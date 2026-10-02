const fs = require('fs');

const files = JSON.parse(fs.readFileSync('relevant_order_files.json', 'utf8'));
let result = '';

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  result += `\n=======================================================\n`;
  result += `FILE: ${file} (lines: ${content.split('\n').length})\n`;
  result += `=======================================================\n`;
  
  // Extract interfaces or component declarations
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('interface ') || l.includes('function ') || l.includes('const ') && (l.includes('Modal') || l.includes('Page') || l.includes('Table') || l.includes('Order'))) {
      if (i < 50) result += `Line ${i+1}: ${l.trim()}\n`;
    }
  });
});

fs.writeFileSync('order_files_inspection.txt', result, 'utf8');
