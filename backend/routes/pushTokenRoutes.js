import { Router } from "express";
import { registerPushToken } from "../controllers/pushTokenController.js";

const router = Router();

router.post("/api/push-token", registerPushToken);

export default router;
