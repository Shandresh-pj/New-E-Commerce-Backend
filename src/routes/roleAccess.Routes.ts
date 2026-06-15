import { Router } from "express";
import { roleAccessController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /role-access/create:
 *   post:
 *     summary: Create Role Access
 *     tags: [Role Access]
 *     responses:
 *       200:
 *         description: Role access created successfully
 */
router.post(
  "/role-access/create",
  roleAccessController.create.bind(
    roleAccessController
  )
);

/**
 * @swagger
 * /role-access:
 *   get:
 *     summary: Get Role Access List
 *     tags: [Role Access]
 *     responses:
 *       200:
 *         description: Role access fetched successfully
 */
router.get(
  "/role-access",
  roleAccessController.getAll.bind(
    roleAccessController
  )
);

/**
 * @swagger
 * /role-access/{id}:
 *   get:
 *     summary: Get Role Access By ID
 *     tags: [Role Access]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role access fetched successfully
 */
router.get(
  "/role-access/:id",
  roleAccessController.getOne.bind(
    roleAccessController
  )
);

export default router;