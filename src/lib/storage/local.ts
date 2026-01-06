/**
 * Local filesystem storage backend implementation.
 * For development and testing purposes.
 */

import { mkdir, readFile, writeFile, unlink, readdir, stat } from "node:fs/promises";
import { join, dirname, relative } from "node:path";
import type {
  StorageBackend,
  StoryFileMetadata,
  PutOptions,
  ListOptions,
  ListResult,
} from "$lib/types";

/**
 * Configuration for local filesystem storage backend.
 */
export interface LocalStorageConfig {
  /** Base directory for storing files */
  baseDir: string;
}

/**
 * Local filesystem storage backend implementation.
 */
export class LocalStorageBackend implements StorageBackend {
  private baseDir: string;

  constructor(config: LocalStorageConfig) {
    this.baseDir = config.baseDir;
  }

  private getFullPath(key: string): string {
    return join(this.baseDir, key);
  }

  async get(key: string): Promise<string | null> {
    try {
      const content = await readFile(this.getFullPath(key), "utf-8");
      return content;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async put(key: string, content: string, _options?: PutOptions): Promise<void> {
    const fullPath = this.getFullPath(key);

    // Ensure directory exists
    await mkdir(dirname(fullPath), { recursive: true });

    await writeFile(fullPath, content, "utf-8");
  }

  async delete(key: string): Promise<boolean> {
    try {
      await unlink(this.getFullPath(key));
      return true;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const searchDir = options?.prefix ? join(this.baseDir, options.prefix) : this.baseDir;

    try {
      const files = await this.listFilesRecursive(searchDir);

      // Sort by modification time (newest first)
      files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

      // Apply pagination
      const offset = options?.continuationToken ? parseInt(options.continuationToken, 10) : 0;
      const limit = options?.maxResults ?? 100;
      const paginatedFiles = files.slice(offset, offset + limit);
      const hasMore = offset + limit < files.length;

      return {
        files: paginatedFiles,
        continuationToken: hasMore ? String(offset + limit) : undefined,
        hasMore,
      };
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return { files: [], hasMore: false };
      }
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.getFullPath(key));
      return true;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async getMetadata(key: string): Promise<StoryFileMetadata | null> {
    try {
      const fullPath = this.getFullPath(key);
      const fileStat = await stat(fullPath);

      return {
        key,
        size: fileStat.size,
        contentType: "text/markdown",
        lastModified: fileStat.mtime,
      };
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  private async listFilesRecursive(dir: string): Promise<StoryFileMetadata[]> {
    const files: StoryFileMetadata[] = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.listFilesRecursive(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const fileStat = await stat(fullPath);
        files.push({
          key: relative(this.baseDir, fullPath),
          size: fileStat.size,
          contentType: "text/markdown",
          lastModified: fileStat.mtime,
        });
      }
    }

    return files;
  }

  private isNotFoundError(error: unknown): boolean {
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code: string }).code;
      return code === "ENOENT";
    }
    return false;
  }
}
