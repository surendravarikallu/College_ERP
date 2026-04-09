const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

const targetDir = path.join(process.cwd(), 'client', 'src', 'examcell');

walk(targetDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("localStorage.getItem('auth_token')")) {
      console.log(`Fixing: ${filePath}`);
      const updated = content.replace(/localStorage\.getItem\('auth_token'\)/g, "(localStorage.getItem('ec_auth_token') || localStorage.getItem('erp_access_token'))");
      fs.writeFileSync(filePath, updated);
    }
  }
});
