import jwt from "jsonwebtoken";

const authenticateMiddleware =
(
  req:any,
  res:any,
  next:any
)=>{

try{

const auth=
req.headers.authorization;

if(
!auth ||
!auth.startsWith("Bearer ")
){

return res.status(401)
.json({

success:false,
message:"Unauthorized"

});

}

const token=
auth.split(" ")[1];

const decoded:any=
jwt.verify(
token,
process.env.JWT_SECRET!
);

req.user={

userId:
decoded.userId,

companyId:
decoded.company_id,

branchId:
decoded.branch_id,

userType:
decoded.userType,

roles:
decoded.roles || [],

permissions:
decoded.permissions || [],

isSuperAdmin:
decoded.isSuperAdmin

};

next();

}
catch{

return res.status(401)
.json({

success:false,
message:"Invalid token"

});

}

};

export default authenticateMiddleware;