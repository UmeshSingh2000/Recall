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

export function buildTicketSummaryPrompt(payload) {
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
