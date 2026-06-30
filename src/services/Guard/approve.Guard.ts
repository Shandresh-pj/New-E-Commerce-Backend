export const approveGuard=
(
req:any,
res:any,
next:any
)=>{

if(
req.user.isSuperAdmin
){

return next();

}

const roleNames=
req.user.roles.map(
(r:any)=>r.name
);

const allowed=

roleNames.includes(
"ADMIN"
);

if(
!allowed
){

return res.status(403)
.json({

success:false,
message:
"Approval denied"

});

}

next();

};