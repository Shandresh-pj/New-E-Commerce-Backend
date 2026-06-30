import bcrypt from "bcrypt";
import {
Request,
Response
} from "express";

import {
Controller,
Post,
Get,
Put,
Delete,
Middleware
} from "../decorators";

import authenticateMiddleware
from "../middleware/authenticate.middleware";

import {
dataSource
} from "../server";

import {
User
} from "../entities/user";

import {
CreateProfileDto,
UpdateProfileDto
} from "../dto";

import validate from "../middleware/validate";

@Controller("/profile")
export class ProfileController{


// =====================================
// CREATE
// =====================================

@Post("/")
@Middleware([
authenticateMiddleware,
validate(CreateProfileDto)
])
public async create(
req:any,
res:any
){

try{

const repo=
dataSource.getRepository(
User
);

const exists=
await repo.findOne({

where:{
email:req.body.email
}

});

if(exists){

return res.status(400)
.json({

success:false,
message:"Email already exists"

});

}

const hashedPassword=
await bcrypt.hash(
req.body.password,
12
);

const image=
req.file
? `/uploads/${req.file.filename}`
: undefined;

const user=
repo.create({

name:req.body.name,

email:req.body.email,

password:hashedPassword,

mobilenumber:req.body.mobilenumber,

address:req.body.address,

status:req.body.status,

image:image

});

const saved=
await repo.save(user);

const{
password,
...safeUser
}=saved;

return res.status(201)
.json({

success:true,
message:"Profile created successfully",
data:safeUser

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
// GET BY ID
// =====================================

@Get("/:id")
@Middleware([
authenticateMiddleware
])
public async getById(
req:any,
res:any
){

try{

// ===========================
// AUTH CHECK
// ===========================

if(!req.user){

return res.status(401)
.json({

success:false,
message:
"Unauthorized"

});

}


const userId=
Number(req.params.id);

if(isNaN(userId)){

return res.status(400)
.json({

success:false,
message:
"Invalid user id"

});

}


const repo=
dataSource.getRepository(
User
);


const user=
await repo.findOne({

where:{
id:userId
}

});


if(!user){

return res.status(404)
.json({

success:false,
message:
"User not found"

});

}


// ===========================
// ONLY SELF OR SUPERADMIN
// ===========================

if(

!req.user?.isSuperAdmin &&

req.user?.id!==user.id

){

return res.status(403)
.json({

success:false,
message:
"Forbidden"

});

}


// ===========================
// REMOVE SENSITIVE DATA
// ===========================

const {
password,
verificationToken,
resetPasswordToken,
...safeUser

}=user as any;


return res.status(200)
.json({

success:true,
data:safeUser

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
// GET ALL
// =====================================

@Get("/")
@Middleware([
authenticateMiddleware
])
public async getAll(
req:any,
res:any
){

try{

const repo=
dataSource.getRepository(
User
);

const page=
Math.max(
1,
Number(req.query.page)||1
);

const limit=
Math.min(
50,
Number(req.query.limit)||10
);

const [users,total]=
await repo.findAndCount({

skip:
(page-1)*limit,

take:
limit,

order:{
id:"DESC"
}

});


const safeUsers=
users.map(

({password,...rest})=>rest

);

return res.json({

success:true,

page,
limit,
total,

data:safeUsers

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
// UPDATE
// =====================================

@Put("/:id")
@Middleware([
authenticateMiddleware,
validate(UpdateProfileDto)
])
public async update(
req:any,
res:any
){

try{

const repo=
dataSource.getRepository(
User
);

const user=
await repo.findOne({

where:{
id:Number(
req.params.id
)
}

});

if(!user){

return res.status(404)
.json({

success:false,
message:"User not found"

});

}


// self or super admin

if(

!req.user.isSuperAdmin &&
req.user.id!==user.id

){

return res.status(403)
.json({

success:false,
message:"Forbidden"

});

}


const emailExists=
await repo.findOne({

where:{
email:req.body.email
}

});


if(

emailExists &&
emailExists.id!==user.id

){

return res.status(400)
.json({

success:false,
message:"Email already exists"

});

}


const image=
req.file
? `/uploads/${req.file.filename}`
: user.image;


repo.merge(

user,

{

name:req.body.name,

email:req.body.email,

mobilenumber:req.body.mobilenumber,

address:req.body.address,

status:req.body.status,

image:image

}

);

const updated=
await repo.save(user);

const{
password,
...safeUser
}=updated;

return res.json({

success:true,
message:"Updated successfully",
data:safeUser

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
// DELETE
// =====================================

@Delete("/:id")
@Middleware([
authenticateMiddleware
])
public async delete(
req:any,
res:any
){

try{

if(
!req.user.isSuperAdmin
){

return res.status(403)
.json({

success:false,
message:"Only Super Admin"

});

}

const repo=
dataSource.getRepository(
User
);

const result=
await repo.delete(
Number(req.params.id)
);

if(!result.affected){

return res.status(404)
.json({

success:false,
message:"User not found"

});

}

return res.json({

success:true,
message:"Deleted successfully"

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