import { Router } from "express";
import { syncProjects, syncProjectsIds, getProjectById } from "../controllers/syncController.js";
const router = Router();

router.post("/api/sync-projects", syncProjects);
router.get("/api/sync-projects-ids", syncProjectsIds);
router.get('/api/project/:id', getProjectById)

export default router;