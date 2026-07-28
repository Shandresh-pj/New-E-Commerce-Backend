import { Router } from "express";
import { roleAccessController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

const adminRoles = [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER];

// =======================================
// CREATE ROLE ACCESS
// =======================================
/**
 * @swagger
 * /role-access:
 *   post:
 *     tags:
 *       - Role Access
 *     summary: Assign permission to role at a scope (admin / branch / employee)
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/role-access",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.create.bind(roleAccessController)
);

// =======================================
// BATCH / SYNC ROLE ACCESS
// =======================================
router.post(
  "/role-access/batch",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.batch.bind(roleAccessController)
);

router.put(
  "/role-access/batch",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.batch.bind(roleAccessController)
);

router.post(
  "/role-access/sync",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.batch.bind(roleAccessController)
);

// =======================================
// UPDATE ROLE ACCESS
// =======================================
router.put(
  "/role-access/:id",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.update.bind(roleAccessController)
);

// =======================================
// GET ALL ROLE ACCESS
// =======================================
router.get(
  "/role-access",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.getAll.bind(roleAccessController)
);

// =======================================
// GET BY ROLE
// =======================================
router.get(
  "/role-access/role/:role_id",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.getByRole.bind(roleAccessController)
);

// =======================================
// DELETE ROLE ACCESS
// =======================================
router.delete(
  "/role-access/:id",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.delete.bind(roleAccessController)
);

// =======================================
// APPROVE ROLE ACCESS
// =======================================
router.put(
  "/role-access/:id/approve",
  authenticateMiddleware,
  authorize({ roles: adminRoles }),
  roleAccessController.approve.bind(roleAccessController)
);

export default router;