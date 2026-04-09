const fs = require('fs');
const path = require('path');
const uiDir = path.join(__dirname, '../client/src/components/ui');

if (!fs.existsSync(uiDir)) {
    console.error('UI directory not found:', uiDir);
    process.exit(1);
}

const files = fs.readdirSync(uiDir);

files.forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(uiDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Pattern 1: (({ className, ...props }, ref) => 
    // Targets forwardRef with destructuring
    const pattern1 = /\(\s*\{\s*([^}]+)\s*\}\s*,\s*ref\s*\)\s*=>/g;
    if (pattern1.test(content)) {
        content = content.replace(pattern1, '({ $1 }: any, ref) =>');
        modified = true;
    }

    // Pattern 2: (({ className, ...props }) =>
    // Targets functional components with destructuring
    const pattern2 = /\(\s*\{\s*([^}:]+)\s*\}\s*\)\s*=>/g;
     if (pattern2.test(content)) {
        content = content.replace(pattern2, '({ $1 }: any) =>');
        modified = true;
    }

    if (modified) {
        console.log('Fixed:', file);
        fs.writeFileSync(filePath, content);
    }
  }
});
