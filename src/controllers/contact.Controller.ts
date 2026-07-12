import { Request, Response, NextFunction } from "express";
import dataSource from "../config/database";
import { Contact, ContactStatus } from "../entities/contact.entity";
import { User, UserRole } from "../entities/user";
import { Company } from "../entities/company";
import { Role } from "../entities/roles";
import { AuditLog } from "../entities/auditLogs";
import { EmailService } from "../utils/sendEmailOtp";
import { UserType } from "../utils/Role-Access";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import PDFDocument from "pdfkit";

export class ContactController {
  // ============================================
  // CHECK DUPLICATE
  // ============================================
  public async checkDuplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, companyName, phone } = req.body;
      const contactRepo = dataSource.getRepository(Contact);
      const userRepo = dataSource.getRepository(User);
      const companyRepo = dataSource.getRepository(Company);

      let duplicateEmail = false;
      let duplicateCompany = false;
      let duplicatePhone = false;
      let existingDetails: any = null;

      if (email) {
        const contactExists = await contactRepo.findOne({
          where: { email, isDeleted: false }
        });
        const userExists = await userRepo.findOne({
          where: { email }
        });
        if (contactExists || userExists) {
          duplicateEmail = true;
          existingDetails = {
            type: userExists ? "User Account" : "Lead Registration",
            name: userExists ? userExists.name : contactExists?.ownerName,
            company: userExists ? "SVK E-Com" : contactExists?.companyName,
            status: userExists ? (userExists.isActive ? "ACTIVE" : "INACTIVE") : contactExists?.status
          };
        }
      }

      if (companyName) {
        const contactExists = await contactRepo.findOne({
          where: { companyName, isDeleted: false }
        });
        const companyExists = await companyRepo.findOne({
          where: { name: companyName }
        });
        if (contactExists || companyExists) {
          duplicateCompany = true;
          if (!existingDetails) {
            existingDetails = {
              type: companyExists ? "Active Tenant" : "Lead Registration",
              name: companyExists ? companyExists.name : contactExists?.ownerName,
              company: companyExists ? companyExists.name : contactExists?.companyName,
              status: companyExists ? "ACTIVE" : contactExists?.status
            };
          }
        }
      }

      if (phone) {
        const contactExists = await contactRepo.findOne({
          where: { phone, isDeleted: false }
        });
        const userExists = await userRepo.findOne({
          where: { mobilenumber: phone }
        });
        const companyExists = await companyRepo.findOne({
          where: { phone }
        });
        if (contactExists || userExists || companyExists) {
          duplicatePhone = true;
          if (!existingDetails) {
            existingDetails = {
              type: userExists ? "User Account" : (companyExists ? "Active Tenant" : "Lead Registration"),
              name: userExists ? userExists.name : (companyExists ? companyExists.name : contactExists?.ownerName),
              company: userExists ? "SVK E-Com" : (companyExists ? companyExists.name : contactExists?.companyName),
              status: userExists ? "ACTIVE" : (companyExists ? "ACTIVE" : contactExists?.status)
            };
          }
        }
      }

      return res.json({
        success: true,
        duplicateEmail,
        duplicateCompany,
        duplicatePhone,
        existingDetails
      });
    } catch (error) {
      next(error);
    }
  }


  // ============================================
  // PUBLIC REGISTER (Create Lead/Contact)
  // ============================================
  public async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        companyName,
        businessName,
        ownerName,
        email,
        phone,
        country,
        state,
        city,
        businessType,
        gst,
        website,
        employeeCount,
        preferredPlan,
        billingCycle,
        message
      } = req.body;

      const contactRepo = dataSource.getRepository(Contact);
      const userRepo = dataSource.getRepository(User);

      // Duplicates validation
      const existingEmail = await contactRepo.findOne({ where: { email, isDeleted: false } });
      const existingUser = await userRepo.findOne({ where: { email } });
      if (existingEmail || existingUser) {
        return res.status(400).json({ success: false, message: "Email is already registered" });
      }

      const existingPhoneContact = await contactRepo.findOne({ where: { phone, isDeleted: false } });
      const existingPhoneUser = await userRepo.findOne({ where: { mobilenumber: phone } });
      const existingPhoneCompany = await dataSource.getRepository(Company).findOne({ where: { phone } });
      if (existingPhoneContact || existingPhoneUser || existingPhoneCompany) {
        return res.status(400).json({ success: false, message: "Mobile number is already registered" });
      }

      if (companyName) {
         const existingCompany = await dataSource.getRepository(Company).findOne({ where: { name: companyName } });
         if (existingCompany) {
             return res.status(400).json({ success: false, message: "Company name is already registered" });
         }
      }

      const verifyToken = crypto.randomUUID();
      const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const contact = contactRepo.create({
        companyName,
        businessName,
        ownerName,
        email,
        phone,
        country,
        state,
        city,
        businessType,
        gst: gst || null,
        website: website || null,
        employeeCount: employeeCount ? Number(employeeCount) : 1,
        preferredPlan,
        billingCycle,
        message: message || null,
        status: ContactStatus.PENDING,
        emailVerified: false,
        verificationToken: verifyToken,
        verificationTokenExpires: verifyExpiry
      });

      const savedContact = await contactRepo.save(contact);

      // Create Audit Log
      const auditRepo = dataSource.getRepository(AuditLog);
      await auditRepo.save({
        module: "CONTACT",
        action: "CREATE",
        recordId: savedContact.id,
        userId: 0,
        roleId: 0,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
        device: req.headers["user-agent"] as string,
        diff: { new: savedContact }
      });

      // Send Verification Email
      const appUrl = process.env.APP_URL || "http://localhost:4200";
      const verifyUrl = `${appUrl}/authentication/verify-email?token=${verifyToken}`;
      
      EmailService.sendRegistrationVerification(email, ownerName, verifyUrl).catch((mailErr) => {
        console.error("Verification email sending failed:", mailErr);
      });


      return res.status(201).json({
        success: true,
        message: "Registration successful. Please check your email to verify your account."
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // VERIFY EMAIL (Public flow)
  // ============================================
  public async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, message: "Token is required" });
      }

      const contactRepo = dataSource.getRepository(Contact);
      const contact = await contactRepo.findOne({
        where: { verificationToken: token, isDeleted: false }
      });

      if (!contact) {
        return res.status(404).json({ success: false, message: "Invalid or expired token" });
      }

      if (contact.verificationTokenExpires && contact.verificationTokenExpires < new Date()) {
        return res.status(400).json({ success: false, message: "Verification token has expired" });
      }

      contact.emailVerified = true;
      contact.verificationToken = "";
      contact.verificationTokenExpires = null;

      // Auto-approve trial registrations, else mark pending admin approval
      let autoApproved = false;
      if (contact.preferredPlan === "14-Day Free Trial" || contact.preferredPlan === "Trial") {
        contact.status = ContactStatus.APPROVED;
        // Generate password setup token
        contact.verificationToken = crypto.randomUUID();
        contact.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        autoApproved = true;
      }

      await contactRepo.save(contact);

      // Audit Log
      const auditRepo = dataSource.getRepository(AuditLog);
      await auditRepo.save({
        module: "CONTACT",
        action: "VERIFY_EMAIL",
        recordId: contact.id,
        userId: 0,
        roleId: 0,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
        device: req.headers["user-agent"] as string
      });

      if (autoApproved) {
        // Send password setup link
        const appUrl = process.env.APP_URL || "http://localhost:4200";
        const setupUrl = `${appUrl}/authentication/setup-password?token=${contact.verificationToken}`;
        
        EmailService.sendTrialApproval(contact.email, contact.ownerName, contact.preferredPlan, setupUrl).catch((mailErr) => {
          console.error("Password setup email sending failed:", mailErr);
        });


        return res.json({
          success: true,
          autoApproved: true,
          message: "Email verified successfully! A password setup link has been sent to your email."
        });
      }

      return res.json({
        success: true,
        autoApproved: false,
        message: "Email verified successfully! Your account is now pending administrator approval."
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // PASSWORD SETUP (Public flow)
  // ============================================
  public async setupPassword(req: Request, res: Response, next: NextFunction) {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const { token, password } = req.body;
      if (!token || !password) {
        await qr.rollbackTransaction();
        return res.status(400).json({ success: false, message: "Token and password are required" });
      }

      const contactRepo = qr.manager.getRepository(Contact);
      const contact = await contactRepo.findOne({
        where: { verificationToken: token, isDeleted: false }
      });

      if (!contact) {
        await qr.rollbackTransaction();
        return res.status(404).json({ success: false, message: "Invalid password setup token" });
      }

      if (contact.status !== ContactStatus.APPROVED) {
        await qr.rollbackTransaction();
        return res.status(400).json({ success: false, message: "Lead has not been approved yet" });
      }

      if (contact.verificationTokenExpires && contact.verificationTokenExpires < new Date()) {
        await qr.rollbackTransaction();
        return res.status(400).json({ success: false, message: "Password setup link has expired" });
      }

      const userRepo = qr.manager.getRepository(User);
      const companyRepo = qr.manager.getRepository(Company);
      const userRoleRepo = qr.manager.getRepository(UserRole);
      const roleRepo = qr.manager.getRepository(Role);

      // Double check user email duplication
      const existingUser = await userRepo.findOne({ where: { email: contact.email } });
      if (existingUser) {
        await qr.rollbackTransaction();
        return res.status(400).json({ success: false, message: "User with this email already exists" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create Admin User
      const user = userRepo.create({
        name: contact.ownerName,
        email: contact.email,
        password: hashedPassword,
        mobilenumber: contact.phone,
        userType: UserType.ADMIN,
        emailVerified: true,
        mustChangePassword: false,
        isActive: true,
        address: `${contact.city}, ${contact.state}, ${contact.country}`
      });
      const savedUser = await userRepo.save(user);

      // Create Company
      const company = companyRepo.create({
        name: contact.companyName,
        email: contact.email,
        phone: contact.phone,
        address: `${contact.city}, ${contact.state}, ${contact.country}`,
        gst_number: contact.gst || undefined,
        owner_id: savedUser.id
      });
      const savedCompany = await companyRepo.save(company);

      // Find Admin Role ID
      const adminRole = await roleRepo.findOne({ where: { name: UserType.ADMIN } });
      if (!adminRole) {
        await qr.rollbackTransaction();
        return res.status(500).json({ success: false, message: "Admin role is not seeded in database" });
      }

      // Create UserRole mapping
      await userRoleRepo.save({
        user_id: savedUser.id,
        role_id: adminRole.id,
        company_id: savedCompany.id
      });

      // Update Contact state
      contact.status = ContactStatus.CONVERTED;
      contact.verificationToken = "";
      contact.verificationTokenExpires = null;
      await contactRepo.save(contact);

      // Audit Log
      const auditRepo = qr.manager.getRepository(AuditLog);
      await auditRepo.save({
        module: "CONTACT",
        action: "CONVERT",
        recordId: contact.id,
        userId: savedUser.id,
        roleId: adminRole.id,
        companyId: savedCompany.id,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
        device: req.headers["user-agent"] as string,
        diff: { convertedCompany: savedCompany, convertedUser: savedUser }
      });

      await qr.commitTransaction();

      return res.json({
        success: true,
        message: "Account setup completed successfully! You can now log in."
      });
    } catch (error) {
      await qr.rollbackTransaction();
      next(error);
    } finally {
      await qr.release();
    }
  }

  // ============================================
  // GET CONTACTS / LEADS (Admin CRM Dashboard)
  // ============================================
  public async getContacts(req: any, res: Response, next: NextFunction) {
    try {
      const contactRepo = dataSource.getRepository(Contact);

      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);
      const skip = (page - 1) * limit;

      const sortBy = req.query.sortBy || "createdAt";
      const sortOrder = req.query.sortOrder === "ASC" ? "ASC" : "DESC";

      const queryBuilder = contactRepo.createQueryBuilder("contact");

      // Soft delete check
      const showDeleted = req.query.showDeleted === "true";
      queryBuilder.where("contact.isDeleted = :isDeleted", { isDeleted: showDeleted });

      // Filtering
      if (req.query.status) {
        queryBuilder.andWhere("contact.status = :status", { status: req.query.status });
      }
      if (req.query.preferredPlan) {
        queryBuilder.andWhere("contact.preferredPlan = :plan", { plan: req.query.preferredPlan });
      }
      if (req.query.businessType) {
        queryBuilder.andWhere("contact.businessType = :btype", { btype: req.query.businessType });
      }

      // Searching
      if (req.query.search) {
        queryBuilder.andWhere(
          "(contact.companyName LIKE :search OR contact.ownerName LIKE :search OR contact.email LIKE :search OR contact.phone LIKE :search)",
          { search: `%${req.query.search}%` }
        );
      }

      queryBuilder
        .orderBy(`contact.${sortBy}`, sortOrder)
        .skip(skip)
        .take(limit);

      const [contacts, total] = await queryBuilder.getManyAndCount();

      // Lead Analytics Statistics for CRM dashboard
      const statsBuilder = contactRepo.createQueryBuilder("contact").where("contact.isDeleted = false");
      const allCounts = await statsBuilder
        .select("contact.status", "status")
        .addSelect("COUNT(contact.id)", "count")
        .groupBy("contact.status")
        .getRawMany();

      const stats = {
        total: await contactRepo.count({ where: { isDeleted: false } }),
        pending: 0,
        approved: 0,
        rejected: 0,
        converted: 0
      };

      allCounts.forEach((c) => {
        if (c.status === "PENDING") stats.pending = Number(c.count);
        if (c.status === "APPROVED") stats.approved = Number(c.count);
        if (c.status === "REJECTED") stats.rejected = Number(c.count);
        if (c.status === "CONVERTED") stats.converted = Number(c.count);
      });

      return res.json({
        success: true,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats,
        data: contacts
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // GET CONTACT BY ID (CRM Dashboard)
  // ============================================
  public async getContactById(req: any, res: Response, next: NextFunction) {
    try {
      const contactRepo = dataSource.getRepository(Contact);
      const contact = await contactRepo.findOne({
        where: { id: Number(req.params.id) }
      });

      if (!contact) {
        return res.status(404).json({ success: false, message: "Lead contact not found" });
      }

      return res.json({ success: true, data: contact });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // UPDATE CONTACT (CRM Dashboard)
  // ============================================
  public async updateContact(req: any, res: Response, next: NextFunction) {
    try {
      const contactRepo = dataSource.getRepository(Contact);
      const contact = await contactRepo.findOne({
        where: { id: Number(req.params.id) }
      });

      if (!contact) {
        return res.status(404).json({ success: false, message: "Lead contact not found" });
      }

      const prev = { ...contact };
      contactRepo.merge(contact, req.body);
      const updated = await contactRepo.save(contact);

      // Audit log
      const auditRepo = dataSource.getRepository(AuditLog);
      await auditRepo.save({
        module: "CONTACT",
        action: "UPDATE",
        recordId: contact.id,
        userId: req.user.id,
        roleId: req.user.roleId || 0,
        companyId: req.user.companyId || null,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
        device: req.headers["user-agent"] as string,
        diff: { previous: prev, new: updated }
      });

      return res.json({ success: true, message: "Lead updated successfully", data: updated });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // APPROVE CONTACT (CRM Dashboard)
  // ============================================
  public async approveContact(req: any, res: Response, next: NextFunction) {
    try {
      const contactRepo = dataSource.getRepository(Contact);
      const contact = await contactRepo.findOne({
        where: { id: Number(req.params.id), isDeleted: false }
      });

      if (!contact) {
        return res.status(404).json({ success: false, message: "Lead contact not found" });
      }

      if (contact.status === ContactStatus.CONVERTED) {
        return res.status(400).json({ success: false, message: "Lead already converted to customer" });
      }

      const prev = { ...contact };
      contact.status = ContactStatus.APPROVED;
      contact.verificationToken = crypto.randomUUID();
      contact.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const updated = await contactRepo.save(contact);

      // Audit log
      const auditRepo = dataSource.getRepository(AuditLog);
      await auditRepo.save({
        module: "CONTACT",
        action: "APPROVE",
        recordId: contact.id,
        userId: req.user.id,
        roleId: req.user.roleId || 0,
        companyId: req.user.companyId || null,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
        device: req.headers["user-agent"] as string,
        diff: { previous: prev, new: updated }
      });

      // Send password setup email
      const appUrl = process.env.APP_URL || "http://localhost:4200";
      const setupUrl = `${appUrl}/authentication/setup-password?token=${contact.verificationToken}`;
      
      EmailService.sendTrialApproval(contact.email, contact.ownerName, contact.preferredPlan, setupUrl).catch((mailErr) => {
        console.error("Approval setup email failed:", mailErr);
      });


      return res.json({ success: true, message: "Lead approved. Password setup email sent to customer." });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // REJECT CONTACT (CRM Dashboard)
  // ============================================
  public async rejectContact(req: any, res: Response, next: NextFunction) {
    try {
      const contactRepo = dataSource.getRepository(Contact);
      const contact = await contactRepo.findOne({
        where: { id: Number(req.params.id), isDeleted: false }
      });

      if (!contact) {
        return res.status(404).json({ success: false, message: "Lead contact not found" });
      }

      const prev = { ...contact };
      contact.status = ContactStatus.REJECTED;
      contact.verificationToken = "";
      contact.verificationTokenExpires = null;
      const updated = await contactRepo.save(contact);

      // Audit log
      const auditRepo = dataSource.getRepository(AuditLog);
      await auditRepo.save({
        module: "CONTACT",
        action: "REJECT",
        recordId: contact.id,
        userId: req.user.id,
        roleId: req.user.roleId || 0,
        companyId: req.user.companyId || null,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
        device: req.headers["user-agent"] as string,
        diff: { previous: prev, new: updated }
      });

      // Send rejection email
      const rejectHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #07070f; color: #f0f0ff; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
          <h2 style="color: #ef4444;">Registration Update</h2>
          <p>Hi ${contact.ownerName},</p>
          <p>Thank you for your interest in SVK E-Com. Unfortunately, we are unable to approve your registration request for plan "${contact.preferredPlan}" at this time.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      `;
      const transporter = require("nodemailer").createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: contact.email,
          subject: "Registration status update - SVK E-Com",
          html: rejectHtml
        });
      } catch (mailErr) {
        console.error("Rejection email failed:", mailErr);
      }

      return res.json({ success: true, message: "Lead rejected successfully" });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // SOFT DELETE CONTACT (CRM Dashboard)
  // ============================================
  public async softDeleteContact(req: any, res: Response, next: NextFunction) {
    try {
      const contactRepo = dataSource.getRepository(Contact);
      const contact = await contactRepo.findOne({
        where: { id: Number(req.params.id) }
      });

      if (!contact) {
        return res.status(404).json({ success: false, message: "Lead contact not found" });
      }

      contact.isDeleted = true;
      contact.deletedAt = new Date();
      await contactRepo.save(contact);

      // Audit log
      const auditRepo = dataSource.getRepository(AuditLog);
      await auditRepo.save({
        module: "CONTACT",
        action: "SOFT_DELETE",
        recordId: contact.id,
        userId: req.user.id,
        roleId: req.user.roleId || 0,
        companyId: req.user.companyId || null,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
        device: req.headers["user-agent"] as string
      });

      return res.json({ success: true, message: "Lead soft-deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // RESTORE CONTACT (CRM Dashboard)
  // ============================================
  public async restoreContact(req: any, res: Response, next: NextFunction) {
    try {
      const contactRepo = dataSource.getRepository(Contact);
      const contact = await contactRepo.findOne({
        where: { id: Number(req.params.id) }
      });

      if (!contact) {
        return res.status(404).json({ success: false, message: "Lead contact not found" });
      }

      contact.isDeleted = false;
      contact.deletedAt = null;
      await contactRepo.save(contact);

      // Audit log
      const auditRepo = dataSource.getRepository(AuditLog);
      await auditRepo.save({
        module: "CONTACT",
        action: "RESTORE",
        recordId: contact.id,
        userId: req.user.id,
        roleId: req.user.roleId || 0,
        companyId: req.user.companyId || null,
        ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
        device: req.headers["user-agent"] as string
      });

      return res.json({ success: true, message: "Lead restored successfully" });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // EXPORT CONTACTS (CSV & PDF)
  // ============================================
  public async exportContacts(req: any, res: Response, next: NextFunction) {
    try {
      const contactRepo = dataSource.getRepository(Contact);
      const format = req.query.format || "csv";

      const queryBuilder = contactRepo.createQueryBuilder("contact");
      queryBuilder.where("contact.isDeleted = :isDeleted", { isDeleted: req.query.showDeleted === "true" });

      if (req.query.status) {
        queryBuilder.andWhere("contact.status = :status", { status: req.query.status });
      }
      if (req.query.preferredPlan) {
        queryBuilder.andWhere("contact.preferredPlan = :plan", { plan: req.query.preferredPlan });
      }
      if (req.query.search) {
        queryBuilder.andWhere(
          "(contact.companyName LIKE :search OR contact.ownerName LIKE :search OR contact.email LIKE :search)",
          { search: `%${req.query.search}%` }
        );
      }

      const contacts = await queryBuilder.orderBy("contact.createdAt", "DESC").getMany();

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="contacts-export.csv"');

        let csv = "ID,Company Name,Business Name,Owner Name,Email,Phone,Country,State,City,Business Type,Plan,Billing Cycle,Status,Created At\n";
        contacts.forEach((c) => {
          csv += `"${c.id}","${c.companyName.replace(/"/g, '""')}","${c.businessName.replace(/"/g, '""')}","${c.ownerName.replace(/"/g, '""')}","${c.email}","${c.phone}","${c.country}","${c.state}","${c.city}","${c.businessType}","${c.preferredPlan}","${c.billingCycle}","${c.status}","${c.createdAt.toISOString()}"\n`;
        });

        return res.send(csv);
      } else if (format === "pdf") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="contacts-export.pdf"');

        const doc = new PDFDocument({ margin: 30 });
        doc.pipe(res);

        doc.fontSize(18).text("SVK E-Com CRM Leads & Contacts Export", { align: "center" });
        doc.fontSize(10).text(`Exported at: ${new Date().toLocaleString()}`, { align: "center" });
        doc.moveDown(2);

        contacts.forEach((c, idx) => {
          doc.fontSize(12).fillColor("#6366f1").text(`${idx + 1}. ${c.companyName} (${c.preferredPlan})`);
          doc.fontSize(10).fillColor("#444")
            .text(`Owner: ${c.ownerName} | Email: ${c.email} | Phone: ${c.phone}`)
            .text(`Location: ${c.city}, ${c.state}, ${c.country} | Type: ${c.businessType}`)
            .text(`Status: ${c.status} | Registered: ${c.createdAt.toLocaleDateString()}`);
          doc.moveDown();
        });

        doc.end();
        return;
      }

      return res.status(400).json({ success: false, message: "Invalid format. Supported: csv, pdf" });
    } catch (error) {
      next(error);
    }
  }
}
