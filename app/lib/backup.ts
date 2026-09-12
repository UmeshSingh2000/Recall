import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";

const BACKUP_FORMAT = "recall-backup";
const BACKUP_VERSION = 1;

const tableColumns = {
  projects: ["id", "name", "description", "repository_url", "created_at", "updated_at"],
  tickets: ["id", "project_id", "ticket_key", "title", "description", "status", "priority", "due_date", "my_context", "why_implementing", "how_it_works", "important_decisions", "next_action", "created_at", "updated_at", "completed_at"],
  progress_items: ["id", "ticket_id", "content", "completed", "position", "created_at", "completed_at"],
  work_logs: ["id", "ticket_id", "type", "description", "what_remains", "next_action", "commit_hash", "created_at"],
  ticket_files: ["id", "ticket_id", "file_path", "created_at"],
  ticket_notes: ["id", "ticket_id", "content", "created_at", "updated_at"],
  work_sessions: ["id", "ticket_id", "started_at", "paused_at", "ended_at", "pause_reason", "summary", "next_action"],
  settings: ["key", "value"],
} as const;

type BackupTable = keyof typeof tableColumns;
type BackupRow = Record<string, unknown>;

export type RecallBackup = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: Record<BackupTable, BackupRow[]>;
};

export async function createBackup(db: SQLiteDatabase): Promise<RecallBackup> {
  const data = {} as Record<BackupTable, BackupRow[]>;
  for (const table of Object.keys(tableColumns) as BackupTable[]) {
    data[table] = await db.getAllAsync<BackupRow>(`SELECT * FROM ${table}`);
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function parseBackup(value: unknown): RecallBackup {
  if (!value || typeof value !== "object") {
    throw new Error("The selected file is not a JSON object.");
  }
  const candidate = value as Partial<RecallBackup>;
  if (candidate.format !== BACKUP_FORMAT || candidate.version !== BACKUP_VERSION || !candidate.data || typeof candidate.data !== "object") {
    throw new Error("This file is not a compatible Recall backup.");
  }
  for (const table of Object.keys(tableColumns) as BackupTable[]) {
    if (!Array.isArray(candidate.data[table])) {
      throw new Error(`The backup is missing the ${table} table.`);
    }
  }
  return candidate as RecallBackup;
}

export async function restoreBackup(db: SQLiteDatabase, backup: RecallBackup) {
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM progress_items");
    await db.runAsync("DELETE FROM work_logs");
    await db.runAsync("DELETE FROM ticket_files");
    await db.runAsync("DELETE FROM ticket_notes");
    await db.runAsync("DELETE FROM work_sessions");
    await db.runAsync("DELETE FROM tickets");
    await db.runAsync("DELETE FROM projects");
    await db.runAsync("DELETE FROM settings");

    for (const table of ["projects", "tickets", "progress_items", "work_logs", "ticket_files", "ticket_notes", "work_sessions", "settings"] as BackupTable[]) {
      const columns = tableColumns[table];
      for (const row of backup.data[table]) {
        const values = columns.map((column) => (row[column] ?? null) as SQLiteBindValue);
        const placeholders = columns.map(() => "?").join(", ");
        await db.runAsync(
          `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
          ...values,
        );
      }
    }
  });
}
