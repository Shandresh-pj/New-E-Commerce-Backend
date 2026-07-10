const fs = require('fs');
const path = require('path');

function replaceImports(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            replaceImports(fullPath);
        } else if (file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Compute relative path to src/config/database
            const relativeToConfig = path.relative(path.dirname(fullPath), path.join(__dirname, 'src', 'config', 'database')).replace(/\\/g, '/');
            
            // Replace import { dataSource } from "../server" or similar
            // It might be "../server", "../../server", etc.
            content = content.replace(/import\s*{\s*dataSource\s*}\s*from\s*['"](\.\.\/)*server['"];?/g, `import dataSource from "${relativeToConfig}";`);
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Fixed', fullPath);
            }
        }
    }
}

replaceImports(path.join(__dirname, 'src'));
console.log('Done');
