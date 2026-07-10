import {
Request,
Response,
NextFunction
} from "express";

import {
Controller,
Get,
Post,
Delete,
Middleware
} from "../decorators";

import authenticateMiddleware
from "../middleware/authenticate.middleware";

import dataSource from "../config/database";

import { generateToken }
from "../utils/jwt";

import { UserRole }
from "../entities/user";

import { RolePermission }
from "../entities/role-access";

import { User }
from "../entities/user";

import { Company }
from "../entities/company";

import { Branch }
from "../entities/branch";
import { Role } from "../entities/roles";



@Controller("/admin")
export class AdminController{


// =====================================================
// GET USER ACCESS
// =====================================================

@Get("/users/:id/access")
@Middleware([
authenticateMiddleware
])
public async getUserAccess(
req:any,
res:Response,
next:NextFunction
){

try{

const userId=
Number(req.params.id);

if(
!req.user.isSuperAdmin &&
req.user.id!==userId
){

return res.status(403)
.json({

success:false,
message:"Forbidden"

});

}

const repo=
dataSource.getRepository(
UserRole
);

const access=
await repo.find({

where:{
user:{
id:userId
}
},

relations:{

user:true,
company:true,
branch:true,
role:true

}

});

return res.json({

success:true,
data:access

});

}
catch(err){

next(err);

}

}



// =====================================================
// ASSIGN ROLE
// =====================================================

@Post("/user-access")
@Middleware([
authenticateMiddleware
])
public async assignRole(
req:any,
res:Response
){

try{

if(
!req.user.isSuperAdmin
){

return res.status(403)
.json({

success:false,
message:
"Only Superadmin can assign roles"

});

}

const {

user_id,
company_id,
branch_id,
role_id

}=req.body;

const repo=
dataSource.getRepository(
UserRole
);

const userRepo=
dataSource.getRepository(
User
);

const roleRepo=
dataSource.getRepository(
Role
);

const companyRepo=
dataSource.getRepository(
Company
);

const branchRepo=
dataSource.getRepository(
Branch
);


// validate user

const user=
await userRepo.findOne({

where:{
id:user_id
}

});

if(!user){

return res.status(404)
.json({

success:false,
message:"User not found"

});

}


// validate role

const role=
await roleRepo.findOne({

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


// validate company

if(company_id){

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

}


// validate branch

if(branch_id){

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

}


// prevent duplicate role assignment

const existing=
await repo.findOne({

where:{

user:{
id:user_id
},

role:{
id:role_id
},

company:
company_id
?{
id:company_id
}
:undefined,

branch:
branch_id
?{
id:branch_id
}
:undefined

}

});

if(existing){

return res.status(400)
.json({

success:false,
message:
"Role already assigned"

});

}


const access=
repo.create({

user:{
id:user_id
},

role:{
id:role_id
},

company:
company_id
?{
id:company_id
}
:undefined,

branch:
branch_id
?{
id:branch_id
}
:undefined

});

const saved=
await repo.save(
access
);

return res.json({

success:true,
message:
"Role assigned successfully",

data:saved

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



// =====================================================
// REMOVE USER ACCESS
// =====================================================

@Delete("/user-access/:id")
@Middleware([
authenticateMiddleware
])
public async removeUserAccess(
req:any,
res:Response
){

try{

if(
!req.user.isSuperAdmin
){

return res.status(403)
.json({

success:false,
message:
"Only Superadmin can remove access"

});

}

const accessId=
Number(
req.params.id
);

const repo=
dataSource.getRepository(
UserRole
);

const access=
await repo.findOne({

where:{
id:accessId
}

});

if(!access){

return res.status(404)
.json({

success:false,
message:
"Access record not found"

});

}

await repo.remove(
access
);

return res.json({

success:true,
message:
"Access removed"

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



// =====================================================
// SELECT CONTEXT
// =====================================================

@Post("/select-context")
@Middleware([
authenticateMiddleware
])
public async selectContext(
req:any,
res:any
){

try{

const{

companyId,
branchId,
roleId

}=req.body;


// verify that user owns this role

const accessRepo=
dataSource.getRepository(
UserRole
);

const access=
await accessRepo.findOne({

where:{

user:{
id:req.user.id
},

company:
companyId
?{
id:companyId
}
:undefined,

branch:
branchId
?{
id:branchId
}
:undefined,

role:{
id:roleId
}

}

});


if(!access){

return res.status(403)
.json({

success:false,
message:
"Unauthorized context"

});

}


// load permissions

const permissionRepo=
dataSource.getRepository(
RolePermission
);

const permissions=
await permissionRepo

.createQueryBuilder(
"rp"
)

.leftJoinAndSelect(
"rp.menu",
"menu"
)

.leftJoinAndSelect(
"rp.permission",
"permission"
)

.where(
"rp.role.id=:roleId",
{
roleId
}
)

.getMany();


// generate token

const token=
generateToken({

userId:
req.user.id,

companyId,

branchId,

roleId,

permissions

});


return res.json({

success:true,
token,
message:
"Context selected"

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

}