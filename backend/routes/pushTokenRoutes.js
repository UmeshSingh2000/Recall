import { Router } from "express";
import { registerPushToken } from "../controllers/pushTokenController.js";
import { requireNeonAuth } from "../middleware/requireNeonAuth.js";

const router = Router();

router.post("/api/push-token", requireNeonAuth, registerPushToken);

export default router;
