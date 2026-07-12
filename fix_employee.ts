import * as fs from 'fs';
import * as path from 'path';

const file = path.join(__dirname, 'src/controllers/employee.controller.ts');
let content = fs.readFileSync(file, 'utf-8');

if (!content.includes('TenantService')) {
  content = content.replace('import { UserType } from "../utils/Role-Access";', 
  'import { UserType } from "../utils/Role-Access";\nimport { TenantService } from "../middleware/tenantFilter.middleware";');
}

// Replace in getOne, update, and delete
content = content.replace(/where:\{\s*id:Number\(\s*req\.params\.id\s*\),\s*userType: In\(\[UserType\.BRANCH_MANAGER, UserType\.SHOPKEEPER, UserType\.DELIVERY_BOY, UserType\.EMPLOYEE\]\)\s*\}/, 
  'where: TenantService.scopeWhere(req.user, { id: Number(req.params.id), userType: In([UserType.BRANCH_MANAGER, UserType.SHOPKEEPER, UserType.DELIVERY_BOY, UserType.EMPLOYEE]) })');

content = content.replace(/where:\{\s*id:Number\(\s*req\.params\.id\s*\)\s*\}\s*\}\)/g, 
  'where: TenantService.scopeWhere(req.user, { id: Number(req.params.id) })\n      })');

// Also update the getAll (line 400 approx)
// wait, we can just replace where:{} in getAll
content = content.replace(/const employees =\s*await repo\.find\(\{\s*where:\{\s*userType: In\(\[UserType\.BRANCH_MANAGER, UserType\.SHOPKEEPER, UserType\.DELIVERY_BOY, UserType\.EMPLOYEE\]\)\s*\},/g,
  'const employees = await repo.find({ where: TenantService.scopeWhere(req.user, { userType: In([UserType.BRANCH_MANAGER, UserType.SHOPKEEPER, UserType.DELIVERY_BOY, UserType.EMPLOYEE]) }),');

fs.writeFileSync(file, content);
console.log('employee.controller.ts updated');
