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

export type ChatSession = {
  id: string;
  title: string;
  preview: string;
  ticket_ids: number[];
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  created_at: string;
  updated_at: string;
};

export async function streamChatWithTickets(
  payload: { message: string; ticket_ids: number[] },
  onChunk: (content: string) => void,
) {
  const authToken = await getAuthToken();
  const response = await fetch(`${BACKEND_URL}/api/chat-tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : `The chat service responded with ${response.status}.`,
    );
  }

  if (!response.body) {
    throw new Error("The chat service did not provide a response stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const event of events) {
        const data = event
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("");
        if (!data) continue;
        const parsed = JSON.parse(data) as { content?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.content) onChunk(parsed.content);
        if (event.startsWith("event: done")) completed = true;
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      const data = buffer
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("");
      if (data) {
        const parsed = JSON.parse(data) as { content?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.content) onChunk(parsed.content);
      }
    }
    if (!completed) throw new Error("The chat stream ended unexpectedly.");
  } finally {
    reader.releaseLock();
  }
}

async function chatSessionRequest(path: string, method: "GET" | "POST" | "PATCH", body?: object) {
  const authToken = await getAuthToken();
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + authToken,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof result?.error === "string" ? result.error : "Chat history request failed.");
  }
  return result;
}

export async function listChatSessions() {
  const result = await chatSessionRequest("/api/chat-sessions", "GET");
  return result.sessions as ChatSession[];
}

export async function createChatSession(input: { title: string; ticket_ids?: number[] }) {
  const result = await chatSessionRequest("/api/chat-sessions", "POST", input);
  return result.session as ChatSession;
}

export async function updateChatSession(id: string, input: Partial<Pick<ChatSession, "title" | "preview" | "ticket_ids" | "messages">>) {
  const result = await chatSessionRequest(`/api/chat-sessions/${id}`, "PATCH", input);
  return result.session as ChatSession;
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
