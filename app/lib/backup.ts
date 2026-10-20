const BACKUP_FORMAT = "recall-backup";
const BACKUP_VERSION = 1;

export const tableColumns = {
  projects: ["id", "user_id", "name", "description", "repository_url", "created_at", "updated_at"],
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
