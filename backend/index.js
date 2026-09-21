import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import crypto from "node:crypto";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config({ path: new URL(".env", import.meta.url) });

const app = express();
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const port = process.env.PORT || 3000;
const server = createServer(app);
const webSocketServer = new WebSocketServer({ server });
const pushTokens = new Set();
const apiToken = process.env.RECALL_API_TOKEN;

if (!apiToken) {
  throw new Error("RECALL_API_TOKEN is not configured");
}

app.use(express.json());

function requireApiToken(req, res, next) {
  const authorization = req.get("Authorization") || "";
  const suppliedToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const expected = Buffer.from(apiToken);
  const supplied = Buffer.from(suppliedToken);

  if (
    expected.length !== supplied.length ||
    !crypto.timingSafeEqual(expected, supplied)
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

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

function broadcast(message) {
  const serialized = JSON.stringify(message);

  webSocketServer.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(serialized);
    }
  });
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeGitContext(payload) {
  const allowedLogTypes = new Set([
    "code",
    "bug_fix",
    "investigation",
    "testing",
    "refactoring",
    "documentation",
    "decision",
    "other",
  ]);

  return {
    type: "git_commit",
    eventId: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    repository: isNonEmptyString(payload.repository) ? payload.repository.trim() : "",
    ticketKey: payload.ticketKey.trim(),
    commitHash: isNonEmptyString(payload.commitHash) ? payload.commitHash.trim() : "",
    commitMessage: isNonEmptyString(payload.commitMessage) ? payload.commitMessage.trim() : "",
    description: isNonEmptyString(payload.description) ? payload.description.trim() : "",
    files: Array.isArray(payload.files)
      ? payload.files.filter((file) => isNonEmptyString(file)).map((file) => file.trim())
      : [],
    logType: allowedLogTypes.has(payload.type) ? payload.type : "code",
    nextAction: isNonEmptyString(payload.next_action) ? payload.next_action.trim() : "",
  };
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
  const result = await response.json();


  if (!response.ok) {
    throw new Error(`Expo Push Service responded with ${response.status}: ${JSON.stringify(result)}`);
  }

  result.data?.forEach((ticket, index) => {
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      pushTokens.delete(messages[index].to);
    }
    if (ticket.status === "error") {
      console.error("Expo push ticket error", {
        token: messages[index].to,
        message: ticket.message,
        details: ticket.details,
      });
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
  if (typeof token !== "string" || !token.startsWith("ExponentPushToken[")) {
    return res.status(400).json({ error: "The request body must include a valid Expo push token." });
  }
  pushTokens.add(token);
  return res.status(204).send();
});

app.post("/api/clipboard", requireApiToken, (req, res) => {

  const { text } = req.body;

  if (typeof text !== "string") {
    return res.status(400).json({ error: "The request body must include a text string." });
  }

  broadcastClipboard(text);

  return res.status(200).json({ message: "Clipboard text received." });
});

// Receives the context emitted by the local Git socket script. Ticket data lives
// on each device, so the backend validates and relays this event to connected apps.
app.post("/api/git/commit", requireApiToken, (req, res) => {
  if (!req.body || !isNonEmptyString(req.body.ticketKey)) {
    return res.status(400).json({
      error: "The request body must include a non-empty ticketKey.",
    });
  }

  const gitCommit = normalizeGitContext(req.body);
  broadcast(gitCommit);

  return res.status(202).json({
    message: "Git commit received and sent to connected apps.",
    eventId: gitCommit.eventId,
    receivedAt: gitCommit.receivedAt,
  });
});

export async function generateWithGroq(messages) {
  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages,
    temperature: 0.2,
  });

  return completion.choices[0]?.message?.content ?? "";
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function appendTextField(sections, label, value) {
  if (hasText(value)) {
    sections.push(`${label}:\n${value.trim()}`);
  }
}

function appendScalarField(sections, label, value) {
  if (value !== undefined && value !== null && value !== "") {
    sections.push(`${label}: ${value}`);
  }
}

function formatTimestamp(value) {
  return hasText(value) ? value.trim() : null;
}

