import * as SecureStore from "expo-secure-store";
import type {
  ProgressItem,
  Project,
  Ticket,
  TicketFile,
  TicketNote,
  WorkLog,
  WorkSession,
} from "../types";

export const BACKEND_URL = "https://recall-en47.onrender.com";

const API_TOKEN_KEY = "recall.api_token";

export type GenerateSummaryPayload = {
  ticket: Ticket & {
    project_id?: number;
    due_date?: string | null;
    created_at?: string;
    completed_at?: string | null;
  };
  project?: Pick<Project, "name" | "description" | "repository_url"> | null;
  progress_items?: ProgressItem[];
  work_logs?: WorkLog[];
  ticket_files?: TicketFile[];
  ticket_notes?: TicketNote[];
  work_sessions?: WorkSession[];
};

export async function hasApiToken() {
  const token = await SecureStore.getItemAsync(API_TOKEN_KEY);
  return Boolean(token?.trim());
}

export async function saveApiToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) {
    await SecureStore.deleteItemAsync(API_TOKEN_KEY);
    return;
  }

  await SecureStore.setItemAsync(API_TOKEN_KEY, trimmed);
}

export async function clearApiToken() {
  await SecureStore.deleteItemAsync(API_TOKEN_KEY);
}

async function getApiToken() {
  const token = await SecureStore.getItemAsync(API_TOKEN_KEY);
  if (!token?.trim()) {
    throw new Error("Add your Recall API token in Settings before summarizing tickets.");
  }

  return token.trim();
}

export async function generateTicketSummary(payload: GenerateSummaryPayload) {
  const token = await getApiToken();
  const response = await fetch(`${BACKEND_URL}/api/generate-summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof result?.error === "string"
        ? result.error
        : `The summary service responded with ${response.status}.`;
    throw new Error(message);
  }

  if (!result?.summary || typeof result.summary !== "string") {
    throw new Error("The summary service returned an invalid response.");
  }

  return result.summary.trim();
}

export type GenerateLogSummaryPayload = {
  log: WorkLog;
  ticket: Pick<Ticket, "ticket_key" | "title" | "description" | "status" | "next_action">;
  project?: Pick<Project, "name" | "description" | "repository_url"> | null;
};

export async function generateLogSummary(payload: GenerateLogSummaryPayload) {
  const token = await getApiToken();
  const response = await fetch(`${BACKEND_URL}/api/generate-log-summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof result?.error === "string"
      ? result.error
      : `The summary service responded with ${response.status}.`;
    throw new Error(message);
  }

  if (!result?.summary || typeof result.summary !== "string") {
    throw new Error("The summary service returned an invalid response.");
  }

  return result.summary.trim();
}
