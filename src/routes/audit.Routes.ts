import { Router } from "express";
import { auditLogsController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

router.get(
  "/audit",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  auditLogsController.getLogs.bind(auditLogsController)
);

router.delete(
  "/audit/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  auditLogsController.deleteLog.bind(auditLogsController)
);

export default router;
