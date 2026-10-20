import { redis } from "../config/redis.js";

export const PROJECTS_CACHE_TTL_SECONDS = 600;
export const TICKETS_CACHE_TTL_SECONDS = 60;

export const projectsCacheKey = (userId) => `projects:${userId}`;
export const ticketsCacheKey = (userId) => `tickets:${userId}`;
export const projectCacheKey = (userId, projectId) => `project:${userId}:${projectId}`;

export async function cacheAside(key, ttlSeconds, fetchData) {
  // 1. Try Redis
  try {
    const cached = await redis.get(key);

    if (cached !== null) {
      console.log("Redis cache HIT:", key);
      return cached;
    }
  } catch (error) {
    console.error("Redis GET failed:", error.message);
  }

  // 2. Fall back to the database
  const data = await fetchData();

  // 3. Cache the result
  if (data !== null && data !== undefined) {
    try {
      await redis.set(key, data, { ex: ttlSeconds });
      console.log("Redis cache MISS:", key);
    } catch (error) {
      console.error("Redis SET failed:", error.message);
    }
  }

  return data;
}

export async function invalidateCache(key) {
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Redis DEL failed:", error.message);
  }
}
