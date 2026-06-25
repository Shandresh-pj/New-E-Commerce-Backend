// jobs/AuditBackupJob.ts

import cron from "node-cron";

import {
LessThan
} from "typeorm";
import { dataSource } from "../server";
import { AuditLog, AuditLogBackup } from "../entities/auditLogs";



cron.schedule(

"0 0 * * *",

async()=>{

try{

const auditRepo=
dataSource.getRepository(
AuditLog
);

const backupRepo=
dataSource.getRepository(
AuditLogBackup
);

const sevenDaysAgo=
new Date();

sevenDaysAgo.setDate(

sevenDaysAgo.getDate()-7

);


const oldLogs=
await auditRepo.find({

where:{

createdAt:
LessThan(
sevenDaysAgo
)

}

});


if(
oldLogs.length
){

await backupRepo.save(
oldLogs
);

await auditRepo.remove(
oldLogs
);

console.log(

`${oldLogs.length}
logs moved to backup`

);

}

}
catch(error){

console.log(
error
);

}

}

);