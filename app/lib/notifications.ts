import api from "./axios";

export type PendingTicketNotificationItem = {
  id: number;
  ticket_key: string;
  title: string;
  status: string;
  short_summary?: string;
  project?: { name: string };
};

export type RecallNotification = {
  id: number;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  is_read: boolean;
  read_at: string | null;
  push_status: string;
  sent_at: string | null;
  created_at: string;
};

export function parsePendingTicketsData(
  data: unknown,
): PendingTicketNotificationItem[] {
  if (!data) return [];

  let parsed: unknown = data;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.filter(
    (item): item is PendingTicketNotificationItem =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as PendingTicketNotificationItem).id === "number" &&
      typeof (item as PendingTicketNotificationItem).ticket_key === "string",
  );
}

export async function listRecallNotifications() {
  const response = await api.get<{ notifications: RecallNotification[] }>(
    "/api/notifications",
  );
  return response.data.notifications;
}

export async function markRecallNotificationRead(id: number) {
  const response = await api.patch<{ notification: RecallNotification | null }>(
    `/api/notifications/${id}/read`,
  );
  return response.data.notification;
}
