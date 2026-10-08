import { broadcastClipboard } from "../services/broadcastService.js";

export function receiveClipboard(req, res) {

  const { text } = req.body;

  if (typeof text !== "string") {
    return res.status(400).json({ error: "The request body must include a text string." });
  }

  broadcastClipboard(text);

  return res.status(200).json({ message: "Clipboard text received." });
}
