export function iso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function asDate(value) {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function asText(value, fallback = "") {
  if (value == null) return fallback;
  return String(value);
}

export function asInt(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw new Error(`Invalid ${label}`);
  }
  return number;
}

export function projectCounts(tickets) {
  const active = tickets.filter(
    (ticket) => ticket.status !== "done" && ticket.status !== "live",
  ).length;
  const completed = tickets.length - active;
  return { active_count: active, completed_count: completed };
}

export function serializeProject(project, counts = {}) {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? "",
    repository_url: project.repository_url ?? "",
    created_at: iso(project.created_at),
    updated_at: iso(project.updated_at),
    ...counts,
  };
}

export function serializeTicket(ticket) {
  const lastLog = ticket.work_logs?.[0]?.description ?? null;
  return {
    id: ticket.id,
    project_id: ticket.project_id,
    project_name: ticket.project?.name ?? "",
    ticket_key: ticket.ticket_key,
    title: ticket.title,
    description: ticket.description ?? "",
    status: ticket.status,
    priority: ticket.priority,
    due_date: iso(ticket.due_date),
    next_action: ticket.next_action ?? "",
    my_context: ticket.my_context ?? "",
    why_implementing: ticket.why_implementing ?? "",
    how_it_works: ticket.how_it_works ?? "",
    important_decisions: ticket.important_decisions ?? "",
    created_at: iso(ticket.created_at),
    updated_at: iso(ticket.updated_at),
    completed_at: iso(ticket.completed_at),
    last_log: lastLog,
  };
}

export function serializeProgress(item) {
  return {
    id: item.id,
    ticket_id: item.ticket_id,
    content: item.content,
    completed: item.completed ?? 0,
    position: item.position ?? 0,
    created_at: iso(item.created_at),
    completed_at: iso(item.completed_at),
  };
}

export function serializeWorkLog(log) {
  return {
    id: log.id,
    ticket_id: log.ticket_id,
    type: log.type,
    description: log.description,
    what_remains: log.what_remains ?? "",
    next_action: log.next_action ?? "",
    commit_hash: log.commit_hash ?? "",
    created_at: iso(log.created_at),
  };
}

export function serializeFile(file) {
  return {
    id: file.id,
    ticket_id: file.ticket_id,
    file_path: file.file_path,
    created_at: iso(file.created_at),
  };
}

export function serializeNote(note) {
  return {
    id: note.id,
    ticket_id: note.ticket_id,
    content: note.content,
    created_at: iso(note.created_at),
    updated_at: iso(note.updated_at),
  };
}

export function serializeSession(session) {
  return {
    id: session.id,
    ticket_id: session.ticket_id,
    started_at: iso(session.started_at),
    paused_at: iso(session.paused_at),
    ended_at: iso(session.ended_at),
    pause_reason: session.pause_reason ?? "",
    summary: session.summary ?? "",
    next_action: session.next_action ?? "",
  };
}
