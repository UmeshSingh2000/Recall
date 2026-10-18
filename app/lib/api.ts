import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import type {
  ProgressItem,
  Project,
  Ticket,
  TicketFile,
  TicketNote,
  WorkLog,
  WorkSession,
} from "../types";
import { getAuthJWT } from "./neon";

const configuredBackendUrl = Constants.expoConfig?.extra?.backendUrl;

if (typeof configuredBackendUrl !== "string" || !configuredBackendUrl.trim()) {
  throw new Error("BACKEND_URL is not configured.");
}

export const BACKEND_URL = configuredBackendUrl.replace(/\/+$/, "");

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

export async function getAuthToken() {
  const token = await getAuthJWT();
  if (!token?.trim()) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const freshToken = token.trim();
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, freshToken);
  return freshToken;
}

export async function generateTicketSummary(payload: GenerateSummaryPayload) {
  const authToken = await getAuthToken();
  const response = await fetch(`${BACKEND_URL}/api/generate-summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
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
  const authToken = await getAuthToken();
  const response = await fetch(`${BACKEND_URL}/api/generate-log-summary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
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

const AUTH_TOKEN_KEY = "recall.auth_token";

export async function hasAuthToken() {
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  return Boolean(token?.trim());
}

export async function clearAuthToken() {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export async function saveAuthToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) {
    await clearAuthToken();
    return;
  }
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, trimmed);
}
