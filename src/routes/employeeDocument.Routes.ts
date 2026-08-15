import { Router } from "express";
import { EmployeeDocumentController } from "../controllers/employee-document.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

/**
 * @swagger
 * /employee-documents:
 *   get:
 *     summary: List Employee Documents
 *     description: Retrieve uploaded employee documents (identity proofs, certifications, contracts).
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: integer
 *         description: Filter documents by employee ID
 *     responses:
 *       200:
 *         description: List of documents retrieved
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/employee-documents", authenticateMiddleware, EmployeeDocumentController.getDocuments);

/**
 * @swagger
 * /employee-documents:
 *   post:
 *     summary: Upload Employee Document
 *     description: Upload a new document for an employee.
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - documentType
 *               - file
 *             properties:
 *               employeeId:
 *                 type: integer
 *               documentType:
 *                 type: string
 *                 example: "PASSPORT"
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/employee-documents", authenticateMiddleware, EmployeeDocumentController.uploadDocument);

/**
 * @swagger
 * /employee-documents/{id}/verify:
 *   put:
 *     summary: Verify Employee Document
 *     description: Mark an employee document as verified or rejected by HR/Admin.
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [VERIFIED, REJECTED]
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document verification status updated
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/employee-documents/:id/verify", authenticateMiddleware, EmployeeDocumentController.verifyDocument);
router.post("/employee-documents/:id/verify", authenticateMiddleware, EmployeeDocumentController.verifyDocument);

export default router;
