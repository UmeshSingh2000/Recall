import { z } from "zod";

export const logIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid work log ID"),
});
