import { canjeaClient } from './src/providers/canjea/client.js';

async function testTestSkus() {
  console.log('Testing getCatalogSku("test-topup")...');
  try {
    const res = await canjeaClient.getCatalogSku('test-topup');
    console.log('test-topup product:', res);
  } catch (e) {
    console.error('Error test-topup:', e.message);
  }

  console.log('\nTesting verifyPlayer on test-topup with id 1000...');
  try {
    const vRes = await canjeaClient.verifyPlayer({ sku: 'test-topup', playerId: '1000' });
    console.log('Verify test-topup 1000:', vRes);
  } catch (e) {
    console.error('Error verify test-topup:', e.message);
  }
}

testTestSkus().catch(console.error);

