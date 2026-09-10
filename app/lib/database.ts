import type { SQLiteDatabase } from 'expo-sqlite';

const LATEST_SCHEMA_VERSION = 3;

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      repository_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      ticket_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'in_progress',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      my_context TEXT NOT NULL DEFAULT '',
      why_implementing TEXT NOT NULL DEFAULT '',
      how_it_works TEXT NOT NULL DEFAULT '',
      important_decisions TEXT NOT NULL DEFAULT '',
      next_action TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS progress_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS work_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'code',
      description TEXT NOT NULL,
      what_remains TEXT NOT NULL DEFAULT '',
      next_action TEXT NOT NULL DEFAULT '',
      commit_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ticket_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_updated ON tickets(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_logs_ticket ON work_logs(ticket_id, created_at DESC);
  `);

  const version = await db.getFirstAsync<{ version: number }>('SELECT version FROM schema_version LIMIT 1');
  if (!version) {
    await migrateToV2(db);
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', LATEST_SCHEMA_VERSION);
    return;
  }

  if (version.version < 2) {
    await migrateToV2(db);
  }
  if (version.version < 3) {
    await removeDemoData(db);
  }
  if (version.version < LATEST_SCHEMA_VERSION) {
    await db.runAsync('UPDATE schema_version SET version = ?', LATEST_SCHEMA_VERSION);
  }
}

async function migrateToV2(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ticket_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS work_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      paused_at TEXT,
      ended_at TEXT,
      pause_reason TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      next_action TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_ticket ON work_sessions(ticket_id, started_at DESC);
  `);
}

async function removeDemoData(db: SQLiteDatabase) {
  await db.runAsync(
    "DELETE FROM tickets WHERE ticket_key IN ('AUTH-123', 'API-88', 'UI-204', 'SEARCH-52', 'RAG-31', 'CACHE-19', 'DOCS-7')",
  );
  await db.runAsync(
    "DELETE FROM projects WHERE name IN ('Atlas Platform', 'Signal Search') AND NOT EXISTS (SELECT 1 FROM tickets WHERE tickets.project_id = projects.id)",
  );
}

export async function deleteTicket(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM tickets WHERE id = ?', id);
}

export async function deleteProject(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM projects WHERE id = ?', id);
}

async function seedDatabase(db: SQLiteDatabase) {
  const now = new Date().toISOString();
  const projects = [
    ['Atlas Platform', 'Shared identity and developer platform services.', 'https://github.com/acme/atlas'],
    ['Signal Search', 'Semantic search and retrieval tooling for internal teams.', 'https://github.com/acme/signal-search'],
  ];
  for (const [name, description, repositoryUrl] of projects) {
    await db.runAsync('INSERT INTO projects (name, description, repository_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', name, description, repositoryUrl, now, now);
  }

  const atlas = await db.getFirstAsync<{ id: number }>('SELECT id FROM projects WHERE name = ?', 'Atlas Platform');
  const signal = await db.getFirstAsync<{ id: number }>('SELECT id FROM projects WHERE name = ?', 'Signal Search');
  if (!atlas || !signal) return;

  const tickets = [
    [atlas.id, 'AUTH-123', 'Authentication caching', 'Reduce repeated auth lookups while keeping tokens fresh.', 'in_progress', 'high', 'Implement TTL-based cache expiration.'],
    [atlas.id, 'API-88', 'Typed integration errors', 'Give clients actionable error types from the integration layer.', 'review', 'medium', 'Address review feedback on error payloads.'],
    [atlas.id, 'UI-204', 'Settings screen refactor', 'Make account settings easier to scan on small screens.', 'paused', 'low', 'Resume after the auth work lands.'],
    [signal.id, 'SEARCH-52', 'Semantic code search', 'Improve ranking for symbols and nearby implementation context.', 'in_progress', 'urgent', 'Benchmark the new reranker against the fixture set.'],
    [signal.id, 'RAG-31', 'Source citation panel', 'Show the exact source spans behind generated answers.', 'blocked', 'high', 'Confirm the metadata contract with the API team.'],
    [signal.id, 'CACHE-19', 'Embedding cache', 'Avoid recomputing embeddings for unchanged documents.', 'done', 'medium', 'Monitor cache hit rate after release.'],
    [atlas.id, 'DOCS-7', 'On-call handoff notes', 'Document the common failure modes for the gateway.', 'done', 'low', 'Keep the runbook current.'],
  ];
  for (const ticket of tickets) {
    await db.runAsync('INSERT OR IGNORE INTO tickets (project_id, ticket_key, title, description, status, priority, next_action, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', ticket[0], ticket[1], ticket[2], ticket[3], ticket[4], ticket[5], ticket[6], now, now);
  }
  const auth = await db.getFirstAsync<{ id: number }>('SELECT id FROM tickets WHERE ticket_key = ?', 'AUTH-123');
  const search = await db.getFirstAsync<{ id: number }>('SELECT id FROM tickets WHERE ticket_key = ?', 'SEARCH-52');
  if (auth && search) {
    await db.runAsync('INSERT INTO progress_items (ticket_id, content, completed, position, created_at) VALUES (?, ?, 1, 1, ?)', auth.id, 'Investigated existing authentication flow', now);
    await db.runAsync('INSERT INTO progress_items (ticket_id, content, completed, position, created_at) VALUES (?, ?, 1, 2, ?)', auth.id, 'Added in-memory cache lookup', now);
    await db.runAsync('INSERT INTO progress_items (ticket_id, content, completed, position, created_at) VALUES (?, ?, 0, 3, ?)', auth.id, 'Add cache expiration', now);
    await db.runAsync('INSERT INTO progress_items (ticket_id, content, completed, position, created_at) VALUES (?, ?, 0, 4, ?)', auth.id, 'Test concurrent requests', now);
    await db.runAsync('INSERT INTO work_logs (ticket_id, type, description, what_remains, next_action, commit_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', auth.id, 'code', 'Implemented the in-memory cache lookup and invalidation path.', 'TTL and concurrency tests remain.', 'Implement TTL-based cache expiration.', 'a82cf1d', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
    await db.runAsync('INSERT INTO work_logs (ticket_id, type, description, what_remains, next_action, commit_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', search.id, 'investigation', 'Mapped the ranking pipeline and found the reranker fixture gap.', 'Run the benchmark with realistic symbol queries.', 'Benchmark the new reranker against the fixture set.', '', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    await migrateToV2(db);
    await db.runAsync('INSERT INTO work_sessions (ticket_id, started_at, paused_at, pause_reason, summary, next_action) VALUES (?, ?, ?, ?, ?, ?)', auth.id, new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), 'Higher priority task', 'Implemented cache lookup and invalidation.', 'Implement TTL-based cache expiration.');
  }
}
