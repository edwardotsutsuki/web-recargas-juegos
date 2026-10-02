const fs = require('fs');

const views = JSON.parse(fs.readFileSync('views_dump.json', 'utf8'));

console.log('=== CLIENT ORDER VIEWS ===');
views.clientOrders.forEach(f => console.log(f));

console.log('\n=== ADMIN ORDER VIEWS ===');
views.adminOrders.forEach(f => console.log(f));

console.log('\n=== ADMIN DASHBOARD VIEWS ===');
views.adminDash.forEach(f => console.log(f));

// Escribir listado exacto para procesamiento
fs.writeFileSync('views_summary_list.txt', 
  'CLIENT:\n' + views.clientOrders.join('\n') + '\n\n' +
  'ADMIN:\n' + views.adminOrders.join('\n') + '\n\n' +
  'DASH:\n' + views.adminDash.join('\n')
);
