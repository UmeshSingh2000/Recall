import prisma from "../config/prisma.js";
import { parseRequest } from "../validators/parseRequest.js";
import {
  createProjectBodySchema,
  projectIdParamSchema,
  updateProjectBodySchema,
} from "../validators/projectSchemas.js";
import {
  cacheAside,
  invalidateCache,
  PROJECTS_CACHE_KEY,
  PROJECTS_CACHE_TTL_SECONDS,
  projectCacheKey,
  TICKETS_CACHE_KEY,
} from "../services/cache.js";
import {
  projectCounts,
  serializeProject,
  serializeTicket,
} from "../services/workspaceSerialize.js";

const ticketListInclude = {
  project: { select: { name: true } },
  work_logs: {
    orderBy: { created_at: "desc" },
    take: 1,
    select: { description: true },
  },
};

export async function listProjects(_req, res) {
  try {
    const projects = await cacheAside(
      PROJECTS_CACHE_KEY,
      PROJECTS_CACHE_TTL_SECONDS,
      async () => {
        const rows = await prisma.project.findMany({
          orderBy: { name: "asc" },
          include: { tickets: { select: { status: true } } },
        });

        return rows.map((project) =>
          serializeProject(project, projectCounts(project.tickets)),
        );
      },
    );

    return res.status(200).json({ projects });
  } catch (error) {
    console.error("List projects failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createProject(req, res) {
  try {
    const body = parseRequest(res, createProjectBodySchema, req.body ?? {});
    if (!body) return;

    const now = new Date();
    const project = await prisma.project.create({
      data: {
        name: body.name,
        description: body.description,
        repository_url: body.repository_url,
        created_at: now,
        updated_at: now,
      },
    });

    await invalidateCache(PROJECTS_CACHE_KEY);
    return res.status(201).json({ id: project.id });
  } catch (error) {
    console.error("Create project failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateProject(req, res) {
  try {
    const params = parseRequest(res, projectIdParamSchema, req.params);
    if (!params) return;
    const body = parseRequest(res, updateProjectBodySchema, req.body ?? {});
    if (!body) return;

    const project = await prisma.project.update({
      where: { id: params.id },
      data: { ...body, updated_at: new Date() },
      include: { tickets: { select: { status: true } } },
    });

    await invalidateCache(PROJECTS_CACHE_KEY);
    await invalidateCache(TICKETS_CACHE_KEY);
    await invalidateCache(projectCacheKey(params.id));
    return res
      .status(200)
      .json({ project: serializeProject(project, projectCounts(project.tickets)) });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Update project failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProject(req, res) {
  try {
    const params = parseRequest(res, projectIdParamSchema, req.params);
    if (!params) return;

    const result = await cacheAside(
      projectCacheKey(params.id),
      PROJECTS_CACHE_TTL_SECONDS,
      async () => {
        const project = await prisma.project.findUnique({
          where: { id: params.id },
          include: { tickets: { select: { status: true } } },
        });

        if (!project) {
          return null;
        }

        const tickets = await prisma.ticket.findMany({
          where: { project_id: project.id },
          orderBy: { updated_at: "desc" },
          include: ticketListInclude,
        });

        return {
          project: serializeProject(project, projectCounts(project.tickets)),
          tickets: tickets.map(serializeTicket),
        };
      },
    );

    if (!result) {
      return res.status(404).json({ error: "Project not found" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get project failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteProject(req, res) {
  try {
    const params = parseRequest(res, projectIdParamSchema, req.params);
    if (!params) return;

    await prisma.project.delete({ where: { id: params.id } });
    await invalidateCache(PROJECTS_CACHE_KEY);
    await invalidateCache(TICKETS_CACHE_KEY);
    await invalidateCache(projectCacheKey(params.id));
    return res.status(200).json({ message: "Project deleted" });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Delete project failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
