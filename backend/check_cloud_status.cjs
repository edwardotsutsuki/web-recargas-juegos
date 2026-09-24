const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

async function main() {
  const res = await fetch(env.CANJEA_BASE_URL + '/catalog', {
    headers: { 'Authorization': `Bearer ${env.CANJEA_API_KEY}` }
  });
  const data = await res.json();
  const ff = data.products.filter(p => p.game === 'ff' || p.sku.toLowerCase().includes('ff'));
  console.log('Free Fire products in Canjea:');
  ff.forEach(p => {
    console.log(`- SKU: ${p.sku} | Name: ${p.name} | Price: $${p.price} | CanVerify: ${p.can_verify_player}`);
  });
}

main().catch(console.error);
