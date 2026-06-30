export const tenantMiddleware=
(req:any,res:any,next:any)=>{

if(
req.user.isSuperAdmin
){

return next();

}

req.tenant={

company_id:
req.user.company_id,

branch_id:
req.user.branch_id

};

next();

};