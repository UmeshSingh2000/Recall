import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { port } from "./config/env.js";
import { registerRoutes } from "./routes/index.js";
import { setWebSocketServer } from "./services/broadcastService.js";

export { generateWithGroq } from "./services/groqService.js";

const app = express();
const server = createServer(app);
const webSocketServer = new WebSocketServer({ server });

setWebSocketServer(webSocketServer);

app.use(express.json());
registerRoutes(app);

server.listen(port, "0.0.0.0", () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
