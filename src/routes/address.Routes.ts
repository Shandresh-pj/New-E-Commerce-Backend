import { Router } from "express";
import { profileController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Address
 *   description: Customer & User Saved Delivery Addresses Management
 */

/**
 * @swagger
 * /address:
 *   get:
 *     tags:
 *       - Address
 *     summary: Get all user addresses
 *     description: Returns all saved delivery addresses for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Addresses fetched successfully
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
 *                   example: "Addresses fetched successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       label:
 *                         type: string
 *                         example: "Home"
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                       phone:
 *                         type: string
 *                         example: "+919876543210"
 *                       line1:
 *                         type: string
 *                         example: "123 Main Street"
 *                       line2:
 *                         type: string
 *                         example: "Apartment 4B"
 *                       city:
 *                         type: string
 *                         example: "Bengaluru"
 *                       state:
 *                         type: string
 *                         example: "Karnataka"
 *                       pincode:
 *                         type: string
 *                         example: "560001"
 *                       isDefault:
 *                         type: boolean
 *                         example: true
 *                       latitude:
 *                         type: number
 *                         format: float
 *                         example: 12.9716000
 *                       longitude:
 *                         type: number
 *                         format: float
 *                         example: 77.5946000
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/address",
  authenticateMiddleware,
  authorize(),
  profileController.getAddresses.bind(profileController)
);

/**
 * @swagger
 * /address:
 *   post:
 *     tags:
 *       - Address
 *     summary: Add new delivery address
 *     description: Create a new delivery address for the authenticated user
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
 *               - phone
 *               - line1
 *               - city
 *               - state
 *               - pincode
 *             properties:
 *               label:
 *                 type: string
 *                 example: "Home"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               line1:
 *                 type: string
 *                 example: "123 Main Street"
 *               line2:
 *                 type: string
 *                 example: "Near City Park"
 *               city:
 *                 type: string
 *                 example: "Bengaluru"
 *               state:
 *                 type: string
 *                 example: "Karnataka"
 *               pincode:
 *                 type: string
 *                 example: "560001"
 *               isDefault:
 *                 type: boolean
 *                 example: true
 *               receiver_type:
 *                 type: string
 *                 example: "myself"
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: 12.9716000
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: 77.5946000
 *     responses:
 *       201:
 *         description: Address saved successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User account not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/address",
  authenticateMiddleware,
  authorize(),
  profileController.addAddress.bind(profileController)
);

/**
 * @swagger
 * /address/{id}:
 *   put:
 *     tags:
 *       - Address
 *     summary: Update address
 *     description: Update an existing delivery address for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Address ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:
 *                 type: string
 *                 example: "Office"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *               line1:
 *                 type: string
 *                 example: "456 Tech Park"
 *               line2:
 *                 type: string
 *                 example: "Building 3"
 *               city:
 *                 type: string
 *                 example: "Bengaluru"
 *               state:
 *                 type: string
 *                 example: "Karnataka"
 *               pincode:
 *                 type: string
 *                 example: "560100"
 *               isDefault:
 *                 type: boolean
 *                 example: false
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: 12.9716000
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: 77.5946000
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/address/:id",
  authenticateMiddleware,
  authorize(),
  profileController.updateAddress.bind(profileController)
);

/**
 * @swagger
 * /address/{id}:
 *   delete:
 *     tags:
 *       - Address
 *     summary: Delete address
 *     description: Delete a saved delivery address by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/address/:id",
  authenticateMiddleware,
  authorize(),
  profileController.deleteAddress.bind(profileController)
);

/**
 * @swagger
 * /address/{id}/default:
 *   patch:
 *     tags:
 *       - Address
 *     summary: Set default delivery address
 *     description: Mark an address as the default delivery address for the user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Default address updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Internal server error
 */
router.patch(
  "/address/:id/default",
  authenticateMiddleware,
  authorize(),
  profileController.setDefaultAddress.bind(profileController)
);

export default router;
