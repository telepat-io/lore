import Database from 'better-sqlite3';
import path from 'path';

const DB_FILENAME = 'db.sqlite';

/** Open (or create) the repo's SQLite database and ensure schema exists */
export function openDb(repoRoot: string): Database.Database {
  const dbPath = path.join(repoRoot, '.lore', DB_FILENAME);
  const db = new Database(dbPath);

  // WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  ensureSchema(db);
  return db;
}

function ensureSchema(db: Database.Database): void {
  db.exec(`
    -- Backlinks graph for BFS/DFS traversal and lore path
    CREATE TABLE IF NOT EXISTS links (
      from_slug TEXT NOT NULL,
      to_slug   TEXT NOT NULL,
      PRIMARY KEY (from_slug, to_slug)
    );
    CREATE INDEX IF NOT EXISTS links_to ON links(to_slug);

    -- Articles content table (backing store for FTS5)
    CREATE TABLE IF NOT EXISTS articles (
      slug  TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body  TEXT NOT NULL
    );

    -- Full-text search over all wiki content
    CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(
      slug, title, body,
      content='articles',
      content_rowid='rowid',
      tokenize='porter unicode61'
    );

    -- Triggers to keep FTS in sync with articles table
    CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
      INSERT INTO fts(rowid, slug, title, body) VALUES (new.rowid, new.slug, new.title, new.body);
    END;
    CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
      INSERT INTO fts(fts, rowid, slug, title, body) VALUES('delete', old.rowid, old.slug, old.title, old.body);
    END;
    CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
      INSERT INTO fts(fts, rowid, slug, title, body) VALUES('delete', old.rowid, old.slug, old.title, old.body);
      INSERT INTO fts(rowid, slug, title, body) VALUES (new.rowid, new.slug, new.title, new.body);
    END;
  `);
}

/** Drop and recreate all tables (for full reindex) */
export function resetDb(db: Database.Database): void {
  db.exec(`
    DROP TABLE IF EXISTS fts;
    DROP TABLE IF EXISTS articles;
    DROP TABLE IF EXISTS links;
    DROP TRIGGER IF EXISTS articles_ai;
    DROP TRIGGER IF EXISTS articles_ad;
    DROP TRIGGER IF EXISTS articles_au;
  `);
  ensureSchema(db);
}
