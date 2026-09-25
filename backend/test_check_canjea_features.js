import { canjeaClient } from './src/providers/canjea/client.js';

async function checkHumanDeliveryProducts() {
  const cat = await canjeaClient.getCatalog();
  const prods = cat.products || [];

  const humanProds = prods.filter(p => p.delivery?.mode === 'human' || (p.required_fields && p.required_fields.length > 0));
  console.log('Total products in Canjea catalog:', prods.length);
  console.log('Human delivery / required_fields products:', humanProds.length);

  if (humanProds.length > 0) {
    console.log('Sample human product:');
    console.log(JSON.stringify(humanProds[0], null, 2));
  }

  // Also check redeem_instructions
  const withInstructions = prods.filter(p => p.redeem_instructions);
  console.log('Products with redeem_instructions:', withInstructions.length);
  if (withInstructions.length > 0) {
    console.log('Sample redeem_instructions product:', withInstructions[0].sku, withInstructions[0].name);
    console.log('Instructions snippet:', withInstructions[0].redeem_instructions.substring(0, 150));
  }
}

checkHumanDeliveryProducts().catch(console.error);

