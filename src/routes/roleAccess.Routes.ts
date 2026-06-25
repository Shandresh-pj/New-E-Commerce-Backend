import { Router } from "express";

import {
roleAccessController
} from "../controllers";

import authenticateMiddleware
from "../middleware/authenticate";

const router=Router();


// =======================================
// CREATE ROLE ACCESS
// =======================================

/**
 * @swagger
 * /role-access/create:
 *   post:
 *     tags:
 *       - Role Access
 *     summary: Assign permission to role
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_id
 *               - permission_id
 *             properties:
 *               role_id:
 *                 type: integer
 *                 example: 1
 *               permission_id:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Permission assigned successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Unauthorized
 */

router.post(
"/role-access/create",
authenticateMiddleware,
roleAccessController
.create
.bind(
roleAccessController
)
);


// =======================================
// GET ALL ROLE ACCESS
// =======================================

/**
 * @swagger
 * /role-access:
 *   get:
 *     tags:
 *       - Role Access
 *     summary: Get all role permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of permissions
 */

router.get(
"/role-access",
authenticateMiddleware,
roleAccessController
.getAll
.bind(
roleAccessController
)
);


// =======================================
// GET ROLE PERMISSIONS
// =======================================

/**
 * @swagger
 * /role-access/role/{role_id}:
 *   get:
 *     tags:
 *       - Role Access
 *     summary: Get permissions by role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role permissions
 */

router.get(
"/role-access/role/:role_id",
authenticateMiddleware,
roleAccessController
.getByRole
.bind(
roleAccessController
)
);




// =======================================
// DELETE ROLE ACCESS
// =======================================

/**
 * @swagger
 * /role-access/{id}:
 *   delete:
 *     tags:
 *       - Role Access
 *     summary: Remove permission from role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Permission removed
 *       404:
 *         description: Record not found
 */

router.delete(
"/role-access/:id",
authenticateMiddleware,
roleAccessController
.delete
.bind(
roleAccessController
)
);

export default router;