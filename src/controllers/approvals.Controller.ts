import { Request, Response, NextFunction } from "express";
import dataSource from "../config/database";
import { ProductApproval, ApprovalStatus, ApprovalActionType } from "../entities/productApproval";
import { Product } from "../entities/products";
import { ProductVariant } from "../entities/productVariant";
import { ProductAttributeValueProduct } from "../entities/productAttribute";
import { StockLog } from "../entities/stock";
import { ApiError } from "../exceptions/ApiError";
import { TenantService } from "../middleware/tenantFilter.middleware";
import { UserType } from "../utils/Role-Access";
import { io } from "../socket/socket";
import { Notification } from "../entities/notification";
import { AuditLog } from "../entities/auditLogs";
import { ProductApprovalStatus } from "../dto";

export class ApprovalsController {

  // ================= GET ALL =================
  async getAll(req: any, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const repo = dataSource.getRepository(ProductApproval);
      const baseWhere = TenantService.scopeWhere(req.user);

      const where: any = { ...baseWhere };

      if (req.query.status) {
        where.status = req.query.status;
      }

      if (req.query.action_type) {
        where.action_type = req.query.action_type;
      }

      const [data, total] = await repo.findAndCount({
        where,
        order: { id: "DESC" },
        skip,
        take: limit,
      });

      return res.json({
        success: true,
        message: "Approval requests fetched successfully",
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= GET BY ID =================
  async getById(req: any, res: Response, next: NextFunction) {
    try {
      const repo = dataSource.getRepository(ProductApproval);
      const baseWhere = TenantService.scopeWhere(req.user);

      const data = await repo.findOne({
        where: { ...baseWhere, id: Number(req.params.id) },
        relations: { product: true }
      });

      if (!data) {
        throw new ApiError(404, "Approval request not found");
      }

      return res.json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= ACTION =================
  async takeAction(req: any, res: Response, next: NextFunction) {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const id = Number(req.params.id);
      const { action, comment } = req.body; // action: 'APPROVE' | 'REJECT' | 'CANCEL' | 'CHANGES_REQUESTED'
      const user = req.user;

      const approvalRepo = qr.manager.getRepository(ProductApproval);
      const request = await approvalRepo.findOne({
        where: { id },
        relations: { product: true }
      });

      if (!request) {
        throw new ApiError(404, "Approval request not found");
      }

      if (request.status !== ApprovalStatus.PENDING) {
        throw new ApiError(400, `Cannot process request that is already ${request.status}`);
      }

      const userName = user.email || user.username || `User ${user.userId}`;
      const isAuthorized = user.isSuperAdmin || user.userType === UserType.SUPER_ADMIN || user.userType === UserType.ADMIN;

      // Restrict cancellation to the requester
      if (action === "CANCEL") {
        if (request.requested_by_id !== user.userId) {
          throw new ApiError(403, "You can only cancel your own approval requests");
        }
        request.status = ApprovalStatus.CANCELLED;
      } else {
        // APPROVE, REJECT, CHANGES_REQUESTED require Admin privileges
        if (!isAuthorized) {
          throw new ApiError(403, "Only admins or super admins can perform this action");
        }

        if (action === "APPROVE") {
          request.status = ApprovalStatus.APPROVED;
          request.approved_by = userName;
          request.approved_date = new Date();
          request.approval_comment = comment || request.approval_comment;

          // Apply changes to live database
          await this.applyApprovalChanges(qr.manager, request, user);
        } else if (action === "REJECT") {
          request.status = ApprovalStatus.REJECTED;
          request.rejected_by = userName;
          request.rejected_date = new Date();
          request.approval_comment = comment || "No reason provided";
        } else if (action === "CHANGES_REQUESTED") {
          request.status = ApprovalStatus.CHANGES_REQUESTED;
          request.approval_comment = comment || "Changes requested by administrator";
        } else {
          throw new ApiError(400, "Invalid approval action");
        }
      }

      // Add to audit history list
      const audit = {
        action,
        user: userName,
        timestamp: new Date(),
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
        device: req.headers["user-agent"] as string,
        comment: comment || "",
      };
      request.audit_history = request.audit_history ? [...request.audit_history, audit] : [audit];

      await approvalRepo.save(request);

      // Create a global AuditLog
      const auditRepo = qr.manager.getRepository(AuditLog);
      await auditRepo.save({
        module: "PRODUCT_APPROVAL",
        action: action,
        recordId: request.id,
        userId: user.userId,
        roleId: user.roleId || 0,
        companyId: user.companyId || null,
        branchId: user.branchId || null,
        ip: audit.ip,
        device: audit.device,
        diff: { previous: request.previous_values, new: request.new_values },
      });

      await qr.commitTransaction();

      // Realtime websocket updates
      io.emit("approval-update", {
        id: request.id,
        status: request.status,
        action_type: request.action_type,
        message: `Approval request for "${request.new_values?.name || 'Stock Adjustment'}" was ${request.status.toLowerCase()}`
      });

      // Notify users
      try {
        const notificationRepo = dataSource.getRepository(Notification);
        const notification = notificationRepo.create({
          message: `Your approval request for "${request.new_values?.name || 'Stock Adjustment'}" is ${request.status.toLowerCase()}`,
          type: request.status === "Approved" ? "PUBLISHED" : "STOCK_UPDATE",
          product_id: request.product_id ?? undefined,
        });
        await notificationRepo.save(notification);
        io.emit("new-notification", notification);
      } catch (nErr) {
        console.error("Notification Error:", nErr);
      }

      return res.json({
        success: true,
        message: `Request status changed to ${request.status} successfully`,
        data: request,
      });

    } catch (err) {
      await qr.rollbackTransaction();
      next(err);
    } finally {
      await qr.release();
    }
  }

  // ================= BULK ACTIONS =================
  async bulkAction(req: any, res: Response, next: NextFunction) {
    const { ids, action, comment } = req.body; // ids: number[], action: 'APPROVE' | 'REJECT'
    const user = req.user;

    const isAuthorized = user.isSuperAdmin || user.userType === UserType.SUPER_ADMIN || user.userType === UserType.ADMIN;
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Only admins or super admins can perform bulk actions" });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No request IDs provided" });
    }

    const userName = user.email || user.username || `User ${user.userId}`;
    const processed: number[] = [];
    const failed: any[] = [];

    for (const id of ids) {
      const qr = dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();

      try {
        const approvalRepo = qr.manager.getRepository(ProductApproval);
        const request = await approvalRepo.findOne({
          where: { id },
          relations: { product: true }
        });

        if (!request) {
          throw new Error("Request not found");
        }

        if (request.status !== ApprovalStatus.PENDING) {
          throw new Error(`Cannot process request: currently ${request.status}`);
        }

        if (action === "APPROVE") {
          request.status = ApprovalStatus.APPROVED;
          request.approved_by = userName;
          request.approved_date = new Date();
          request.approval_comment = comment || request.approval_comment;

          // Apply changes to live database
          await this.applyApprovalChanges(qr.manager, request, user);
        } else if (action === "REJECT") {
          request.status = ApprovalStatus.REJECTED;
          request.rejected_by = userName;
          request.rejected_date = new Date();
          request.approval_comment = comment || "No reason provided";
        } else {
          throw new Error("Invalid action for bulk processing");
        }

        const audit = {
          action,
          user: userName,
          timestamp: new Date(),
          ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
          device: req.headers["user-agent"] as string,
          comment: comment || "",
        };
        request.audit_history = request.audit_history ? [...request.audit_history, audit] : [audit];

        await approvalRepo.save(request);

        const auditRepo = qr.manager.getRepository(AuditLog);
        await auditRepo.save({
          module: "PRODUCT_APPROVAL",
          action: "BULK_" + action,
          recordId: request.id,
          userId: user.userId,
          roleId: user.roleId || 0,
          companyId: user.companyId || null,
          branchId: user.branchId || null,
          ip: audit.ip,
          device: audit.device,
          diff: { previous: request.previous_values, new: request.new_values },
        });

        await qr.commitTransaction();
        processed.push(id);

        io.emit("approval-update", {
          id: request.id,
          status: request.status,
          action_type: request.action_type
        });

      } catch (err: any) {
        await qr.rollbackTransaction();
        failed.push({ id, error: err.message || "Failed to process approval" });
      } finally {
        await qr.release();
      }
    }

    return res.json({
      success: true,
      message: `Bulk processing completed. Success: ${processed.length}, Failed: ${failed.length}`,
      data: { processed, failed }
    });
  }

  // ================= HELPERS =================
  private async applyApprovalChanges(manager: any, request: ProductApproval, user: any) {
    const productRepo = manager.getRepository(Product);

    if (request.action_type === ApprovalActionType.CREATE) {
      const {
        name,
        description,
        price,
        stock,
        barcode,
        category,
        registration_id,
        product_type,
        stock_in_hand,
        status,
        low_stock_threshold,
        critical_stock_threshold,
        image,
        images,
        video,
        variants,
        attribute_values
      } = request.new_values;

      const product = productRepo.create({
        name,
        description,
        price,
        stock,
        barcode,
        category,
        registration_id: registration_id || request.requested_by_id,
        product_type,
        stock_in_hand,
        status: status || "active",
        approval_status: ProductApprovalStatus.APPROVED,
        low_stock_threshold: low_stock_threshold !== undefined ? Number(low_stock_threshold) : 5,
        critical_stock_threshold: critical_stock_threshold !== undefined ? Number(critical_stock_threshold) : 2,
        image,
        images: images || [],
        video,
      });

      await productRepo.save(product);

      // Save variants
      if (Array.isArray(variants) && variants.length > 0) {
        const variantRepo = manager.getRepository(ProductVariant);
        const variantEntities = variants.map((v: any) => {
          return variantRepo.create({
            CompanyId: v.CompanyId ?? 0,
            ProductId: product.id,
            Barcode: v.Barcode,
            Price: v.Price,
            Stock: v.Stock,
            ProductAttributeId: v.ProductAttributeId,
            ProductAttributeValueId: v.ProductAttributeValueId,
          });
        });
        await variantRepo.save(variantEntities);
      }

      // Save attribute links
      if (Array.isArray(attribute_values) && attribute_values.length > 0) {
        const linkRepo = manager.getRepository(ProductAttributeValueProduct);
        const linkEntities = attribute_values.map((item: any) => {
          return linkRepo.create({
            ProductId: product.id,
            ProductAttributeValueId: item.ProductAttributeValueId,
          });
        });
        await linkRepo.save(linkEntities);
      }

      request.product_id = product.id;

    } else if (request.action_type === ApprovalActionType.UPDATE) {
      const product = await productRepo.findOneBy({ id: request.product_id });
      if (!product) {
        throw new Error("Product associated with this update request no longer exists");
      }

      const {
        name,
        description,
        price,
        stock,
        barcode,
        category,
        product_type,
        stock_in_hand,
        status,
        low_stock_threshold,
        critical_stock_threshold,
        image,
        images,
        video,
        variants,
        attribute_values
      } = request.new_values;

      product.name = name ?? product.name;
      product.description = description ?? product.description;
      product.price = price ?? product.price;
      product.barcode = barcode ?? product.barcode;
      product.stock = stock ?? product.stock;
      product.category = category ?? product.category;
      product.product_type = product_type ?? product.product_type;
      product.stock_in_hand = stock_in_hand ?? product.stock_in_hand;
      product.status = status ?? product.status;
      product.low_stock_threshold = low_stock_threshold !== undefined ? Number(low_stock_threshold) : product.low_stock_threshold;
      product.critical_stock_threshold = critical_stock_threshold !== undefined ? Number(critical_stock_threshold) : product.critical_stock_threshold;

      if (video) product.video = video;
      if (images) product.images = images;
      if (image) product.image = image;
      product.approval_status = ProductApprovalStatus.APPROVED;

      await productRepo.save(product);

      // Sync variants
      if (variants !== undefined) {
        const variantRepo = manager.getRepository(ProductVariant);
        await variantRepo.delete({ ProductId: product.id });

        if (Array.isArray(variants) && variants.length > 0) {
          const variantEntities = variants.map((v: any) => {
            return variantRepo.create({
              CompanyId: v.CompanyId ?? 0,
              ProductId: product.id,
              Barcode: v.Barcode,
              Price: v.Price,
              Stock: v.Stock,
              ProductAttributeId: v.ProductAttributeId,
              ProductAttributeValueId: v.ProductAttributeValueId,
            });
          });
          await variantRepo.save(variantEntities);
        }
      }

      // Sync attribute values
      if (attribute_values !== undefined) {
        const linkRepo = manager.getRepository(ProductAttributeValueProduct);
        await linkRepo.delete({ ProductId: product.id });

        if (Array.isArray(attribute_values) && attribute_values.length > 0) {
          const linkEntities = attribute_values.map((item: any) => {
            return linkRepo.create({
              ProductId: product.id,
              ProductAttributeValueId: item.ProductAttributeValueId,
            });
          });
          await linkRepo.save(linkEntities);
        }
      }

    } else if (request.action_type === ApprovalActionType.STOCK_ADJUST) {
      const product = await productRepo.findOneBy({ id: request.product_id });
      if (!product) {
        throw new Error("Product for stock adjustment not found");
      }

      const { quantity, action } = request.new_values;

      const oldStock = product.stock;

      if (action === "ADD") {
        product.stock += quantity;
      } else {
        if (product.stock < quantity) {
          throw new Error("Insufficient stock to process removal approval");
        }
        product.stock -= quantity;
      }

      await productRepo.save(product);

      // Save a finalized StockLog
      const logRepo = manager.getRepository(StockLog);
      await logRepo.save({
        product_id: product.id,
        old_stock: oldStock,
        added_stock: action === "ADD" ? quantity : -quantity,
        new_stock: product.stock,
        action,
        created_by: request.requested_by_id,
        status: "Approved",
        approved_by: user.userId,
        approved_at: new Date()
      });
    }
  }
}
