import prisma from "../config/prisma";

export async function syncProjects(req, res) {
    try {
        const {
            id,
            name,
            created_at,
            updated_at,
            description,
            repository_url
        } = req.body;
        const project = await prisma.project.findUnique({
            where: {
                id: id
            }
        })
        if (project) {
            return res.status(400).json({
                error: "Project already exists"
            })
        }
        else {
            await prisma.project.create({
                data: {
                    id: id,
                    name: name,
                    description: description,
                    repository_url: repository_url,
                    created_at: created_at,
                    updated_at: updated_at
                }
            })
            return res.status(200).json({
                message: "Project Sync successfully"
            })
        }
    }
    catch (error) {
        return res.status(500).json({
            error: "Internal server error"
        })
    } finally {
        await prisma.$disconnect();
    }
}