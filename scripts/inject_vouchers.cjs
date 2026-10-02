const fs = require('fs');

const views = JSON.parse(fs.readFileSync('views_dump.json', 'utf8'));

// 1. Integrar VoucherCard en componentes de órdenes de cliente
views.clientOrders.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Si no tiene VoucherCard importado
  if (!code.includes('VoucherCard') && (code.includes('order') || code.includes('Order'))) {
    // Buscar import
    const importStatement = `import { VoucherCard } from '../../../components/molecules/VoucherCard';\nimport { extractOrderVoucher } from '../../../utils/voucherHelpers';\n`;
    const altImportStatement = `import { VoucherCard } from '@/components/molecules/VoucherCard';\nimport { extractOrderVoucher } from '@/utils/voucherHelpers';\n`;
    
    // Check if alias or relative
    const usesAlias = code.includes('@/');
    const toImport = usesAlias ? altImportStatement : `import { VoucherCard } from '../../components/molecules/VoucherCard';\nimport { extractOrderVoucher } from '../../utils/voucherHelpers';\n`;
    
    // Insert import after first import
    const firstImportIndex = code.indexOf('import');
    if (firstImportIndex !== -1) {
      code = toImport + code;
      changed = true;
    }

    // Buscar dónde se renderizan detalles de la orden
    if (code.includes('player_id') || code.includes('status')) {
      // Buscar un buen punto de inserción para el voucher
      const pattern = /(<div[^>]*>[\s\S]*?(?:ID de Jugador|ID Jugador|player_id|reference)[\s\S]*?<\/div>)/i;
      const match = code.match(pattern);
      if (match) {
        const voucherComponentCall = `\n{/* Voucher / PIN Digital si aplica */}\n{(() => { const v = extractOrderVoucher(order || selectedOrder); return v ? <VoucherCard pin={v.pin} serial={v.serial} instructions={v.instructions} /> : null; })()}\n`;
        code = code.replace(match[0], match[0] + voucherComponentCall);
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`Actualizado con éxito: ${filePath}`);
  }
});

// 2. Integrar VoucherCard en componentes de órdenes de Admin
views.adminOrders.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (!code.includes('VoucherCard') && (code.includes('order') || code.includes('Order'))) {
    const usesAlias = code.includes('@/');
    const toImport = usesAlias 
      ? `import { VoucherCard } from '@/components/molecules/VoucherCard';\nimport { extractOrderVoucher } from '@/utils/voucherHelpers';\n`
      : `import { VoucherCard } from '../../components/molecules/VoucherCard';\nimport { extractOrderVoucher } from '../../utils/voucherHelpers';\n`;

    const firstImportIndex = code.indexOf('import');
    if (firstImportIndex !== -1) {
      code = toImport + code;
      changed = true;
    }

    if (code.includes('player_id') || code.includes('status') || code.includes('reference')) {
      const pattern = /(<div[^>]*>[\s\S]*?(?:player_id|reference|detalles)[\s\S]*?<\/div>)/i;
      const match = code.match(pattern);
      if (match) {
        const voucherComponentCall = `\n{/* PIN / Código Entregado (Admin) */}\n{(() => { const v = extractOrderVoucher(order || selectedOrder); return v ? <VoucherCard pin={v.pin} serial={v.serial} instructions={v.instructions} /> : null; })()}\n`;
        code = code.replace(match[0], match[0] + voucherComponentCall);
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log(`Admin actualizado con éxito: ${filePath}`);
  }
});
