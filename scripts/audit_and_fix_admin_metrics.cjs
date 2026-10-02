const fs = require('fs');

const dashPath = 'frontend/src/modules/admin/pages/AdminDashboardPage.tsx';
if (fs.existsSync(dashPath)) {
  let dashCode = fs.readFileSync(dashPath, 'utf8');
  let dashChanged = false;

  // Asegurar que si calcula ganancia neta o costo de órdenes, use los campos homologados
  // wholesale_cost ?? wholesale_price ?? cost ?? 0
  if (dashCode.includes('wholesale_price') || dashCode.includes('wholesale_cost') || dashCode.includes('profit')) {
    console.log('AdminDashboardPage ya maneja métricas de costos/ganancias.');
  }

  // Revisar si hay divisiones por cero o fallbacks a $0
  console.log('Revisando lógica interna de AdminDashboardPage...');
}

const catalogPath = 'frontend/src/modules/admin/pages/AdminCatalogPage.tsx';
if (fs.existsSync(catalogPath)) {
  let catalogCode = fs.readFileSync(catalogPath, 'utf8');
  console.log('AdminCatalogPage encontrado, longitud:', catalogCode.length);
}
