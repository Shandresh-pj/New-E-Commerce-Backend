// middleware/branchIsolation.ts

export const branchIsolation=
(
req:any,
res:any,
next:any
)=>{

const user=
req.user;

if(
user.isSuperAdmin
){

return next();
}

if(
!user.branchId
){

return res.status(403)
.json({

success:false,
message:
"Branch access denied"

});

}

req.branchId=
user.branchId;

next();

};