export class TenantService{

static apply(
user:any,
qb:any,
alias:string
){

if(
user.isSuperAdmin
){

return qb;
}

if(
user.userType==="Admin"
){

qb.andWhere(

`${alias}.company_id=:companyId`,

{
companyId:
user.companyId
}

);

}

if(
user.userType==="Branch"
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
user.userType==="Employee"
){

qb.andWhere(

`${alias}.user_id=:userId`,
{
userId:
user.userId
}

);

}

return qb;

}

}