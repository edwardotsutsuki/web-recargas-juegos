const fs = require('fs');

const files = fs.readFileSync('found_order_files_list.txt', 'utf8').split('\n').filter(Boolean);
let report = '';

files.forEach(f => {
  if (fs.existsSync(f)) {
    const content = fs.readFileSync(f, 'utf8');
    report += `\n=======================================================\n`;
    report += `FILE: ${f}\n`;
    report += `=======================================================\n`;
    
    // Look for where details, pin, voucher, or status are handled
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('status') || l.includes('detail') || l.includes('player_id') || l.includes('amount') || l.includes('price') || l.includes('copy') || l.includes('Card') || l.includes('Modal')) {
        if (i < 120) report += `${i+1}: ${l.trim()}\n`;
      }
    });
  }
});

fs.writeFileSync('order_components_details.txt', report, 'utf8');
