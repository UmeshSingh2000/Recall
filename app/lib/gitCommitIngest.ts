import { notifyGitCommitLogged } from "./gitCommitEvents";
import type { WorkLogType } from "../types";
import { applyGitCommit } from "./workspace";
import { store } from "../store";
import { invalidateTicket } from "../store/workspaceSlice";

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

export async function applyGitCommitEvent(event: GitCommitEvent): Promise<boolean> {
  const key = dedupeKey(event);
  if (processedKeys.has(key)) {
    return false;
  }
  processedKeys.add(key);

  try {
    const result = await applyGitCommit({
      ticketKey: event.ticketKey,
      commitHash: event.commitHash,
      commitMessage: event.commitMessage,
      description: event.description,
      files: event.files,
      logType: event.logType || "code",
      nextAction: event.nextAction,
      receivedAt: event.receivedAt,
    });
    if (!result.applied || result.ticketId == null) {
      return false;
    }
    store.dispatch(invalidateTicket(result.ticketId));
    notifyGitCommitLogged(result.ticketId);
    return true;
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status !== 404) {
      processedKeys.delete(key);
    }
    throw error;
  }
}
