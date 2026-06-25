import cron from "node-cron";
import { dataSource } from "../server";
import { AuditLog, AuditLogBackup } from "../entities/auditLogs";
import { LessThan, In } from "typeorm";

cron.schedule("0 2 * * *", async () => {

  const auditRepo = dataSource.getRepository(AuditLog);
  const backupRepo = dataSource.getRepository(AuditLogBackup);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const oldLogs = await auditRepo.find({
    where: {
      createdAt: LessThan(cutoff)
    }
  });

  if (!oldLogs.length) return;

  // backup first
  await backupRepo.insert(oldLogs);

  // delete after backup
  await auditRepo.delete({
    id: In(oldLogs.map(l => l.id))
  });

  console.log(`Archived ${oldLogs.length} audit logs`);
});