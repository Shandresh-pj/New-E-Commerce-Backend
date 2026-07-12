import dataSource from './src/config/database';
import { Company } from './src/entities/company';
import { UserRole } from './src/entities/user';

dataSource.initialize().then(async () => {
  try {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    // Pick a company ID that has user roles
    const userRole = await queryRunner.manager.findOne(UserRole, { where: { company_id: 1 } });
    
    if (userRole) {
      console.log('Found UserRole with company_id = 1. Trying to delete...');
      const res1 = await queryRunner.manager.delete(UserRole, { company_id: 1 });
      console.log('DeleteResult using { company_id: 1 }:', res1);

      const res2 = await queryRunner.manager.delete(UserRole, { company: { id: 1 } });
      console.log('DeleteResult using { company: { id: 1 } }:', res2);
    } else {
      console.log('No user role found for company 1');
    }

    await queryRunner.release();
  } catch(e: any) {
    console.log("DB ERROR:", e.message);
  }
  process.exit(0);
});
