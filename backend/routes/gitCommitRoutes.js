import { Router } from "express";
import { receiveGitCommit } from "../controllers/gitCommitController.js";
import { requireApiToken } from "../middleware/requireApiToken.js";

const router = Router();

router.post("/api/git/commit", requireApiToken, receiveGitCommit);

export default router;
