import { Router } from "express";
import { auditLogsController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

router.get(
  "/audit",
  authenticateMiddleware,
  auditLogsController.getLogs.bind(auditLogsController)
);

router.delete(
  "/audit/:id",
  authenticateMiddleware,
  auditLogsController.deleteLog.bind(auditLogsController)
);

export default router;
