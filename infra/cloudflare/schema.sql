-- D1 Schema for 1000words story metadata
-- Apply with: wrangler d1 execute 1000words --file=schema.sql

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author_did TEXT NOT NULL,
    author_name TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    word_count INTEGER NOT NULL CHECK (word_count >= 950 AND word_count <= 1000),
    excerpt TEXT,
    tags TEXT, -- JSON array stored as text
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for listing by publish date
CREATE INDEX IF NOT EXISTS idx_stories_status_published
ON stories(status, published_at DESC);

-- Index for listing by author
CREATE INDEX IF NOT EXISTS idx_stories_author_published
ON stories(author_did, published_at DESC);

-- Full-text search index
CREATE VIRTUAL TABLE IF NOT EXISTS stories_fts USING fts5(
    title,
    excerpt,
    author_name,
    content='stories',
    content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS stories_ai AFTER INSERT ON stories BEGIN
    INSERT INTO stories_fts(rowid, title, excerpt, author_name)
    VALUES (new.rowid, new.title, new.excerpt, new.author_name);
END;

CREATE TRIGGER IF NOT EXISTS stories_ad AFTER DELETE ON stories BEGIN
    INSERT INTO stories_fts(stories_fts, rowid, title, excerpt, author_name)
    VALUES ('delete', old.rowid, old.title, old.excerpt, old.author_name);
END;

CREATE TRIGGER IF NOT EXISTS stories_au AFTER UPDATE ON stories BEGIN
    INSERT INTO stories_fts(stories_fts, rowid, title, excerpt, author_name)
    VALUES ('delete', old.rowid, old.title, old.excerpt, old.author_name);
    INSERT INTO stories_fts(rowid, title, excerpt, author_name)
    VALUES (new.rowid, new.title, new.excerpt, new.author_name);
END;
