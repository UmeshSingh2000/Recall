import prisma from "../config/prisma.js";
import { getTicketObjectText } from "../config/objectStorage.js";
import { streamWithGroq } from "../services/groqService.js";
import {
  getAuthUserId,
  ticketsOwnedByUserWhere,
} from "../services/workspaceAuth.js";

function serializeChatSession(session) {
  return {
    id: String(session.id),
    title: session.title,
    preview: session.preview,
    ticket_ids: session.ticket_ids,
    messages: session.messages,
    created_at: session.created_at,
    updated_at: session.updated_at,
  };
}

export async function listChatSessions(req, res) {
  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return;
    const sessions = await prisma.chatSession.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: "desc" },
      take: 100,
    });
    return res.status(200).json({ sessions: sessions.map(serializeChatSession) });
  } catch (error) {
    console.error("Failed to list chat sessions:", error);
    return res.status(500).json({ error: "Could not load chat history." });
  }
}

export async function createChatSession(req, res) {
  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return;
    const { title, ticket_ids: ticketIds } = req.body ?? {};
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "A chat title is required." });
    }
    const session = await prisma.chatSession.create({
      data: {
        user_id: userId,
        title: title.trim(),
        ticket_ids: Array.isArray(ticketIds) ? ticketIds : [],
      },
    });
    return res.status(201).json({ session: serializeChatSession(session) });
  } catch (error) {
    console.error("Failed to create chat session:", error);
    return res.status(500).json({ error: "Could not create chat session." });
  }
}

export async function updateChatSession(req, res) {
  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return;
    const id = Number(req.params.id);
    const { title, preview, ticket_ids: ticketIds, messages } = req.body ?? {};
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid chat session." });
    }
    const existing = await prisma.chatSession.findFirst({ where: { id, user_id: userId } });
    if (!existing) return res.status(404).json({ error: "Chat session not found." });

    const session = await prisma.chatSession.update({
      where: { id },
      data: {
        ...(typeof title === "string" ? { title: title.trim() } : {}),
        ...(typeof preview === "string" ? { preview } : {}),
        ...(Array.isArray(ticketIds) ? { ticket_ids: ticketIds } : {}),
        ...(Array.isArray(messages) ? { messages } : {}),
        updated_at: new Date(),
      },
    });
    return res.status(200).json({ session: serializeChatSession(session) });
  } catch (error) {
    console.error("Failed to update chat session:", error);
    return res.status(500).json({ error: "Could not update chat session." });
  }
}

function formatTicket(ticket, diffContents) {
  const lines = [
    `Ticket: ${ticket.ticket_key}`,
    `Title: ${ticket.title}`,
    `Description: ${ticket.description || "(none)"}`,
    `Status: ${ticket.status}`,
    `Priority: ${ticket.priority}`,
    `Due date: ${ticket.due_date?.toISOString() || "(none)"}`,
    `Created at: ${ticket.created_at.toISOString()}`,
    `Updated at: ${ticket.updated_at.toISOString()}`,
    `Completed at: ${ticket.completed_at?.toISOString() || "(not completed)"}`,
    `Next action: ${ticket.next_action || "(none)"}`,
    `My context: ${ticket.my_context || "(none)"}`,
    `Why implementing: ${ticket.why_implementing || "(none)"}`,
    `How it works: ${ticket.how_it_works || "(none)"}`,
    `Important decisions: ${ticket.important_decisions || "(none)"}`,
    `Summary: ${ticket.summary || "(none)"}`,
    `Images: ${ticket.images.length ? ticket.images.join(", ") : "(none)"}`,
    `Project: ${ticket.project.name}`,
    `Project description: ${ticket.project.description || "(none)"}`,
    `Repository: ${ticket.project.repository_url || "(none)"}`,
    "",
    "Progress:",
    ...ticket.progress_items.map((item) => `- [${item.completed ? "x" : " "}] ${item.content}`),
    "",
    "Work logs:",
    ...ticket.work_logs.map((log) =>
      `- ${log.created_at.toISOString()} [${log.type}] ${log.description}\n  Remains: ${log.what_remains || "(none)"}\n  Next action: ${log.next_action || "(none)"}\n  Commit: ${log.commit_hash || "(none)"}`,
    ),
    "",
    "Tracked files:",
    ...ticket.ticket_files.map((file) => `- ${file.file_path}`),
    "",
    "Notes:",
    ...ticket.ticket_notes.map((note) => `- ${note.updated_at.toISOString()}: ${note.content}`),
    "",
    "Work sessions:",
    ...ticket.work_sessions.map((session) =>
      `- ${session.started_at.toISOString()} to ${session.ended_at?.toISOString() || "ongoing"}: ${session.summary || "(no summary)"}\n  Pause reason: ${session.pause_reason || "(none)"}\n  Next action: ${session.next_action || "(none)"}`,
    ),
    "",
    "Diffs and diff files:",
  ];

  for (const diff of ticket.ticket_diffs) {
    lines.push(
      `--- ${diff.file_name} (${diff.file_size} bytes) ---`,
      `Created at: ${diff.created_at.toISOString()}`,
      `Commit: ${diff.commit_sha || "(none)"}`,
      `Description: ${diff.description || "(none)"}`,
      diffContents.get(diff.object_key) || "(empty diff)",
    );
    for (const file of diff.files) {
      lines.push(
        `--- Changed file: ${file.file_path} (${file.file_size} bytes) ---`,
        diffContents.get(file.object_key) || "(empty file)",
      );
    }
  }

  return lines.join("\n");
}

