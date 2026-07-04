import { Router } from "express";
import { authController, companyController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { verifyEmailLimiter } from "../controllers/company.Controller";
import { UserType } from "../utils/Role-Access";

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
  "/auth/select-context",authenticateMiddleware,
  authController.selectContext.bind(authController)
);

/**
 * @swagger
 * /auth/create-user:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Select Company Context
 *     description: Select company, branch and role after login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *            schema:
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
 *               userType : 
 *                 type: string
 *     responses:
 *       200:
 *         description: Context selected successfully
 */
router.post(
  "/auth/create-user",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  authController.createUser.bind(authController)
);

/**
 * @swagger
 * /auth/user/{:id}:
 *   get:
 *     tags:
 *       - Auth
 *     summary: get Id Based On User
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
 *               
 *     responses:
 *       201:
 *         description: User created successfully
 *       403:
 *         description: Access denied
 */
router.get(
  "/auth/user/:id",
  authenticateMiddleware,
  authorize(),
  authController.getUserById.bind(authController)
);

/**
 * @swagger
 * /auth/get-users:
 *   get:
 *     tags:
 *       - Auth
 *     summary: All Users 
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
router.get(
  "/auth/get-users",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  authController.getUsers.bind(authController)
);

/**
 * @swagger
 * /auth/delete/{:id}:
 *   delete:
 *     tags:
 *       - Auth
 *     summary: Delete Users
 *     description: Select company, branch 
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
router.delete(
  "/auth/delete/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  auditMiddleware("USER"),
  authController.deleteUser.bind(authController)
);

router.put(
  "/auth/admin-set-password/:userId",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  authController.adminSetPassword.bind(authController)
);



 /**
 * @swagger
 * /auth/verify/{token}:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Verify user email
 *     description: Verify email using verification token sent to user email
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Email verified successfully
 *
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid or already used token
 *
 *       500:
 *         description: Internal server error
 */
router.get(
  "/verify/:token",
  verifyEmailLimiter,
  companyController.verifyEmail.bind(companyController)
);

export default router;