import { Router } from "express";
import { authController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate";

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
 *     summary: Login
 *     description: Login for Super Admin, Admin, Branch Manager, Employee and Customer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@gmail.com
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login successful
 *       403:
 *         description: Password change required
 */
router.post(
  "/auth/login",
  authController.login.bind(
    authController
  )
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
  "/auth/create-superadmin",authenticateMiddleware,
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


/**
 * @swagger
 * /auth/create-user:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Create User
 *     description: Super Admin can create Admin, Branch Manager, Employee and Customer users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - userType
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               mobilenumber:
 *                 type: string
 *               userType:
 *                 type: string
 *                 enum:
 *                   - Admin
 *                   - Branches
 *                   - Employees
 *                   - Customer
 *               company_id:
 *                 type: number
 *               branch_id:
 *                 type: number
 *               role_id:
 *                 type: number
 *     responses:
 *       201:
 *         description: User created successfully
 *       403:
 *         description: Access denied
 */
router.post(
  "/auth/create-user",
  authController.createUser.bind(
    authController
  )
);
export default router;