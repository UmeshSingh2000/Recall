import crypto from "node:crypto";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeGitContext(payload) {
  const allowedLogTypes = new Set([
    "code",
    "bug_fix",
    "investigation",
    "testing",
    "refactoring",
    "documentation",
    "decision",
    "other",
  ]);

  return {
    type: "git_commit",
    eventId: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    repository: isNonEmptyString(payload.repository) ? payload.repository.trim() : "",
    ticketKey: payload.ticketKey.trim(),
    commitHash: isNonEmptyString(payload.commitHash) ? payload.commitHash.trim() : "",
    commitMessage: isNonEmptyString(payload.commitMessage) ? payload.commitMessage.trim() : "",
    description: isNonEmptyString(payload.description) ? payload.description.trim() : "",
    files: Array.isArray(payload.files)
      ? payload.files.filter((file) => isNonEmptyString(file)).map((file) => file.trim())
      : [],
    logType: allowedLogTypes.has(payload.type) ? payload.type : "code",
    nextAction: isNonEmptyString(payload.next_action) ? payload.next_action.trim() : "",
  };
}

export { isNonEmptyString };
