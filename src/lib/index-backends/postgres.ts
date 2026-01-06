/**
 * PostgreSQL index backend implementation.
 * For production deployments with PostgreSQL.
 */

import { Pool, type PoolConfig } from "pg";
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
 * Configuration for PostgreSQL index backend.
 */
export interface PostgresIndexConfig {
  /** PostgreSQL connection string or config */
  connectionConfig: string | PoolConfig;
  /** Table name for stories (default: stories) */
  tableName?: string;
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
  tags: string[] | null;
  published_at: Date;
  updated_at: Date;
  created_at: Date;
}

/**
 * PostgreSQL index backend implementation.
 */
export class PostgresIndexBackend implements IndexBackend {
  private pool: Pool;
  private tableName: string;
  private initialized = false;

  constructor(config: PostgresIndexConfig) {
    this.pool =
      typeof config.connectionConfig === "string"
        ? new Pool({ connectionString: config.connectionConfig })
        : new Pool(config.connectionConfig);
    this.tableName = config.tableName ?? "stories";
  }

  /**
   * Initialize the database schema.
   * Call this once before using the backend.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        author_did TEXT NOT NULL,
        author_name TEXT NOT NULL,
        storage_key TEXT NOT NULL UNIQUE,
        word_count INTEGER NOT NULL,
        excerpt TEXT,
        tags TEXT[],
        published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_author_did ON ${this.tableName}(author_did);
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_published_at ON ${this.tableName}(published_at);
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_title ON ${this.tableName}(title);
    `);

    this.initialized = true;
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
      tags: row.tags ?? undefined,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
  }

  async create(input: CreateStoryInput): Promise<StoryMetadata> {
    const result = await this.pool.query<StoryRow>(
      `INSERT INTO ${this.tableName} (title, author_did, author_name, storage_key, word_count, excerpt, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.title,
        input.authorDid,
        input.authorName,
        input.storageKey,
        input.wordCount,
        input.excerpt ?? null,
        input.tags ?? null,
      ],
    );

    return this.rowToMetadata(result.rows[0]);
  }

  async get(id: string): Promise<StoryMetadata | null> {
    const result = await this.pool.query<StoryRow>(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToMetadata(result.rows[0]);
  }

  async update(id: string, input: UpdateStoryInput): Promise<StoryMetadata | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }
    if (input.excerpt !== undefined) {
      updates.push(`excerpt = $${paramIndex++}`);
      values.push(input.excerpt);
    }
    if (input.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(input.tags);
    }
    if (input.wordCount !== undefined) {
      updates.push(`word_count = $${paramIndex++}`);
      values.push(input.wordCount);
    }

    if (updates.length === 0) {
      return this.get(id);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const result = await this.pool.query<StoryRow>(
      `UPDATE ${this.tableName} SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.rowToMetadata(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async query(options?: QueryOptions): Promise<QueryResult> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (options?.authorDid) {
      conditions.push(`author_did = $${paramIndex++}`);
      values.push(options.authorDid);
    }

    if (options?.tags && options.tags.length > 0) {
      conditions.push(`tags @> $${paramIndex++}`);
      values.push(options.tags);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Build ORDER BY
    const sortField = this.getSortField(options?.sortBy ?? "publishedAt");
    const sortOrder = options?.sortOrder === "asc" ? "ASC" : "DESC";

    // Get paginated results
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const result = await this.pool.query<StoryRow>(
      `SELECT * FROM ${this.tableName} ${whereClause}
       ORDER BY ${sortField} ${sortOrder}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset],
    );

    const stories = result.rows.map((row) => this.rowToMetadata(row));

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
    const conditions: string[] = ["(title ILIKE $1 OR excerpt ILIKE $1)"];
    const searchPattern = `%${options.query}%`;
    const values: unknown[] = [searchPattern];
    let paramIndex = 2;

    if (options.authorDid) {
      conditions.push(`author_did = $${paramIndex++}`);
      values.push(options.authorDid);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // Get total count
    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const result = await this.pool.query<StoryRow>(
      `SELECT * FROM ${this.tableName} ${whereClause}
       ORDER BY published_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset],
    );

    const stories = result.rows.map((row) => this.rowToMetadata(row));

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
   * Close the connection pool.
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
