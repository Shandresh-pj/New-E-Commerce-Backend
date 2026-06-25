import {
  Controller,
  Post,
  Get,
  Middleware,
  Swagger
} from "../decorators";

import { Request, Response } from "express";
import { dataSource } from "../server";
import authenticateMiddleware from "../middleware/authenticate";
import { Role } from "../entities/roles";


@Controller("/roles")
export class RoleController {

  // =====================================================
  // CREATE ROLE
  // =====================================================
@Post("/")
@Middleware([
authenticateMiddleware
])
public async create(
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
message:
"Only SuperAdmin can create roles"

});

}

const repo=
dataSource.getRepository(
Role
);

const exists=
await repo.findOne({

where:{
name:req.body.name
}

});

if(exists){

return res.status(400)
.json({

success:false,
message:
"Role already exists"

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

return res.json({

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

  // =====================================================
  // GET ALL ROLES
  // =====================================================
  @Get("/")
  @Middleware([authenticateMiddleware])
  @Swagger("Get Roles", "List all roles")
  public async getAll(req: any, res: any) {

    const repo = dataSource.getRepository(Role);

    const roles = await repo.find();

    return res.json({
      success: true,
      data: roles
    });
  }
}