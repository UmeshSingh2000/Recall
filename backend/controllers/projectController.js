import prisma from "../config/prisma.js";
import { parseRequest } from "../validators/parseRequest.js";
import { createProjectBodySchema, projectIdParamSchema } from "../validators/projectSchemas.js";
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
    const projects = await prisma.project.findMany({
      orderBy: { name: "asc" },
      include: { tickets: { select: { status: true } } },
    });

    return res.status(200).json({
      projects: projects.map((project) =>
        serializeProject(project, projectCounts(project.tickets)),
      ),
    });
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

    return res.status(201).json({ id: project.id });
  } catch (error) {
    console.error("Create project failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getProject(req, res) {
  try {
    const params = parseRequest(res, projectIdParamSchema, req.params);
    if (!params) return;

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { tickets: { select: { status: true } } },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const tickets = await prisma.ticket.findMany({
      where: { project_id: project.id },
      orderBy: { updated_at: "desc" },
      include: ticketListInclude,
    });

    return res.status(200).json({
      project: serializeProject(project, projectCounts(project.tickets)),
      tickets: tickets.map(serializeTicket),
    });
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
    return res.status(200).json({ message: "Project deleted" });
  } catch (error) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "Project not found" });
    }
    console.error("Delete project failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
