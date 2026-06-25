import { Router } from "express";
import { companyController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate";

const router = Router();

/**
 * @swagger
 * /companies:
 *   post:
 *     tags:
 *       - Company
 *     summary: Create Company
 *     description: Only SuperAdmin can create company
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
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               gst_number:
 *                 type: string
 *     responses:
 *       201:
 *         description: Company created successfully
 *       403:
 *         description: Forbidden
 */
router.post(
  "/companies",
  authenticateMiddleware,
  companyController.create.bind(companyController)
);

/**
 * @swagger
 * /companies/{id}:
 *   put:
 *     tags:
 *       - Company
 *     summary: Update Company
 *     description: Only SuperAdmin can update company
 *     security:
 *       - bearerAuth: []
 *
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *                 example: SVK DTH WORLD
 *
 *               email:
 *                 type: string
 *                 example: svk@gmail.com
 *
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *
 *               address:
 *                 type: string
 *                 example: T.VADIPATTI, MADURAI
 *
 *               gst_number:
 *                 type: string
 *                 example: 33ABCDE1234F1Z5
 *
 */
router.put(
  "/companies/:id",
  authenticateMiddleware,
  companyController.update.bind(
    companyController
  )
);


/**
 * @swagger
 * /companies:
 *   get:
 *     tags:
 *       - Company
 *     summary: Get All Companies
 */
router.get(
  "/companies",
  authenticateMiddleware,
  companyController.getAll.bind(companyController)
);

/**
 * @swagger
 * /companies/{id}:
 *   get:
 *     tags:
 *       - Company
 *     summary: Get Company By ID
 */
router.get(
  "/companies/:id",
  authenticateMiddleware,
  companyController.getOne.bind(companyController)
);

/**
 * @swagger
 * /companies/{id}:
 *   delete:
 *     tags:
 *       - Company
 *     summary: Delete company
 *     description: Delete a company and its related records (branches, role mappings, etc). Only Super Admin can perform this action.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company deleted successfully
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
 *                   example: Company deleted successfully
 *
 *       403:
 *         description: Unauthorized access
 *
 *       404:
 *         description: Company not found
 *
 *       500:
 *         description: Internal server error
 */
router.delete(
"/companies/:id",
authenticateMiddleware,
companyController.delete.bind(
companyController
)
);

export default router;