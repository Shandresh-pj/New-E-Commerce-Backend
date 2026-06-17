import { Router } from "express";
import { authController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register User
 *     description: Create normal user with default role (Customer)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               mobilenumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created
 *       400:
 *         description: Email already exists
 */
router.post(
  "/auth/register",
  authController.register.bind(authController)
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login User
 *     description: Login using email or mobile number.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               mobilenumber:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login success
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/auth/login",
  authController.login.bind(authController)
);

/**
 * @swagger
 * /auth/create-superadmin:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Create SuperAdmin
 *     description: Bootstrap super admin (run only once)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               mobilenumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: SuperAdmin created
 *       400:
 *         description: Already exists
 */
router.post(
  "/auth/create-superadmin",
  authController.createSuperAdmin.bind(authController)
);

/**
 * @swagger
 * /auth/select-context:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Select Company Context
 *     description: Select company, branch and role after login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - company_id
 *               - role_id
 *             properties:
 *               user_id:
 *                 type: number
 *               company_id:
 *                 type: number
 *               branch_id:
 *                 type: number
 *               role_id:
 *                 type: number
 *     responses:
 *       200:
 *         description: Context selected successfully
 */
router.post(
  "/auth/select-context",
  authController.selectContext.bind(authController)
);

export default router;