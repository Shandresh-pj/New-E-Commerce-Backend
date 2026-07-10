// seeds/role.seed.ts

import { Role } from "../../entities/roles";
import dataSource from "../../config/database";
import { UserType } from "../Role-Access";

export async function seedRoles(){

try{

const roleRepo=
dataSource.getRepository(
Role
);

const roles=
Object.values(
UserType
);

for(
const roleName of roles
){

const exists=
await roleRepo.findOne({

where:{
name:roleName
}

});

if(!exists){

const role=
roleRepo.create({

name:roleName,

isActive:true

});

await roleRepo.save(
role
);

console.log(
`Role created: ${roleName}`
);

}

}

console.log(
"Role seeding completed"
);

}
catch(error){

console.log(
"Role seed error:",
error
);

}

}