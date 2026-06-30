import bcrypt from "bcrypt";
import crypto from "crypto";

import { Response } from "express";
import { In } from "typeorm";
import { dataSource } from "../server";

import { User, UserRole } from "../entities/user";

import { EmailService } from "../utils/sendEmailOtp";
import { UserType } from "../utils/Role-Access";

import {
  Delete,
  Get,
  Middleware,
  Post,
  Put,
  Swagger
} from "../decorators";

import authenticateMiddleware from "../middleware/authenticate";
import { Employee } from "../entities/employee.entity";
import { Company } from "../entities/company";
import { Branch } from "../entities/branch";
import { Role } from "../entities/roles";
import { auditMiddleware } from "../middleware/audit.Middleware";

export class EmployeeController {

  // =====================================
  // CREATE EMPLOYEE
  // =====================================

@Post("/")
@Middleware([authenticateMiddleware,auditMiddleware("EMPLOYEE"),])
@Swagger(
 "Create Employee",
 "Create employee with company, branch and role assignment"
)
async create(
 req:any,
 res:Response
){

const queryRunner=
dataSource.createQueryRunner();

await queryRunner.connect();

await queryRunner.startTransaction();

try{

const userRepo=
queryRunner.manager.getRepository(
User
);

const roleRepo=
queryRunner.manager.getRepository(
UserRole
);

const companyRepo=
queryRunner.manager.getRepository(
Company
);

const branchRepo=
queryRunner.manager.getRepository(
Branch
);

const roleMasterRepo=
queryRunner.manager.getRepository(
Role
);


const{

name,
email,
mobilenumber,
company_id,
branch_id,
role_id,
userType

}=req.body;


// ====================
// Existing email check
// ====================

const exists=
await userRepo.findOne({

where:{
email
}

});

if(exists){

return res.status(409)
.json({

success:false,
message:"Email already exists"

});

}


// ====================
// Validate relations
// ====================

const company=
await companyRepo.findOne({

where:{
id:company_id
}

});

if(!company){

return res.status(404)
.json({

success:false,
message:"Company not found"

});

}


const branch=
await branchRepo.findOne({

where:{
id:branch_id
}

});

if(!branch){

return res.status(404)
.json({

success:false,
message:"Branch not found"

});

}


const role=
await roleMasterRepo.findOne({

where:{
id:role_id
}

});

if(!role){

return res.status(404)
.json({

success:false,
message:"Role not found"

});

}



// ====================
// Generate password
// ====================

const tempPassword=
crypto
.randomBytes(4)
.toString("hex");

const hashedPassword=
await bcrypt.hash(
tempPassword,
12
);


// ====================
// Create employee
// ====================

const employee=
userRepo.create({

name,
email,
mobilenumber,

password:
hashedPassword,

userType:
userType ||
UserType.STAFF_KEEPER,

mustChangePassword:true,

isActive:true,

isSuperAdmin:false

});

await userRepo.save(
employee
);


// ====================
// Create assignment
// ====================

const userRole=
roleRepo.create({

user:{
id:employee.id
},

company:{
id:company_id
},

branch:{
id:branch_id
},

role:{
id:role_id
}

});

await roleRepo.save(
userRole);


// ====================
// Send mail
// ====================

await EmailService
.sendTemporaryPassword(

email,
tempPassword,
name

);


await queryRunner
.commitTransaction();


return res.status(201)
.json({

success:true,

message:
"Employee created successfully",

data:{

id:
employee.id,

name:
employee.name,

email:
employee.email,

mobilenumber:
employee.mobilenumber,

userRole:{

company_id,
branch_id,
role_id

}

}

});

}
catch(error:any){

await queryRunner
.rollbackTransaction();

return res.status(500)
.json({

success:false,
message:error.message

});

}
finally{

await queryRunner.release();

}

}
  // =====================================
  // GET ALL EMPLOYEES
  // =====================================

@Get("/")
@Middleware([authenticateMiddleware])
async getAll(
 req:any,
 res:Response
){try{

const page=Number(req.query.page)||1;

const limit=Number(req.query.limit)||10;

const skip=(page-1)*limit;

const repo=dataSource.getRepository(User);

const [users,total]=
await repo.findAndCount({

where:{
 userType: In([
   UserType.BRANCH_MANAGER,
   UserType.STAFF_KEEPER,
   UserType.DELIVERY_BOY
 ])
},

relations:{
 userRoles:{
   company:true,
   branch:true,
   role:true
 }
},

select:{

id:true,
name:true,
email:true,
mobilenumber:true,
userType:true,

userRoles:{

id:true,

company:{
id:true,
name:true
},

branch:{
id:true,
name:true,
location:true
},

role:{
id:true,
name:true
}

}

}

});

return res.json({

success:true,
data:users,

pagination:{

total,
page,
limit,

totalPages:
Math.ceil(
total/limit
)

}

});

}
catch(error:any){

return res.status(500)
.json({

success:false,
message:error.message

});

}

}

