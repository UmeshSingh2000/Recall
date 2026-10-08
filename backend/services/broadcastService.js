import { sendPushNotifications } from "./pushNotificationService.js";

let webSocketServer;

export function setWebSocketServer(server) {
  webSocketServer = server;
}

export function broadcastClipboard(text) {
  const receivedAt = new Date().toISOString();
  const message = JSON.stringify({
    type: "clipboard",
    text,
    receivedAt,
  });

  webSocketServer.clients.forEach((client) => {
    if (client.readyState === 1) {
      console.log("sending text to app", message)
      client.send(message);
    }
  });
  sendPushNotifications(text, receivedAt).catch((error) => {
    console.error("Failed to send push notifications:", error.message);
  });
}

export function broadcast(message) {
  const serialized = JSON.stringify(message);

  webSocketServer.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(serialized);
    }
  });
}
