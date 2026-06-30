export const tenantMiddleware=
(req:any,res:any,next:any)=>{

if(
req.user.isSuperAdmin
){

return next();

}

req.tenant={

company_id:
req.user.companyId,

branch_id:
req.user.branchId

};

next();

};