import { canjeaClient } from '../backend/src/providers/canjea/client.js';

async function runContractTests() {
  console.log('====================================================');
  console.log('🧪 INICIANDO TEST DE CONTRATO CANJEA (v1 2026-10-04)');
  console.log('====================================================\n');

  // Test 1: Balance
  console.log('1. Verificando saldo de la cuenta Canjea...');
  try {
    const balanceRes = await canjeaClient.getBalance();
    console.log('✅ Saldo actual Canjea:', JSON.stringify(balanceRes), '\n');
  } catch (err) {
    console.error('❌ Error consultando saldo:', err.message, err.status, err.details, '\n');
  }

  // Test 2: Verificación de Jugador con SKU test-topup (ID 1000 - Exitoso)
  console.log('2. Probando verificación de jugador con test-topup (ID: 1000 - Caso Exitoso)...');
  try {
    const verifyOk = await canjeaClient.verifyPlayer({
      sku: 'test-topup',
      playerId: '1000',
    });
    console.log('✅ Resultado jugador válido 1000:', JSON.stringify(verifyOk));
    if (verifyOk.valid && verifyOk.player_name) {
      console.log(`   -> Nombre retornado: "${verifyOk.player_name}"`);
    }
  } catch (err) {
    console.error('❌ Error en verificación ID 1000:', err.message, err.details);
  }

  // Test 3: Verificación de Jugador con SKU test-topup (ID 2000 - Inválido)
  console.log('\n3. Probando verificación de jugador con test-topup (ID: 2000 - Caso Inválido)...');
  try {
    const verifyFail = await canjeaClient.verifyPlayer({
      sku: 'test-topup',
      playerId: '2000',
    });
    console.log('✅ Resultado jugador inválido 2000:', JSON.stringify(verifyFail));
  } catch (err) {
    console.error('❌ Error en verificación ID 2000:', err.message, err.details);
  }

  // Test 4: Verificación de producto sin verificador (test-code -> NO_VERIFIER)
  console.log('\n4. Probando verificación con producto tipo PIN/CÓDIGO (NO_VERIFIER)...');
  try {
    const verifyNoVerifier = await canjeaClient.verifyPlayer({
      sku: 'test-code',
      playerId: '1000',
    });
    console.log('✅ Resultado NO_VERIFIER:', JSON.stringify(verifyNoVerifier));
  } catch (err) {
    console.error('❌ Error en NO_VERIFIER:', err.message);
  }

  // Test 5: Crear orden de prueba con SKU test-code (costo $0.00 en sandbox de producción)
  console.log('\n5. Probando creación de orden de prueba con SKU test-code ($0.00)...');
  const testOrderId = `test_${Date.now()}`;
  try {
    const orderRes = await canjeaClient.createOrder({
      externalId: testOrderId,
      sku: 'test-code',
    });
    console.log('✅ Respuesta orden test-code:', JSON.stringify(orderRes, null, 2));
  } catch (err) {
    console.log('ℹ️ Respuesta esperada test-code:', err.message, `(HTTP ${err.status})`);
  }

  // Test 6: Crear orden de prueba con SKU test-topup ($0.00) y player 1000
  console.log('\n6. Probando creación de orden de prueba con SKU test-topup ($0.00, ID: 1000)...');
  const testTopupOrderId = `test_topup_${Date.now()}`;
  try {
    const topupRes = await canjeaClient.createOrder({
      externalId: testTopupOrderId,
      sku: 'test-topup',
      player: { id: '1000' },
    });
    console.log('✅ Respuesta orden test-topup:', JSON.stringify(topupRes, null, 2));
    if (topupRes.order) {
      console.log(`   -> Status: ${topupRes.order.status}`);
      console.log(`   -> Reference ID: ${topupRes.order.id || topupRes.order.reference_id}`);
    }
  } catch (err) {
    console.log('ℹ️ Respuesta test-topup:', err.message, `(HTTP ${err.status})`);
  }

  console.log('\n====================================================');
  console.log('🏁 PRUEBAS DE CONTRATO FINALIZADAS');
  console.log('====================================================');
}

runContractTests().catch((err) => {
  console.error('Error fatal ejecutando pruebas:', err);
  process.exit(1);
});
