import dataSource from './src/config/database';

dataSource.initialize().then(async () => {
  try {
    const res = await dataSource.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'user_roles';
    `);
    console.log('Tables referencing user_roles:');
    console.dir(res, { depth: null });
  } catch(e) {
    console.log("DB ERROR:", e);
  }
  process.exit(0);
});
