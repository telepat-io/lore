import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { openDb, resetDb } from '../../core/db.js';
import { initRepo } from '../../core/repo.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-test-'));
  await initRepo(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('openDb', () => {
  it('creates tables on first open', () => {
    const db = openDb(tmpDir);
    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
      const names = tables.map(t => t.name);
      expect(names).toContain('articles');
      expect(names).toContain('links');
    } finally {
      db.close();
    }
  });

  it('creates FTS5 virtual table', () => {
    const db = openDb(tmpDir);
    try {
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
      const names = tables.map(t => t.name);
      expect(names).toContain('fts');
    } finally {
      db.close();
    }
  });

  it('inserts and queries articles', () => {
    const db = openDb(tmpDir);
    try {
      db.prepare('INSERT INTO articles (slug, title, body) VALUES (?, ?, ?)').run('test', 'Test Article', 'Hello world');
      const row = db.prepare('SELECT * FROM articles WHERE slug = ?').get('test') as { slug: string; title: string; body: string };
      expect(row.title).toBe('Test Article');
    } finally {
      db.close();
    }
  });

  it('FTS5 search works after insert', () => {
    const db = openDb(tmpDir);
    try {
      db.prepare('INSERT INTO articles (slug, title, body) VALUES (?, ?, ?)').run('test', 'Test', 'knowledge management system');
      const rows = db.prepare("SELECT slug FROM fts WHERE fts MATCH 'knowledge'").all() as { slug: string }[];
      expect(rows).toHaveLength(1);
      expect(rows[0]!.slug).toBe('test');
    } finally {
      db.close();
    }
  });

  it('links table works', () => {
    const db = openDb(tmpDir);
    try {
      db.prepare('INSERT INTO links (from_slug, to_slug) VALUES (?, ?)').run('a', 'b');
      db.prepare('INSERT INTO links (from_slug, to_slug) VALUES (?, ?)').run('a', 'c');
      const rows = db.prepare('SELECT to_slug FROM links WHERE from_slug = ?').all('a') as { to_slug: string }[];
      expect(rows).toHaveLength(2);
    } finally {
      db.close();
    }
  });
});

describe('resetDb', () => {
  it('clears all data', () => {
    const db = openDb(tmpDir);
    try {
      db.prepare('INSERT INTO articles (slug, title, body) VALUES (?, ?, ?)').run('test', 'Test', 'Body');
      db.prepare('INSERT INTO links (from_slug, to_slug) VALUES (?, ?)').run('a', 'b');
      resetDb(db);
      const articles = db.prepare('SELECT COUNT(*) as cnt FROM articles').get() as { cnt: number };
      const links = db.prepare('SELECT COUNT(*) as cnt FROM links').get() as { cnt: number };
      expect(articles.cnt).toBe(0);
      expect(links.cnt).toBe(0);
    } finally {
      db.close();
    }
  });
});
