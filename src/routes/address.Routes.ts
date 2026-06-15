import { Router, Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import authenticateMiddleware from "../middleware/authenticate";
import { dataSource } from "../server";
import { UserAddress } from "../entities/userAddress";
import { Register } from "../entities/register";

interface AuthRequest extends Request {
  user?: string | JwtPayload;
}

const router = Router();

function getUserId(req: AuthRequest): number | null {
  const id = (req.user as JwtPayload)?.id;
  return id != null ? Number(id) : null;
}

/**
 * @swagger
 * tags:
 *   name: Address
 *   description: User delivery address management
 */

/**
 * @swagger
 * /address:
 *   get:
 *     tags:
 *       - Address
 *     summary: Get all addresses
 *     description: Returns all saved delivery addresses for the logged-in user
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Address'
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/address",
  authenticateMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, message: "Invalid token: user ID missing" });
      }

      const addresses = await dataSource.getRepository(UserAddress).find({
        where: { userId },
        order: { isDefault: "DESC", created_at: "DESC" },
      }); 

      return res.json({ success: true, message: "Addresses fetched successfully", data: addresses });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /address:
 *   post:
 *     tags:
 *       - Address
 *     summary: Add new address
 *     description: Create a new delivery address for the logged-in user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressInput'
 *     responses:
 *       201:
 *         description: Address saved successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/address",
  authenticateMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, message: "Invalid token: user ID missing" });
      }

      const { label, name, phone, line1, line2, city, state, pincode, isDefault } = req.body;

      if (!name || !phone || !line1 || !city || !state || !pincode) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }

      const userExists = await dataSource.getRepository(Register).findOne({ where: { id: userId } });
      if (!userExists) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const repository = dataSource.getRepository(UserAddress);

      if (isDefault) {
        await repository.update({ userId }, { isDefault: false });
      }

      const address = repository.create({
        userId,
        label: label || "Home",
        name,
        phone,
        line1,
        line2: line2 || "",
        city,
        state,
        pincode,
        isDefault: !!isDefault,
      });

      await repository.save(address);

      return res.status(201).json({
        success: true,
        message: "Address saved successfully",
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /address/{id}:
 *   put:
 *     tags:
 *       - Address
 *     summary: Update address
 *     description: Update an existing delivery address
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
 *             $ref: '#/components/schemas/AddressInput'
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       404:
 *         description: Address not found
 *       401:
 *         description: Unauthorized
 */
router.put(
  "/address/:id",
  authenticateMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, message: "Invalid token: user ID missing" });
      }

      const { label, name, phone, line1, line2, city, state, pincode, isDefault } = req.body;
      const repository = dataSource.getRepository(UserAddress);

      const address = await repository.findOne({
        where: { id: Number(req.params.id), userId },
      });

      if (!address) {
        return res.status(404).json({ success: false, message: "Address not found" });
      }

      if (isDefault) {
        await repository.update({ userId }, { isDefault: false });
      }

      await repository.update(Number(req.params.id), {
        label: label || address.label,
        name: name || address.name,
        phone: phone || address.phone,
        line1: line1 || address.line1,
        line2: line2 ?? address.line2,
        city: city || address.city,
        state: state || address.state,
        pincode: pincode || address.pincode,
        isDefault: !!isDefault,
      });

      return res.json({ success: true, message: "Address updated successfully" });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /address/{id}:
 *   delete:
 *     tags:
 *       - Address
 *     summary: Delete address
 *     description: Delete a saved delivery address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       404:
 *         description: Address not found
 *       401:
 *         description: Unauthorized
 */
router.delete(
  "/address/:id",
  authenticateMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, message: "Invalid token: user ID missing" });
      }

      const repository = dataSource.getRepository(UserAddress);

      const result = await repository.delete({
        id: Number(req.params.id),
        userId,
      });

      if (!result.affected) {
        return res.status(404).json({ success: false, message: "Address not found" });
      }

      return res.json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /address/{id}/default:
 *   patch:
 *     tags:
 *       - Address
 *     summary: Set default address
 *     description: Mark an address as the default delivery address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Default address updated
 *       404:
 *         description: Address not found
 *       401:
 *         description: Unauthorized
 */
router.patch(
  "/address/:id/default",
  authenticateMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ success: false, message: "Invalid token: user ID missing" });
      }

      const repository = dataSource.getRepository(UserAddress);

      const address = await repository.findOne({
        where: { id: Number(req.params.id), userId },
      });

      if (!address) {
        return res.status(404).json({ success: false, message: "Address not found" });
      }

      await repository.update({ userId }, { isDefault: false });
      await repository.update(Number(req.params.id), { isDefault: true });

      return res.json({ success: true, message: "Default address updated" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