function buildTicketSummaryPrompt(payload) {
  const ticket = payload.ticket ?? payload;
  const project = payload.project ?? ticket.project ?? null;
  const progressItems = payload.progress_items ?? ticket.progress_items ?? [];
  const workLogs = payload.work_logs ?? ticket.work_logs ?? [];
  const ticketFiles = payload.ticket_files ?? ticket.ticket_files ?? [];
  const ticketNotes = payload.ticket_notes ?? ticket.ticket_notes ?? [];
  const workSessions = payload.work_sessions ?? ticket.work_sessions ?? [];
  const sections = [];

  appendScalarField(sections, "Ticket ID", ticket.id);
  appendTextField(sections, "Ticket key", ticket.ticket_key);
  appendTextField(sections, "Title", ticket.title);
  appendTextField(sections, "Description", ticket.description);
  appendScalarField(sections, "Status", ticket.status);
  appendScalarField(sections, "Priority", ticket.priority);

  const dueDate = formatTimestamp(ticket.due_date);
  if (dueDate) sections.push(`Due date: ${dueDate}`);

  const createdAt = formatTimestamp(ticket.created_at);
  if (createdAt) sections.push(`Created at: ${createdAt}`);

  const updatedAt = formatTimestamp(ticket.updated_at);
  if (updatedAt) sections.push(`Updated at: ${updatedAt}`);

  const completedAt = formatTimestamp(ticket.completed_at);
  if (completedAt) sections.push(`Completed at: ${completedAt}`);

  appendTextField(sections, "What is this feature?", ticket.my_context);
  appendTextField(sections, "Why am I implementing it?", ticket.why_implementing);
  appendTextField(sections, "How does it work?", ticket.how_it_works);
  appendTextField(sections, "Important decisions", ticket.important_decisions);
  appendTextField(sections, "Next action", ticket.next_action);

  if (project && typeof project === "object") {
    const projectLines = [];
    const projectName = project.name ?? ticket.project_name;
    if (projectName) projectLines.push(`Project name: ${projectName}`);
    if (hasText(project.description)) {
      projectLines.push(`Project description:\n${project.description.trim()}`);
    }
    if (project.repository_url) {
      projectLines.push(`Repository URL: ${project.repository_url}`);
    }
    if (projectLines.length > 0) {
      sections.push(projectLines.join("\n"));
    }
  } else {
    appendTextField(sections, "Project", ticket.project_name);
  }

  if (Array.isArray(progressItems) && progressItems.length > 0) {
    const items = progressItems
      .map((item, index) => {
        const lines = [`${index + 1}. [${item.completed ? "done" : "open"}] ${item.content}`];
        const itemCreatedAt = formatTimestamp(item.created_at);
        if (itemCreatedAt) lines.push(`   Created at: ${itemCreatedAt}`);
        const itemCompletedAt = formatTimestamp(item.completed_at);
        if (itemCompletedAt) lines.push(`   Completed at: ${itemCompletedAt}`);
        return lines.join("\n");
      })
      .join("\n");
    sections.push(`Progress items:\n${items}`);
  }

  if (Array.isArray(workLogs) && workLogs.length > 0) {
    const logs = workLogs
      .map((log, index) => {
        const lines = [`${index + 1}. Type: ${log.type}`];
        const logCreatedAt = formatTimestamp(log.created_at);
        if (logCreatedAt) lines.push(`   Created at: ${logCreatedAt}`);
        if (hasText(log.description)) lines.push(`   Description: ${log.description.trim()}`);
        if (hasText(log.what_remains)) lines.push(`   What remains: ${log.what_remains.trim()}`);
        if (hasText(log.next_action)) lines.push(`   Next action: ${log.next_action.trim()}`);
        if (hasText(log.commit_hash)) lines.push(`   Commit hash: ${log.commit_hash.trim()}`);
        return lines.join("\n");
      })
      .join("\n");
    sections.push(`Work logs:\n${logs}`);
  }

  if (Array.isArray(ticketFiles) && ticketFiles.length > 0) {
    const files = ticketFiles
      .map((file, index) => {
        const lines = [`${index + 1}. ${file.file_path}`];
        const fileCreatedAt = formatTimestamp(file.created_at);
        if (fileCreatedAt) lines.push(`   Added at: ${fileCreatedAt}`);
        return lines.join("\n");
      })
      .join("\n");
    sections.push(`Related files:\n${files}`);
  }

  if (Array.isArray(ticketNotes) && ticketNotes.length > 0) {
    const notes = ticketNotes
      .map((note, index) => {
        const lines = [`${index + 1}. ${note.content}`];
        const noteCreatedAt = formatTimestamp(note.created_at);
        if (noteCreatedAt) lines.push(`   Created at: ${noteCreatedAt}`);
        const noteUpdatedAt = formatTimestamp(note.updated_at);
        if (noteUpdatedAt) lines.push(`   Updated at: ${noteUpdatedAt}`);
        return lines.join("\n");
      })
      .join("\n");
    sections.push(`Notes:\n${notes}`);
  }

  if (Array.isArray(workSessions) && workSessions.length > 0) {
    const sessions = workSessions
      .map((session, index) => {
        const lines = [`${index + 1}. Work session`];
        const startedAt = formatTimestamp(session.started_at);
        if (startedAt) lines.push(`   Started at: ${startedAt}`);
        const pausedAt = formatTimestamp(session.paused_at);
        if (pausedAt) lines.push(`   Paused at: ${pausedAt}`);
        const endedAt = formatTimestamp(session.ended_at);
        if (endedAt) lines.push(`   Ended at: ${endedAt}`);
        if (hasText(session.pause_reason)) lines.push(`   Pause reason: ${session.pause_reason.trim()}`);
        if (hasText(session.summary)) lines.push(`   Summary: ${session.summary.trim()}`);
        if (hasText(session.next_action)) lines.push(`   Next action: ${session.next_action.trim()}`);
        return lines.join("\n");
      })
      .join("\n");
    sections.push(`Work sessions:\n${sessions}`);
  }

  return sections.join("\n\n");
}

