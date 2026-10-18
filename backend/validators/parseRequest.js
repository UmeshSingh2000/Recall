/**
 * @template {import("zod").ZodTypeAny} T
 * @param {import("express").Response} res
 * @param {T} schema
 * @param {unknown} data
 * @returns {import("zod").output<T> | null}
 */
export function parseRequest(res, schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue?.message ?? "Validation failed";
    res.status(400).json({ error: message });
    return null;
  }

  return result.data;
}
