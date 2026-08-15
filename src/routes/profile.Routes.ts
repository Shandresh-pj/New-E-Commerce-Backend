import { authController, profileController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { uploadImage } from "../utils/upload";
import { UserType } from "../utils/Role-Access";

import { Router } from "express";
const router = Router();


/**
 * @swagger
 * /profile/all:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get All Profiles
 *     description: Retrieve all user profiles with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Profiles fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 total:
 *                   type: integer
 *                   example: 25
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       mobilenumber:
 *                         type: string
 *                       address:
 *                         type: string
 *                       image:
 *                         type: string
 *                       usertype:
 *                         type: string
 *                       status:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.get(
  "/profile/all",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.CUSTOMER],
    menu: "Profile",
    action: "READ"
  }),
  profileController.getAll.bind(profileController)
);


/**
 * @swagger
 * /profile/{id}:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get Profile By Id
 *     description: Retrieve a single profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Profile ID
 *     responses:
 *       200:
 *         description: Profile details retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/profile/:id",
  authenticateMiddleware,
  authorize(),
  profileController.getById.bind(profileController)
);


/**
 * @swagger
 * /profile/add:
 *   post:
 *     tags:
 *       - Profile
 *     summary: Create Profile
 *     description: Create user profile with optional multipart image upload
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - mobilenumber
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               mobilenumber:
 *                 type: string
 *               address:
 *                 type: string
 *               usertype:
 *                 type: string
 *               status:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Profile created successfully
 *       400:
 *         description: Validation failed or user already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/profile/add",
  authenticateMiddleware,
  authorize(),
  uploadImage.upload.fields([
    { name: "image", maxCount: 1 },
    { name: "profile_image", maxCount: 1 },
    { name: "background_image", maxCount: 1 },
    { name: "cover_image", maxCount: 1 }
  ]), uploadImage.compressor,
  profileController.create.bind(profileController)
);

/**
 * @swagger
 * /profile/{id}:
 *   put:
 *     tags:
 *       - Profile
 *     summary: Update Profile
 *     description: Update profile details with optional image upload
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Profile ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               mobilenumber:
 *                 type: string
 *               address:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/profile/:id",
  authenticateMiddleware,
  authorize(),
  uploadImage.upload.fields([
    { name: "image", maxCount: 1 },
    { name: "profile_image", maxCount: 1 },
    { name: "background_image", maxCount: 1 },
    { name: "cover_image", maxCount: 1 }
  ]), uploadImage.compressor,
  profileController.update.bind(profileController)
);

/**
 * @swagger
 * /profile/{id}:
 *   delete:
 *     tags:
 *       - Profile
 *     summary: Delete Profile
 *     description: Delete a user profile (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Profile ID
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/profile/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
    menu: "Profile",
    action: "DELETE"
  }),
  profileController.delete.bind(profileController)
);

export default router;