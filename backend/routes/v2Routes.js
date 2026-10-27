import { Router } from "express";
import multer from "multer";
import { deleteAllData, exportBackup, importBackup } from "../controllers/backupController.js";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "../controllers/projectController.js";
import {
  applyGitCommit,
  createTicket,
  createWorkLog,
  deleteTicket,
  deleteWorkLog,
  getTicket,
  getWorkLog,
  listTickets,
  pauseTicket,
  searchWorkspace,
  updateTicket,
  addTicketImage,
  deleteTicketImage,
} from "../controllers/ticketController.js";
import {
  listNotifications,
  markNotificationRead,
} from "../controllers/notificationController.js";
import { requireNeonAuth } from "../middleware/requireNeonAuth.js";

const router = Router();
const uploadTicketImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, file.mimetype.startsWith("image/"));
  },
});
const uploadSingleTicketImage = (req, res, next) => {
  uploadTicketImage.single("image")(req, res, (error) => {
    if (error?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Image must be 10 MB or smaller." });
    }
    if (error) {
      return res.status(400).json({ error: "A valid image file is required." });
    }
    return next();
  });
};
router.use(requireNeonAuth);

router.get("/api/projects", listProjects);
router.post("/api/projects", createProject);
router.get("/api/projects/:id", getProject);
router.patch("/api/projects/:id", updateProject);
router.delete("/api/projects/:id", deleteProject);

router.get("/api/tickets", listTickets);
router.post("/api/tickets", createTicket);
router.get("/api/tickets/:id", getTicket);
router.patch("/api/tickets/:id", updateTicket);
router.delete("/api/tickets/:id", deleteTicket);
router.post("/api/tickets/:id/images", uploadSingleTicketImage, addTicketImage);
router.delete("/api/tickets/:id/images", deleteTicketImage);
router.post("/api/tickets/:id/logs", createWorkLog);
router.post("/api/tickets/:id/pause", pauseTicket);

router.get("/api/logs/:id", getWorkLog);
router.delete("/api/logs/:id", deleteWorkLog);

router.get("/api/notifications", listNotifications);
router.patch("/api/notifications/:id/read", markNotificationRead);

router.get("/api/search", searchWorkspace);
router.post("/api/git-commits", applyGitCommit);

router.get("/api/export", exportBackup);
router.post("/api/import", importBackup);
router.delete("/api/data", deleteAllData);

export default router;
