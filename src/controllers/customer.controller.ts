import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import dataSource from "../config/database";
import { User } from "../entities/user";
import { Order } from "../entities/order";
import { UserType } from "../utils/Role-Access";

export class CustomerManagementController {

  /**
   * GET /customers
   * List customers with aggregated order statistics
   */
  public async getCustomers(req: any, res: Response) {
    try {
      const userRepo = dataSource.getRepository(User);
      const orderRepo = dataSource.getRepository(Order);

      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 50);
      const search = String(req.query.search || "").trim().toLowerCase();

      const qb = userRepo.createQueryBuilder("user")
        .where("user.userType = :type", { type: UserType.CUSTOMER });

      if (search) {
        qb.andWhere("(LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search OR LOWER(user.mobilenumber) LIKE :search)", {
          search: `%${search}%`
        });
      }

      const [users, total] = await qb
        .orderBy("user.id", "DESC")
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      // Aggregate order statistics per customer
      const enriched = await Promise.all(
        users.map(async (u) => {
          const orders = await orderRepo.find({
            where: { user_id: u.id },
            order: { created_at: "DESC" },
          });

          const totalSpent = orders.reduce((sum, ord) => sum + Number(ord.total || 0), 0);
          const totalOrders = orders.length;
          const lastOrderDate = orders.length > 0 ? orders[0].created_at : null;

          return {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.mobilenumber || "N/A",
            mobilenumber: u.mobilenumber || "N/A",
            address: u.address || "",
            status: u.isActive ? "ACTIVE" : "INACTIVE",
            isActive: u.isActive,
            total_orders: totalOrders,
            totalOrders,
            total_spent: totalSpent,
            totalSpent,
            last_order_date: lastOrderDate,
            lastOrderDate,
            created_at: u.created_at,
          };
        })
      );

      return res.json({
        success: true,
        data: enriched,
        total,
        page,
        limit,
      });
    } catch (err: any) {
      console.error("[CustomerManagementController.getCustomers Error]:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch customers" });
    }
  }

  /**
   * POST /customers
   * Create new customer
   */
  public async createCustomer(req: any, res: Response) {
    try {
      const { name, email, phone, mobilenumber, address, password } = req.body;
      const effPhone = phone || mobilenumber;

      if (!name || !email) {
        return res.status(400).json({ success: false, message: "Name and email are required" });
      }

      const userRepo = dataSource.getRepository(User);
      const existing = await userRepo.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ success: false, message: "User with this email already exists" });
      }

      const rawPassword = password || `Cust@${Date.now().toString().slice(-4)}`;
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      const customer = userRepo.create({
        name,
        email,
        password: hashedPassword,
        mobilenumber: effPhone || null,
        address: address || null,
        userType: UserType.CUSTOMER,
        isActive: true,
        emailVerified: true,
        mustChangePassword: false,
      });

      const saved = await userRepo.save(customer);

      return res.status(201).json({
        success: true,
        message: "Customer created successfully",
        data: {
          id: saved.id,
          name: saved.name,
          email: saved.email,
          phone: saved.mobilenumber,
          address: saved.address,
          status: "ACTIVE",
          total_orders: 0,
          total_spent: 0,
        },
      });
    } catch (err: any) {
      console.error("[CustomerManagementController.createCustomer Error]:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to create customer" });
    }
  }

  /**
   * GET /customers/:id
   * Get single customer with order history
   */
  public async getCustomerById(req: any, res: Response) {
    try {
      const id = Number(req.params.id);
      const userRepo = dataSource.getRepository(User);
      const orderRepo = dataSource.getRepository(Order);

      const user = await userRepo.findOne({ where: { id } });
      if (!user) {
        return res.status(404).json({ success: false, message: "Customer not found" });
      }

      const orders = await orderRepo.find({
        where: { user_id: id },
        relations: { items: true },
        order: { created_at: "DESC" },
      });

      const totalSpent = orders.reduce((sum, ord) => sum + Number(ord.total || 0), 0);

      return res.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.mobilenumber || "N/A",
          mobilenumber: user.mobilenumber || "N/A",
          address: user.address || "",
          status: user.isActive ? "ACTIVE" : "INACTIVE",
          isActive: user.isActive,
          total_orders: orders.length,
          total_spent: totalSpent,
          orders,
          created_at: user.created_at,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || "Failed to get customer" });
    }
  }

  /**
   * PUT /customers/:id
   * Update customer profile
   */
  public async updateCustomer(req: any, res: Response) {
    try {
      const id = Number(req.params.id);
      const userRepo = dataSource.getRepository(User);

      const user = await userRepo.findOne({ where: { id } });
      if (!user) {
        return res.status(404).json({ success: false, message: "Customer not found" });
      }

      const { name, email, phone, mobilenumber, address, isActive, status } = req.body;
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone || mobilenumber) user.mobilenumber = phone || mobilenumber;
      if (address !== undefined) user.address = address;
      if (isActive !== undefined) user.isActive = Boolean(isActive);
      if (status !== undefined) user.isActive = String(status).toUpperCase() === "ACTIVE";

      const updated = await userRepo.save(user);

      return res.json({
        success: true,
        message: "Customer updated successfully",
        data: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.mobilenumber,
          address: updated.address,
          status: updated.isActive ? "ACTIVE" : "INACTIVE",
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || "Failed to update customer" });
    }
  }

  /**
   * DELETE /customers/:id
   * Deactivate or delete customer
   */
  public async deleteCustomer(req: any, res: Response) {
    try {
      const id = Number(req.params.id);
      const userRepo = dataSource.getRepository(User);

      const user = await userRepo.findOne({ where: { id } });
      if (!user) {
        return res.status(404).json({ success: false, message: "Customer not found" });
      }

      user.isActive = false;
      await userRepo.save(user);

      return res.json({
        success: true,
        message: "Customer deactivated successfully",
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || "Failed to delete customer" });
    }
  }
}