export async function chatWithTickets(req, res) {
  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { message, ticket_ids: ticketIds } = req.body ?? {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "A non-empty message is required." });
    }
    if (
      !Array.isArray(ticketIds) ||
      ticketIds.length === 0 ||
      ticketIds.some((id) => !Number.isInteger(id) || id <= 0)
    ) {
      return res.status(400).json({ error: "At least one valid ticket is required." });
    }

    const tickets = await prisma.ticket.findMany({
      where: { id: { in: [...new Set(ticketIds)] }, ...ticketsOwnedByUserWhere(userId) },
      include: {
        project: { select: { name: true, description: true, repository_url: true } },
        progress_items: { orderBy: { position: "asc" } },
        work_logs: { orderBy: { created_at: "asc" } },
        ticket_files: { orderBy: { created_at: "asc" } },
        ticket_notes: { orderBy: { updated_at: "asc" } },
        work_sessions: { orderBy: { started_at: "asc" } },
        ticket_diffs: {
          orderBy: { created_at: "asc" },
          include: { files: { orderBy: { file_path: "asc" } } },
        },
      },
    });

    if (tickets.length !== new Set(ticketIds).size) {
      return res.status(404).json({ error: "One or more tickets could not be found." });
    }

    const diffContents = new Map();
    await Promise.all(
      tickets.flatMap((ticket) =>
        ticket.ticket_diffs.flatMap((diff) => [
          getTicketObjectText(diff.object_key, ticket.id).then((content) =>
            diffContents.set(diff.object_key, content),
          ),
          ...diff.files.map((file) =>
            getTicketObjectText(file.object_key, ticket.id).then((content) =>
              diffContents.set(file.object_key, content),
            ),
          ),
        ]),
      ),
    );

    const context = tickets
      .map((ticket) => formatTicket(ticket, diffContents))
      .join("\n\n======== NEXT TICKET ========\n\n");
    const messages = [
      {
        role: "system",
        content:
          "You are an engineering ticket assistant. Answer the user's question using only the supplied ticket context. " +
          "You have access to the complete ticket history and uploaded diffs/files. Be precise, practical, and concise. " +
          "If the context does not contain the answer, say so instead of inventing details.",
      },
      {
        role: "user",
        content: `Ticket context:\n\n${context}\n\nUser question:\n${message.trim()}`,
      },
    ];

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const stream = await streamWithGroq(messages);
    let hasContent = false;
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (typeof content !== "string" || !content) continue;
      hasContent = true;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }

    if (!hasContent) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "The chat service returned an empty response." })}\n\n`);
    } else {
      res.write("event: done\ndata: {}\n\n");
    }
    return res.end();
  } catch (error) {
    console.error("Failed to chat with tickets:", error?.stack || error);
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error?.message || "Failed to generate a chat response." })}\n\n`);
      return res.end();
    }
    return res.status(502).json({
      error: error?.message || "Failed to generate a chat response.",
    });
  }
}
