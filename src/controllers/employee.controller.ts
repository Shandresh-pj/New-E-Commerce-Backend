import bcrypt from "bcrypt";
import crypto from "crypto";
import { Response } from "express";
import dataSource from "../config/database";
import { In, Not } from "typeorm";
import { User, UserRole } from "../entities/user";
import { EmailService } from "../utils/sendEmailOtp";
import { UserType, EmployeeType } from "../utils/Role-Access";
import { TenantService } from "../middleware/tenantFilter.middleware";
import { Controller, Delete, Get, Middleware, Post, Put, Swagger } from "../decorators";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { Company } from "../entities/company";
import { Branch } from "../entities/branch";
import { Role } from "../entities/roles";
import { Employee } from "../entities/employee.entity";
import { auditMiddleware } from "../middleware/audit.Middleware";

@Controller("/employees")
export class EmployeeController {

  // =====================================
  // CREATE EMPLOYEE
  // =====================================
  @Post("/")
  @Middleware([authenticateMiddleware, auditMiddleware("EMPLOYEE")])
  @Swagger("Create Employee", "Create employee with company, branch and role assignment")
  async create(req: any, res: Response) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userRepo = queryRunner.manager.getRepository(User);
      const roleRepo = queryRunner.manager.getRepository(UserRole);
      const companyRepo = queryRunner.manager.getRepository(Company);
      const branchRepo = queryRunner.manager.getRepository(Branch);
      const roleMasterRepo = queryRunner.manager.getRepository(Role);
      const hrEmployeeRepo = queryRunner.manager.getRepository(Employee);

      const {
        name,
        email,
        mobilenumber,
        company_id,
        branch_id,
        role_id,
        userType,
        employee_code,
        department,
        designation,
        salary,
        working_hours,
        joining_date,
        address
      } = req.body;

      if (!name || !email || !mobilenumber) {
        await queryRunner.rollbackTransaction();
        return res.status(400).json({ success: false, message: "name, email, and mobilenumber are required" });
      }

      // Existing email check
      const exists = await userRepo.findOne({ where: { email } });
      if (exists) {
        await queryRunner.rollbackTransaction();
        return res.status(409).json({ success: false, message: "Email already exists" });
      }

      const effectiveCompId = company_id ? Number(company_id) : (req.user?.company_id || req.user?.companyId || 1);
      const effectiveBranchId = branch_id ? Number(branch_id) : (req.user?.branch_id || req.user?.branchId || 1);

      if (effectiveCompId) {
        const company = await companyRepo.findOne({ where: { id: effectiveCompId } });
        if (!company) {
          await queryRunner.rollbackTransaction();
          return res.status(404).json({ success: false, message: "Company not found" });
        }
      }

      if (effectiveBranchId) {
        const branch = await branchRepo.findOne({ where: { id: effectiveBranchId } });
        if (!branch) {
          await queryRunner.rollbackTransaction();
          return res.status(404).json({ success: false, message: "Branch not found" });
        }
      }

      let role: Role | null = null;
      if (role_id) {
        role = await roleMasterRepo.findOne({ where: { id: Number(role_id) } });
      }
      if (!role) {
        role = await roleMasterRepo.findOne({ where: { name: "Employee" } });
      }

      const tempPassword = crypto.randomBytes(4).toString("hex");
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      const userTargetType = userType || UserType.EMPLOYEE;

      const newUser = userRepo.create({
        name,
        email,
        mobilenumber,
        password: hashedPassword,
        userType: userTargetType as any,
        mustChangePassword: true,
        isActive: true,
        isSuperAdmin: false
      });

      await userRepo.save(newUser);

      const userRole = roleRepo.create({
        user_id: newUser.id,
        role_id: role ? role.id : (role_id ? Number(role_id) : 1),
        company_id: effectiveCompId,
        branch_id: effectiveBranchId
      });

      await roleRepo.save(userRole);

      // Create HR Employee Record
      const empCode = employee_code || `EMP-${String(newUser.id).padStart(4, '0')}`;
      const hrPayload: any = {
        id: newUser.id,
        company_id: effectiveCompId,
        branch_id: effectiveBranchId,
        employee_code: empCode,
        name,
        email,
        mobile: mobilenumber,
        designation: designation || "Staff",
        department: department || "General",
        type: EmployeeType.SHOPKEEPER,
        salary: salary ? Number(salary) : 0,
        working_hours: working_hours ? Number(working_hours) : 8,
        joining_date: joining_date || new Date().toISOString().split("T")[0],
        status: true
      };

      const hrEmployee = hrEmployeeRepo.create(hrPayload);

      try {
        await hrEmployeeRepo.save(hrEmployee as any);
      } catch (err: any) {
        console.warn("HR Employee save note:", err.message);
      }

      await queryRunner.commitTransaction();

