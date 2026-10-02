const fs = require('fs');
const path = require('path');

function findInDir(dir, filter) {
  let results = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && !p.includes('node_modules') && !p.includes('.git') && !p.includes('dist')) {
      results = results.concat(findInDir(p, filter));
    } else if (filter(p)) {
      results.push(p);
    }
  }
  return results;
}

const allFiles = findInDir('frontend/src', p => p.endsWith('.tsx') || p.endsWith('.ts'));

// Buscar dónde se renderizan las órdenes
const clientOrders = allFiles.filter(p => p.includes('client') && (p.includes('Order') || p.includes('Historial') || p.includes('Receipt') || p.includes('Detail')));
const adminOrders = allFiles.filter(p => p.includes('admin') && (p.includes('Order') || p.includes('Historial') || p.includes('Detail')));
const adminDash = allFiles.filter(p => p.includes('admin') && (p.includes('Dashboard') || p.includes('Catalog') || p.includes('Accounting')));

const res = {
  clientOrders,
  adminOrders,
  adminDash
};

fs.writeFileSync('exact_views.json', JSON.stringify(res, null, 2), 'utf8');
console.log('Vistas identificadas:', JSON.stringify(res, null, 2));
