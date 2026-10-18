import { Router } from "express";
import { receiveClipboard } from "../controllers/clipboardController.js";
import { requireNeonAuth } from "../middleware/requireNeonAuth.js";

const router = Router();

router.post("/api/clipboard", requireNeonAuth, receiveClipboard);

export default router;
