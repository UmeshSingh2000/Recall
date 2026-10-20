import {
  invalidateCache,
  projectCacheKey,
  projectsCacheKey,
  ticketsCacheKey,
} from "./cache.js";

export function getAuthUserId(req, res) {
  const userId = req?.auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

export function ticketsOwnedByUserWhere(userId) {
  return { project: { user_id: userId } };
}

export async function invalidateUserWorkspaceCache(userId, projectId) {
  await invalidateCache(projectsCacheKey(userId));
  await invalidateCache(ticketsCacheKey(userId));
  if (projectId != null) {
    await invalidateCache(projectCacheKey(userId, projectId));
  }
}
