import { z } from "zod";

export const createProjectBodySchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  description: z.string().optional().default(""),
  repository_url: z.string().optional().default(""),
});

export const updateProjectBodySchema = createProjectBodySchema.partial().refine(
  (body) => Object.keys(body).length > 0,
  "At least one project field is required",
);

export const projectIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid project ID"),
});
