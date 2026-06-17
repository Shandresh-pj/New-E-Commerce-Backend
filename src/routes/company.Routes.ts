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

export default router;