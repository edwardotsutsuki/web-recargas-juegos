const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function main() {
  console.log('=== BENCHMARKING REFACTORED SERVICES ===');
  const { catalogService } = await import('./src/services/catalogService.js');
  const { playerService } = await import('./src/services/playerService.js');
  const { balanceMonitorService } = await import('./src/services/balanceMonitorService.js');

  // 1. Balance Monitor
  console.log('\n--- 1. Testing balanceMonitorService.getStatus() ---');
  let t = performance.now();
  const b1 = await balanceMonitorService.getStatus();
  console.log('Balance #1 (Initial fetch):', (performance.now() - t).toFixed(1) + 'ms', 'Balance:', b1.canjea_balance);
  t = performance.now();
  const b2 = await balanceMonitorService.getStatus();
  console.log('Balance #2 (Cached / Stale):', (performance.now() - t).toFixed(1) + 'ms', 'Balance:', b2.canjea_balance);

  // 2. Catalog Service
  console.log('\n--- 2. Testing catalogService.getGamesList() ---');
  t = performance.now();
  const g1 = await catalogService.getGamesList();
  console.log(`Games #1 (Cold GZIP fetch): ${(performance.now() - t).toFixed(1)}ms, Games: ${g1.length}`);
  t = performance.now();
  const g2 = await catalogService.getGamesList();
  console.log(`Games #2 (In-memory Cache): ${(performance.now() - t).toFixed(1)}ms, Games: ${g2.length}`);

  // 3. Player Verification
  console.log('\n--- 3. Testing playerService.verifyPlayer() ---');
  t = performance.now();
  const v1 = await playerService.verifyPlayer({ sku: 'ffbr100', playerId: '12345678' });
  console.log(`Verify FF #1 (Parallel LATAM/BR): ${(performance.now() - t).toFixed(1)}ms, Valid: ${v1.valid}, Msg: ${v1.message}`);
  t = performance.now();
  const v2 = await playerService.verifyPlayer({ sku: 'ffbr100', playerId: '12345678' });
  console.log(`Verify FF #2 (Instant Cache): ${(performance.now() - t).toFixed(1)}ms, Valid: ${v2.valid}, Msg: ${v2.message}`);
}

main().catch(console.error);

