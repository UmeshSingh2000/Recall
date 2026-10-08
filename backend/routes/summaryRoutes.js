import { Router } from "express";
import { generateLogSummary, generateSummary } from "../controllers/summaryController.js";
import { requireApiToken } from "../middleware/requireApiToken.js";

const router = Router();

router.post("/api/generate-summary", requireApiToken, generateSummary);
router.post("/api/generate-log-summary", requireApiToken, generateLogSummary);

export default router;
