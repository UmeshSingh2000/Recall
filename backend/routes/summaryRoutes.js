import { Router } from "express";
import {
  generateLogSummary,
  generateSummary,
} from "../controllers/summaryController.js";
import { generatePendingTicketsSummary } from "../controllers/cronController.js";
import { requireNeonAuth } from "../middleware/requireNeonAuth.js";

const router = Router();

router.post("/api/generate-summary", requireNeonAuth, generateSummary);
router.post("/api/generate-log-summary", requireNeonAuth, generateLogSummary);
router.post(
  "/api/generate-pending-tickets-summary",
  generatePendingTicketsSummary,
);

export default router;
