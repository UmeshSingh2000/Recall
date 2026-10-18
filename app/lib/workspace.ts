import type { ProgressItem, Project, Ticket, TicketFile, TicketNote, WorkLog, WorkSession } from "../types";
import api from "./axios";
import { parseBackup, type RecallBackup } from "./backup";

export async function listProjects() {
  const response = await api.get<{ projects: Project[] }>("/api/projects");
  return response.data.projects;
}

export async function createProject(input: { name: string; description: string; repository_url: string }) {
  const response = await api.post<{ id: number }>("/api/projects", input);
  return response.data.id;
}

export async function updateProject(
  id: number,
  input: Partial<Pick<Project, "name" | "description" | "repository_url">>,
) {
  const response = await api.patch<{ project: Project }>(`/api/projects/${id}`, input);
  return response.data.project;
}

export async function getProject(id: number) {
  const response = await api.get<{ project: Project; tickets: Ticket[] }>(`/api/projects/${id}`);
  return response.data;
}

export async function deleteProject(id: number) {
  await api.delete(`/api/projects/${id}`);
}

export async function listTickets() {
  const response = await api.get<{ tickets: Ticket[] }>("/api/tickets");
  return response.data.tickets;
}

export async function createTicket(input: {
  project_id: number;
  ticket_key: string;
  title: string;
  description: string;
  next_action: string;
}) {
  const response = await api.post<{ id: number }>("/api/tickets", input);
  return response.data.id;
}

export type TicketDetail = {
  ticket: Ticket;
  progress: ProgressItem[];
  logs: WorkLog[];
  files: TicketFile[];
  notes: TicketNote[];
  sessions: WorkSession[];
  project: Pick<Project, "name" | "description" | "repository_url"> | null;
};

export async function getTicket(id: number) {
  const response = await api.get<TicketDetail>(`/api/tickets/${id}`);
  return response.data;
}

export async function updateTicket(id: number, input: Partial<Ticket> & { completed_at?: string | null }) {
  const response = await api.patch<{ ticket: Ticket }>(`/api/tickets/${id}`, input);
  return response.data.ticket;
}

export async function deleteTicket(id: number) {
  await api.delete(`/api/tickets/${id}`);
}

export async function logProgress(
  ticketId: number,
  input: {
    type: string;
    description: string;
    what_remains: string;
    next_action: string;
    commit_hash: string;
    files: string[];
  },
) {
  await api.post(`/api/tickets/${ticketId}/logs`, input);
}

export async function pauseTicket(
  ticketId: number,
  input: {
    summary: string;
    what_remains: string;
    next_action: string;
    pause_reason: string;
  },
) {
  await api.post(`/api/tickets/${ticketId}/pause`, input);
}

export type WorkLogDetail = WorkLog & {
  ticket_key: string;
  ticket_title: string;
  ticket_description: string;
  ticket_status: Ticket["status"];
  ticket_next_action: string;
  project_name: string;
  project_description: string;
  repository_url: string;
};

export async function getWorkLog(id: number) {
  const response = await api.get<{ log: WorkLogDetail; files: TicketFile[] }>(`/api/logs/${id}`);
  return response.data;
}

export async function deleteWorkLog(id: number) {
  await api.delete(`/api/logs/${id}`);
}

export async function searchWorkspace(query: string) {
  const response = await api.get<{ results: (Ticket & { logs: WorkLog[] })[] }>("/api/search", {
    params: { q: query },
  });
  return response.data.results;
}

export async function applyGitCommit(event: {
  ticketKey: string;
  commitHash: string;
  commitMessage: string;
  description: string;
  files: string[];
  logType: string;
  nextAction: string;
  receivedAt: string;
}) {
  const response = await api.post<{ applied: boolean; ticketId?: number }>("/api/git-commits", event);
  return response.data;
}

export async function exportOnlineBackup() {
  const response = await api.get<unknown>("/api/export");
  return parseBackup(response.data);
}

export async function importOnlineBackup(backup: RecallBackup) {
  await api.post("/api/import", backup);
}

export async function deleteAllOnlineData() {
  await api.delete("/api/data");
}
