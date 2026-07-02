import { Router } from "express";
import { leaveController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

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
  authorize({
    roles: [
      UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER, UserType.DELIVERY_BOY, UserType.EMPLOYEE,
    ],
  }),
  leaveController.apply.bind(leaveController)
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
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
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
  leaveController.approve.bind(leaveController)
);

export default router;
