import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import dataSource from "../config/database";
import { In } from "typeorm";
import { Doctor, Patient, Appointment, AppointmentStatus } from "../entities/healthcare.entity";
import { Consultation } from "../entities/healthcare2.entity";
import { User, UserRole } from "../entities/user";
import { Role } from "../entities/roles";
import { UserType } from "../utils/Role-Access";
import { EmailService } from "../utils/sendEmailOtp";
import { io } from "../socket/socket";

// ─── Helper: Build scheduled_at from date+time strings ────────────────────────
function buildScheduledAt(body: any): Date {
  if (body.scheduled_at) return new Date(body.scheduled_at);
  const dateStr = body.appointment_date || body.date;
  const timeStr = body.appointment_time || body.time || '09:00';
  if (dateStr) {
    try {
      // dateStr could be ISO (2026-09-01) or DD-MM-YYYY
      const normalized = /^\d{2}-\d{2}-\d{4}$/.test(String(dateStr))
        ? String(dateStr).split('-').reverse().join('-')  // DD-MM-YYYY → YYYY-MM-DD
        : String(dateStr).split('T')[0];
      return new Date(`${normalized}T${timeStr}:00`);
    } catch { /* fall through */ }
  }
  return new Date();
}

// ─── Helper: Enrich appointment object with virtual fields ────────────────────
function enrichAppointment(appt: any): any {
  if (!appt) return appt;
  const s = appt.scheduled_at ? new Date(appt.scheduled_at) : null;
  return {
    ...appt,
    appointment_date: s
      ? `${String(s.getDate()).padStart(2,'0')}-${String(s.getMonth()+1).padStart(2,'0')}-${s.getFullYear()}`
      : (appt.appointment_date || null),
    appointment_time: s
      ? `${String(s.getHours()).padStart(2,'0')}:${String(s.getMinutes()).padStart(2,'0')}`
      : (appt.appointment_time || '09:00'),
  };
}

// ─── Doctor Controller ────────────────────────────────────────────────────────

export class DoctorController {

