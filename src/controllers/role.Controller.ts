import {
Controller,
Post,
Get,
Middleware
}
from "../decorators";

import authenticateMiddleware
from "../middleware/authenticate.middleware";



import dataSource from "../config/database";

import { Role }
from "../entities/roles";
import { superAdminGuard } from "../services/Guard/superAdmin.Guard";

@Controller("/roles")
export class RoleController {

@Post("/")
@Middleware([
authenticateMiddleware,
superAdminGuard
])

async create(
req:any,
res:any
){

try{

const repo=
dataSource.getRepository(
Role
);

const exists=
await repo.findOne({

where:{
name:req.body.name.trim()
}

});

if(exists){

return res.status(409)
.json({

success:false,
message:"Role already exists"

});

}

const role=
repo.create({

name:req.body.name,
isActive:true

});

await repo.save(
role
);

return res.status(201)
.json({

success:true,
data:role

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

@Get("/")
@Middleware([
authenticateMiddleware
])

async getAll(
req:any,
res:any
){

const repo=
dataSource.getRepository(
Role
);

const roles=
await repo.find({

order:{
id:"DESC"
}

});

return res.json({

success:true,
count:roles.length,
data:roles

});

}

}