import { User } from "../entities/user";
import dataSource from "../config/database";
import { StatusType } from "../utils/Role-Access";

export class UserStatusService{

static async approveUser(
id:number,
currentUser:any
){

if(
!currentUser.isSuperAdmin &&
currentUser.userType!=="Admin"
){

throw new Error(
"Unauthorized"
);

}

const repo=
dataSource.getRepository(User);

const user=
await repo.findOne({

where:{id}

});

if(!user){

throw new Error(
"User not found"
);

}

user.status=
StatusType.ACTIVE;

return repo.save(
user
);

}

}