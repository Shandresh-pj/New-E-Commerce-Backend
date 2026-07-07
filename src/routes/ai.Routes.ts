import { Router } from "express";
import { aiController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

// ================= GENERATE DESCRIPTION =================
router.post(
  "/ai/generate-description",
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
  aiController.generateDescription.bind(aiController)
);

// ================= AUDIT PRODUCT =================
router.post(
  "/ai/audit-product",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  aiController.auditProduct.bind(aiController)
);

export default router;
