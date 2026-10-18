import { Router } from "express";
import { receiveGitCommit } from "../controllers/gitCommitController.js";
import { requireNeonAuth } from "../middleware/requireNeonAuth.js";

const router = Router();

router.post("/api/git/commit", requireNeonAuth, receiveGitCommit);

export default router;