      EmailService.sendTemporaryPassword(email, tempPassword, name)
        .catch(err => console.log("Employee Mail Note:", err?.message || err));

      return res.status(201).json({
        success: true,
        message: "Employee created successfully",
        data: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          mobilenumber: newUser.mobilenumber,
          userType: newUser.userType,
          userRole: {
            company_id: effectiveCompId,
            branch_id: effectiveBranchId,
            role_id: role ? role.id : role_id
          }
        }
      });

    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      console.error("Error in EmployeeController.create:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create employee"
      });
    } finally {
      await queryRunner.release();
    }
  }

  // =====================================
  // GET ALL EMPLOYEES
  // =====================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  async getAll(req: any, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 100));
      const skip = (page - 1) * limit;

      const userRepo = dataSource.getRepository(User);
      const hrRepo = dataSource.getRepository(Employee);

      const qb = userRepo.createQueryBuilder("user")
        .leftJoinAndSelect("user.userRoles", "ur")
        .leftJoinAndSelect("ur.company", "company")
        .leftJoinAndSelect("ur.branch", "branch")
        .leftJoinAndSelect("ur.role", "role")
        .where("user.userType IN (:...types)", {
          types: [UserType.BRANCH_MANAGER, UserType.SHOPKEEPER, UserType.DELIVERY_BOY, UserType.EMPLOYEE]
        })
        .select([
          "user.id", "user.name", "user.email", "user.mobilenumber", "user.userType", "user.isActive",
          "ur.id", "company.id", "company.name", "branch.id", "branch.name", "branch.location", "role.id", "role.name"
        ]);

      const compId = req.user?.company_id || req.user?.companyId;
      const bId = req.user?.branch_id || req.user?.branchId;

      if (!req.user?.isSuperAdmin && compId) {
        qb.andWhere("ur.company_id = :companyId", { companyId: compId });
      }

      if (bId) {
        qb.andWhere("ur.branch_id = :branchId", { branchId: bId });
      }

      qb.orderBy("user.id", "DESC");
      qb.skip(skip).take(limit);

      const [users, total] = await qb.getManyAndCount();

      const userIds = users.map(u => u.id);
      let hrDetails: any[] = [];
      if (userIds.length > 0) {
        try {
          hrDetails = await hrRepo.find({ where: { id: In(userIds) } });
        } catch (e) {
          hrDetails = [];
        }
      }
      const hrMap = new Map(hrDetails.map(h => [h.id, h]));

      const enrichedUsers = users.map(u => {
        const hr = hrMap.get(u.id);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          mobilenumber: u.mobilenumber,
          userType: u.userType,
          isActive: u.isActive,
          department: hr?.department || "General",
          designation: hr?.designation || "Staff",
          employee_code: hr?.employee_code || `EMP-${String(u.id).padStart(4, '0')}`,
          salary: hr?.salary ? Number(hr.salary) : 0,
          joining_date: hr?.joining_date || null,
          status: u.isActive !== false ? 'ACTIVE' : 'INACTIVE',
          userRoles: u.userRoles
        };
      });

      return res.json({
        success: true,
        data: enrichedUsers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error: any) {
      console.error("Error in EmployeeController.getAll:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch employees",
        data: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
      });
    }
  }

  // =====================================
  // GET SINGLE EMPLOYEE
  // =====================================
  @Get("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Employee", "Get employee by id")
  async getOne(req: any, res: Response) {
    try {
      const targetId = Number(req.params.id);
      if (isNaN(targetId)) {
        return res.status(400).json({ success: false, message: "Invalid employee ID" });
      }

      const userRepo = dataSource.getRepository(User);
      const hrRepo = dataSource.getRepository(Employee);

      const user = await userRepo.findOne({
        where: { id: targetId },
        relations: { userRoles: { company: true, branch: true, role: true } }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "Employee not found" });
      }

      const hr: any = await hrRepo.findOne({ where: { id: targetId } });

      return res.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobilenumber: user.mobilenumber,
          userType: user.userType,
          isActive: user.isActive,
          department: hr?.department || "General",
          designation: hr?.designation || "Staff",
          employee_code: hr?.employee_code || `EMP-${String(user.id).padStart(4, '0')}`,
          salary: hr?.salary ? Number(hr.salary) : 0,
          joining_date: hr?.joining_date || null,
          status: user.isActive !== false ? 'ACTIVE' : 'INACTIVE',
          userRoles: user.userRoles
        }
      });

    } catch (error: any) {
      console.error("Error in EmployeeController.getOne:", error);
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch employee" });
    }
  }

  // =====================================
  // UPDATE EMPLOYEE
  // =====================================
  @Put("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Update Employee", "Update employee")
  async update(req: any, res: Response) {
    try {
      const targetId = Number(req.params.id);
      if (isNaN(targetId)) {
        return res.status(400).json({ success: false, message: "Invalid employee ID" });
      }

      const userRepo = dataSource.getRepository(User);
      const hrRepo = dataSource.getRepository(Employee);
      const userRoleRepo = dataSource.getRepository(UserRole);

      const user = await userRepo.findOne({ where: { id: targetId } });
      if (!user) {
        return res.status(404).json({ success: false, message: "Employee not found" });
      }

      const { name, email, mobilenumber, userType, company_id, branch_id, role_id, department, designation, employee_code, salary } = req.body;

      // Validate email uniqueness if changing email
      if (email && email !== user.email) {
        const emailUser = await userRepo.findOne({ where: { email, id: Not(targetId) } });
        if (emailUser) {
          return res.status(409).json({ success: false, message: `Email '${email}' is already in use by another user.` });
        }
        const emailEmp = await hrRepo.findOne({ where: { email, id: Not(targetId) } });
        if (emailEmp) {
          return res.status(409).json({ success: false, message: `Email '${email}' is already in use by another employee.` });
        }
      }

      // Validate employee_code uniqueness if changing code
      if (employee_code) {
        const codeEmp = await hrRepo.findOne({ where: { employee_code, id: Not(targetId) } });
        if (codeEmp) {
          return res.status(409).json({ success: false, message: `Employee code '${employee_code}' is already in use.` });
        }
      }

      if (name !== undefined) user.name = name;
      if (email !== undefined) user.email = email;
      if (mobilenumber !== undefined) user.mobilenumber = mobilenumber;
      if (userType !== undefined) user.userType = userType;

      await userRepo.save(user);

      // Update UserRole
      let userRole = await userRoleRepo.findOne({ where: { user_id: user.id } });
      if (!userRole) {
        userRole = userRoleRepo.create({ user_id: user.id });
      }
      if (company_id !== undefined) userRole.company_id = Number(company_id);
      if (branch_id !== undefined) userRole.branch_id = Number(branch_id);
      if (role_id !== undefined) userRole.role_id = Number(role_id);
      await userRoleRepo.save(userRole);

      // Update HR Employee record
      let hr: any = await hrRepo.findOne({ where: { id: user.id } });
      if (!hr) {
        hr = await hrRepo.findOne({ where: { email: user.email } });
      }

      if (!hr) {
        const defaultCode = employee_code || `EMP-${String(user.id).padStart(4, '0')}`;
        const hrPayload: any = {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobilenumber || '',
          company_id: userRole.company_id || 1,
          branch_id: userRole.branch_id || 1,
          employee_code: defaultCode,
          designation: designation || "Staff",
          department: department || "General",
          type: EmployeeType.SHOPKEEPER,
          salary: salary ? Number(salary) : 50000
        };
        hr = hrRepo.create(hrPayload);
      }

      if (name !== undefined) hr.name = name;
      if (email !== undefined) hr.email = email;
      if (mobilenumber !== undefined) hr.mobile = mobilenumber;
      if (department !== undefined) hr.department = department;
      if (designation !== undefined) hr.designation = designation;
      if (employee_code !== undefined) hr.employee_code = employee_code;
      if (salary !== undefined) hr.salary = Number(salary);

      await hrRepo.save(hr);

      return res.json({
        success: true,
        message: "Employee updated successfully",
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobilenumber: user.mobilenumber,
          userType: user.userType,
          department: hr.department,
          designation: hr.designation,
          salary: hr.salary
        }
      });

    } catch (error: any) {
      console.error("Error in EmployeeController.update:", error);
      const isDuplicate = error.message?.includes("duplicate key") || error.code === "23505";
      const userMessage = isDuplicate
        ? "Email or Employee Code is already registered to another employee."
        : (error.message || "Failed to update employee");

      return res.status(isDuplicate ? 409 : 500).json({
        success: false,
        message: userMessage
      });
    }
  }

  // =====================================
  // DELETE EMPLOYEE
  // =====================================
  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger("Delete Employee", "Delete employee")
  async delete(req: any, res: Response) {
    try {
      const targetId = Number(req.params.id);
      if (isNaN(targetId)) {
        return res.status(400).json({ success: false, message: "Invalid employee ID" });
      }

      const userRepo = dataSource.getRepository(User);
      const hrRepo = dataSource.getRepository(Employee);
      const userRoleRepo = dataSource.getRepository(UserRole);

      const user = await userRepo.findOne({ where: { id: targetId } });
      if (!user) {
        return res.status(404).json({ success: false, message: "Employee not found" });
      }

      await userRoleRepo.delete({ user_id: targetId });
      await hrRepo.delete({ id: targetId });
      await userRepo.delete(targetId);

      return res.json({
        success: true,
        message: "Employee deleted successfully"
      });

    } catch (error: any) {
      console.error("Error in EmployeeController.delete:", error);
      return res.status(500).json({ success: false, message: error.message || "Failed to delete employee" });
    }
  }
}