  // =====================================
  // GET SINGLE EMPLOYEE
  // =====================================

  @Get("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger(
    "Get Employee",
    "Get employee by id"
  )
  async getOne(
    req:any,
    res:Response
  ){

    try{

      const repo =
      dataSource.getRepository(User);

      const employee =
      await repo.findOne({

        where:{

          id:Number(
            req.params.id
          ),

          userType: In([
            UserType.BRANCH_MANAGER,
            UserType.STAFF_KEEPER,
            UserType.DELIVERY_BOY
          ])
        },

        select:{
          id:true,
          name:true,
          email:true,
          mobilenumber:true,
          userType:true
        }

      });

      if(!employee){

        return res.status(404)
        .json({

          success:false,
          message:
          "Employee not found"

        });

      }

      return res.json({

        success:true,
        data:employee

      });

    }
    catch(error:any){

      return res.status(500)
      .json({

        success:false,
        message:error.message

      });

    }

  }

  // =====================================
  // UPDATE EMPLOYEE
  // =====================================

  @Put("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger(
    "Update Employee",
    "Update employee"
  )
  async update(
    req:any,
    res:Response
  ){

    try{

      const repo =
      dataSource.getRepository(User);

      const employee =
      await repo.findOne({

        where:{
          id:Number(
            req.params.id
          )
        }

      });

      if(!employee){

        return res.status(404)
        .json({

          success:false,
          message:
          "Employee not found"

        });

      }

      delete req.body.password;

      repo.merge(
        employee,
        req.body
      );

      await repo.save(
        employee
      );

      return res.json({

        success:true,

        message:
        "Employee updated",

        data:employee

      });

    }
    catch(error:any){

      return res.status(500)
      .json({

        success:false,
        message:error.message

      });

    }

  }

  // =====================================
  // DELETE EMPLOYEE
  // =====================================

  @Delete("/:id")
  @Middleware([authenticateMiddleware])
  @Swagger(
    "Delete Employee",
    "Delete employee"
  )
  async delete(
    req:any,
    res:Response
  ){

    try{

      const repo =
      dataSource.getRepository(User);

      const employee =
      await repo.findOne({

        where:{
          id:Number(
            req.params.id
          )
        }

      });

      if(!employee){

        return res.status(404)
        .json({

          success:false,
          message:
          "Employee not found"

        });

      }

      await repo.delete(
        employee.id
      );

      return res.json({

        success:true,

        message:
        "Employee deleted"

      });

    }
    catch(error:any){

      return res.status(500)
      .json({

        success:false,
        message:error.message

      });

    }

  }

  // =====================================
  // ASSIGN ROLE + BRANCH
  // =====================================

  // @Post("/assign")
  // @Middleware([authenticateMiddleware])
  // @Swagger(
  //   "Assign Employee",
  //   "Assign branch and role"
  // )
  // async assign(
  //   req:any,
  //   res:Response
  // ){

  //   try{

  //     const {

  //       user_id,
  //       branch_id,
  //       company_id,
  //       role_id

  //     } = req.body;

  //     const roleRepo =
  //     dataSource.getRepository(
  //       UserRole
  //     );

  //     await roleRepo.save({

  //       user_id,
  //       branch_id,
  //       company_id,
  //       role_id

  //     });

  //     return res.json({

  //       success:true,

  //       message:
  //       "Employee assigned successfully"

  //     });

  //   }
  //   catch(error:any){

  //     return res.status(500)
  //     .json({

  //       success:false,
  //       message:error.message

  //     });

  //   }

  // }

}