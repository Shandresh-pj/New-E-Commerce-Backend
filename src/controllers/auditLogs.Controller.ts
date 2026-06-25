import { Controller, Get, Middleware, Put } from "../decorators";
import { AuditLog } from "../entities/auditLogs";
import { Branch } from "../entities/branch";
import authenticateMiddleware from "../middleware/authenticate";
import { dataSource } from "../server";



@Controller('/Audit')
export class AuditLogsController{
    

// Update Api
@Put("/:id")
@Middleware([
authenticateMiddleware
])
public async update(
req:any,
res:any
){

try{

const branchRepo=
dataSource.getRepository(
Branch
);

const auditRepo=
dataSource.getRepository(
AuditLog
);

const branch=
await branchRepo.findOne({

where:{
id:Number(
req.params.id
)
},

relations:{
company:true
}

});

if(!branch){

return res.status(404).json({

success:false,
message:"Branch not found"

});

}


// Security

if(
!req.user.isSuperAdmin &&
branch.company.id !==
req.user.company_id
){

return res.status(403)
.json({

success:false,
message:"Forbidden"

});

}


// Keep old values

const oldData={
...branch
};


// Update values

branchRepo.merge(

branch,

{

name:
req.body.name,

location:
req.body.location,

email:
req.body.email,

phone:
req.body.phone

}

);

const updated=
await branchRepo.save(
branch
);


// Save audit log

await auditRepo.save({

module:"BRANCH",

action:"UPDATE",

recordId:
updated.id,

userId:
req.user.id,

roleId:
req.user.role_id,

companyId:
req.user.company_id,

branchId:
req.user.branch_id,

oldData,

newData:
updated

});


return res.status(200)
.json({

success:true,

message:
"Branch updated",

data:
updated

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

// get api
@Get("/logs")
@Middleware([
authenticateMiddleware
])
public async getLogs(
req:any,
res:any
){

try{

const repo=
dataSource.getRepository(
AuditLog
);

let where:any={};


// Super admin

if(
req.user.isSuperAdmin
){

where={};

}


// Company admin

else if(
req.user.role_id===1
){

where={

companyId:
req.user.company_id

};

}


// Branch manager

else if(
req.user.role_id===2
){

where={

branchId:
req.user.branch_id

};

}


// Other roles

else{

where={

roleId:
req.user.role_id

};

}


const logs=
await repo.find({

where,

order:{

createdAt:
"DESC"

}

});


return res.status(200)
.json({

success:true,

count:
logs.length,

data:
logs

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