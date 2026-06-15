import { authController } from "../controllers";
import { uploadImage } from "../utils/upload";

import { Router } from "express";
const router = Router();


/**
 * @swagger
 * /profile/all:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get All Profiles
 *     description: Retrieve all user profiles
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
 *                 users:
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
 */
router.get(
  "/profile/all",
  authController.getAll.bind(authController)
);


/**
 * @swagger
 * /profile/{id}:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get Profile By Id
 *     description: Retrieve a single profile
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get(
  "/profile/:id",
  authController.getById.bind(authController)
);


/**
 * @swagger
 * /profile/add:
 *   post:
 *     tags:
 *       - Profile
 *     summary: Create Profile
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
 */
router.post(
  "/profile/add",
  uploadImage.upload.single("image"),uploadImage.compressor,
  authController.create.bind(authController)
);

/**
 * @swagger
 * /profile/{id}:
 *   put:
 *     tags:
 *       - Profile
 *     summary: Update Profile
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 */
router.put(
  "/profile/:id",
  uploadImage.upload.single("image"),uploadImage.compressor,
  authController.update.bind(authController)
);

/**
 * @swagger
 * /profile/{id}:
 *   delete:
 *     tags:
 *       - Profile
 *     summary: Delete Profile
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.delete(
  "/profile/:id",
  authController.delete.bind(authController)
);

export default router;