import { Router } from "express";
import { receiveClipboard } from "../controllers/clipboardController.js";
import { requireApiToken } from "../middleware/requireApiToken.js";

const router = Router();

router.post("/api/clipboard", requireApiToken, receiveClipboard);

export default router;
