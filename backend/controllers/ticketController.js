import prisma from "../config/prisma.js";
import { parseRequest } from "../validators/parseRequest.js";
import {
  createTicketBodySchema,
  createWorkLogBodySchema,
  gitCommitBodySchema,
  pauseTicketBodySchema,
  ticketIdParamSchema,
  updateTicketBodySchema,
} from "../validators/ticketSchemas.js";
import { logIdParamSchema } from "../validators/logSchemas.js";
import {
  serializeFile,
  serializeNote,
  serializeProgress,
  serializeSession,
  serializeTicket,
  serializeWorkLog,
} from "../services/workspaceSerialize.js";
import {
  cacheAside,
  invalidateCache,
  PROJECTS_CACHE_KEY,
  projectCacheKey,
  TICKETS_CACHE_KEY,
  TICKETS_CACHE_TTL_SECONDS,
} from "../services/cache.js";

const ticketListInclude = {
  project: { select: { name: true } },
  work_logs: {
    orderBy: { created_at: "desc" },
    take: 1,
    select: { description: true },
  },
};

export async function listTickets(_req, res) {
  try {
    const tickets = await cacheAside(
      TICKETS_CACHE_KEY,
      TICKETS_CACHE_TTL_SECONDS,
      async () => {
        const rows = await prisma.ticket.findMany({
          orderBy: { updated_at: "desc" },
          include: ticketListInclude,
        });
        return rows.map(serializeTicket);
      },
    );
    return res.status(200).json({ tickets });
  } catch (error) {
    console.error("List tickets failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createTicket(req, res) {
  try {
    const body = parseRequest(res, createTicketBodySchema, req.body ?? {});
    if (!body) return;

    const now = new Date();
    const ticket = await prisma.ticket.create({
      data: {
        project_id: body.project_id,
        ticket_key: body.ticket_key.toUpperCase(),
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        next_action: body.next_action,
        created_at: now,
        updated_at: now,
      },
    });

    await invalidateCache(PROJECTS_CACHE_KEY);
    await invalidateCache(projectCacheKey(body.project_id));
    await invalidateCache(TICKETS_CACHE_KEY);
    return res.status(201).json({ id: ticket.id });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "A ticket with that key already exists." });
    }
    if (error?.code === "P2003") {
      return res.status(400).json({ error: "Project not found." });
    }
    console.error("Create ticket failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getTicket(req, res) {
  try {
    const params = parseRequest(res, ticketIdParamSchema, req.params);
    if (!params) return;

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        project_id: true,
        ticket_key: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        due_date: true,
        my_context: true,
        why_implementing: true,
        how_it_works: true,
        important_decisions: true,
        next_action: true,
        created_at: true,
        updated_at: true,
        completed_at: true,
        project: {
          select: { name: true, description: true, repository_url: true },
        },
        progress_items: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            ticket_id: true,
            content: true,
            completed: true,
            position: true,
            created_at: true,
            completed_at: true,
          },
        },
        work_logs: {
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            ticket_id: true,
            type: true,
            description: true,
            what_remains: true,
            next_action: true,
            commit_hash: true,
            created_at: true,
          },
        },
        ticket_files: {
          orderBy: { created_at: "desc" },
          select: { id: true, ticket_id: true, file_path: true, created_at: true },
        },
        ticket_notes: {
          orderBy: { updated_at: "desc" },
          select: {
            id: true,
            ticket_id: true,
            content: true,
            created_at: true,
            updated_at: true,
          },
        },
        work_sessions: {
          orderBy: { started_at: "desc" },
          select: {
            id: true,
            ticket_id: true,
            started_at: true,
            paused_at: true,
            ended_at: true,
            pause_reason: true,
            summary: true,
            next_action: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    return res.status(200).json({
      ticket: serializeTicket({
        ...ticket,
        work_logs: ticket.work_logs.slice(0, 1),
      }),
      progress: ticket.progress_items.map(serializeProgress),
      logs: ticket.work_logs.map(serializeWorkLog),
      files: ticket.ticket_files.map(serializeFile),
      notes: ticket.ticket_notes.map(serializeNote),
      sessions: ticket.work_sessions.map(serializeSession),
      project: {
        name: ticket.project.name,
        description: ticket.project.description,
        repository_url: ticket.project.repository_url,
      },
    });
  } catch (error) {
    console.error("Get ticket failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateTicket(req, res) {
  try {
    const params = parseRequest(res, ticketIdParamSchema, req.params);
    if (!params) return;
    const body = parseRequest(res, updateTicketBodySchema, req.body ?? {});
    if (!body) return;

    const data = { updated_at: new Date() };
    for (const key of [
      "project_id",
      "title",
      "description",
      "status",
      "priority",
      "next_action",
      "my_context",
      "why_implementing",
      "how_it_works",
      "important_decisions",
      "completed_at",
      "due_date",
    ]) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.ticket_key !== undefined) data.ticket_key = body.ticket_key.toUpperCase();

    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data,
      include: ticketListInclude,
    });

    await invalidateCache(PROJECTS_CACHE_KEY);
    await invalidateCache(projectCacheKey(ticket.project_id));
    await invalidateCache(TICKETS_CACHE_KEY);
    return res.status(200).json({ ticket: serializeTicket(ticket) });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Ticket not found" });
    }
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "A ticket with that key already exists." });
    }
    console.error("Update ticket failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteTicket(req, res) {
  try {
    const params = parseRequest(res, ticketIdParamSchema, req.params);
    if (!params) return;
    const ticket = await prisma.ticket.delete({ where: { id: params.id } });
    await invalidateCache(PROJECTS_CACHE_KEY);
    await invalidateCache(projectCacheKey(ticket.project_id));
    await invalidateCache(TICKETS_CACHE_KEY);
    return res.status(200).json({ message: "Ticket deleted" });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Ticket not found" });
    }
    console.error("Delete ticket failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createWorkLog(req, res) {
  try {
    const params = parseRequest(res, ticketIdParamSchema, req.params);
    if (!params) return;
    const body = parseRequest(res, createWorkLogBodySchema, req.body ?? {});
    if (!body) return;

    const now = new Date();
    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const files = body.files.map((file) => file.trim()).filter(Boolean);

    await prisma.$transaction(async (tx) => {
      await tx.workLog.create({
        data: {
          ticket_id: ticket.id,
          type: body.type,
          description: body.description,
          what_remains: body.what_remains,
          next_action: body.next_action,
          commit_hash: body.commit_hash,
          created_at: now,
        },
      });

      if (files.length) {
        await tx.ticketFile.createMany({
          data: files.map((filePath) => ({
            ticket_id: ticket.id,
            file_path: filePath,
            created_at: now,
          })),
        });
      }

      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: ticket.status === "paused" ? "in_progress" : ticket.status,
          next_action: body.next_action,
          updated_at: now,
        },
      });
    });

    await invalidateCache(PROJECTS_CACHE_KEY);
    await invalidateCache(projectCacheKey(ticket.project_id));
    await invalidateCache(TICKETS_CACHE_KEY);
    return res.status(201).json({ message: "Progress logged" });
  } catch (error) {
    console.error("Create work log failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function pauseTicket(req, res) {
  try {
    const params = parseRequest(res, ticketIdParamSchema, req.params);
    if (!params) return;
    const body = parseRequest(res, pauseTicketBodySchema, req.body ?? {});
    if (!body) return;

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.workSession.create({
        data: {
          ticket_id: ticket.id,
          started_at: now,
          paused_at: now,
          pause_reason: body.pause_reason,
          summary: body.summary,
          next_action: body.next_action,
        },
      });
      await tx.workLog.create({
        data: {
          ticket_id: ticket.id,
          type: "other",
          description: body.summary.trim() || "Paused work session.",
          what_remains: body.what_remains,
          next_action: body.next_action,
          created_at: now,
        },
      });
      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "paused",
          next_action: body.next_action,
          updated_at: now,
        },
      });
    });

    await invalidateCache(PROJECTS_CACHE_KEY);
    await invalidateCache(projectCacheKey(ticket.project_id));
    await invalidateCache(TICKETS_CACHE_KEY);
    return res.status(201).json({ message: "Ticket paused" });
  } catch (error) {
    console.error("Pause ticket failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getWorkLog(req, res) {
  try {
    const params = parseRequest(res, logIdParamSchema, req.params);
    if (!params) return;

    const log = await prisma.workLog.findUnique({
      where: { id: params.id },
      include: {
        ticket: { include: { project: true } },
      },
    });

    if (!log) {
      return res.status(404).json({ error: "Work log not found" });
    }

    const files = await prisma.ticketFile.findMany({
      where: { ticket_id: log.ticket_id, created_at: log.created_at },
      orderBy: { id: "asc" },
    });

    return res.status(200).json({
      log: {
        ...serializeWorkLog(log),
        ticket_key: log.ticket.ticket_key,
        ticket_title: log.ticket.title,
        ticket_description: log.ticket.description,
        ticket_status: log.ticket.status,
        ticket_next_action: log.ticket.next_action,
        project_name: log.ticket.project.name,
        project_description: log.ticket.project.description,
        repository_url: log.ticket.project.repository_url,
      },
      files: files.map(serializeFile),
    });
  } catch (error) {
    console.error("Get work log failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteWorkLog(req, res) {
  try {
    const params = parseRequest(res, logIdParamSchema, req.params);
    if (!params) return;

    const log = await prisma.workLog.findUnique({ where: { id: params.id } });
    if (!log) {
      return res.status(404).json({ error: "Work log not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.ticketFile.deleteMany({
        where: { ticket_id: log.ticket_id, created_at: log.created_at },
      });
      await tx.workLog.delete({ where: { id: log.id } });
    });

    return res.status(200).json({ message: "Work log deleted" });
  } catch (error) {
    console.error("Delete work log failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function searchWorkspace(req, res) {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const where = query
      ? {
          OR: [
            { ticket_key: { contains: query, mode: "insensitive" } },
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { next_action: { contains: query, mode: "insensitive" } },
            {
              work_logs: {
                some: {
                  OR: [
                    { description: { contains: query, mode: "insensitive" } },
                    { commit_hash: { contains: query, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {};

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { updated_at: "desc" },
      include: {
        project: { select: { name: true } },
        work_logs: { orderBy: { created_at: "desc" } },
      },
    });

    return res.status(200).json({
      results: tickets.map((ticket) => ({
        ...serializeTicket({
          ...ticket,
          work_logs: ticket.work_logs.slice(0, 1),
        }),
        logs: ticket.work_logs.map(serializeWorkLog),
      })),
    });
  } catch (error) {
    console.error("Search failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function applyGitCommit(req, res) {
  try {
    const body = parseRequest(res, gitCommitBodySchema, req.body ?? {});
    if (!body) return;

    const ticket = await prisma.ticket.findFirst({
      where: { ticket_key: { equals: body.ticketKey, mode: "insensitive" } },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found", applied: false });
    }

    if (body.commitHash) {
      const existing = await prisma.workLog.findFirst({
        where: { ticket_id: ticket.id, commit_hash: body.commitHash },
      });
      if (existing) {
        return res.status(200).json({ applied: false, ticketId: ticket.id });
      }
    }

    const now = body.receivedAt ? new Date(body.receivedAt) : new Date();
    const createdAt = Number.isNaN(now.getTime()) ? new Date() : now;
    const description = body.description || body.commitMessage || "Git commit received.";
    const files = body.files.map((file) => file.trim()).filter(Boolean);

    await prisma.$transaction(async (tx) => {
      if (body.commitHash) {
        const existing = await tx.workLog.findFirst({
          where: { ticket_id: ticket.id, commit_hash: body.commitHash },
        });
        if (existing) return;
      }

      await tx.workLog.create({
        data: {
          ticket_id: ticket.id,
          type: body.logType,
          description,
          what_remains: "",
          next_action: body.nextAction,
          commit_hash: body.commitHash,
          created_at: createdAt,
        },
      });

      if (files.length) {
        await tx.ticketFile.createMany({
          data: files.map((filePath) => ({
            ticket_id: ticket.id,
            file_path: filePath,
            created_at: createdAt,
          })),
        });
      }

      await tx.ticket.update({
        where: { id: ticket.id },
        data: {
          ...(body.nextAction ? { next_action: body.nextAction } : {}),
          updated_at: createdAt,
        },
      });
    });

    return res.status(201).json({ applied: true, ticketId: ticket.id });
  } catch (error) {
    console.error("Apply git commit failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