  // GET ALL DOCTORS (With Multi-Tenant Scoping, Company/Branch Filters & Search)
  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Doctor);
      const { search, is_active, company_id, branch_id, page = 1, limit = 100 } = req.query as any;
      const user: any = (req as any).user || {};

      const qb = repo.createQueryBuilder("d");

      const compId = user?.company_id || user?.companyId;
      const userBranchId = user?.branch_id || user?.branchId;

      if (company_id !== undefined && company_id !== null && company_id !== '') {
        qb.andWhere("d.company_id = :filterCid", { filterCid: Number(company_id) });
      } else if (user && !user.isSuperAdmin && user.userType !== UserType.SUPER_ADMIN && compId) {
        if (userBranchId) {
          qb.where("((d.company_id = :cid AND (d.branch_id = :bid OR d.branch_id IS NULL)) OR d.company_id IS NULL OR d.company_id = 1)", { cid: compId, bid: userBranchId });
        } else {
          qb.where("(d.company_id = :cid OR d.company_id IS NULL OR d.company_id = 1)", { cid: compId });
        }
      }

      if (branch_id !== undefined && branch_id !== null && branch_id !== '') {
        qb.andWhere("d.branch_id = :filterBid", { filterBid: Number(branch_id) });
      }

      if (is_active !== undefined && is_active !== null && is_active !== '') {
        const activeBool = is_active === "true" || is_active === true || is_active === '1' || is_active === 1;
        qb.andWhere("d.is_active = :a", { a: activeBool });
      }

      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        qb.andWhere("(d.name LIKE :s OR d.specialization LIKE :s OR d.email LIKE :s OR d.license_no LIKE :s OR d.qualification LIKE :s)", { s });
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 100);
      const skip = (pageNum - 1) * limitNum;

      qb.skip(skip).take(limitNum).orderBy("d.created_at", "DESC");

      const [data, total] = await qb.getManyAndCount();
      return res.json({ success: true, data, total, page: pageNum, limit: limitNum });
    } catch (err: any) {
      console.error("[DoctorController.getAll Error]:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // GET DOCTOR BY ID
  async getById(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Doctor);
      const doctor = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!doctor) return res.status(404).json({ success: false, message: "Doctor record not found" });
      return res.json({ success: true, data: doctor });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // CREATE DOCTOR (Transactional Doctor + User Account + Credentials Email)
  async create(req: Request, res: Response) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user: any = (req as any).user || {};
      const userRepo = queryRunner.manager.getRepository(User);
      const roleRepo = queryRunner.manager.getRepository(UserRole);
      const roleMasterRepo = queryRunner.manager.getRepository(Role);
      const doctorRepo = queryRunner.manager.getRepository(Doctor);

      const {
        name,
        email,
        phone,
        mobilenumber,
        specialization,
        qualification,
        experience_years,
        consultation_fee,
        registration_number,
        registration_body,
        license_no,
        description,
        bio,
        is_active,
        company_id,
        branch_id,
        temporary_password,
        password,
        send_email_credentials
      } = req.body;

      if (!name) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({ success: false, message: "Doctor name is required" });
      }

      const effectiveCompId = company_id !== undefined && company_id !== null && company_id !== '' ? Number(company_id) : (user?.company_id || user?.companyId || 1);
      const effectiveBranchId = branch_id !== undefined && branch_id !== null && branch_id !== '' ? Number(branch_id) : (user?.branch_id || user?.branchId || null);
      const contactPhone = phone || mobilenumber || '';
      const doctorName = name.startsWith('Dr.') ? name : `Dr. ${name}`;
      const effectiveLicenseNo = registration_number || registration_body || license_no || '';
      const effectiveBio = description || bio || '';

      let newUser: User | null = null;
      let rawTempPassword = temporary_password || password || crypto.randomBytes(4).toString("hex");

      if (email && email.trim()) {
        const cleanEmail = email.trim().toLowerCase();
        const existingUser = await userRepo.findOne({ where: { email: cleanEmail } });
        if (existingUser) {
          await queryRunner.rollbackTransaction();
          return res.status(409).json({ success: false, message: `An account with email '${cleanEmail}' already exists` });
        }

        const hashedPassword = await bcrypt.hash(rawTempPassword, 12);

        newUser = userRepo.create({
          name: doctorName,
          email: cleanEmail,
          mobilenumber: contactPhone,
          password: hashedPassword,
          userType: UserType.DOCTOR,
          mustChangePassword: true,
          isActive: is_active !== false,
          isSuperAdmin: false
        });

        await userRepo.save(newUser);

        let doctorRole = await roleMasterRepo.findOne({ where: { name: UserType.DOCTOR } });
        if (!doctorRole) {
          doctorRole = await roleMasterRepo.findOne({ where: { name: "Doctor" } });
        }
        if (!doctorRole) {
          doctorRole = await roleMasterRepo.findOne({ where: { name: "Employee" } });
        }
        if (!doctorRole) {
          doctorRole = roleMasterRepo.create({ name: UserType.DOCTOR, isActive: true });
          await roleMasterRepo.save(doctorRole);
        }

        const userRolePayload: any = {
          user: { id: newUser.id },
          user_id: newUser.id,
          role: { id: doctorRole.id },
          role_id: doctorRole.id,
          company: { id: effectiveCompId },
          company_id: effectiveCompId,
        };

        if (effectiveBranchId) {
          userRolePayload.branch = { id: effectiveBranchId };
          userRolePayload.branch_id = effectiveBranchId;
        }

        const userRole = roleRepo.create(userRolePayload);
        await roleRepo.save(userRole);
      }

      const doctorPayload: any = {
        name: doctorName,
        specialization: specialization || 'General Medicine',
        qualification: qualification || 'MBBS',
        experience_years: Number(experience_years || 0),
        consultation_fee: consultation_fee !== undefined ? Number(consultation_fee) : 0,
        license_no: effectiveLicenseNo,
        phone: contactPhone,
        email: email ? email.trim().toLowerCase() : '',
        bio: effectiveBio,
        is_active: is_active !== false,
        company_id: effectiveCompId,
        branch_id: effectiveBranchId
      };

      if (newUser) {
        doctorPayload.user_id = newUser.id;
      }

      const doctor = doctorRepo.create(doctorPayload);
      await doctorRepo.save(doctor);

      await queryRunner.commitTransaction();

      if (email && send_email_credentials !== false) {
        EmailService.sendTemporaryPassword(email.trim().toLowerCase(), rawTempPassword, doctorName)
          .catch(err => console.error("[Doctor] Credentials email error:", err?.message || err));
      }

      return res.status(201).json({
        success: true,
        data: doctor,
        message: email ? `Doctor registered successfully and login credentials sent to ${email}` : "Doctor registered successfully"
      });

    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      console.error("[DoctorController.create Error]:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // UPDATE DOCTOR (Sync Doctor + Associated User Account)
  async update(req: Request, res: Response) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const doctorRepo = queryRunner.manager.getRepository(Doctor);
      const userRepo = queryRunner.manager.getRepository(User);

      const doctorId = Number(req.params.id);
      const doctor = await doctorRepo.findOne({ where: { id: doctorId } });
      if (!doctor) {
        await queryRunner.rollbackTransaction();
        return res.status(404).json({ success: false, message: "Doctor not found" });
      }

      const {
        name,
        email,
        phone,
        mobilenumber,
        specialization,
        qualification,
        experience_years,
        consultation_fee,
        registration_number,
        registration_body,
        license_no,
        description,
        bio,
        is_active,
        temporary_password,
        password,
        send_email_credentials
      } = req.body;

      const newName = name ? (name.startsWith('Dr.') ? name : `Dr. ${name}`) : doctor.name;
      const newEmail = email !== undefined ? (email ? email.trim().toLowerCase() : '') : doctor.email;
      const newPhone = phone || mobilenumber || doctor.phone;
      const newLicenseNo = registration_number || registration_body || license_no || doctor.license_no;
      const newBio = description || bio || doctor.bio;

      let associatedUser: User | null = null;
      if (doctor.user_id) {
        associatedUser = await userRepo.findOne({ where: { id: doctor.user_id } });
      }
      if (!associatedUser && doctor.email) {
        associatedUser = await userRepo.findOne({ where: { email: doctor.email } });
      }

      let newPassToMail = temporary_password || password;

      if (associatedUser) {
        if (newEmail && newEmail !== associatedUser.email) {
          const emailOccupied = await userRepo.findOne({ where: { email: newEmail } });
          if (emailOccupied && emailOccupied.id !== associatedUser.id) {
            await queryRunner.rollbackTransaction();
            return res.status(409).json({ success: false, message: `Email '${newEmail}' is already used by another user` });
          }
          associatedUser.email = newEmail;
        }

        associatedUser.name = newName;
        associatedUser.mobilenumber = newPhone || '';

        if (is_active !== undefined) {
          associatedUser.isActive = is_active !== false;
        }

        if (newPassToMail && newPassToMail.trim()) {
          associatedUser.password = await bcrypt.hash(newPassToMail.trim(), 12);
          associatedUser.mustChangePassword = true;
        }

        await userRepo.save(associatedUser);
      }

      doctorRepo.merge(doctor, {
        name: newName,
        email: newEmail,
        phone: newPhone,
        specialization: specialization !== undefined ? specialization : doctor.specialization,
        qualification: qualification !== undefined ? qualification : doctor.qualification,
        experience_years: experience_years !== undefined ? Number(experience_years) : doctor.experience_years,
        consultation_fee: consultation_fee !== undefined ? Number(consultation_fee) : doctor.consultation_fee,
        license_no: newLicenseNo,
        bio: newBio,
        is_active: is_active !== undefined ? (is_active !== false) : doctor.is_active,
        company_id: req.body.company_id !== undefined ? (req.body.company_id ? Number(req.body.company_id) : null) : doctor.company_id,
        branch_id: req.body.branch_id !== undefined ? (req.body.branch_id ? Number(req.body.branch_id) : null) : doctor.branch_id
      });

      await doctorRepo.save(doctor);
      await queryRunner.commitTransaction();

      if (newEmail && newPassToMail && send_email_credentials !== false) {
        EmailService.sendTemporaryPassword(newEmail, newPassToMail, newName)
          .catch(err => console.error("[Doctor Update] Email error:", err?.message || err));
      }

      return res.json({
        success: true,
        data: doctor,
        message: "Doctor details updated successfully"
      });

    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      console.error("[DoctorController.update Error]:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // DELETE DOCTOR (Soft Deactivation or Permanent Removal)
  async delete(req: Request, res: Response) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const doctorRepo = queryRunner.manager.getRepository(Doctor);
      const userRepo = queryRunner.manager.getRepository(User);
      const roleRepo = queryRunner.manager.getRepository(UserRole);

      const doctorId = Number(req.params.id);
      const isPermanent = req.query.permanent === "true" || req.query.hard === "true";

      const doctor = await doctorRepo.findOne({ where: { id: doctorId } });
      if (!doctor) {
        await queryRunner.rollbackTransaction();
        return res.status(404).json({ success: false, message: "Doctor not found" });
      }

      let associatedUser: User | null = null;
      if (doctor.user_id) {
        associatedUser = await userRepo.findOne({ where: { id: doctor.user_id } });
      } else if (doctor.email) {
        associatedUser = await userRepo.findOne({ where: { email: doctor.email } });
      }

      if (isPermanent) {
        await doctorRepo.remove(doctor);

        if (associatedUser) {
          await roleRepo.delete({ user_id: associatedUser.id });
          await userRepo.remove(associatedUser);
        }

        await queryRunner.commitTransaction();
        return res.json({ success: true, message: "Doctor record permanently deleted" });
      } else {
        doctor.is_active = false;
        await doctorRepo.save(doctor);

        if (associatedUser) {
          associatedUser.isActive = false;
          await userRepo.save(associatedUser);
        }

        await queryRunner.commitTransaction();
        return res.json({ success: true, message: "Doctor profile deactivated successfully" });
      }

    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      console.error("[DoctorController.delete Error]:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

// ─── Patient Controller ────────────────────────────────────────────────────────

export class PatientController {

  async getAll(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Patient);
      const { search, page = 1, limit = 50 } = req.query as any;
      const user: any = (req as any).user || {};

      const qb = repo.createQueryBuilder("p");
      const compId = user?.company_id || user?.companyId;

      if (user && !user.isSuperAdmin && user.userType !== UserType.SUPER_ADMIN && compId) {
        qb.where("(p.company_id = :cid OR p.company_id IS NULL)", { cid: compId });
      }

      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        qb.andWhere("(p.name LIKE :s OR p.phone LIKE :s OR p.email LIKE :s OR p.patient_code LIKE :s)", { s });
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 50);
      const skip = (pageNum - 1) * limitNum;

      qb.skip(skip).take(limitNum).orderBy("p.created_at", "DESC");

      const [data, total] = await qb.getManyAndCount();
      return res.json({ success: true, data, total, page: pageNum, limit: limitNum });
    } catch (err: any) {
      console.error("[PatientController.getAll Error]:", err);
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
      const user: any = (req as any).user || {};
      const compId = user?.company_id || user?.companyId || 1;
      const branchId = user?.branch_id || user?.branchId || null;
      const repo = dataSource.getRepository(Patient);
      const patient = repo.create({ ...req.body, company_id: compId, branch_id: branchId });
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
      const docRepo  = dataSource.getRepository(Doctor);
      const patRepo  = dataSource.getRepository(Patient);
      const { status, doctor_id, patient_id, date_from, date_to, page = 1, limit = 50 } = req.query as any;
      const user: any = (req as any).user || {};

      const qb = repo.createQueryBuilder("a");
      const compId = user?.company_id || user?.companyId;

      if (user && !user.isSuperAdmin && user.userType !== UserType.SUPER_ADMIN && compId) {
        qb.where("(a.company_id = :cid OR a.company_id IS NULL)", { cid: compId });
      }

      if (status)    qb.andWhere("a.status = :status", { status });
      if (doctor_id) qb.andWhere("a.doctor_id = :did", { did: doctor_id });
      if (patient_id)qb.andWhere("a.patient_id = :pid", { pid: patient_id });
      if (date_from) qb.andWhere("a.scheduled_at >= :df", { df: date_from });
      if (date_to)   qb.andWhere("a.scheduled_at <= :dt", { dt: date_to });

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 50);
      const skip = (pageNum - 1) * limitNum;

      qb.skip(skip).take(limitNum).orderBy("a.scheduled_at", "ASC");

      const [raw, total] = await qb.getManyAndCount();

      // Enrich with patient_name, doctor_name, and virtual date/time fields
      const doctorIds  = [...new Set(raw.map(a => a.doctor_id).filter(Boolean))];
      const patientIds = [...new Set(raw.map(a => a.patient_id).filter(Boolean))];

      const [doctors, patients] = await Promise.all([
        doctorIds.length  ? docRepo.findBy({ id: In(doctorIds as any[]) })  : Promise.resolve([]),
        patientIds.length ? patRepo.findBy({ id: In(patientIds as any[]) }) : Promise.resolve([]),
      ]);

      const docMap: Record<number, Doctor>  = {};
      const patMap: Record<number, Patient> = {};
      doctors.forEach((d: any)  => { docMap[d.id]  = d; });
      patients.forEach((p: any) => { patMap[p.id]  = p; });

      const data = raw.map(a => enrichAppointment({
        ...a,
        patient_name: patMap[a.patient_id]?.name  || null,
        doctor_name:  docMap[a.doctor_id]?.name   || null,
        specialty:    docMap[a.doctor_id]?.specialization || null,
      }));

      return res.json({ success: true, data, total, page: pageNum, limit: limitNum });
    } catch (err: any) {
      console.error("[AppointmentController.getAll Error]:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const repo    = dataSource.getRepository(Appointment);
      const docRepo = dataSource.getRepository(Doctor);
      const patRepo = dataSource.getRepository(Patient);

      const appointment = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

      const [doctor, patient] = await Promise.all([
        appointment.doctor_id  ? docRepo.findOne({ where: { id: appointment.doctor_id }  }) : Promise.resolve(null),
        appointment.patient_id ? patRepo.findOne({ where: { id: appointment.patient_id } }) : Promise.resolve(null),
      ]);

      return res.json({
        success: true,
        data: enrichAppointment({
          ...appointment,
          patient_name: (patient as any)?.name || null,
          doctor_name:  (doctor  as any)?.name || null,
          specialty:    (doctor  as any)?.specialization || null,
        })
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const user: any = (req as any).user || {};
      const compId   = user?.company_id || user?.companyId || 1;
      const branchId = user?.branch_id  || user?.branchId  || null;
      const repo     = dataSource.getRepository(Appointment);

      // Accept appointment_date + appointment_time OR scheduled_at
      const scheduledAt = buildScheduledAt(req.body);

      const appointment = repo.create({
        patient_id:     req.body.patient_id,
        doctor_id:      req.body.doctor_id,
        scheduled_at:   scheduledAt,
        notes:          req.body.notes || req.body.chief_complaint || req.body.reason || null,
        reason:         req.body.reason || req.body.chief_complaint || req.body.notes || null,
        token_number:   req.body.token_number || null,
        status:         AppointmentStatus.BOOKED,
        company_id:     compId,
        branch_id:      branchId,
      });

      await repo.save(appointment);
      const enriched = enrichAppointment(appointment);
      if (io && compId) io.to(`company_${compId}`).emit("appointment.created", enriched);
      return res.status(201).json({ success: true, data: enriched, message: "Appointment booked" });
    } catch (err: any) {
      console.error("[AppointmentController.create Error]:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Appointment);
      const appointment = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

      // Rebuild scheduled_at if date/time fields are provided
      if (req.body.appointment_date || req.body.appointment_time || req.body.scheduled_at) {
        appointment.scheduled_at = buildScheduledAt({
          ...req.body,
          appointment_time: req.body.appointment_time || (() => {
            const s = new Date(appointment.scheduled_at);
            return `${String(s.getHours()).padStart(2,'0')}:${String(s.getMinutes()).padStart(2,'0')}`;
          })()
        });
      }

      if (req.body.patient_id !== undefined) appointment.patient_id = req.body.patient_id;
      if (req.body.doctor_id  !== undefined) appointment.doctor_id  = req.body.doctor_id;
      if (req.body.notes      !== undefined) appointment.notes       = req.body.notes;
      if (req.body.reason     !== undefined) appointment.reason      = req.body.reason;

      await repo.save(appointment);
      const enriched = enrichAppointment(appointment);
      const user: any = (req as any).user || {};
      if (io) io.to(`company_${user.company_id || user.companyId}`).emit("appointment.updated", enriched);
      return res.json({ success: true, data: enriched, message: "Appointment updated" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Appointment);
      const { status: nextStatus } = req.body as { status: AppointmentStatus };
      const appointment = await repo.findOne({ where: { id: Number(req.params.id) } });

      if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });

      const allowed = VALID_TRANSITIONS[appointment.status] || [];
      if (!allowed.includes(nextStatus)) {
        return res.status(422).json({
          success: false,
          message: `Cannot transition from '${appointment.status}' to '${nextStatus}'. Allowed: ${allowed.join(", ") || "none"}`
        });
      }

      appointment.status = nextStatus;
      await repo.save(appointment);

      const user: any = (req as any).user || {};
      if (io) io.to(`company_${user.company_id}`).emit("appointment.updated", appointment);

      return res.json({ success: true, data: appointment, message: `Appointment status updated to ${nextStatus}` });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async cancel(req: Request, res: Response) {
    try {
      const repo = dataSource.getRepository(Appointment);
      const appointment = await repo.findOne({ where: { id: Number(req.params.id) } });
      if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
      appointment.status = AppointmentStatus.CANCELLED;
      await repo.save(appointment);
      const user: any = (req as any).user || {};
      if (io) io.to(`company_${user.company_id}`).emit("appointment.cancelled", appointment);
      return res.json({ success: true, data: appointment, message: "Appointment cancelled" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
