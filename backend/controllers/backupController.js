import prisma from "../config/prisma.js";
import {
  asDate,
  asInt,
  asText,
  iso,
} from "../services/workspaceSerialize.js";
import { getAuthUserId, invalidateUserWorkspaceCache } from "../services/workspaceAuth.js";
import {
  deleteUserWorkspace,
  loadUserWorkspaceIds,
} from "../services/workspaceBackup.js";

const BACKUP_FORMAT = "recall-backup";
const BACKUP_VERSION = 1;

function backupRows(rows, mapRow) {
  return rows.map(mapRow);
}

function ticketIdFilter(ticketIds) {
  return ticketIds.length ? { ticket_id: { in: ticketIds } } : { ticket_id: { in: [-1] } };
}

export async function exportBackup(req, res) {
  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const { projects, projectIds, ticketIds } = await loadUserWorkspaceIds(userId);

    const [
      tickets,
      progressItems,
      workLogs,
      ticketFiles,
      ticketNotes,
      workSessions,
      settings,
    ] = await Promise.all([
      projectIds.length
        ? prisma.ticket.findMany({
            where: { project_id: { in: projectIds } },
            orderBy: { id: "asc" },
          })
        : [],
      prisma.progressItem.findMany({
        where: ticketIdFilter(ticketIds),
        orderBy: { id: "asc" },
      }),
      prisma.workLog.findMany({
        where: ticketIdFilter(ticketIds),
        orderBy: { id: "asc" },
      }),
      prisma.ticketFile.findMany({
        where: ticketIdFilter(ticketIds),
        orderBy: { id: "asc" },
      }),
      prisma.ticketNote.findMany({
        where: ticketIdFilter(ticketIds),
        orderBy: { id: "asc" },
      }),
      prisma.workSession.findMany({
        where: ticketIdFilter(ticketIds),
        orderBy: { id: "asc" },
      }),
      prisma.setting.findMany({ orderBy: { key: "asc" } }),
    ]);

    const fullProjects = projects.length
      ? await prisma.project.findMany({
          where: { user_id: userId },
          orderBy: { id: "asc" },
        })
      : [];

    return res.status(200).json({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        projects: backupRows(fullProjects, (row) => ({
          id: row.id,
          user_id: row.user_id,
          name: row.name,
          description: row.description,
          repository_url: row.repository_url,
          created_at: iso(row.created_at),
          updated_at: iso(row.updated_at),
        })),
        tickets: backupRows(tickets, (row) => ({
          id: row.id,
          project_id: row.project_id,
          ticket_key: row.ticket_key,
          title: row.title,
          description: row.description,
          status: row.status,
          priority: row.priority,
          due_date: iso(row.due_date),
          my_context: row.my_context,
          why_implementing: row.why_implementing,
          how_it_works: row.how_it_works,
          important_decisions: row.important_decisions,
          next_action: row.next_action,
          created_at: iso(row.created_at),
          updated_at: iso(row.updated_at),
          completed_at: iso(row.completed_at),
        })),
        progress_items: backupRows(progressItems, (row) => ({
          id: row.id,
          ticket_id: row.ticket_id,
          content: row.content,
          completed: row.completed,
          position: row.position,
          created_at: iso(row.created_at),
          completed_at: iso(row.completed_at),
        })),
        work_logs: backupRows(workLogs, (row) => ({
          id: row.id,
          ticket_id: row.ticket_id,
          type: row.type,
          description: row.description,
          what_remains: row.what_remains,
          next_action: row.next_action,
          commit_hash: row.commit_hash,
          created_at: iso(row.created_at),
        })),
        ticket_files: backupRows(ticketFiles, (row) => ({
          id: row.id,
          ticket_id: row.ticket_id,
          file_path: row.file_path,
          created_at: iso(row.created_at),
        })),
        ticket_notes: backupRows(ticketNotes, (row) => ({
          id: row.id,
          ticket_id: row.ticket_id,
          content: row.content,
          created_at: iso(row.created_at),
          updated_at: iso(row.updated_at),
        })),
        work_sessions: backupRows(workSessions, (row) => ({
          id: row.id,
          ticket_id: row.ticket_id,
          started_at: iso(row.started_at),
          paused_at: iso(row.paused_at),
          ended_at: iso(row.ended_at),
          pause_reason: row.pause_reason,
          summary: row.summary,
          next_action: row.next_action,
        })),
        settings: settings.map((row) => ({ key: row.key, value: row.value })),
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function requireRows(data, table) {
  if (!Array.isArray(data?.[table])) {
    throw new Error(`The backup is missing the ${table} table.`);
  }
  return data[table];
}

function mapProjects(rows, userId) {
  return rows.map((row) => ({
    id: asInt(row.id, "project id"),
    user_id: userId,
    name: asText(row.name).trim(),
    description: asText(row.description),
    repository_url: asText(row.repository_url),
    created_at: asDate(row.created_at) ?? new Date(),
    updated_at: asDate(row.updated_at) ?? new Date(),
  }));
}

function mapTickets(rows) {
  return rows.map((row) => ({
    id: asInt(row.id, "ticket id"),
    project_id: asInt(row.project_id, "ticket project_id"),
    ticket_key: asText(row.ticket_key).trim(),
    title: asText(row.title).trim(),
    description: asText(row.description),
    status: asText(row.status, "in_progress"),
    priority: asText(row.priority, "medium"),
    due_date: asDate(row.due_date),
    my_context: asText(row.my_context),
    why_implementing: asText(row.why_implementing),
    how_it_works: asText(row.how_it_works),
    important_decisions: asText(row.important_decisions),
    next_action: asText(row.next_action),
    created_at: asDate(row.created_at) ?? new Date(),
    updated_at: asDate(row.updated_at) ?? new Date(),
    completed_at: asDate(row.completed_at),
  }));
}

function mapProgress(rows) {
  return rows.map((row) => ({
    id: asInt(row.id, "progress id"),
    ticket_id: asInt(row.ticket_id, "progress ticket_id"),
    content: asText(row.content),
    completed: Number(row.completed) ? 1 : 0,
    position: Number.isFinite(Number(row.position)) ? Number(row.position) : 0,
    created_at: asDate(row.created_at) ?? new Date(),
    completed_at: asDate(row.completed_at),
  }));
}

function mapLogs(rows) {
  return rows.map((row) => ({
    id: asInt(row.id, "work log id"),
    ticket_id: asInt(row.ticket_id, "work log ticket_id"),
    type: asText(row.type, "code"),
    description: asText(row.description),
    what_remains: asText(row.what_remains),
    next_action: asText(row.next_action),
    commit_hash: asText(row.commit_hash),
    created_at: asDate(row.created_at) ?? new Date(),
  }));
}

function mapFiles(rows) {
  return rows.map((row) => ({
    id: asInt(row.id, "file id"),
    ticket_id: asInt(row.ticket_id, "file ticket_id"),
    file_path: asText(row.file_path),
    created_at: asDate(row.created_at) ?? new Date(),
  }));
}

function mapNotes(rows) {
  return rows.map((row) => ({
    id: asInt(row.id, "note id"),
    ticket_id: asInt(row.ticket_id, "note ticket_id"),
    content: asText(row.content),
    created_at: asDate(row.created_at) ?? new Date(),
    updated_at: asDate(row.updated_at) ?? new Date(),
  }));
}

function mapSessions(rows) {
  return rows.map((row) => ({
    id: asInt(row.id, "session id"),
    ticket_id: asInt(row.ticket_id, "session ticket_id"),
    started_at: asDate(row.started_at) ?? new Date(),
    paused_at: asDate(row.paused_at),
    ended_at: asDate(row.ended_at),
    pause_reason: asText(row.pause_reason),
    summary: asText(row.summary),
    next_action: asText(row.next_action),
  }));
}

function mapSettings(rows) {
  return rows
    .filter((row) => row && row.key != null)
    .map((row) => ({
      key: asText(row.key),
      value: asText(row.value),
    }));
}

async function resetSequence(tx, table) {
  const rows = await tx.$queryRawUnsafe(
    `SELECT COALESCE(MAX(id), 0)::int AS max_id FROM ${table}`,
  );
  const maxId = Number(rows[0]?.max_id ?? 0);
  if (maxId > 0) {
    await tx.$queryRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), ${maxId}, true)`,
    );
  }
}

export async function importBackup(req, res) {
  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    const body = req.body ?? {};
    if (body.format !== BACKUP_FORMAT || body.version !== BACKUP_VERSION) {
      return res.status(400).json({ error: "This file is not a compatible Recall backup." });
    }

    const projects = mapProjects(requireRows(body.data, "projects"), userId).filter(
      (row) => row.name,
    );
    const tickets = mapTickets(requireRows(body.data, "tickets")).filter(
      (row) => row.ticket_key && row.title,
    );
    const progressItems = mapProgress(requireRows(body.data, "progress_items"));
    const workLogs = mapLogs(requireRows(body.data, "work_logs"));
    const ticketFiles = mapFiles(requireRows(body.data, "ticket_files"));
    const ticketNotes = mapNotes(requireRows(body.data, "ticket_notes"));
    const workSessions = mapSessions(requireRows(body.data, "work_sessions"));
    const settings = mapSettings(requireRows(body.data, "settings"));

    await prisma.$transaction(
      async (tx) => {
        await deleteUserWorkspace(tx, userId);

        if (projects.length) await tx.project.createMany({ data: projects });
        if (tickets.length) await tx.ticket.createMany({ data: tickets });
        if (progressItems.length) await tx.progressItem.createMany({ data: progressItems });
        if (workLogs.length) await tx.workLog.createMany({ data: workLogs });
        if (ticketFiles.length) await tx.ticketFile.createMany({ data: ticketFiles });
        if (ticketNotes.length) await tx.ticketNote.createMany({ data: ticketNotes });
        if (workSessions.length) await tx.workSession.createMany({ data: workSessions });

        for (const setting of settings) {
          await tx.setting.upsert({
            where: { key: setting.key },
            create: setting,
            update: { value: setting.value },
          });
        }

        for (const table of [
          "projects",
          "tickets",
          "progress_items",
          "work_logs",
          "ticket_files",
          "ticket_notes",
          "work_sessions",
        ]) {
          await resetSequence(tx, table);
        }
      },
      { timeout: 60000 },
    );

    await invalidateUserWorkspaceCache(userId);
    return res.status(200).json({
      message: "Backup imported",
      counts: {
        projects: projects.length,
        tickets: tickets.length,
      },
    });
  } catch (error) {
    console.error("Import failed:", error);
    const message = error instanceof Error ? error.message : "Could not import that backup.";
    const status = message.startsWith("Invalid") || message.startsWith("The backup") ? 400 : 500;
    return res.status(status).json({
      error: status === 400 ? message : "Could not import that backup.",
    });
  }
}

export async function deleteAllData(req, res) {
  try {
    const userId = getAuthUserId(req, res);
    if (!userId) return;

    await prisma.$transaction(async (tx) => {
      await deleteUserWorkspace(tx, userId);
    });
    await invalidateUserWorkspaceCache(userId);
    return res.status(200).json({ message: "All data deleted" });
  } catch (error) {
    console.error("Delete all data failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
