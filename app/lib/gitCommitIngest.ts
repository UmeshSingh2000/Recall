import type { SQLiteDatabase } from "expo-sqlite";
import { notifyGitCommitLogged } from "./gitCommitEvents";
import type { WorkLogType } from "../types";

export type GitCommitEvent = {
  type: "git_commit";
  eventId?: string;
  ticketKey: string;
  commitHash: string;
  commitMessage: string;
  description: string;
  files: string[];
  logType: WorkLogType;
  nextAction: string;
  receivedAt: string;
};

const processedKeys = new Set<string>();

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseFiles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((file) => isNonEmptyString(file)).map((file) => file.trim());
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((file) => isNonEmptyString(file)).map((file) => file.trim());
      }
    } catch {
      return [value.trim()];
    }
  }

  return [];
}

function dedupeKey(event: GitCommitEvent): string {
  if (event.eventId) return `event:${event.eventId}`;
  if (event.commitHash) return `commit:${event.ticketKey}:${event.commitHash}`;
  return `fallback:${event.ticketKey}:${event.receivedAt}`;
}

export function parseGitCommitPayload(value: unknown): GitCommitEvent | null {
  if (!value || typeof value !== "object") return null;

  const payload = value as Record<string, unknown>;
  if (payload.type !== "git_commit" || !isNonEmptyString(payload.ticketKey)) {
    return null;
  }

  const logType =
    typeof payload.logType === "string" ? (payload.logType as WorkLogType) : "code";

  return {
    type: "git_commit",
    eventId: isNonEmptyString(payload.eventId) ? payload.eventId.trim() : undefined,
    ticketKey: payload.ticketKey.trim(),
    commitHash: isNonEmptyString(payload.commitHash) ? payload.commitHash.trim() : "",
    commitMessage: isNonEmptyString(payload.commitMessage)
      ? payload.commitMessage.trim()
      : "",
    description: isNonEmptyString(payload.description) ? payload.description.trim() : "",
    files: parseFiles(payload.files),
    logType,
    nextAction: isNonEmptyString(payload.nextAction) ? payload.nextAction.trim() : "",
    receivedAt: isNonEmptyString(payload.receivedAt)
      ? payload.receivedAt.trim()
      : new Date().toISOString(),
  };
}

export function isGitCommitEvent(value: unknown): value is GitCommitEvent {
  return parseGitCommitPayload(value) !== null;
}

export async function applyGitCommitEvent(
  db: SQLiteDatabase,
  event: GitCommitEvent,
): Promise<boolean> {
  const key = dedupeKey(event);
  if (processedKeys.has(key)) {
    return false;
  }

  const ticket = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM tickets WHERE ticket_key = ? COLLATE NOCASE",
    event.ticketKey.trim(),
  );

  if (!ticket) {
    console.warn(`Git commit ignored: no ticket found for ${event.ticketKey}.`);
    return false;
  }

  if (event.commitHash) {
    const existing = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM work_logs WHERE ticket_id = ? AND commit_hash = ?",
      ticket.id,
      event.commitHash,
    );
    if (existing) {
      processedKeys.add(key);
      return false;
    }
  }

  processedKeys.add(key);

  const now = event.receivedAt || new Date().toISOString();
  const description = event.description || event.commitMessage || "Git commit received.";
  const logType: WorkLogType = event.logType || "code";
  let inserted = false;

  await db.withTransactionAsync(async () => {
    if (event.commitHash) {
      const existingInTx = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM work_logs WHERE ticket_id = ? AND commit_hash = ?",
        ticket.id,
        event.commitHash,
      );
      if (existingInTx) {
        return;
      }
    }

    inserted = true;
    await db.runAsync(
      "INSERT INTO work_logs (ticket_id, type, description, what_remains, next_action, commit_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ticket.id,
      logType,
      description,
      "",
      event.nextAction || "",
      event.commitHash || "",
      now,
    );

    for (const filePath of event.files) {
      await db.runAsync(
        "INSERT INTO ticket_files (ticket_id, file_path, created_at) VALUES (?, ?, ?)",
        ticket.id,
        filePath,
        now,
      );
    }

    await db.runAsync(
      "UPDATE tickets SET next_action = CASE WHEN ? <> '' THEN ? ELSE next_action END, updated_at = ? WHERE id = ?",
      event.nextAction || "",
      event.nextAction || "",
      now,
      ticket.id,
    );
  });

  if (!inserted) {
    return false;
  }

  notifyGitCommitLogged(ticket.id);
  return true;
}
