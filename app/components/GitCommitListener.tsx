import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { BACKEND_URL } from "../lib/api";
import { applyGitCommitEvent, parseGitCommitPayload } from "../lib/gitCommitIngest";

const webSocketUrl = BACKEND_URL.replace(/^https/, "wss");

function ingestGitCommit(
  db: ReturnType<typeof useSQLiteContext>,
  payload: unknown,
) {
  const event = parseGitCommitPayload(payload);
  if (!event) return;

  applyGitCommitEvent(db, event).catch((error) =>
    console.warn("Unable to save Git commit log", error),
  );
}

export function GitCommitListener() {
  const db = useSQLiteContext();

  useEffect(() => {
    if (Platform.OS === "web") return;

    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        ingestGitCommit(db, notification.request.content.data);
      },
    );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        ingestGitCommit(db, response.notification.request.content.data);
      });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          ingestGitCommit(db, response.notification.request.content.data);
        }
      })
      .catch((error) => {
        console.warn("Unable to read last Git commit notification", error);
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [db]);

  useEffect(() => {
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | undefined;

    const connect = () => {
      if (disposed) return;
      socket = new WebSocket(webSocketUrl);
      socket.onmessage = (message) => {
        try {
          const event = parseGitCommitPayload(JSON.parse(message.data) as unknown);
          if (event) {
            applyGitCommitEvent(db, event).catch((error) =>
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
