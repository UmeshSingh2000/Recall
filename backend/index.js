import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const app = express();
const port = process.env.PORT || 3000;
const server = createServer(app);
const webSocketServer = new WebSocketServer({ server });

app.use(express.json());

function broadcastClipboard(text) {
  const message = JSON.stringify({
    type: "clipboard",
    text,
    receivedAt: new Date().toISOString(),
  });

  webSocketServer.clients.forEach((client) => {
    if (client.readyState === 1) {
      console.log("sending text to app", message)
      client.send(message);
    }
  });
}

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
