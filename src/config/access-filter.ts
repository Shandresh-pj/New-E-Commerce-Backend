// middleware/accessFilter.ts

import {
UserType,
EmployeeType
}
from "../utils/Role-Access";

export function applyAccess(
req:any,
qb:any,
alias:string
){

const user=
req.user;

if(
user.isSuperAdmin
){

return qb;
}


switch(
user.userType
){

case UserType.ADMIN:

qb.andWhere(

`${alias}.company_id=:companyId`,
{
companyId:
user.companyId
}

);

break;


case UserType.EMPLOYEE:

if(
user.employeeType===

EmployeeType.BRANCH_MANAGER ||

user.employeeType===

EmployeeType.STAFF_KEEPER
){

qb.andWhere(

`${alias}.company_id=:companyId`,
{
companyId:
user.companyId
}

);

qb.andWhere(

`${alias}.branch_id=:branchId`,
{
branchId:
user.branchId
}

);

}

if(
user.employeeType===

EmployeeType.DELIVERY_BOY
){

qb.andWhere(

`${alias}.assigned_to=:userId`,
{
userId:
user.id
}

);

}

break;

}

return qb;
}