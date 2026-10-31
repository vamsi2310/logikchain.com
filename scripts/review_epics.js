const fs = require('fs');
const path = require('path');

const servicesDir = path.resolve('microservices/services');
const services = fs.readdirSync(servicesDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);

console.log('--- DETAILED MICROSERVICE ROUTE DISCOVERY ---');
const serviceRoutes = {};

services.forEach(s => {
  const src = path.join(servicesDir, s, 'src');
  if (!fs.existsSync(src)) return;
  
  serviceRoutes[s] = [];
  const files = fs.readdirSync(src).filter(f => f.endsWith('.ts'));

  files.forEach(file => {
    const content = fs.readFileSync(path.join(src, file), 'utf8');
    const regex = /(?:app|router)\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      serviceRoutes[s].push({
        method: match[1].toUpperCase(),
        path: match[2],
        file
      });
    }
  });

  console.log(`\n=== ${s} (Total routes: ${serviceRoutes[s].length}) ===`);
  serviceRoutes[s].forEach(r => console.log(`  [${r.file}] ${r.method.padEnd(6)} ${r.path}`));
});
