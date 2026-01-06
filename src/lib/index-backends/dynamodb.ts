/**
 * DynamoDB index backend implementation.
 * For AWS serverless deployments.
 */

import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
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
 * Configuration for DynamoDB index backend.
 */
export interface DynamoDBIndexConfig {
  /** DynamoDB table name */
  tableName: string;
  /** AWS region */
  region: string;
  /** Optional endpoint for local DynamoDB */
  endpoint?: string;
  /** Optional AWS credentials */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * DynamoDB item type.
 */
interface StoryItem {
  pk: string; // "STORY#<id>"
  sk: string; // "STORY#<id>"
  gsi1pk: string; // "AUTHOR#<authorDid>"
  gsi1sk: string; // publishedAt ISO string
  id: string;
  title: string;
  authorDid: string;
  authorName: string;
  storageKey: string;
  wordCount: number;
  excerpt?: string;
  tags?: string[];
  publishedAt: string;
  updatedAt: string;
  createdAt: string;
}

/**
 * DynamoDB index backend implementation.
 */
export class DynamoDBIndexBackend implements IndexBackend {
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(config: DynamoDBIndexConfig) {
    this.tableName = config.tableName;

    this.client = new DynamoDBClient({
      region: config.region,
      endpoint: config.endpoint,
      credentials: config.credentials,
    });

    this.docClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }

