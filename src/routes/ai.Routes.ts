import { Router } from "express";
import { aiController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /ai/generate-description:
 *   post:
 *     summary: Generate AI Product Description
 *     description: Uses AI to generate structured marketing & technical product descriptions based on product parameters.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: "DTH HD Set Top Box"
 *               category:
 *                 type: string
 *                 example: "Set Top Boxes"
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["1080p Full HD", "Dolby Audio", "Universal Remote"]
 *     responses:
 *       200:
 *         description: Generated description successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 description:
 *                   type: string
 *                   example: "High-definition DTH receiver with crystal-clear 1080p visual fidelity and immersive sound..."
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/ai/generate-description",
  authenticateMiddleware,
  authorize({
    roles: [
      UserType.SUPER_ADMIN,
      UserType.ADMIN,
      UserType.BRANCH,
      UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER,
    ],
  }),
  aiController.generateDescription.bind(aiController)
);

/**
 * @swagger
 * /ai/audit-product:
 *   post:
 *     summary: Audit Product Quality via AI
 *     description: Analyzes product information and images for completeness, compliance, and SEO optimization.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: integer
 *                 example: 101
 *     responses:
 *       200:
 *         description: Product audit report generated
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/ai/audit-product",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  aiController.auditProduct.bind(aiController)
);

export default router;
