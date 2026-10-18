import { Router } from "express";
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
} from "../controllers/ticketController.js";
import { requireNeonAuth } from "../middleware/requireNeonAuth.js";

const router = Router();
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
router.post("/api/tickets/:id/logs", createWorkLog);
router.post("/api/tickets/:id/pause", pauseTicket);

router.get("/api/logs/:id", getWorkLog);
router.delete("/api/logs/:id", deleteWorkLog);

router.get("/api/search", searchWorkspace);
router.post("/api/git-commits", applyGitCommit);

router.get("/api/export", exportBackup);
router.post("/api/import", importBackup);
router.delete("/api/data", deleteAllData);

export default router;
