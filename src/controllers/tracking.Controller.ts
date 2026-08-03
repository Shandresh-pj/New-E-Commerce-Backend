import { Request, Response } from "express";
import { Controller, Get, Post, Delete, Middleware, Swagger } from "../decorators";
import dataSource from "../config/database";
import { DeliveryTracking, DeliveryAssignment } from "../entities/delivery.entity";
import { TenantService } from "../middleware/tenantFilter.middleware";
import authenticateMiddleware from "../middleware/authenticate.middleware";

@Controller("/delivery-tracking")
export class DeliveryTrackingController {

  /**
   * Seed dynamic active delivery assignments if tracking database is empty
   */
  private async seedDefaultDeliveriesIfEmpty(companyId: number, branchId: number) {
    const repo = dataSource.getRepository(DeliveryTracking);
    const count = await repo.count({ where: { company_id: companyId } });

    if (count === 0) {
      const seedItems: Partial<DeliveryTracking>[] = [
        {
          order_id: 101,
          delivery_boy_id: 1,
          company_id: companyId,
          branch_id: branchId,
          invoice_no: "TRIP-2026-089",
          delivery_boy_name: "Alex Vance (Rapido Captain)",
          delivery_boy_phone: "+1 (555) 234-5678",
          customer_name: "Sophia Bennett",
          vehicle_no: "NY-882-TRK (Yamaha FZ)",
          vehicle_type: "BIKE",
          pickup_address: "Central City Store Hub, 5th Avenue, NY",
          pickup_latitude: 40.7278000,
          pickup_longitude: -74.0260000,
          delivery_address: "742 Evergreen Terrace, Brooklyn, NY",
          delivery_latitude: 40.7030000,
          delivery_longitude: -73.9910000,
          latitude: 40.7128000,
          longitude: -74.0060000,
          speed: "42 km/h",
          eta: "12 mins",
          distance_remaining: "2.4 km",
          status: "ON_THE_WAY"
        },
        {
          order_id: 102,
          delivery_boy_id: 2,
          company_id: companyId,
          branch_id: branchId,
          invoice_no: "SWIGGY-2026-092",
          delivery_boy_name: "Marcus Chen (Zomato Partner)",
          delivery_boy_phone: "+1 (555) 876-5432",
          customer_name: "David Miller",
          vehicle_no: "NY-419-EXP (Honda Activa)",
          vehicle_type: "AUTO",
          pickup_address: "Downtown Logistics Hub, Broadway, NY",
          pickup_latitude: 40.7350000,
          pickup_longitude: -73.9980000,
          delivery_address: "120 Broadway Ave, Manhattan, NY",
          delivery_latitude: 40.7110000,
          delivery_longitude: -74.0090000,
          latitude: 40.7306000,
          longitude: -73.9352000,
          speed: "38 km/h",
          eta: "18 mins",
          distance_remaining: "4.8 km",
          status: "MOVING"
        }
      ];

      for (const item of seedItems) {
        const entity = repo.create(item);
        await repo.save(entity);
      }
    }
  }

