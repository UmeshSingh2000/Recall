import prisma from "../config/prisma.js";

export async function syncProjects(req, res) {
    try {
        const {
            id,
            name,
            created_at,
            updated_at,
            description,
            repository_url
        } = req.body || {};

        const projectId = Number(id);
        const createdAt = new Date(created_at);
        const updatedAt = new Date(updated_at);

        if (
            !Number.isInteger(projectId) ||
            projectId < 1 ||
            typeof name !== "string" ||
            name.trim().length === 0 ||
            !created_at ||
            Number.isNaN(createdAt.getTime()) ||
            !updated_at ||
            Number.isNaN(updatedAt.getTime()) ||
            (description !== undefined && typeof description !== "string") ||
            (repository_url !== undefined && typeof repository_url !== "string")
        ) {
            return res.status(400).json({
                error: "Invalid project data"
            });
        }

        await prisma.project.create({
            data: {
                id: projectId,
                name: name.trim(),
                ...(description !== undefined && { description }),
                ...(repository_url !== undefined && { repository_url }),
                created_at: createdAt,
                updated_at: updatedAt
            }
        });

        return res.status(200).json({
            message: "Project Sync successfully"
        });
    }
    catch (error) {
        if (error?.code === "P2002") {
            return res.status(400).json({
                error: "Project already exists"
            });
        }

        console.error("Project sync failed:", error);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
}

// optimise later returning all ids might be a lot of data
export async function syncProjectsIds(req, res) {
    try {
        const projects = await prisma.project.findMany({
            select: {
                id: true
            }
        });
        return res.status(200).json({
            projects
        });
    }
    catch (error) {
        console.error("Project IDs sync failed:", error);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
}

export async function getProjectById(req, res) {
    try {
        const projectId = Number(req.params.id);
        console.log("Received project ID:", projectId);
        if (!Number.isInteger(projectId) || projectId < 1) {
            return res.status(400).json({
                error: "Invalid project ID"
            });
        }

        const project = await prisma.project.findUnique({
            where: {
                id: projectId
            }
        });

        if (!project) {
            return res.status(404).json({
                error: "Project not found"
            });
        }

        return res.status(200).json({
            project
        });
    } catch (error) {
        console.error("Get project by ID failed:", error);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
}