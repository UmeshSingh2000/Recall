import { generateWithGroq } from "../services/groqService.js";
import { buildTicketSummaryPrompt } from "../services/ticketSummaryService.js";

export async function generateSummary(req, res) {
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
}

export async function generateLogSummary(req, res) {
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
}
