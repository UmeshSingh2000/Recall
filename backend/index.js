import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const app = express();
const port = process.env.PORT || 3000;
const server = createServer(app);
const webSocketServer = new WebSocketServer({ server });
const pushTokens = new Set();

app.use(express.json());

function broadcastClipboard(text) {
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

async function sendPushNotifications(text, receivedAt) {
  if (pushTokens.size === 0) return;

  const messages = [...pushTokens].map((token) => ({
    to: token,
    title: "New clipboard text",
    body: text.length > 180 ? `${text.slice(0, 177)}...` : text,
    sound: "clipboard.wav",
    channelId: "clipboard-v2",
    data: { type: "clipboard", text, receivedAt },
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo Push Service responded with ${response.status}`);
  }

  const result = await response.json();
  result.data?.forEach((ticket, index) => {
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      pushTokens.delete(messages[index].to);
    }
  });
}

app.get('/', (req, res) => {
  return res.json({
    message: "All System up and running!",
    status: 200
  })
})

app.post("/api/push-token", (req, res) => {
  const { token } = req.body;

  if (typeof token !== "string" || !token.startsWith("ExpoPushToken[")) {
    return res.status(400).json({ error: "The request body must include a valid Expo push token." });
  }

  pushTokens.add(token);
  return res.status(204).send();
});

app.post("/api/clipboard", (req, res) => {
  const { text } = req.body;

  if (typeof text !== "string") {
    return res.status(400).json({ error: "The request body must include a text string." });
  }

  broadcastClipboard(text);

  return res.status(200).json({ message: "Clipboard text received." });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