app.post("/api/generate-summary", requireApiToken, async (req, res) => {
  const { ticket, project, progress_items, work_logs, ticket_files, ticket_notes, work_sessions } =
    req.body;

  if (!ticket || typeof ticket !== "object") {
    return res.status(400).json({
      error: "The request body must include a ticket object.",
    });
  }

  if (typeof ticket.title !== "string" || !ticket.title.trim()) {
    return res.status(400).json({
      error: "The ticket must include a non-empty title.",
    });
  }

  const ticketContext = buildTicketSummaryPrompt({
    ticket,
    project,
    progress_items,
    work_logs,
    ticket_files,
    ticket_notes,
    work_sessions,
  });

  if (!ticketContext.trim()) {
    return res.status(400).json({
      error: "The ticket does not contain enough information to summarize.",
    });
  }

  try {
    const summary = await generateWithGroq([
      {
        role: "system",
        content:
          "You summarize engineering tickets for a developer returning to work after a break. " +
          "Write a concise, practical summary in plain language. " +
          "Cover what the ticket is about, current state, key decisions, and what to do next. " +
          "Use short paragraphs or bullet points. Do not invent details that are not in the ticket.",
      },
      {
        role: "user",
        content: `Summarize this ticket:\n\n${ticketContext}`,
      },
    ]);

    if (!summary.trim()) {
      return res.status(502).json({ error: "Failed to generate a summary." });
    }

    return res.status(200).json({ summary });
  } catch (error) {
    console.error("Failed to generate ticket summary:", error.message);
    return res.status(502).json({ error: "Failed to generate a summary." });
  }
});

app.post("/api/generate-log-summary", requireApiToken, async (req, res) => {
  const { log, ticket, project } = req.body;

  if (!log || typeof log !== "object" || !ticket || typeof ticket !== "object") {
    return res.status(400).json({ error: "The request body must include log and ticket objects." });
  }
  if (typeof log.description !== "string" || !log.description.trim()) {
    return res.status(400).json({ error: "The log must include a non-empty description." });
  }

  const context = [
    `Log type: ${log.type ?? "other"}`,
    `Created at: ${log.created_at ?? "unknown"}`,
    `What happened: ${log.description.trim()}`,
    log.what_remains ? `What remains: ${log.what_remains}` : "",
    log.next_action ? `Next action: ${log.next_action}` : "",
    log.commit_hash ? `Commit: ${log.commit_hash}` : "",
    `Ticket: ${ticket.ticket_key ?? ""} - ${ticket.title ?? ""}`,
    ticket.description ? `Ticket description: ${ticket.description}` : "",
    ticket.status ? `Ticket status: ${ticket.status}` : "",
    ticket.next_action ? `Ticket next action: ${ticket.next_action}` : "",
    project?.name ? `Project: ${project.name}` : "",
    project?.description ? `Project description: ${project.description}` : "",
  ].filter(Boolean).join("\n");

  try {
    const summary = await generateWithGroq([
      {
        role: "system",
        content: "You summarize an engineering work log for a developer returning to the task. Write a concise practical summary of what changed, why it matters, what remains, and the next action. Use short paragraphs or bullet points. Do not invent details.",
      },
      { role: "user", content: `Summarize this work log:\n\n${context}` },
    ]);
    if (!summary.trim()) return res.status(502).json({ error: "Failed to generate a summary." });
    return res.status(200).json({ summary });
  } catch (error) {
    console.error("Failed to generate log summary:", error.message);
    return res.status(502).json({ error: "Failed to generate a summary." });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
