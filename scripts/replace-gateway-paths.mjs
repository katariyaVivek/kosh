import fs from 'node:fs';
import path from 'node:path';

function replaceInDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      replaceInDir(full);
    } else if (
      e.name.endsWith('.js') ||
      e.name.endsWith('.jsx') ||
      e.name.endsWith('.ts') ||
      e.name.endsWith('.tsx') ||
      e.name.endsWith('.json')
    ) {
      let content = fs.readFileSync(full, 'utf8');
      if (content.includes('/dashboard')) {
        console.log('Replacing in:', full.replace(/\\/g, '/'));
        content = content.replaceAll('/dashboard/', '/gateway/');
        content = content.replaceAll('"/dashboard"', '"/gateway"');
        content = content.replaceAll("'/dashboard'", "'/gateway'");
        content = content.replaceAll('`/dashboard`', '`/gateway`');
        fs.writeFileSync(full, content, 'utf8');
      }
    }
  }
}

replaceInDir('C:/Users/user/kosh/src');
replaceInDir('C:/Users/user/kosh/app/gateway');
console.log('Path replacement complete!');
