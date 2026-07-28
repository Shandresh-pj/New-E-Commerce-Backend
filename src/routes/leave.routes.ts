import { Router } from "express";
import { leaveController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

const allRoles = [
  UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER,
  UserType.SHOPKEEPER, UserType.DELIVERY_BOY, UserType.EMPLOYEE
];

/**
 * @swagger
 * /leave/apply:
 *   post:
 *     summary: Apply Leave
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/leave/apply",
  authenticateMiddleware,
  authorize({ roles: allRoles }),
  auditMiddleware("LEAVE_APPLY"),
  leaveController.apply.bind(leaveController)
);

/**
 * @swagger
 * /leave/balance:
 *   get:
 *     summary: Get Leave Balances for Employee
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  ["/leave/balance", "/leave/balance/:id"],
  authenticateMiddleware,
  authorize({ roles: allRoles }),
  leaveController.getBalance.bind(leaveController)
);

/**
 * @swagger
 * /leave/history:
 *   get:
 *     summary: Get Leave History for Employee
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  ["/leave/history", "/leave/history/:id"],
  authenticateMiddleware,
  authorize({ roles: allRoles }),
  leaveController.getHistory.bind(leaveController)
);

/**
 * @swagger
 * /leave:
 *   get:
 *     summary: Get Leave Requests
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/leave",
  authenticateMiddleware,
  authorize({ roles: allRoles }),
  leaveController.getAll.bind(leaveController)
);

/**
 * @swagger
 * /leave/approve/{id}:
 *   put:
 *     summary: Approve Leave
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/leave/approve/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
    requireApproval: true,
  }),
  auditMiddleware("LEAVE_APPROVE"),
  leaveController.approve.bind(leaveController)
);

/**
 * @swagger
 * /leave/reject/{id}:
 *   put:
 *     summary: Reject Leave
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/leave/reject/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
    requireApproval: true,
  }),
  auditMiddleware("LEAVE_REJECT"),
  leaveController.reject.bind(leaveController)
);

/**
 * @swagger
 * /leave/{id}:
 *   delete:
 *     summary: Delete Leave
 *     tags: [Leave]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/leave/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  auditMiddleware("LEAVE_DELETE"),
  leaveController.delete.bind(leaveController)
);

export default router;
