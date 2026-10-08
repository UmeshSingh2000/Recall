import healthRoutes from "./healthRoutes.js";
import pushTokenRoutes from "./pushTokenRoutes.js";
import clipboardRoutes from "./clipboardRoutes.js";
import gitCommitRoutes from "./gitCommitRoutes.js";
import summaryRoutes from "./summaryRoutes.js";
import v2Routes from "./v2Routes.js";

export function registerRoutes(app) {
  app.use(healthRoutes);
  app.use(pushTokenRoutes);
  app.use(clipboardRoutes);
  app.use(gitCommitRoutes);
  app.use(summaryRoutes);
  app.use(v2Routes)
}
