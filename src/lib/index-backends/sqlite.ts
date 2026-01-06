/**
 * SQLite index backend implementation.
 * For local development and small deployments.
 */

import Database from "better-sqlite3";
import type {
  IndexBackend,
  StoryMetadata,
  CreateStoryInput,
  UpdateStoryInput,
  QueryOptions,
  SearchOptions,
  QueryResult,
} from "$lib/types";

/**
 * Configuration for SQLite index backend.
 */
export interface SQLiteIndexConfig {
  /** Path to SQLite database file */
  dbPath: string;
}

/**
 * Row type for database queries.
 */
interface StoryRow {
  id: string;
  title: string;
  author_did: string;
  author_name: string;
  storage_key: string;
  word_count: number;
  excerpt: string | null;
  tags: string | null;
  published_at: string;
  updated_at: string;
  created_at: string;
}

/**
 * SQLite index backend implementation.
 */
export class SQLiteIndexBackend implements IndexBackend {
  private db: Database.Database;

  constructor(config: SQLiteIndexConfig) {
    this.db = new Database(config.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author_did TEXT NOT NULL,
        author_name TEXT NOT NULL,
        storage_key TEXT NOT NULL UNIQUE,
        word_count INTEGER NOT NULL,
        excerpt TEXT,
        tags TEXT,
        published_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_stories_author_did ON stories(author_did);
      CREATE INDEX IF NOT EXISTS idx_stories_published_at ON stories(published_at);
      CREATE INDEX IF NOT EXISTS idx_stories_title ON stories(title);
    `);
  }

  private rowToMetadata(row: StoryRow): StoryMetadata {
    return {
      id: row.id,
      title: row.title,
      authorDid: row.author_did,
      authorName: row.author_name,
      storageKey: row.storage_key,
      wordCount: row.word_count,
      excerpt: row.excerpt ?? undefined,
      tags: row.tags ? JSON.parse(row.tags) : undefined,
      publishedAt: new Date(row.published_at),
      updatedAt: new Date(row.updated_at),
      createdAt: new Date(row.created_at),
    };
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  async create(input: CreateStoryInput): Promise<StoryMetadata> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO stories (id, title, author_did, author_name, storage_key, word_count, excerpt, tags, published_at, updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.title,
      input.authorDid,
      input.authorName,
      input.storageKey,
      input.wordCount,
      input.excerpt ?? null,
      input.tags ? JSON.stringify(input.tags) : null,
      now,
      now,
      now,
    );

    const created = await this.get(id);
    if (!created) {
      throw new Error("Failed to create story");
    }
    return created;
  }

  async get(id: string): Promise<StoryMetadata | null> {
    const stmt = this.db.prepare("SELECT * FROM stories WHERE id = ?");
    const row = stmt.get(id) as StoryRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToMetadata(row);
  }

  async update(id: string, input: UpdateStoryInput): Promise<StoryMetadata | null> {
    const existing = await this.get(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.title !== undefined) {
      updates.push("title = ?");
      values.push(input.title);
    }
    if (input.excerpt !== undefined) {
      updates.push("excerpt = ?");
      values.push(input.excerpt);
    }
    if (input.tags !== undefined) {
      updates.push("tags = ?");
      values.push(JSON.stringify(input.tags));
    }
    if (input.wordCount !== undefined) {
      updates.push("word_count = ?");
      values.push(input.wordCount);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`UPDATE stories SET ${updates.join(", ")} WHERE id = ?`);
    stmt.run(...values);

    return this.get(id);
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare("DELETE FROM stories WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async query(options?: QueryOptions): Promise<QueryResult> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (options?.authorDid) {
      conditions.push("author_did = ?");
      values.push(options.authorDid);
    }

    if (options?.tags && options.tags.length > 0) {
      // Simple tag matching - check if all tags exist in the JSON array
      for (const tag of options.tags) {
        conditions.push("tags LIKE ?");
        values.push(`%"${tag}"%`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM stories ${whereClause}`);
    const countResult = countStmt.get(...values) as { count: number };
    const total = countResult.count;

    // Build ORDER BY
    const sortField = this.getSortField(options?.sortBy ?? "publishedAt");
    const sortOrder = options?.sortOrder === "asc" ? "ASC" : "DESC";

    // Get paginated results
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const stmt = this.db.prepare(`
      SELECT * FROM stories ${whereClause}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(...values, limit, offset) as StoryRow[];
    const stories = rows.map((row) => this.rowToMetadata(row));

    return {
      stories,
      total,
      hasMore: offset + stories.length < total,
    };
  }

  async listByAuthor(
    authorDid: string,
    options?: Omit<QueryOptions, "authorDid">,
  ): Promise<QueryResult> {
    return this.query({ ...options, authorDid });
  }

  async search(options: SearchOptions): Promise<QueryResult> {
    const conditions: string[] = ["(title LIKE ? OR excerpt LIKE ?)"];
    const searchPattern = `%${options.query}%`;
    const values: unknown[] = [searchPattern, searchPattern];

    if (options.authorDid) {
      conditions.push("author_did = ?");
      values.push(options.authorDid);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Get total count
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM stories ${whereClause}`);
    const countResult = countStmt.get(...values) as { count: number };
    const total = countResult.count;

    // Get paginated results
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const stmt = this.db.prepare(`
      SELECT * FROM stories ${whereClause}
      ORDER BY published_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(...values, limit, offset) as StoryRow[];
    const stories = rows.map((row) => this.rowToMetadata(row));

    return {
      stories,
      total,
      hasMore: offset + stories.length < total,
    };
  }

  async count(options?: Omit<QueryOptions, "limit" | "offset">): Promise<number> {
    const result = await this.query({ ...options, limit: 1, offset: 0 });
    return result.total;
  }

  private getSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      publishedAt: "published_at",
      updatedAt: "updated_at",
      createdAt: "created_at",
      title: "title",
    };
    return fieldMap[sortBy] ?? "published_at";
  }

  /**
   * Close the database connection.
   */
  close(): void {
    this.db.close();
  }
}