  /**
   * Initialize the DynamoDB table.
   * Creates the table if it doesn't exist.
   */
  async init(): Promise<void> {
    try {
      await this.client.send(new DescribeTableCommand({ TableName: this.tableName }));
      return; // Table exists
    } catch (error: unknown) {
      if ((error as { name?: string }).name !== "ResourceNotFoundException") {
        throw error;
      }
    }

    // Create table with GSI for author queries
    await this.client.send(
      new CreateTableCommand({
        TableName: this.tableName,
        KeySchema: [
          { AttributeName: "pk", KeyType: "HASH" },
          { AttributeName: "sk", KeyType: "RANGE" },
        ],
        AttributeDefinitions: [
          { AttributeName: "pk", AttributeType: "S" },
          { AttributeName: "sk", AttributeType: "S" },
          { AttributeName: "gsi1pk", AttributeType: "S" },
          { AttributeName: "gsi1sk", AttributeType: "S" },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "gsi1",
            KeySchema: [
              { AttributeName: "gsi1pk", KeyType: "HASH" },
              { AttributeName: "gsi1sk", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
        ],
        BillingMode: "PAY_PER_REQUEST",
      }),
    );
  }

  private itemToMetadata(item: StoryItem): StoryMetadata {
    return {
      id: item.id,
      title: item.title,
      authorDid: item.authorDid,
      authorName: item.authorName,
      storageKey: item.storageKey,
      wordCount: item.wordCount,
      excerpt: item.excerpt,
      tags: item.tags,
      publishedAt: new Date(item.publishedAt),
      updatedAt: new Date(item.updatedAt),
      createdAt: new Date(item.createdAt),
    };
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  async create(input: CreateStoryInput): Promise<StoryMetadata> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const item: StoryItem = {
      pk: `STORY#${id}`,
      sk: `STORY#${id}`,
      gsi1pk: `AUTHOR#${input.authorDid}`,
      gsi1sk: now,
      id,
      title: input.title,
      authorDid: input.authorDid,
      authorName: input.authorName,
      storageKey: input.storageKey,
      wordCount: input.wordCount,
      excerpt: input.excerpt,
      tags: input.tags,
      publishedAt: now,
      updatedAt: now,
      createdAt: now,
    };

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );

    return this.itemToMetadata(item);
  }

  async get(id: string): Promise<StoryMetadata | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          pk: `STORY#${id}`,
          sk: `STORY#${id}`,
        },
      }),
    );

    if (!result.Item) {
      return null;
    }

    return this.itemToMetadata(result.Item as StoryItem);
  }

  async update(id: string, input: UpdateStoryInput): Promise<StoryMetadata | null> {
    const existing = await this.get(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const expressionValues: Record<string, unknown> = {};
    const expressionNames: Record<string, string> = {};

    if (input.title !== undefined) {
      updates.push("#title = :title");
      expressionNames["#title"] = "title";
      expressionValues[":title"] = input.title;
    }
    if (input.excerpt !== undefined) {
      updates.push("excerpt = :excerpt");
      expressionValues[":excerpt"] = input.excerpt;
    }
    if (input.tags !== undefined) {
      updates.push("tags = :tags");
      expressionValues[":tags"] = input.tags;
    }
    if (input.wordCount !== undefined) {
      updates.push("wordCount = :wordCount");
      expressionValues[":wordCount"] = input.wordCount;
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push("updatedAt = :updatedAt");
    expressionValues[":updatedAt"] = new Date().toISOString();

    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          pk: `STORY#${id}`,
          sk: `STORY#${id}`,
        },
        UpdateExpression: `SET ${updates.join(", ")}`,
        ExpressionAttributeValues: expressionValues,
        ExpressionAttributeNames:
          Object.keys(expressionNames).length > 0 ? expressionNames : undefined,
      }),
    );

    return this.get(id);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) {
      return false;
    }

    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          pk: `STORY#${id}`,
          sk: `STORY#${id}`,
        },
      }),
    );

    return true;
  }

  async query(options?: QueryOptions): Promise<QueryResult> {
    // If filtering by author, use GSI
    if (options?.authorDid) {
      return this.queryByAuthor(options.authorDid, options);
    }

    // Otherwise, use scan (less efficient but necessary for general queries)
    return this.scanStories(options);
  }

  private async queryByAuthor(authorDid: string, options?: QueryOptions): Promise<QueryResult> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "gsi1",
        KeyConditionExpression: "gsi1pk = :pk",
        ExpressionAttributeValues: {
          ":pk": `AUTHOR#${authorDid}`,
        },
        ScanIndexForward: options?.sortOrder === "asc",
        Limit: options?.limit ?? 20,
      }),
    );

    const items = (result.Items ?? []) as StoryItem[];
    const stories = items.map((item) => this.itemToMetadata(item));

    // Filter by tags if specified
    const filtered = options?.tags
      ? stories.filter((s) => options.tags!.every((tag) => s.tags?.includes(tag)))
      : stories;

    return {
      stories: filtered.slice(0, options?.limit ?? 20),
      total: result.Count ?? 0,
      hasMore: !!result.LastEvaluatedKey,
    };
  }

  private async scanStories(options?: QueryOptions): Promise<QueryResult> {
    const result = await this.docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "begins_with(pk, :prefix)",
        ExpressionAttributeValues: {
          ":prefix": "STORY#",
        },
        Limit: (options?.limit ?? 20) * 2, // Scan more to account for filtering
      }),
    );

    let items = (result.Items ?? []) as StoryItem[];

    // Filter by tags if specified
    if (options?.tags && options.tags.length > 0) {
      items = items.filter((item) => options.tags!.every((tag) => item.tags?.includes(tag)));
    }

    // Sort
    const sortField = options?.sortBy ?? "publishedAt";
    items.sort((a, b) => {
      const aVal = a[sortField as keyof StoryItem] as string;
      const bVal = b[sortField as keyof StoryItem] as string;
      return options?.sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    // Apply limit
    const limited = items.slice(0, options?.limit ?? 20);
    const stories = limited.map((item) => this.itemToMetadata(item));

    return {
      stories,
      total: result.Count ?? 0,
      hasMore: !!result.LastEvaluatedKey,
    };
  }

  async listByAuthor(
    authorDid: string,
    options?: Omit<QueryOptions, "authorDid">,
  ): Promise<QueryResult> {
    return this.queryByAuthor(authorDid, options);
  }

  async search(options: SearchOptions): Promise<QueryResult> {
    // DynamoDB doesn't support full-text search natively
    // Use scan with filter for basic search
    const query = options.query.toLowerCase();

    const result = await this.docClient.send(
      new ScanCommand({
        TableName: this.tableName,
        FilterExpression: "begins_with(pk, :prefix)",
        ExpressionAttributeValues: {
          ":prefix": "STORY#",
        },
      }),
    );

    let items = (result.Items ?? []) as StoryItem[];

    // Filter by search query (title or excerpt)
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.excerpt?.toLowerCase().includes(query) ?? false),
    );

    // Filter by author if specified
    if (options.authorDid) {
      items = items.filter((item) => item.authorDid === options.authorDid);
    }

    // Sort by publishedAt desc
    items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 20;
    const paginated = items.slice(offset, offset + limit);

    const stories = paginated.map((item) => this.itemToMetadata(item));

    return {
      stories,
      total: items.length,
      hasMore: offset + paginated.length < items.length,
    };
  }

  async count(options?: Omit<QueryOptions, "limit" | "offset">): Promise<number> {
    const result = await this.query({ ...options, limit: 1000 });
    return result.total;
  }

  /**
   * Close the DynamoDB client.
   */
  destroy(): void {
    this.client.destroy();
  }
}
