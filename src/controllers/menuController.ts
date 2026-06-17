import { Request, Response } from "express";
import { Controller, Post, Get, Middleware } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate";
import { permissionGuard } from "../middleware/permissionGuard.middleware";



@Controller("/orders")
export class OrderController {

  // =========================
  // CREATE ORDER (WRITE)
  // =========================
  @Post("")
  @Middleware([
    authenticateMiddleware,
    permissionGuard("Orders", "WRITE"),
  ])
  public async createOrder(req: any, res: Response) {
    try {
      const { companyId, branchId, userId } = req.user;

      // example payload
      const { productId, quantity } = req.body;

      return res.json({
        success: true,
        message: "Order created successfully",
        data: {
          productId,
          quantity,
          companyId,
          branchId,
          createdBy: userId,
        },
      });

    } catch (err) {
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }

  // =========================
  // GET ORDERS (READ)
  // =========================
  @Get("")
  @Middleware([
    authenticateMiddleware,
    permissionGuard("Orders", "READ"),
  ])
  public async getOrders(req: any, res: Response) {
    try {
      const { companyId, branchId } = req.user;

      // dummy response (replace with DB query)
      return res.json({
        success: true,
        data: [
          {
            id: 1,
            product: "Laptop",
            companyId,
            branchId,
          },
        ],
      });

    } catch (err) {
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
  
}


@Controller("/menus")
export class MenuController {

  // =========================
  // GET DYNAMIC MENUS
  // =========================
  @Get("")
  @Middleware([authenticateMiddleware])
  public async getMenus(req: any, res: Response) {
    try {

      const permissions = req.user?.permissions || [];

      // Extract unique menus
      const menuMap = new Map();

      for (const p of permissions) {
        if (!menuMap.has(p.menu)) {
          menuMap.set(p.menu, {
            name: p.menu,
            permissions: [],
          });
        }

        menuMap.get(p.menu).permissions.push(p.permission);
      }

      const menus = Array.from(menuMap.values());

      return res.json({
        success: true,
        menus,
      });

    } catch (err) {
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
}
