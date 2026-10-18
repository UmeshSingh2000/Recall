import { Router } from "express";
import { generateLogSummary, generateSummary } from "../controllers/summaryController.js";
import { requireNeonAuth } from "../middleware/requireNeonAuth.js";

const router = Router();

router.post("/api/generate-summary", requireNeonAuth, generateSummary);
router.post("/api/generate-log-summary", requireNeonAuth, generateLogSummary);

export default router;
