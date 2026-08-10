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
 *     summary: Create User (Admin Only)
 *     description: Admin/SuperAdmin can create system users with assigned role and branch
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
 *               - password
 *               - userType
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jane Smith"
 *                 description: User full name (Required)
 *               email:
 *                 type: string
 *                 example: "jane.smith@example.com"
 *                 description: User email address (Required)
 *               password:
 *                 type: string
 *                 example: "Password@123"
 *                 description: User password (Required)
 *               mobilenumber:
 *                 type: string
 *                 example: "+919876543211"
 *                 description: User mobile number (Optional)
 *               userType:
 *                 type: string
 *                 enum: [ADMIN, BRANCH_MANAGER, SHOPKEEPER, DELIVERY_BOY, EMPLOYEE, CUSTOMER]
 *                 example: "EMPLOYEE"
 *                 description: Role assigned to user (Required)
 *               branchId:
 *                 type: string
 *                 example: "br_001"
 *                 description: Assigned branch ID (Optional)
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input or email already exists
 *       403:
 *         description: Access denied
 */
router.post(
  "/auth/create-user",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  authController.createUser.bind(authController)
);

/**
 * @swagger
 * /auth/user/{id}:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get User By ID
 *     description: Fetch detailed profile of a user by user ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID (Required)
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       404:
 *         description: User not found
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
 *     summary: Get All Users
 *     description: Retrieve list of all registered users with optional search and role filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (Optional)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page (Optional)
 *       - in: query
 *         name: role
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by user role (Optional)
 *     responses:
 *       200:
 *         description: List of users retrieved
 */
router.get(
  "/auth/get-users",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  authController.getUsers.bind(authController)
);

/**
 * @swagger
 * /auth/delete/{id}:
 *   delete:
 *     tags:
 *       - Auth
 *     summary: Delete User
 *     description: Delete a user profile by ID (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete (Required)
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete(
  "/auth/delete/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  auditMiddleware("USER"),
  authController.deleteUser.bind(authController)
);

/**
 * @swagger
 * /auth/admin-set-password/{userId}:
 *   put:
 *     summary: Admin Override User Password
 *     description: Directly update a user's password without requiring old password verification (Super Admin only).
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of user whose password is being reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: "AdminResetPass123!"
 *                 description: New secure password (min 6 characters)
 *     responses:
 *       200:
 *         description: User password updated successfully
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
 *                   example: "User password updated successfully"
 *       400:
 *         description: Invalid password format or missing parameter
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Super Admin required
 *       404:
 *         description: User not found
 */
router.put(
  "/auth/admin-set-password/:userId",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN] }),
  authController.adminSetPassword.bind(authController)
);

/**
 * @swagger
 * /auth/me/permissions:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get my current roles/permissions/menus
 *     description: >
 *       Recomputes roles/permissions/menus from the DB for the logged-in user.
 *       Call this after a "permissions-updated" socket event to refresh access
 *       without requiring a new login.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current access data
 *       404:
 *         description: User not found
 */
router.get(
  "/auth/me/permissions",
  authenticateMiddleware,
  authController.getMyPermissions.bind(authController)
);

/**
 * @swagger
 * /auth/verify/{token}:
 *   get:
 *     tags:
 *       - Auth
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
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Internal server error
 */
router.get(
  "/auth/verify/:token",
  verifyEmailLimiter,
  companyController.verifyEmail.bind(companyController)
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh Access Token
 *     description: Exchange a valid refresh token for a new short-lived JWT access token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsIn..."
 *                 description: Valid refresh token string
 *     responses:
 *       200:
 *         description: New access token issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsIn..."
 *       400:
 *         description: Missing or invalid refresh token
 *       401:
 *         description: Token expired or revoked
 */
router.post(
  "/auth/refresh",
  authController.refresh.bind(authController)
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: User Logout
 *     description: Invalidate refresh token and clear active user session.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsIn..."
 *     responses:
 *       200:
 *         description: Logged out successfully
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
 *                   example: "Logged out successfully"
 */
router.post(
  "/auth/logout",
  authController.logout.bind(authController)
);

export default router;