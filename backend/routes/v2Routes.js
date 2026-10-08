import { Router } from "express";
import { syncProjects } from "../controllers/syncController";
const router = Router();

router.post("/sync-projects", requireV2ApiToken, syncProjects);

export default router;