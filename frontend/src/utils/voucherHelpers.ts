// Helper utilitario para extraer PINs o Vouchers digitales de Canjea / proveedores
export function extractOrderVoucher(order: any): { pin?: string; serial?: string; instructions?: string } | null {
  if (!order) return null;
  const details = typeof order.details === 'string' ? (() => { try { return JSON.parse(order.details); } catch(e) { return {}; } })() : (order.details || {});
  const meta = typeof order.metadata === 'string' ? (() => { try { return JSON.parse(order.metadata); } catch(e) { return {}; } })() : (order.metadata || {});
  const response = typeof order.response === 'string' ? (() => { try { return JSON.parse(order.response); } catch(e) { return {}; } })() : (order.response || {});
  
  // Buscar pin o voucher en varias propiedades comunes del proveedor
  const pin = details.pin || details.pin_code || details.voucher || details.voucher_code || details.card_pin || details.serial_pin ||
              meta.pin || meta.pin_code || meta.voucher || meta.voucher_code ||
              response.pin || response.pin_code || response.voucher || response.code ||
              order.voucher_code || order.pin_code;
              
  const serial = details.serial || details.serial_number || details.card_number || meta.serial || response.serial;
  const instructions = details.instructions || details.redeem_url || meta.instructions || response.instructions;

  if (pin || serial) {
    return { pin: pin ? String(pin) : undefined, serial: serial ? String(serial) : undefined, instructions: instructions ? String(instructions) : undefined };
  }
  return null;
}