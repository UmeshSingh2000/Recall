import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post("/api/clipboard", (req, res) => {
  const { text } = req.body;

  if (typeof text !== "string") {
    return res.status(400).json({ error: "The request body must include a text string." });
  }

  console.log("Received clipboard text:");
  console.log(text);

  return res.status(200).json({ message: "Clipboard text received." });
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
