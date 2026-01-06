/**
 * Index backend interface for story metadata.
 * Story metadata is stored in SQLite, Postgres, or DynamoDB.
 */

/**
 * Story metadata stored in the index.
 * Contains information about a story without the full content.
 */
export interface StoryMetadata {
  /** Unique identifier for the story */
  id: string;
  /** Story title */
  title: string;
  /** Author's DID (decentralized identifier from Atproto) */
  authorDid: string;
  /** Author's display name */
  authorName: string;
  /** Storage key/path where the story content is stored */
  storageKey: string;
  /** Word count of the story (950-1000) */
  wordCount: number;
  /** Short excerpt or description */
  excerpt?: string;
  /** Tags or categories */
  tags?: string[];
  /** Publication timestamp */
  publishedAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Created timestamp */
  createdAt: Date;
}

/**
 * Data required to create a new story entry.
 */
export interface CreateStoryInput {
  title: string;
  authorDid: string;
  authorName: string;
  storageKey: string;
  wordCount: number;
  excerpt?: string;
  tags?: string[];
}

/**
 * Data for updating an existing story.
 */
export interface UpdateStoryInput {
  title?: string;
  excerpt?: string;
  tags?: string[];
  wordCount?: number;
}

/**
 * Options for querying stories.
 */
export interface QueryOptions {
  /** Filter by author DID */
  authorDid?: string;
  /** Filter by tags (stories must have all specified tags) */
  tags?: string[];
  /** Sort field */
  sortBy?: "publishedAt" | "updatedAt" | "createdAt" | "title";
  /** Sort direction */
  sortOrder?: "asc" | "desc";
  /** Maximum results to return */
  limit?: number;
  /** Number of results to skip (for pagination) */
  offset?: number;
}

/**
 * Search options for full-text or title search.
 */
export interface SearchOptions {
  /** Search query string */
  query: string;
  /** Filter by author DID */
  authorDid?: string;
  /** Maximum results to return */
  limit?: number;
  /** Number of results to skip (for pagination) */
  offset?: number;
}

/**
 * Result of a query or search operation.
 */
export interface QueryResult {
  /** Array of story metadata */
  stories: StoryMetadata[];
  /** Total count of matching stories (for pagination) */
  total: number;
  /** Whether there are more results */
  hasMore: boolean;
}

/**
 * Index backend interface for story metadata.
 * Implementations must be pluggable to support different database backends
 * (SQLite, Postgres, DynamoDB).
 */
export interface IndexBackend {
  /**
   * Create a new story entry in the index.
   * @param input - Story data to create
   * @returns The created story metadata with generated ID
   */
  create(input: CreateStoryInput): Promise<StoryMetadata>;

  /**
   * Get a story by its ID.
   * @param id - Story ID
   * @returns Story metadata or null if not found
   */
  get(id: string): Promise<StoryMetadata | null>;

  /**
   * Update an existing story.
   * @param id - Story ID to update
   * @param input - Fields to update
   * @returns Updated story metadata or null if not found
   */
  update(id: string, input: UpdateStoryInput): Promise<StoryMetadata | null>;

  /**
   * Delete a story from the index.
   * @param id - Story ID to delete
   * @returns True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Query stories with optional filtering and pagination.
   * @param options - Query options
   * @returns Query result with stories and pagination info
   */
  query(options?: QueryOptions): Promise<QueryResult>;

  /**
   * List stories by a specific author.
   * @param authorDid - Author's DID
   * @param options - Additional query options (limit, offset, sort)
   * @returns Query result with the author's stories
   */
  listByAuthor(authorDid: string, options?: Omit<QueryOptions, "authorDid">): Promise<QueryResult>;

  /**
   * Search stories by title or content excerpt.
   * @param options - Search options
   * @returns Query result with matching stories
   */
  search(options: SearchOptions): Promise<QueryResult>;

  /**
   * Get total count of stories, optionally filtered.
   * @param options - Optional query options for filtering
   * @returns Total count of matching stories
   */
  count(options?: Omit<QueryOptions, "limit" | "offset">): Promise<number>;
}
