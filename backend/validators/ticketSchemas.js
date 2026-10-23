import { z } from "zod";

const optionalDate = z.union([z.coerce.date(), z.null()]).optional();

export const ticketIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid ticket ID"),
});

export const deleteTicketImageBodySchema = z.object({
  image: z.string().url("Invalid image URL"),
});

export const createTicketBodySchema = z.object({
  project_id: z.coerce.number().int().positive(),
  ticket_key: z.string().trim().min(1, "Ticket key is required"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional().default(""),
  next_action: z.string().optional().default(""),
  status: z.string().min(1).optional().default("in_progress"),
  priority: z.string().min(1).optional().default("medium"),
});

export const updateTicketBodySchema = z
  .object({
    project_id: z.coerce.number().int().positive().optional(),
    ticket_key: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    status: z.string().min(1).optional(),
    priority: z.string().min(1).optional(),
    next_action: z.string().optional(),
    my_context: z.string().optional(),
    why_implementing: z.string().optional(),
    how_it_works: z.string().optional(),
    important_decisions: z.string().optional(),
    completed_at: optionalDate,
    due_date: optionalDate,
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "No fields to update",
  });

export const createWorkLogBodySchema = z.object({
  type: z.string().min(1).optional().default("code"),
  description: z.string().trim().min(1, "Description is required"),
  what_remains: z.string().optional().default(""),
  next_action: z.string().optional().default(""),
  commit_hash: z.string().optional().default(""),
  files: z.array(z.string()).optional().default([]),
});

export const pauseTicketBodySchema = z.object({
  summary: z.string().optional().default(""),
  what_remains: z.string().optional().default(""),
  next_action: z.string().optional().default(""),
  pause_reason: z.string().optional().default(""),
});

export const gitCommitBodySchema = z.object({
  ticketKey: z.string().trim().min(1, "ticketKey is required"),
  commitHash: z.string().optional().default(""),
  commitMessage: z.string().optional().default(""),
  description: z.string().optional().default(""),
  files: z.array(z.string()).optional().default([]),
  logType: z.string().min(1).optional().default("code"),
  nextAction: z.string().optional().default(""),
  receivedAt: z.string().optional(),
});
