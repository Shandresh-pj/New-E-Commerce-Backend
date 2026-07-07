import { Router } from "express";
import { approvalsController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

// ================= LIST ALL APPROVAL REQUESTS =================
router.get(
  "/approvals",
  authenticateMiddleware,
  authorize({
    roles: [
      UserType.SUPER_ADMIN,
      UserType.ADMIN,
      UserType.BRANCH,
      UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER,
      UserType.EMPLOYEE,
    ],
  }),
  approvalsController.getAll.bind(approvalsController)
);

// ================= GET SINGLE APPROVAL REQUEST =================
router.get(
  "/approvals/:id",
  authenticateMiddleware,
  authorize({
    roles: [
      UserType.SUPER_ADMIN,
      UserType.ADMIN,
      UserType.BRANCH,
      UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER,
      UserType.EMPLOYEE,
    ],
  }),
  approvalsController.getById.bind(approvalsController)
);

// ================= TAKE ACTION ON REQUEST =================
router.post(
  "/approvals/:id/action",
  authenticateMiddleware,
  authorize({
    roles: [
      UserType.SUPER_ADMIN,
      UserType.ADMIN,
      UserType.BRANCH,
      UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER,
    ],
  }),
  auditMiddleware("PRODUCT_APPROVAL"),
  approvalsController.takeAction.bind(approvalsController)
);

// ================= BULK ACTIONS =================
router.post(
  "/approvals/bulk-action",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  auditMiddleware("PRODUCT_APPROVAL"),
  approvalsController.bulkAction.bind(approvalsController)
);

export default router;
