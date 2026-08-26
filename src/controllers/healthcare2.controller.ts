import { Request, Response } from "express";
import dataSource from "../config/database";
import {
  Consultation, ConsultationStatus,
  Prescription, PrescriptionStatus, PrescriptionItem,
  Medicine, MedicineSale, MedicineSaleItem, MedicineSaleStatus,
  HealthcareStockApproval, StockApprovalStatus,
} from "../entities/healthcare2.entity";
import { io } from "../socket/socket";

// ─── Consultation Controller ──────────────────────────────────────────────────

export class ConsultationController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Consultation);
      const { search, doctor_id, patient_id, status, page = 1, limit = 20 } = req.query as any;
      const user: any = (req as any).user;

      const qb = repo.createQueryBuilder("c")
        .where("c.company_id = :cid", { cid: user.company_id });

      if (doctor_id)  qb.andWhere("c.doctor_id = :did",   { did: doctor_id });
      if (patient_id) qb.andWhere("c.patient_id = :pid",  { pid: patient_id });
      if (status)     qb.andWhere("c.status = :status",   { status });
      if (search)     qb.andWhere("(c.chief_complaint LIKE :s OR c.diagnosis LIKE :s)", { s: `%${search}%` });

      const skip = (Number(page) - 1) * Number(limit);
      qb.skip(skip).take(Number(limit)).orderBy("c.created_at", "DESC");

      const [data, total] = await qb.getManyAndCount();
      return res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Consultation);
      const item = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!item) return res.status(404).json({ success: false, message: "Consultation not found" });
      return res.json({ success: true, data: item });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const repo = dataSource.getRepository(Consultation);
      const item = repo.create({ ...req.body, company_id: user.company_id, branch_id: user.branch_id });
      await repo.save(item);
      if (io) io.to(`company_${user.company_id}`).emit("consultation.created", item);
      return res.status(201).json({ success: true, data: item, message: "Consultation created" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Consultation);
      const item = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!item) return res.status(404).json({ success: false, message: "Consultation not found" });
      repo.merge(item, req.body);
      await repo.save(item);
      return res.json({ success: true, data: item, message: "Consultation updated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async complete(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Consultation);
      const item = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!item) return res.status(404).json({ success: false, message: "Consultation not found" });
      item.status = ConsultationStatus.COMPLETED;
      await repo.save(item);
      const user: any = (req as any).user;
      if (io) io.to(`company_${user.company_id}`).emit("consultation.completed", item);
      return res.json({ success: true, data: item, message: "Consultation completed" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

// ─── Prescription Controller ──────────────────────────────────────────────────

export class PrescriptionController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Prescription);
      const itemRepo = dataSource.getRepository(PrescriptionItem);
      const { doctor_id, patient_id, status, page = 1, limit = 20 } = req.query as any;
      const user: any = (req as any).user;

      const qb = repo.createQueryBuilder("p")
        .where("p.company_id = :cid", { cid: user.company_id });

      if (doctor_id)  qb.andWhere("p.doctor_id = :did",  { did: doctor_id });
      if (patient_id) qb.andWhere("p.patient_id = :pid", { pid: patient_id });
      if (status)     qb.andWhere("p.status = :status",  { status });

      const skip = (Number(page) - 1) * Number(limit);
      qb.skip(skip).take(Number(limit)).orderBy("p.created_at", "DESC");

      const [prescriptions, total] = await qb.getManyAndCount();

      // Attach items
      const ids = prescriptions.map(p => p.id);
      const items = ids.length
        ? await itemRepo.createQueryBuilder("i").where("i.prescription_id IN (:...ids)", { ids }).getMany()
        : [];

      const data = prescriptions.map(p => ({
        ...p,
        items: items.filter(i => i.prescription_id === p.id),
      }));

      return res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Prescription);
      const itemRepo = dataSource.getRepository(PrescriptionItem);
      const prescription = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!prescription) return res.status(404).json({ success: false, message: "Prescription not found" });
      const items = await itemRepo.find({ where: { prescription_id: prescription.id } });
      return res.json({ success: true, data: { ...prescription, items } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const { items = [], ...prescriptionData } = req.body;

      const repo = dataSource.getRepository(Prescription);
      const itemRepo = dataSource.getRepository(PrescriptionItem);

      const prescription = await repo.save(
        repo.create({ ...prescriptionData, company_id: user.company_id, branch_id: user.branch_id })
      ) as unknown as Prescription;

      if (items.length) {
        const prescriptionItems = items.map((item: any) =>
          itemRepo.create({ ...item, prescription_id: prescription.id })
        );
        await itemRepo.save(prescriptionItems);
      }

      if (io) io.to(`company_${user.company_id}`).emit("prescription.created", { id: prescription.id });
      return res.status(201).json({ success: true, data: prescription, message: "Prescription created" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Prescription);
      const itemRepo = dataSource.getRepository(PrescriptionItem);
      const prescription = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!prescription) return res.status(404).json({ success: false, message: "Prescription not found" });
      if (prescription.status === PrescriptionStatus.FINALIZED) {
        return res.status(400).json({ success: false, message: "Cannot update a finalized prescription" });
      }

      const { items, ...rest } = req.body;
      repo.merge(prescription, rest);
      await repo.save(prescription);

      if (items) {
        await itemRepo.delete({ prescription_id: prescription.id });
        const newItems = items.map((item: any) =>
          itemRepo.create({ ...item, prescription_id: prescription.id })
        );
        await itemRepo.save(newItems);
      }

      return res.json({ success: true, data: prescription, message: "Prescription updated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async finalize(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Prescription);
      const prescription = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!prescription) return res.status(404).json({ success: false, message: "Prescription not found" });
      prescription.status = PrescriptionStatus.FINALIZED;
      await repo.save(prescription);
      return res.json({ success: true, data: prescription, message: "Prescription finalized" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

// ─── Medicine Controller ──────────────────────────────────────────────────────

export class MedicineController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const { search, is_active, page = 1, limit = 20 } = req.query as any;
      const user: any = (req as any).user;

      const qb = repo.createQueryBuilder("m")
        .where("m.company_id = :cid", { cid: user.company_id });

      if (is_active !== undefined) qb.andWhere("m.is_active = :a", { a: is_active === "true" });
      if (search) qb.andWhere("(m.name LIKE :s OR m.generic_name LIKE :s OR m.brand LIKE :s OR m.composition LIKE :s)", { s: `%${search}%` });

      const skip = (Number(page) - 1) * Number(limit);
      qb.skip(skip).take(Number(limit)).orderBy("m.name", "ASC");

      const [data, total] = await qb.getManyAndCount();
      return res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async search(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const { q } = req.query as any;
      const user: any = (req as any).user;
      if (!q) return res.json({ success: true, data: [] });

      const data = await repo.createQueryBuilder("m")
        .where("m.company_id = :cid AND m.is_active = true AND m.current_stock > 0", { cid: user.company_id })
        .andWhere("(m.name LIKE :s OR m.generic_name LIKE :s OR m.brand LIKE :s)", { s: `%${q}%` })
        .take(20)
        .getMany();

      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getExpiring(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const user: any = (req as any).user;
      const days = Number((req.query as any).days || 90);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      const now = new Date();

      const data = await repo.createQueryBuilder("m")
        .where("m.company_id = :cid AND m.is_active = true AND m.expiry_date IS NOT NULL", { cid: user.company_id })
        .andWhere("m.expiry_date <= :cutoff", { cutoff })
        .orderBy("m.expiry_date", "ASC")
        .getMany();

      const categorized = data.map(m => ({
        ...m,
        expiry_status: new Date(m.expiry_date!) < now
          ? "EXPIRED"
          : new Date(m.expiry_date!) <= new Date(now.getTime() + 30 * 86400000)
            ? "CRITICAL"
            : "EXPIRING_SOON",
      }));

      return res.json({ success: true, data: categorized, total: categorized.length });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const item = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!item) return res.status(404).json({ success: false, message: "Medicine not found" });
      return res.json({ success: true, data: item });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const repo = dataSource.getRepository(Medicine);
      const item = repo.create({ ...req.body, company_id: user.company_id, branch_id: user.branch_id });
      await repo.save(item);
      return res.status(201).json({ success: true, data: item, message: "Medicine created" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const item = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!item) return res.status(404).json({ success: false, message: "Medicine not found" });
      repo.merge(item, req.body);
      await repo.save(item);
      return res.json({ success: true, data: item, message: "Medicine updated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const item = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!item) return res.status(404).json({ success: false, message: "Medicine not found" });
      await repo.update(item.id, { is_active: false });
      return res.json({ success: true, message: "Medicine deactivated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

// ─── Pharmacy POS / Medicine Sale Controller ──────────────────────────────────

export class PharmacyPosController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(MedicineSale);
      const { patient_id, status, date_from, date_to, page = 1, limit = 20 } = req.query as any;
      const user: any = (req as any).user;

      const qb = repo.createQueryBuilder("s")
        .where("s.company_id = :cid", { cid: user.company_id });

      if (patient_id) qb.andWhere("s.patient_id = :pid", { pid: patient_id });
      if (status)     qb.andWhere("s.status = :status",  { status });
      if (date_from)  qb.andWhere("s.created_at >= :df", { df: date_from });
      if (date_to)    qb.andWhere("s.created_at <= :dt", { dt: date_to });

      const skip = (Number(page) - 1) * Number(limit);
      qb.skip(skip).take(Number(limit)).orderBy("s.created_at", "DESC");

      const [data, total] = await qb.getManyAndCount();
      return res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const saleRepo = dataSource.getRepository(MedicineSale);
      const itemRepo = dataSource.getRepository(MedicineSaleItem);
      const sale = await saleRepo.findOne({ where: { id: Number(req.params.id) } });
      if (!sale) return res.status(404).json({ success: false, message: "Sale not found" });
      const items = await itemRepo.find({ where: { sale_id: sale.id } });
      return res.json({ success: true, data: { ...sale, items } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * ATOMIC Sale Creation:
   * 1. Validate each medicine has sufficient stock
   * 2. Within a DB transaction: create sale, create items, deduct stock
   * 3. Emit socket events
   */
  async create(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const { items = [], ...saleData } = req.body;

      if (!items.length) {
        return res.status(400).json({ success: false, message: "Sale must contain at least one item" });
      }

      const medRepo  = dataSource.getRepository(Medicine);
      const saleRepo = dataSource.getRepository(MedicineSale);
      const itemRepo = dataSource.getRepository(MedicineSaleItem);

      // --- Pre-validate stock outside transaction ---
      for (const item of items) {
        const med = await medRepo.findOne({ where: { id: item.medicine_id } });
        if (!med) return res.status(404).json({ success: false, message: `Medicine ID ${item.medicine_id} not found` });
        if (med.current_stock < item.quantity) {
          return res.status(409).json({
            success: false,
            message: `Insufficient stock for ${med.name}. Available: ${med.current_stock}, Requested: ${item.quantity}`,
            code: "INSUFFICIENT_STOCK",
          });
        }
      }

      // --- Atomic transaction ---
      const result = await dataSource.transaction(async (manager) => {
        let total_amount = 0;

        // Lock and deduct stock
        for (const item of items) {
          const med = await manager.findOne(Medicine, { where: { id: item.medicine_id }, lock: { mode: "pessimistic_write" } });
          if (!med || med.current_stock < item.quantity) {
            throw new Error(`Concurrent stock conflict for medicine ID ${item.medicine_id}`);
          }
          med.current_stock -= item.quantity;
          await manager.save(Medicine, med);
          total_amount += item.unit_price * item.quantity;
        }

        const discount = Number(saleData.discount_amount || 0);
        const net_amount = total_amount - discount;

        // Create sale record
        const sale = manager.create(MedicineSale, {
          ...saleData,
          total_amount,
          net_amount,
          company_id: user.company_id,
          branch_id:  user.branch_id,
          sold_by:    user.id,
          status:     MedicineSaleStatus.COMPLETED,
        });
        await manager.save(MedicineSale, sale);

        // Create sale items
        const saleItems = items.map((item: any) =>
          manager.create(MedicineSaleItem, {
            ...item,
            sale_id:     sale.id,
            total_price: item.unit_price * item.quantity,
          })
        );
        await manager.save(MedicineSaleItem, saleItems);

        return { sale, saleItems };
      });

      // Socket events
      if (io) {
        io.to(`company_${user.company_id}`).emit("sale.completed", { id: result.sale.id, total: result.sale.net_amount });
        io.to(`company_${user.company_id}`).emit("stock.updated", { timestamp: new Date().toISOString() });
      }

      return res.status(201).json({ success: true, data: result.sale, message: "Sale created successfully" });
    } catch (err: any) {
      const isConflict = err.message?.includes("Concurrent stock conflict") || err.message?.includes("Insufficient");
      return res.status(isConflict ? 409 : 500).json({ success: false, message: err.message });
    }
  }

  async cancel(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const saleRepo = dataSource.getRepository(MedicineSale);
      const itemRepo = dataSource.getRepository(MedicineSaleItem);

      const sale = await saleRepo.findOne({ where: { id: Number(req.params.id) } });
      if (!sale) return res.status(404).json({ success: false, message: "Sale not found" });
      if (sale.status === MedicineSaleStatus.CANCELLED) {
        return res.status(400).json({ success: false, message: "Sale is already cancelled" });
      }

      const items = await itemRepo.find({ where: { sale_id: sale.id } });

      await dataSource.transaction(async (manager) => {
        // Restore stock
        for (const item of items) {
          await manager.increment(Medicine, { id: item.medicine_id }, "current_stock", item.quantity);
        }
        sale.status = MedicineSaleStatus.CANCELLED;
        await manager.save(MedicineSale, sale);
      });

      if (io) io.to(`company_${user.company_id}`).emit("stock.updated", { timestamp: new Date().toISOString() });
      return res.json({ success: true, message: "Sale cancelled and stock restored" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

// ─── Stock Approval Controller ────────────────────────────────────────────────

export class StockApprovalHcController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(HealthcareStockApproval);
      const { status, page = 1, limit = 20 } = req.query as any;
      const user: any = (req as any).user;

      const qb = repo.createQueryBuilder("s").where("s.company_id = :cid", { cid: user.company_id });
      if (status) qb.andWhere("s.status = :status", { status });

      const skip = (Number(page) - 1) * Number(limit);
      qb.skip(skip).take(Number(limit)).orderBy("s.created_at", "DESC");

      const [data, total] = await qb.getManyAndCount();
      return res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(HealthcareStockApproval);
      const item = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!item) return res.status(404).json({ success: false, message: "Stock approval not found" });
      return res.json({ success: true, data: item });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const repo = dataSource.getRepository(HealthcareStockApproval);
      const item = repo.create({
        ...req.body,
        company_id:   user.company_id,
        branch_id:    user.branch_id,
        requested_by: user.id,
        status:       StockApprovalStatus.PENDING,
      });
      await repo.save(item);
      if (io) io.to(`company_${user.company_id}`).emit("stock.approval.created", item);
      return res.status(201).json({ success: true, data: item, message: "Stock approval request created" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(HealthcareStockApproval);
      const item = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!item) return res.status(404).json({ success: false, message: "Not found" });
      if (item.status !== StockApprovalStatus.PENDING) {
        return res.status(400).json({ success: false, message: "Only PENDING approvals can be edited" });
      }
      repo.merge(item, req.body);
      await repo.save(item);
      return res.json({ success: true, data: item, message: "Stock approval updated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async approve(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const repo    = dataSource.getRepository(HealthcareStockApproval);
      const medRepo = dataSource.getRepository(Medicine);

      const approval = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!approval) return res.status(404).json({ success: false, message: "Stock approval not found" });
      if (approval.status !== StockApprovalStatus.PENDING) {
        return res.status(400).json({ success: false, message: `Cannot approve a ${approval.status} entry` });
      }

      await dataSource.transaction(async (manager) => {
        // Update stock approval status
        approval.status      = StockApprovalStatus.APPROVED;
        approval.approved_by = user.id;
        await manager.save(HealthcareStockApproval, approval);

        // Post to actual medicine stock
        const med = await manager.findOne(Medicine, { where: { id: approval.medicine_id } });
        if (med) {
          med.current_stock += approval.quantity;
          // Update batch info from approval if provided
          if (approval.batch_no)    med.batch_no    = approval.batch_no;
          if (approval.expiry_date) med.expiry_date = approval.expiry_date;
          if (approval.purchase_price) med.purchase_price = approval.purchase_price;
          if (approval.mrp)         med.mrp         = approval.mrp;
          await manager.save(Medicine, med);
        }
      });

      if (io) {
        io.to(`company_${user.company_id}`).emit("stock.approved",  { id: approval.id });
        io.to(`company_${user.company_id}`).emit("stock.updated",   { timestamp: new Date().toISOString() });
      }

      return res.json({ success: true, message: "Stock approved and inventory updated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async reject(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const repo = dataSource.getRepository(HealthcareStockApproval);
      const approval = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!approval) return res.status(404).json({ success: false, message: "Not found" });
      if (approval.status !== StockApprovalStatus.PENDING) {
        return res.status(400).json({ success: false, message: `Cannot reject a ${approval.status} entry` });
      }
      approval.status        = StockApprovalStatus.REJECTED;
      approval.approved_by   = user.id;
      approval.reject_reason = req.body.reason || "";
      await repo.save(approval);

      if (io) io.to(`company_${user.company_id}`).emit("stock.rejected", { id: approval.id });
      return res.json({ success: true, message: "Stock approval rejected" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

// ─── Medicine Expiry Controller ────────────────────────────────────────────────

export class MedicineExpiryController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const user: any = (req as any).user;
      const { days = 90 } = req.query as any;
      const now    = new Date();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + Number(days));

      const data = await repo.createQueryBuilder("m")
        .where("m.company_id = :cid AND m.expiry_date IS NOT NULL AND m.is_active = true", { cid: user.company_id })
        .andWhere("m.expiry_date <= :cutoff", { cutoff })
        .orderBy("m.expiry_date", "ASC")
        .getMany();

      const categorized = data.map(m => {
        const exp = new Date(m.expiry_date!);
        const diff = Math.floor((exp.getTime() - now.getTime()) / 86400000);
        return {
          ...m,
          days_to_expiry: diff,
          expiry_status:
            diff < 0   ? "EXPIRED" :
            diff <= 30  ? "CRITICAL" :
                          "EXPIRING_SOON",
        };
      });

      return res.json({ success: true, data: categorized, total: categorized.length });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getSummary(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const user: any = (req as any).user;
      const now = new Date();
      const in30  = new Date(now.getTime() + 30  * 86400000);
      const in90  = new Date(now.getTime() + 90  * 86400000);

      const [expired, critical, expiringSoon] = await Promise.all([
        repo.createQueryBuilder("m").where("m.company_id = :cid AND m.expiry_date < :now AND m.is_active = true", { cid: user.company_id, now }).getCount(),
        repo.createQueryBuilder("m").where("m.company_id = :cid AND m.expiry_date >= :now AND m.expiry_date <= :in30 AND m.is_active = true", { cid: user.company_id, now, in30 }).getCount(),
        repo.createQueryBuilder("m").where("m.company_id = :cid AND m.expiry_date > :in30 AND m.expiry_date <= :in90 AND m.is_active = true", { cid: user.company_id, in30, in90 }).getCount(),
      ]);

      return res.json({ success: true, data: { expired, critical, expiring_soon: expiringSoon } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
