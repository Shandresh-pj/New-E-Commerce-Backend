import { Request, Response } from "express";
import dataSource from "../config/database";
import { Doctor }   from "../entities/healthcare.entity";
import { io }       from "../socket/socket";

export class DoctorController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Doctor);
      const { search, is_active, page = 1, limit = 20 } = req.query as any;
      const user: any = (req as any).user;

      const qb = repo.createQueryBuilder("d")
        .where("d.company_id = :cid", { cid: user.company_id });

      if (user.branch_id) qb.andWhere("d.branch_id = :bid", { bid: user.branch_id });
      if (is_active !== undefined) qb.andWhere("d.is_active = :a", { a: is_active === "true" });
      if (search) qb.andWhere("(d.name LIKE :s OR d.specialization LIKE :s OR d.email LIKE :s)", { s: `%${search}%` });

      const skip = (Number(page) - 1) * Number(limit);
      qb.skip(skip).take(Number(limit)).orderBy("d.created_at", "DESC");

      const [data, total] = await qb.getManyAndCount();
      return res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Doctor);
      const doctor = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
      return res.json({ success: true, data: doctor });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const repo = dataSource.getRepository(Doctor);
      const doctor = repo.create({ ...req.body, company_id: user.company_id, branch_id: user.branch_id });
      await repo.save(doctor);
      return res.status(201).json({ success: true, data: doctor, message: "Doctor created successfully" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Doctor);
      const doctor = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
      repo.merge(doctor, req.body);
      await repo.save(doctor);
      return res.json({ success: true, data: doctor, message: "Doctor updated successfully" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Doctor);
      const doctor = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
      await repo.update(doctor.id, { is_active: false });
      return res.json({ success: true, message: "Doctor deactivated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

// ─── Patient Controller ────────────────────────────────────────────────────────

import { Patient } from "../entities/healthcare.entity";
import { Consultation } from "../entities/healthcare2.entity";

export class PatientController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Patient);
      const { search, page = 1, limit = 20 } = req.query as any;
      const user: any = (req as any).user;

      const qb = repo.createQueryBuilder("p")
        .where("p.company_id = :cid", { cid: user.company_id });

      if (search) qb.andWhere("(p.name LIKE :s OR p.phone LIKE :s OR p.email LIKE :s)", { s: `%${search}%` });

      const skip = (Number(page) - 1) * Number(limit);
      qb.skip(skip).take(Number(limit)).orderBy("p.created_at", "DESC");

      const [data, total] = await qb.getManyAndCount();
      return res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Patient);
      const patient = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
      return res.json({ success: true, data: patient });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getHistory(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Consultation);
      const data = await repo.find({
        where: { patient_id: Number(req.params.id) },
        order: { created_at: "DESC" },
        take: 50,
      });
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const repo = dataSource.getRepository(Patient);
      const patient = repo.create({ ...req.body, company_id: user.company_id, branch_id: user.branch_id });
      await repo.save(patient);
      return res.status(201).json({ success: true, data: patient, message: "Patient registered" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Patient);
      const patient = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
      repo.merge(patient, req.body);
      await repo.save(patient);
      return res.json({ success: true, data: patient, message: "Patient updated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

// ─── Appointment Controller ────────────────────────────────────────────────────

import { Appointment, AppointmentStatus } from "../entities/healthcare.entity";

const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.BOOKED]:          [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.CONFIRMED]:       [AppointmentStatus.CHECKED_IN, AppointmentStatus.CANCELLED],
  [AppointmentStatus.CHECKED_IN]:      [AppointmentStatus.IN_CONSULTATION, AppointmentStatus.NO_SHOW],
  [AppointmentStatus.IN_CONSULTATION]: [AppointmentStatus.COMPLETED],
  [AppointmentStatus.COMPLETED]:       [],
  [AppointmentStatus.CANCELLED]:       [],
  [AppointmentStatus.NO_SHOW]:         [],
};

export class AppointmentController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Appointment);
      const { status, doctor_id, patient_id, date_from, date_to, page = 1, limit = 20 } = req.query as any;
      const user: any = (req as any).user;

      const qb = repo.createQueryBuilder("a")
        .where("a.company_id = :cid", { cid: user.company_id });

      if (status)    qb.andWhere("a.status = :status", { status });
      if (doctor_id) qb.andWhere("a.doctor_id = :did", { did: doctor_id });
      if (patient_id)qb.andWhere("a.patient_id = :pid", { pid: patient_id });
      if (date_from) qb.andWhere("a.scheduled_at >= :df", { df: date_from });
      if (date_to)   qb.andWhere("a.scheduled_at <= :dt", { dt: date_to });

      const skip = (Number(page) - 1) * Number(limit);
      qb.skip(skip).take(Number(limit)).orderBy("a.scheduled_at", "ASC");

      const [data, total] = await qb.getManyAndCount();
      return res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Appointment);
      const appt = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
      return res.json({ success: true, data: appt });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const user: any = (req as any).user;
      const repo = dataSource.getRepository(Appointment);
      const appt = repo.create({ ...req.body, company_id: user.company_id, branch_id: user.branch_id });
      await repo.save(appt);
      if (io) io.to(`company_${user.company_id}`).emit("appointment.created", appt);
      return res.status(201).json({ success: true, data: appt, message: "Appointment created" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Appointment);
      const appt = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
      repo.merge(appt, req.body);
      await repo.save(appt);
      const user: any = (req as any).user;
      if (io) io.to(`company_${user.company_id}`).emit("appointment.updated", appt);
      return res.json({ success: true, data: appt, message: "Appointment updated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Appointment);
      const appt = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });

      const newStatus: AppointmentStatus = req.body.status;
      const allowed = VALID_TRANSITIONS[appt.status];
      if (!allowed.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition from ${appt.status} to ${newStatus}`,
        });
      }

      appt.status = newStatus;
      await repo.save(appt);
      const user: any = (req as any).user;
      if (io) io.to(`company_${user.company_id}`).emit("appointment.updated", appt);
      return res.json({ success: true, data: appt, message: "Status updated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async cancel(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Appointment);
      const appt = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!appt) return res.status(404).json({ success: false, message: "Appointment not found" });
      if ([AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED].includes(appt.status)) {
        return res.status(400).json({ success: false, message: `Cannot cancel a ${appt.status} appointment` });
      }
      appt.status = AppointmentStatus.CANCELLED;
      await repo.save(appt);
      const user: any = (req as any).user;
      if (io) io.to(`company_${user.company_id}`).emit("appointment.updated", appt);
      return res.json({ success: true, message: "Appointment cancelled" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
