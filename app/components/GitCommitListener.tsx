import { useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { BACKEND_URL } from "../lib/api";
import { notifyGitCommitLogged } from "../lib/gitCommitEvents";
import type { WorkLogType } from "../types";

type GitCommitEvent = {
  type: "git_commit";
  ticketKey: string;
  commitHash: string;
  commitMessage: string;
  description: string;
  files: string[];
  logType: WorkLogType;
  nextAction: string;
  receivedAt: string;
};

const webSocketUrl = BACKEND_URL.replace(/^https/, "wss");

function isGitCommitEvent(value: unknown): value is GitCommitEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<GitCommitEvent>;
  return event.type === "git_commit" && typeof event.ticketKey === "string";
}

export function GitCommitListener() {
  const db = useSQLiteContext();

  useEffect(() => {
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | undefined;

    const addGitCommitLog = async (event: GitCommitEvent) => {
      const ticket = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM tickets WHERE ticket_key = ? COLLATE NOCASE",
        event.ticketKey.trim(),
      );

      if (!ticket) {
        console.warn(`Git commit ignored: no ticket found for ${event.ticketKey}.`);
        return;
      }

      // A reconnect or sender retry must not create a second log for one commit.
      if (event.commitHash) {
        const existing = await db.getFirstAsync<{ id: number }>(
          "SELECT id FROM work_logs WHERE ticket_id = ? AND commit_hash = ?",
          ticket.id,
          event.commitHash,
        );
        if (existing) return;
      }

      const now = event.receivedAt || new Date().toISOString();
      const description = event.description || event.commitMessage || "Git commit received.";
      const logType: WorkLogType = event.logType || "code";

      await db.withTransactionAsync(async () => {
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

        for (const filePath of event.files || []) {
          if (typeof filePath === "string" && filePath.trim()) {
            await db.runAsync(
              "INSERT INTO ticket_files (ticket_id, file_path, created_at) VALUES (?, ?, ?)",
              ticket.id,
              filePath.trim(),
              now,
            );
          }
        }

        await db.runAsync(
          "UPDATE tickets SET next_action = CASE WHEN ? <> '' THEN ? ELSE next_action END, updated_at = ? WHERE id = ?",
          event.nextAction || "",
          event.nextAction || "",
          now,
          ticket.id,
        );
      });

      notifyGitCommitLogged(ticket.id);
    };

    const connect = () => {
      if (disposed) return;
      socket = new WebSocket(webSocketUrl);
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as unknown;
          if (isGitCommitEvent(event)) {
            addGitCommitLog(event).catch((error) =>
              console.warn("Unable to save Git commit log", error),
            );
          }
        } catch {
          // Ignore malformed WebSocket messages.
        }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        if (!disposed) retryTimer = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [db]);

  return null;
}
