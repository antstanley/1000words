/**
 * S3 storage backend implementation.
 * Works with AWS S3 and S3-compatible storage services.
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import type {
  StorageBackend,
  StoryFileMetadata,
  PutOptions,
  ListOptions,
  ListResult,
} from "$lib/types";

/**
 * Configuration for S3 storage backend.
 */
export interface S3StorageConfig {
  /** S3 bucket name */
  bucket: string;
  /** AWS region */
  region: string;
  /** Optional endpoint for S3-compatible services (e.g., MinIO, R2) */
  endpoint?: string;
  /** Optional path prefix for all keys */
  prefix?: string;
  /** Optional AWS credentials (uses default credential chain if not provided) */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * S3 storage backend implementation.
 */
export class S3StorageBackend implements StorageBackend {
  private client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.prefix = config.prefix ?? "";

    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: config.credentials,
      forcePathStyle: !!config.endpoint, // Required for S3-compatible services
    });
  }

  private getFullKey(key: string): string {
    return this.prefix ? `${this.prefix}/${key}` : key;
  }

  private stripPrefix(fullKey: string): string {
    if (this.prefix && fullKey.startsWith(`${this.prefix}/`)) {
      return fullKey.slice(this.prefix.length + 1);
    }
    return fullKey;
  }

  async get(key: string): Promise<string | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.getFullKey(key),
      });

      const response = await this.client.send(command);
      const body = await response.Body?.transformToString();
      return body ?? null;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async put(key: string, content: string, options?: PutOptions): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: this.getFullKey(key),
      Body: content,
      ContentType: options?.contentType ?? "text/markdown",
      Metadata: options?.metadata,
    });

    await this.client.send(command);
  }

  async delete(key: string): Promise<boolean> {
    try {
      // Check if exists first
      const exists = await this.exists(key);
      if (!exists) {
        return false;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: this.getFullKey(key),
      });

      await this.client.send(command);
      return true;
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const prefix = options?.prefix
      ? this.getFullKey(options.prefix)
      : this.prefix
        ? `${this.prefix}/`
        : undefined;

    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: options?.maxResults ?? 100,
      ContinuationToken: options?.continuationToken,
    });

    const response = await this.client.send(command);

    const files: StoryFileMetadata[] = (response.Contents ?? []).map((object) => ({
      key: this.stripPrefix(object.Key ?? ""),
      size: object.Size ?? 0,
      contentType: "text/markdown", // S3 doesn't return content type in list
      lastModified: object.LastModified ?? new Date(),
      etag: object.ETag,
    }));

    return {
      files,
      continuationToken: response.NextContinuationToken,
      hasMore: response.IsTruncated ?? false,
    };
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: this.getFullKey(key),
      });

      await this.client.send(command);
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
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: this.getFullKey(key),
      });

      const response = await this.client.send(command);

      return {
        key,
        size: response.ContentLength ?? 0,
        contentType: response.ContentType ?? "text/markdown",
        lastModified: response.LastModified ?? new Date(),
        etag: response.ETag,
      };
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  private isNotFoundError(error: unknown): boolean {
    if (error && typeof error === "object" && "name" in error) {
      const name = (error as { name: string }).name;
      return name === "NoSuchKey" || name === "NotFound";
    }
    return false;
  }
}
