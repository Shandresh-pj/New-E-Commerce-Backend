import { Router } from "express";
import { CustomerManagementController } from "../controllers/customer.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();
const customerController = new CustomerManagementController();

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer management and order statistics
 */

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: List Customers
 *     description: Retrieve all customers with aggregated order count, spending totals, and account statistics.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone number
 *         example: "john"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Customer list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: integer
 *                   example: 120
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 50
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 10
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                       email:
 *                         type: string
 *                         example: "john.doe@example.com"
 *                       phone:
 *                         type: string
 *                         example: "+919876543210"
 *                       mobilenumber:
 *                         type: string
 *                         example: "+919876543210"
 *                       address:
 *                         type: string
 *                         example: "123 Main Street, Chennai"
 *                       status:
 *                         type: string
 *                         enum: [ACTIVE, INACTIVE]
 *                         example: "ACTIVE"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       total_orders:
 *                         type: integer
 *                         example: 5
 *                       total_spent:
 *                         type: number
 *                         example: 4999.00
 *                       last_order_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: "2026-08-10T14:30:00.000Z"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-01-15T09:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create Customer
 *     description: Create a new customer account profile.
 *     tags: [Customers]
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
 *                 example: "Jane Doe"
 *                 description: "**REQUIRED** Customer full name"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane.doe@example.com"
 *                 description: "**REQUIRED** Customer email address (must be unique)"
 *               phone:
 *                 type: string
 *                 example: "+919876543211"
 *                 description: Customer mobile phone number
 *               mobilenumber:
 *                 type: string
 *                 example: "+919876543211"
 *                 description: Alternate phone field
 *               address:
 *                 type: string
 *                 example: "Flat 4B, Green Park, Bangalore"
 *                 description: Customer billing or shipping address
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecretPass@123"
 *                 description: Initial password (if omitted, auto-generated)
 *     responses:
 *       201:
 *         description: Customer created successfully
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
 *                   example: "Customer created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 15
 *                     name:
 *                       type: string
 *                       example: "Jane Doe"
 *                     email:
 *                       type: string
 *                       example: "jane.doe@example.com"
 *                     phone:
 *                       type: string
 *                       example: "+919876543211"
 *                     address:
 *                       type: string
 *                       example: "Flat 4B, Green Park, Bangalore"
 *       400:
 *         description: Validation failed or duplicate email
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/customers", authenticateMiddleware, customerController.getCustomers.bind(customerController));
router.post("/customers", authenticateMiddleware, customerController.createCustomer.bind(customerController));

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     summary: Get Customer Details
 *     description: Retrieve detailed customer profile including order history and total spend.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer User ID
 *         example: 10
 *     responses:
 *       200:
 *         description: Customer profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 10
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     phone:
 *                       type: string
 *                       example: "+919876543210"
 *                     address:
 *                       type: string
 *                       example: "123 Main Street, Chennai"
 *                     status:
 *                       type: string
 *                       example: "ACTIVE"
 *                     total_orders:
 *                       type: integer
 *                       example: 5
 *                     total_spent:
 *                       type: number
 *                       example: 4999.00
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 *   put:
 *     summary: Update Customer Details
 *     description: Full or partial update of customer contact and address details.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer User ID
 *         example: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Updated Doe"
 *               email:
 *                 type: string
 *                 example: "john.updated@example.com"
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               address:
 *                 type: string
 *                 example: "456 New Road, Chennai"
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 example: "ACTIVE"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Customer profile updated successfully
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
 *                   example: "Customer updated successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Patch Customer Details
 *     description: Partially update specific customer fields.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer User ID
 *         example: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               status:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Customer profile patched successfully
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
 *                   example: "Customer updated successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Deactivate Customer
 *     description: Soft-delete / deactivate a customer account.
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer User ID
 *         example: 10
 *     responses:
 *       200:
 *         description: Customer deactivated successfully
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
 *                   example: "Customer deactivated successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
router.get("/customers/:id", authenticateMiddleware, customerController.getCustomerById.bind(customerController));
router.put("/customers/:id", authenticateMiddleware, customerController.updateCustomer.bind(customerController));
router.patch("/customers/:id", authenticateMiddleware, customerController.updateCustomer.bind(customerController));
router.delete("/customers/:id", authenticateMiddleware, customerController.deleteCustomer.bind(customerController));

export default router;
