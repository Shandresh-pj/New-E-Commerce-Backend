import { Router } from "express";
import { authController } from "../controllers";
import { uploadImage } from "../utils/upload";

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register User
 *     description: Create a new user account
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
 *                 
 *               email:
 *                 type: string
 *                 
 *               password:
 *                 type: string
 *                 
 *               mobilenumber:
 *                 type: string
 *                 
 *               address:
 *                 type: string
 *                 
 */
router.post(
  "/auth/register",uploadImage.upload.single("image"),uploadImage.compressor,
  authController.register.bind(authController)
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login User
 *     description: User login with email and password
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
 *               mobilenumber:
 *                 type: string                
 *               password:
 *                 type: string
 */
router.post(
  "/auth/login",
  authController.login.bind(authController)
);
// .bind(authController)



export default router;