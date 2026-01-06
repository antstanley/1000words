/**
 * Storage backend interface for story files.
 * Stories are markdown files stored in S3-compatible or other storage.
 */

/**
 * Metadata for a stored story file.
 */
export interface StoryFileMetadata {
  /** Unique identifier for the story file (typically a path or key) */
  key: string;
  /** File size in bytes */
  size: number;
  /** Content type (typically 'text/markdown') */
  contentType: string;
  /** Last modified timestamp */
  lastModified: Date;
  /** Optional ETag for cache validation */
  etag?: string;
}

/**
 * Options for put operations.
 */
export interface PutOptions {
  /** Content type of the file */
  contentType?: string;
  /** Custom metadata to attach to the file */
  metadata?: Record<string, string>;
}

/**
 * Options for list operations.
 */
export interface ListOptions {
  /** Prefix to filter results (e.g., 'author/user123/') */
  prefix?: string;
  /** Maximum number of results to return */
  maxResults?: number;
  /** Continuation token for pagination */
  continuationToken?: string;
}

/**
 * Result of a list operation.
 */
export interface ListResult {
  /** Array of file metadata */
  files: StoryFileMetadata[];
  /** Token for fetching the next page, if more results exist */
  continuationToken?: string;
  /** Whether there are more results available */
  hasMore: boolean;
}

/**
 * Storage backend interface for story files.
 * Implementations must be pluggable to support different storage providers
 * (S3, local filesystem, etc.).
 */
export interface StorageBackend {
  /**
   * Retrieve a story file by key.
   * @param key - The unique key/path of the file
   * @returns The file content as a string, or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Store a story file.
   * @param key - The unique key/path for the file
   * @param content - The file content (markdown)
   * @param options - Optional settings for the put operation
   */
  put(key: string, content: string, options?: PutOptions): Promise<void>;

  /**
   * Delete a story file.
   * @param key - The unique key/path of the file to delete
   * @returns True if the file was deleted, false if it didn't exist
   */
  delete(key: string): Promise<boolean>;

  /**
   * List story files, optionally filtered by prefix.
   * @param options - Optional filtering and pagination options
   * @returns List result with file metadata and pagination info
   */
  list(options?: ListOptions): Promise<ListResult>;

  /**
   * Check if a file exists.
   * @param key - The unique key/path of the file
   * @returns True if the file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get metadata for a file without retrieving its content.
   * @param key - The unique key/path of the file
   * @returns File metadata, or null if not found
   */
  getMetadata(key: string): Promise<StoryFileMetadata | null>;
}
