import type { SQLiteDatabase } from 'expo-sqlite';

const LATEST_SCHEMA_VERSION = 4;

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
    await migrateToV4(db);

    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', LATEST_SCHEMA_VERSION);
    return;
  }

  if (version.version < 2) {
    await migrateToV2(db);
  }
  if (version.version < 3) {
    await removeDemoData(db);
  }
  if (version.version < 4) {
    await migrateToV4(db);
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

async function migrateToV4(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.runAsync(
    `INSERT OR IGNORE INTO sync_metadata (key, value)
     VALUES ('projects_dirty', '1')`
  );
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

export async function deleteWorkLog(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM work_logs WHERE id = ?', id);
}

export async function deleteAllData(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM progress_items');
    await db.runAsync('DELETE FROM work_logs');
    await db.runAsync('DELETE FROM ticket_files');
    await db.runAsync('DELETE FROM ticket_notes');
    await db.runAsync('DELETE FROM work_sessions');
    await db.runAsync('DELETE FROM tickets');
    await db.runAsync('DELETE FROM projects');
    await db.runAsync('DELETE FROM settings');
  });
}

export enum SyncMetadataKeys {
  ProjectsDirty = 'projects_dirty',
}

export async function getSyncMetaData(db: SQLiteDatabase, key: string): Promise<string | null> {
  const result = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_metadata WHERE key = ?',
    key,
  );
  return result ? result.value : null;
}

export async function setSyncMetaData(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO sync_metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}