const fs = require('fs');

const data = JSON.parse(fs.readFileSync('exact_views.json', 'utf8'));

let analysis = '';

function inspect(fileList, title) {
  analysis += `\n=== ${title} ===\n`;
  fileList.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      analysis += `\nFILE: ${file} (${lines.length} lines)\n`;
      lines.forEach((l, i) => {
        if (l.includes('return') && l.includes('(') || l.includes('status') || l.includes('player_id') || l.includes('details') || l.includes('amount') || l.includes('voucher') || l.includes('pin')) {
          if (i < 80) analysis += `  L${i+1}: ${l.trim().substring(0, 80)}\n`;
        }
      });
    }
  });
}

inspect(data.clientOrders, 'CLIENT ORDERS');
inspect(data.adminOrders, 'ADMIN ORDERS');
inspect(data.adminDash, 'ADMIN DASH & CATALOG');

fs.writeFileSync('VIEWS_ANALYSIS.txt', analysis, 'utf8');
