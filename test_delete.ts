import dataSource from './src/config/database';
import { Company } from './src/entities/company';
import { UserRole } from './src/entities/user';
import { Branch } from './src/entities/branch';

dataSource.initialize().then(async () => {
  try {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const companyRepo = queryRunner.manager.getRepository(Company);
    const company = await companyRepo.findOne({ where: {} });

    if (company) {
      console.log('Found company', company.id);
      
      try {
        await queryRunner.manager.query(`DELETE FROM user_roles WHERE company_id = $1`, [company.id]);
        await queryRunner.manager.query(`DELETE FROM branches WHERE company_id = $1`, [company.id]);
        
        await companyRepo.remove(company);
        console.log("Successfully removed company!");
      } catch (e: any) {
        console.log("Error removing company:", e.message);
      }
    } else {
      console.log('No company found');
    }

    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  } catch(e: any) {
    console.log("DB ERROR:", e.message);
  }
  process.exit(0);
});
