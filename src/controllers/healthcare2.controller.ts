import { Request, Response } from "express";
import dataSource from "../config/database";
import {
  Consultation, ConsultationStatus,
  Prescription, PrescriptionStatus, PrescriptionItem,
  Medicine, MedicineSale, MedicineSaleItem, MedicineSaleStatus,
  HealthcareStockApproval, StockApprovalStatus,
} from "../entities/healthcare2.entity";
import { UserType } from "../utils/Role-Access";
import { io } from "../socket/socket";

// ─── Consultation Controller ──────────────────────────────────────────────────

export class ConsultationController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Consultation);
      const { search, doctor_id, patient_id, status, page = 1, limit = 50 } = req.query as any;
      const user: any = (req as any).user || {};

      const qb = repo.createQueryBuilder("c");
      const compId = user?.company_id || user?.companyId;

      if (user && !user.isSuperAdmin && user.userType !== UserType.SUPER_ADMIN && compId) {
        qb.where("(c.company_id = :cid OR c.company_id IS NULL)", { cid: compId });
      }

      if (doctor_id)  qb.andWhere("c.doctor_id = :did",   { did: doctor_id });
      if (patient_id) qb.andWhere("c.patient_id = :pid",  { pid: patient_id });
      if (status)     qb.andWhere("c.status = :status",   { status });
      if (search && search.trim()) {
        qb.andWhere("(c.chief_complaint LIKE :s OR c.diagnosis LIKE :s OR c.notes LIKE :s)", { s: `%${search.trim()}%` });
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 50);
      const skip = (pageNum - 1) * limitNum;

      qb.skip(skip).take(limitNum).orderBy("c.created_at", "DESC");

      const [data, total] = await qb.getManyAndCount();
      return res.json({ success: true, data, total, page: pageNum, limit: limitNum });
    } catch (err: any) {
      console.error("[ConsultationController.getAll Error]:", err);
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
      const user: any = (req as any).user || {};
      const repo = dataSource.getRepository(Consultation);
      const compId = user?.company_id || user?.companyId || 1;
      const branchId = user?.branch_id || user?.branchId || null;

      const item = repo.create({ ...req.body, company_id: compId, branch_id: branchId });
      await repo.save(item);
      if (io && compId) io.to(`company_${compId}`).emit("consultation.created", item);
      return res.status(201).json({ success: true, data: item, message: "Consultation created successfully" });
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
      return res.json({ success: true, data: item, message: "Consultation updated successfully" });
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
      const user: any = (req as any).user || {};
      const compId = user?.company_id || user?.companyId;
      if (io && compId) io.to(`company_${compId}`).emit("consultation.completed", item);
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
      const { doctor_id, patient_id, status, page = 1, limit = 50 } = req.query as any;
      const user: any = (req as any).user || {};

      const qb = repo.createQueryBuilder("p");
      const compId = user?.company_id || user?.companyId;

      if (user && !user.isSuperAdmin && user.userType !== UserType.SUPER_ADMIN && compId) {
        qb.where("(p.company_id = :cid OR p.company_id IS NULL)", { cid: compId });
      }

      if (doctor_id)  qb.andWhere("p.doctor_id = :did",  { did: doctor_id });
      if (patient_id) qb.andWhere("p.patient_id = :pid", { pid: patient_id });
      if (status)     qb.andWhere("p.status = :status",  { status });

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 50);
      const skip = (pageNum - 1) * limitNum;

      qb.skip(skip).take(limitNum).orderBy("p.created_at", "DESC");

      const [prescriptions, total] = await qb.getManyAndCount();

      const ids = prescriptions.map(p => p.id);
      const items = ids.length
        ? await itemRepo.createQueryBuilder("i").where("i.prescription_id IN (:...ids)", { ids }).getMany()
        : [];

      const data = prescriptions.map(p => ({
        ...p,
        items: items.filter(i => i.prescription_id === p.id),
      }));

      return res.json({ success: true, data, total, page: pageNum, limit: limitNum });
    } catch (err: any) {
      console.error("[PrescriptionController.getAll Error]:", err);
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
      const user: any = (req as any).user || {};
      const compId = user?.company_id || user?.companyId || 1;
      const branchId = user?.branch_id || user?.branchId || null;
      const { items = [], ...prescriptionData } = req.body;

      const repo = dataSource.getRepository(Prescription);
      const itemRepo = dataSource.getRepository(PrescriptionItem);

      const prescription = repo.create({ ...prescriptionData, company_id: compId, branch_id: branchId });
      const savedPrescription: any = await repo.save(prescription as any);

      if (items.length) {
        const prescriptionItems = items.map((item: any) =>
          itemRepo.create({ ...item, prescription_id: savedPrescription.id })
        );
        await itemRepo.save(prescriptionItems as any);
      }

      if (io && compId) io.to(`company_${compId}`).emit("prescription.created", { id: savedPrescription.id });
      return res.status(201).json({ success: true, data: savedPrescription, message: "Prescription created" });
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
      const { search, is_active, page = 1, limit = 50 } = req.query as any;
      const user: any = (req as any).user || {};
      const compId = user?.company_id || user?.companyId;

      const qb = repo.createQueryBuilder("m");
      if (user && !user.isSuperAdmin && user.userType !== UserType.SUPER_ADMIN && compId) {
        qb.where("(m.company_id = :cid OR m.company_id IS NULL)", { cid: compId });
      }

      if (is_active !== undefined && is_active !== null && is_active !== '') {
        qb.andWhere("m.is_active = :a", { a: is_active === "true" || is_active === true || is_active === '1' });
      }

      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        qb.andWhere("(m.name LIKE :s OR m.generic_name LIKE :s OR m.brand LIKE :s OR m.composition LIKE :s)", { s });
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 50);
      const skip = (pageNum - 1) * limitNum;

      qb.skip(skip).take(limitNum).orderBy("m.name", "ASC");

      const [data, total] = await qb.getManyAndCount();
      return res.json({ success: true, data, total, page: pageNum, limit: limitNum });
    } catch (err: any) {
      console.error("[MedicineController.getAll Error]:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async search(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const { q } = req.query as any;
      const user: any = (req as any).user || {};
      if (!q || !q.trim()) return res.json({ success: true, data: [] });

      const compId = user?.company_id || user?.companyId;
      const qb = repo.createQueryBuilder("m")
        .where("m.is_active = true AND m.current_stock > 0")
        .andWhere("(m.name LIKE :s OR m.generic_name LIKE :s OR m.brand LIKE :s)", { s: `%${q.trim()}%` });

      if (compId) {
        qb.andWhere("(m.company_id = :cid OR m.company_id IS NULL)", { cid: compId });
      }

      const data = await qb.take(20).getMany();
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getExpiring(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const user: any = (req as any).user || {};
      const days = Number((req.query as any).days || 90);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      const now = new Date();
      const compId = user?.company_id || user?.companyId;

      const qb = repo.createQueryBuilder("m")
        .where("m.is_active = true AND m.expiry_date IS NOT NULL")
        .andWhere("m.expiry_date <= :cutoff", { cutoff });

      if (compId) {
        qb.andWhere("(m.company_id = :cid OR m.company_id IS NULL)", { cid: compId });
      }

      const data = await qb.orderBy("m.expiry_date", "ASC").getMany();

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
      const user: any = (req as any).user || {};
      const compId = user?.company_id || user?.companyId || 1;
      const branchId = user?.branch_id || user?.branchId || null;

      const repo = dataSource.getRepository(Medicine);
      const medicine = repo.create({ ...req.body, company_id: compId, branch_id: branchId });
      await repo.save(medicine);
      return res.status(201).json({ success: true, data: medicine, message: "Medicine added to catalog" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const medicine = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found" });
      repo.merge(medicine, req.body);
      await repo.save(medicine);
      return res.json({ success: true, data: medicine, message: "Medicine updated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const medicine = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!medicine) return res.status(404).json({ success: false, message: "Medicine not found" });
      await repo.update(medicine.id, { is_active: false });
      return res.json({ success: true, message: "Medicine deactivated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

// ─── Pharmacy POS Controller ───────────────────────────────────────────────────

export class PharmacyPosController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(MedicineSale);
      const itemRepo = dataSource.getRepository(MedicineSaleItem);
      const user: any = (req as any).user || {};
      const { page = 1, limit = 50 } = req.query as any;
      const compId = user?.company_id || user?.companyId;

      const qb = repo.createQueryBuilder("s");
      if (user && !user.isSuperAdmin && user.userType !== UserType.SUPER_ADMIN && compId) {
        qb.where("(s.company_id = :cid OR s.company_id IS NULL)", { cid: compId });
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 50);
      const skip = (pageNum - 1) * limitNum;

      qb.skip(skip).take(limitNum).orderBy("s.created_at", "DESC");

      const [sales, total] = await qb.getManyAndCount();

      const ids = sales.map(s => s.id);
      const items = ids.length
        ? await itemRepo.createQueryBuilder("i").where("i.sale_id IN (:...ids)", { ids }).getMany()
        : [];

      const data = sales.map(s => ({
        ...s,
        items: items.filter(i => i.sale_id === s.id),
      }));

      return res.json({ success: true, data, total, page: pageNum, limit: limitNum });
    } catch (err: any) {
      console.error("[PharmacyPosController.getAll Error]:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(MedicineSale);
      const itemRepo = dataSource.getRepository(MedicineSaleItem);
      const sale = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!sale) return res.status(404).json({ success: false, message: "Sale transaction not found" });
      const items = await itemRepo.find({ where: { sale_id: sale.id } });
      return res.json({ success: true, data: { ...sale, items } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user: any = (req as any).user || {};
      const compId = user?.company_id || user?.companyId || 1;
      const branchId = user?.branch_id || user?.branchId || null;

      const saleRepo = queryRunner.manager.getRepository(MedicineSale);
      const saleItemRepo = queryRunner.manager.getRepository(MedicineSaleItem);
      const medRepo = queryRunner.manager.getRepository(Medicine);

      const { items = [], patient_id, prescription_id, payment_mode = "CASH", discount_amount = 0 } = req.body;

      if (!items.length) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({ success: false, message: "Sale must contain at least one medicine item" });
      }

      let subtotal = 0;
      const saleItemsToInsert: any[] = [];

      for (const item of items) {
        const med = await medRepo.findOne({ where: { id: Number(item.medicine_id) } });
        if (!med) {
          await queryRunner.rollbackTransaction();
          return res.status(404).json({ success: false, message: `Medicine ID ${item.medicine_id} not found` });
        }

        if (med.current_stock < Number(item.quantity)) {
          await queryRunner.rollbackTransaction();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${med.name}. Available: ${med.current_stock}, Requested: ${item.quantity}`
          });
        }

        const unitPrice = Number(item.unit_price || med.sale_price);
        const itemTotal = unitPrice * Number(item.quantity);
        subtotal += itemTotal;

        med.current_stock -= Number(item.quantity);
        await medRepo.save(med);

        // ── Real-time stock alert socket events ────────────────────────────────
        if (io && compId) {
          const reorderLevel = Number(med.reorder_level ?? 10);
          const stockNow     = med.current_stock;
          const payload      = { medicine_id: med.id, name: med.name, stock: stockNow, reorder_level: reorderLevel };

          if (stockNow <= 0) {
            io.to(`company_${compId}`).emit('out_of_stock', payload);
          } else if (stockNow <= Math.floor(reorderLevel * 0.5)) {
            io.to(`company_${compId}`).emit('critical_stock', payload);
          } else if (stockNow <= reorderLevel) {
            io.to(`company_${compId}`).emit('low_stock', payload);
          }
        }
        // ────────────────────────────────────────────────────────────────────────

        saleItemsToInsert.push({
          medicine_id: med.id,
          medicine_name: med.name,
          quantity: Number(item.quantity),
          unit_price: unitPrice,
          total_price: itemTotal
        });
      }

      const totalAmount = Math.max(0, subtotal - Number(discount_amount));

      const sale = saleRepo.create({
        patient_id: patient_id ? Number(patient_id) : null,
        prescription_id: prescription_id ? Number(prescription_id) : null,
        company_id: compId,
        branch_id: branchId,
        sold_by: user.id || null,
        discount_amount: Number(discount_amount),
        total_amount: subtotal,
        net_amount: totalAmount,
        payment_mode,
        status: MedicineSaleStatus.COMPLETED
      });

      const savedSale: any = await saleRepo.save(sale as any);

      const itemsWithSaleId = saleItemsToInsert.map(i => saleItemRepo.create({ ...i, sale_id: (savedSale as any).id }));
      const savedItems = await saleItemRepo.save(itemsWithSaleId as any);

      await queryRunner.commitTransaction();

      if (io && compId) io.to(`company_${compId}`).emit("pos.sale_completed", savedSale);

      return res.status(201).json({
        success: true,
        data: { ...savedSale, items: savedItems },
        message: "Pharmacy sale processed successfully"
      });

    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      console.error("[PharmacyPosController.create Error]:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async cancel(req: Request, res: Response) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const saleRepo = queryRunner.manager.getRepository(MedicineSale);
      const saleItemRepo = queryRunner.manager.getRepository(MedicineSaleItem);
      const medRepo = queryRunner.manager.getRepository(Medicine);

      const saleId = Number(req.params.id);
      const sale = await saleRepo.findOne({ where: { id: saleId } });
      if (!sale) {
        await queryRunner.rollbackTransaction();
        return res.status(404).json({ success: false, message: "Sale transaction not found" });
      }

      if (sale.status === MedicineSaleStatus.CANCELLED) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({ success: false, message: "Sale transaction is already cancelled" });
      }

      const items = await saleItemRepo.find({ where: { sale_id: sale.id } });
      for (const item of items) {
        const med = await medRepo.findOne({ where: { id: item.medicine_id } });
        if (med) {
          med.current_stock += item.quantity;
          await medRepo.save(med);
        }
      }

      sale.status = MedicineSaleStatus.CANCELLED;
      await saleRepo.save(sale);

      await queryRunner.commitTransaction();

      const user: any = (req as any).user || {};
      const compId = user?.company_id || user?.companyId;
      if (io && compId) io.to(`company_${compId}`).emit("pos.sale_cancelled", sale);

      return res.json({ success: true, message: "Sale cancelled and stock restored successfully" });

    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

// ─── Stock Approval Controller ─────────────────────────────────────────────

export class StockApprovalHcController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(HealthcareStockApproval);
      const user: any = (req as any).user || {};
      const { page = 1, limit = 50 } = req.query as any;
      const compId = user?.company_id || user?.companyId;

      const qb = repo.createQueryBuilder("sa");
      if (user && !user.isSuperAdmin && user.userType !== UserType.SUPER_ADMIN && compId) {
        qb.where("(sa.company_id = :cid OR sa.company_id IS NULL)", { cid: compId });
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 50);
      const skip = (pageNum - 1) * limitNum;

      qb.skip(skip).take(limitNum).orderBy("sa.created_at", "DESC");

      const [data, total] = await qb.getManyAndCount();
      return res.json({ success: true, data, total, page: pageNum, limit: limitNum });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(HealthcareStockApproval);
      const item = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!item) return res.status(404).json({ success: false, message: "Stock approval requisition not found" });
      return res.json({ success: true, data: item });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const user: any = (req as any).user || {};
      const compId = user?.company_id || user?.companyId || 1;
      const branchId = user?.branch_id || user?.branchId || null;

      const repo = dataSource.getRepository(HealthcareStockApproval);
      const reqItem = repo.create({
        ...req.body,
        company_id: compId,
        branch_id: branchId,
        requested_by: user.id || null,
        status: StockApprovalStatus.PENDING
      });
      await repo.save(reqItem);
      return res.status(201).json({ success: true, data: reqItem, message: "Stock requisition submitted" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(HealthcareStockApproval);
      const item = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!item) return res.status(404).json({ success: false, message: "Stock approval not found" });
      repo.merge(item, req.body);
      await repo.save(item);
      return res.json({ success: true, data: item, message: "Stock approval updated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async approve(req: Request, res: Response) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const approvalRepo = queryRunner.manager.getRepository(HealthcareStockApproval);
      const medRepo = queryRunner.manager.getRepository(Medicine);

      const id = Number(req.params.id);
      const approval = await approvalRepo.findOne({ where: { id } });
      if (!approval) {
        await queryRunner.rollbackTransaction();
        return res.status(404).json({ success: false, message: "Requisition not found" });
      }

      if (approval.status === StockApprovalStatus.APPROVED) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({ success: false, message: "Requisition is already approved" });
      }

      const med = await medRepo.findOne({ where: { id: approval.medicine_id } });
      if (med) {
        med.current_stock += approval.quantity;
        await medRepo.save(med);
      }

      const user: any = (req as any).user || {};
      approval.status = StockApprovalStatus.APPROVED;
      approval.approved_by = user.id || null;
      await approvalRepo.save(approval);

      await queryRunner.commitTransaction();
      return res.json({ success: true, data: approval, message: "Stock requisition approved & stock incremented" });

    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async reject(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(HealthcareStockApproval);
      const item = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!item) return res.status(404).json({ success: false, message: "Requisition not found" });
      const user: any = (req as any).user || {};
      item.status = StockApprovalStatus.REJECTED;
      item.approved_by = user.id || null;
      await repo.save(item);
      return res.json({ success: true, data: item, message: "Stock requisition rejected" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

// ─── Medicine Expiry Controller ───────────────────────────────────────────

export class MedicineExpiryController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const user: any = (req as any).user || {};
      const compId = user?.company_id || user?.companyId;

      const qb = repo.createQueryBuilder("m")
        .where("m.is_active = true AND m.expiry_date IS NOT NULL");

      if (compId) {
        qb.andWhere("(m.company_id = :cid OR m.company_id IS NULL)", { cid: compId });
      }

      const data = await qb.orderBy("m.expiry_date", "ASC").getMany();
      const now = new Date();

      const list = data.map(m => ({
        ...m,
        status: new Date(m.expiry_date!) < now
          ? "EXPIRED"
          : new Date(m.expiry_date!) <= new Date(now.getTime() + 30 * 86400000)
            ? "CRITICAL"
            : "EXPIRING_SOON"
      }));

      return res.json({ success: true, data: list });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getSummary(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Medicine);
      const user: any = (req as any).user || {};
      const compId = user?.company_id || user?.companyId;

      const qb = repo.createQueryBuilder("m")
        .where("m.is_active = true AND m.expiry_date IS NOT NULL");

      if (compId) {
        qb.andWhere("(m.company_id = :cid OR m.company_id IS NULL)", { cid: compId });
      }

      const data = await qb.getMany();
      const now = new Date();
      const criticalCutoff = new Date(now.getTime() + 30 * 86400000);

      const expired = data.filter(m => new Date(m.expiry_date!) < now).length;
      const critical = data.filter(m => new Date(m.expiry_date!) >= now && new Date(m.expiry_date!) <= criticalCutoff).length;
      const expiring_soon = data.filter(m => new Date(m.expiry_date!) > criticalCutoff).length;

      return res.json({
        success: true,
        data: {
          total: data.length,
          expired,
          critical,
          expiring_soon
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