  // ==========================================
  // START DELIVERY
  // ==========================================
  @Post("/start")
  @Middleware([authenticateMiddleware])
  @Swagger("Start Delivery", "Delivery boy starts delivery assignment with pickup and delivery coordinates")
  async startDelivery(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(DeliveryTracking);
      const companyId = Number(req.user?.companyId || req.user?.company_id || 1);
      const branchId = Number(req.user?.branchId || 1);

      const tracking = repo.create({
        ...req.body,
        company_id: companyId,
        branch_id: branchId,
        status: req.body.status || "ON_THE_WAY",
        pickup_address: req.body.pickup_address || "Store Hub Address",
        pickup_latitude: Number(req.body.pickup_latitude || 40.7278),
        pickup_longitude: Number(req.body.pickup_longitude || -74.0260),
        delivery_address: req.body.delivery_address || "Customer Shipping Address",
        delivery_latitude: Number(req.body.delivery_latitude || 40.7030),
        delivery_longitude: Number(req.body.delivery_longitude || -73.9910),
        latitude: Number(req.body.latitude || 40.7128),
        longitude: Number(req.body.longitude || -74.0060)
      });

      await repo.save(tracking);

      return res.json({
        success: true,
        message: "Delivery started successfully",
        data: tracking
      });
    } catch (err: any) {
      console.error("[DeliveryTrackingController] startDelivery error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to start delivery" });
    }
  }

  // ==========================================
  // UPDATE LIVE LOCATION
  // ==========================================
  @Post("/location")
  @Middleware([authenticateMiddleware])
  @Swagger("Update Location", "Update delivery rider live latitude and longitude")
  async updateLocation(req: any, res: Response) {
    try {
      const repo = dataSource.getRepository(DeliveryTracking);
      const companyId = Number(req.user?.companyId || req.user?.company_id || 1);
      const branchId = Number(req.user?.branchId || 1);

      const tracking = repo.create({
        ...req.body,
        company_id: companyId,
        branch_id: branchId,
        latitude: Number(req.body.latitude),
        longitude: Number(req.body.longitude)
      });

      await repo.save(tracking);

      return res.json({
        success: true,
        message: "Live location updated",
        data: tracking
      });
    } catch (err: any) {
      console.error("[DeliveryTrackingController] updateLocation error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to update location" });
    }
  }

  // ==========================================
  // GET TRACKING BY ORDER
  // ==========================================
  @Get("/order/:order_id")
  @Middleware([authenticateMiddleware])
  @Swagger("Track Order", "Get live order tracking with pickup and delivery coordinates")
  async getTracking(req: any, res: Response) {
    try {
      const companyId = Number(req.user?.companyId || req.user?.company_id || 1);
      const branchId = Number(req.user?.branchId || 1);
      await this.seedDefaultDeliveriesIfEmpty(companyId, branchId);

      const tracking = await dataSource.getRepository(DeliveryTracking).find({
        where: { order_id: Number(req.params.order_id) },
        order: { id: "DESC" }
      });

      return res.json({
        success: true,
        data: tracking
      });
    } catch (err: any) {
      console.error("[DeliveryTrackingController] getTracking error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to get order tracking" });
    }
  }

  // ==========================================
  // GET ALL TRACKINGS
  // ==========================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Tracking List", "Fetch all active delivery tracking records with pickup and destination coordinates")
  async getAll(req: any, res: Response) {
    try {
      const companyId = Number(req.user?.companyId || req.user?.company_id || 1);
      const branchId = Number(req.user?.branchId || 1);

      await this.seedDefaultDeliveriesIfEmpty(companyId, branchId);

      const repo = dataSource.getRepository(DeliveryTracking);
      const data = await repo.find({
        where: { company_id: companyId },
        order: { id: "DESC" }
      });

      return res.json({
        success: true,
        count: data.length,
        data
      });
    } catch (err: any) {
      console.error("[DeliveryTrackingController] getAll error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch tracking list" });
    }
  }

  // ==========================================
  // MARK DELIVERED
  // ==========================================
  @Post("/delivered/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Mark Delivered", "Mark order trip as delivered")
  async delivered(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(DeliveryTracking);
      await repo.update(req.params.id, { status: "DELIVERED" });

      return res.json({
        success: true,
        message: "Order delivered successfully"
      });
    } catch (err: any) {
      console.error("[DeliveryTrackingController] delivered error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to mark delivered" });
    }
  }

  // ==========================================
  // DELETE TRACKING
  // ==========================================
  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  async deleteTracking(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(DeliveryTracking);
      await repo.delete(req.params.id);

      return res.json({
        success: true,
        message: "Tracking record deleted"
      });
    } catch (err: any) {
      console.error("[DeliveryTrackingController] deleteTracking error:", err.message);
      return res.status(500).json({ success: false, message: err.message || "Failed to delete tracking" });
    }
  }
}