import {
Controller,
Post,
Get,
Delete,
Middleware,
Swagger
} from "../decorators";

import authenticateMiddleware
from "../middleware/authenticate";

import { dataSource }
from "../server";

import { RolePermission }
from "../entities/role-access";

import { Permission }
from "../entities/menu";

import { Role }
from "../entities/roles";


@Controller("/role-access")
export class RoleAccessController{


// ====================================
// ASSIGN ROLE ACCESS
// ====================================

@Post("/")
@Middleware([
authenticateMiddleware
])
@Swagger(
"Assign Role Access",
"Assign permission to role"
)

public async create(
req:any,
res:any
){

const queryRunner=
dataSource.createQueryRunner();

await queryRunner.connect();

await queryRunner.startTransaction();

try{


if(
!req.user?.isSuperAdmin
){

await queryRunner.rollbackTransaction();

return res.status(403)
.json({

success:false,
message:
"Only Super Admin"

});

}


const role_id=
Number(
req.body.role_id
);

const permission_id=
Number(
req.body.permission_id
);


if(
!role_id ||
!permission_id
){

await queryRunner.rollbackTransaction();

return res.status(400)
.json({

success:false,
message:
"role_id and permission_id required"

});

}


const roleRepo=
queryRunner.manager.getRepository(
Role
);

const permissionRepo=
queryRunner.manager.getRepository(
Permission
);

const rolePermissionRepo=
queryRunner.manager.getRepository(
RolePermission
);


const role=
await roleRepo.findOne({

where:{
id:role_id
}

});


if(!role){

await queryRunner.rollbackTransaction();

return res.status(404)
.json({

success:false,
message:
"Role not found"

});

}


const permission=
await permissionRepo.findOne({

where:{
id:permission_id
}

});


if(!permission){

await queryRunner.rollbackTransaction();

return res.status(404)
.json({

success:false,
message:
"Permission not found"

});

}


const exists=
await rolePermissionRepo.findOne({

where:{

role:{
id:role_id
},

permission:{
id:permission_id
}

}

});


if(exists){

await queryRunner.rollbackTransaction();

return res.status(409)
.json({

success:false,
message:
"Permission already assigned"

});

}


const data=
rolePermissionRepo.create({

role:{
id:role_id
},

permission:{
id:permission_id
}

});


await rolePermissionRepo.save(
data
);


await queryRunner.commitTransaction();


return res.status(201)
.json({

success:true,
message:
"Permission assigned successfully",
data

});

}
catch(error:any){

await queryRunner.rollbackTransaction();

return res.status(500)
.json({

success:false,
message:
error.message

});

}
finally{

await queryRunner.release();

}

}



// ====================================
// GET ALL ROLE ACCESS
// ====================================

@Get("/")
@Middleware([
authenticateMiddleware
])
@Swagger(
"Get Role Access",
"Get all role permissions"
)

public async getAll(
req:any,
res:any
){

try{

const repo=
dataSource.getRepository(
RolePermission
);

const data=
await repo.find({

relations:{

role:true,

permission:{
menu:true
}

},

order:{
id:"DESC"
}

});


return res.json({

success:true,
count:data.length,
data

});

}
catch(error:any){

return res.status(500)
.json({

success:false,
message:
error.message

});

}

}



// ====================================
// GET PERMISSION BY ROLE
// ====================================

@Get("/role/:role_id")
@Middleware([
authenticateMiddleware
])
@Swagger(
"Role Permissions",
"Get permission by role"
)

public async getByRole(
req:any,
res:any
){

try{

const role_id=
Number(
req.params.role_id
);

if(!role_id){

return res.status(400)
.json({

success:false,
message:
"Invalid role id"

});

}


const repo=
dataSource.getRepository(
RolePermission
);


const data=
await repo.find({

where:{

role:{
id:role_id
}

},

relations:{

role:true,

permission:{
menu:true
}

}

});


return res.json({

success:true,
count:data.length,
data

});

}
catch(error:any){

return res.status(500)
.json({

success:false,
message:
error.message

});

}

}



// ====================================
// ROLE MENU GROUPED PERMISSION
// ====================================

@Get("/role/:role_id/menus")
@Middleware([
authenticateMiddleware
])
@Swagger(
"Role Menu Permissions",
"Get role permission grouped by menu"
)

public async getRoleMenus(
req:any,
res:any
){

try{

const role_id=
Number(
req.params.role_id
);


if(!role_id){

return res.status(400)
.json({

success:false,
message:
"Invalid role id"

});

}


const roleRepo=
dataSource.getRepository(
Role
);


const role=
await roleRepo.findOne({

where:{
id:role_id
},

relations:{
rolePermissions:{
permission:{
menu:true
}
}
}
});


if(!role){

return res.status(404)
.json({

success:false,
message:
"Role not found"

});

}


const menuMap=
new Map();


role.rolePermissions.forEach(

(item:any)=>{

const menu=
item.permission.menu;


if(
!menuMap.has(
menu.id
)
){

menuMap.set(

menu.id,

{

menu_id:
menu.id,

menu:
menu.name,

path:
menu.path,

icon:
menu.icon,

permissions:[]
}

);

}


menuMap
.get(menu.id)
.permissions
.push(
item.permission.action
);

}

);


return res.json({

success:true,

data:{

role_id:
role.id,

role:
role.name,

menus:
Array.from(
menuMap.values()
)

}

});

}
catch(error:any){

return res.status(500)
.json({

success:false,
message:
error.message

});

}

}



// ====================================
// DELETE ACCESS
// ====================================

@Delete("/:id")
@Middleware([
authenticateMiddleware
])
@Swagger(
"Delete Permission",
"Remove permission mapping"
)

public async delete(
req:any,
res:any
){

try{


if(
!req.user?.isSuperAdmin
){

return res.status(403)
.json({

success:false,
message:
"Only Super Admin"

});

}


const repo=
dataSource.getRepository(
RolePermission
);


const id=
Number(
req.params.id
);


const record=
await repo.findOne({

where:{
id
}

});


if(!record){

return res.status(404)
.json({

success:false,
message:
"Permission mapping not found"

});

}


await repo.remove(
record
);


return res.json({

success:true,
message:
"Permission removed successfully"

});

}
catch(error:any){

return res.status(500)
.json({

success:false,
message:
error.message

});

}

}

}