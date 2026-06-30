export function abacCheck(user:any,resource:any,action:string){

if(user.isSuperAdmin){

return true;
}

if(resource.company_id!==user.company_id){

return false;
}

if(user.employeeType=== "DELIVERY BOY" && action==="DELETE"){
return false;
}

if(action==="APPROVE"){
return ["Super_Admin","Admin"].includes(user.userType);
}

return true;

}