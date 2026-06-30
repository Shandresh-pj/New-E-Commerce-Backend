export const permissionGuard=
(
menu:string,
action:string
)=>{

return(
req:any,
res:any,
next:any
)=>{

if(
req.user.isSuperAdmin
){

return next();

}

const permissions=
req.user.permissions || [];

const allowed=
permissions.some(

(p:any)=>

p.menu===menu &&
p.action===action

);

if(
!allowed
){

return res.status(403)
.json({

success:false,
message:
"Permission denied"

});

}

next();

};

};