import { db } from '../src/lib/db';
import {
  reserveStockForCheckout,
  InventoryError,
} from '../src/modules/inventory/reservation';

async function runConcurrencyStressTest() {
  console.log('===============================================================');
  console.log('⚡ High-Concurrency Race Condition Stress Test (50 vs 5)');
  console.log('===============================================================');

  const initialStock = 5;
  const totalCompetitors = 50;
  const testRunId = Date.now();

  console.log(`[1/4] Setting up test environment with ${initialStock} stock units...`);

  const category = await db.category.create({
    data: {
      name: `Concurrency Stress Cat ${testRunId}`,
      slug: `stress-cat-${testRunId}`,
    },
  });

  const product = await db.product.create({
    data: {
      name: `Limited Edition Flash Sale Item ${testRunId}`,
      slug: `stress-prod-${testRunId}`,
      description: 'Stress test item for concurrency race condition validation.',
      basePrice: 999.0,
      isPublished: true,
      categoryId: category.id,
    },
  });

  const variant = await db.productVariant.create({
    data: {
      productId: product.id,
      sku: `STRESS-SKU-${testRunId}`,
      name: 'High Demand Flash Edition',
      stockQuantity: initialStock, // Exactly 5 units
    },
  });

  console.log(`[2/4] Firing ${totalCompetitors} simultaneous checkout reservation attempts...`);

  const sessions = Array.from(
    { length: totalCompetitors },
    (_, i) => `stress_sess_${testRunId}_client_${i + 1}`
  );

  const startTime = Date.now();

  // Execute 50 parallel requests simultaneously
  const results = await Promise.allSettled(
    sessions.map((sessionToken) =>
      reserveStockForCheckout(sessionToken, [{ variantId: variant.id, quantity: 1 }])
    )
  );

  const durationMs = Date.now() - startTime;

  console.log(`[3/4] Analyzing results across ${totalCompetitors} parallel workers (${durationMs}ms)...`);

  const successful = results.filter((r) => r.status === 'fulfilled');
  const failed = results.filter((r) => r.status === 'rejected');

  console.log(`  - Successful reservations: ${successful.length} / ${initialStock} expected`);
  console.log(`  - Rejected (409 Conflict): ${failed.length} / ${totalCompetitors - initialStock} expected`);

  // Verify all rejections had INSUFFICIENT_STOCK code
  let nonStockErrorCount = 0;
  for (const f of failed) {
    if (f.status === 'rejected') {
      const err = f.reason as any;
      if (err.code !== 'INSUFFICIENT_STOCK') {
        nonStockErrorCount++;
        console.error('Unexpected error:', err);
      }
    }
  }

  // Inspect database
  const dbVariant = await db.productVariant.findUnique({
    where: { id: variant.id },
  });

  const heldReservations = await db.stockReservation.count({
    where: { variantId: variant.id, status: 'HELD' },
  });

  console.log(`[4/4] Verifying database integrity...`);
  console.log(`  - Database final stockQuantity: ${dbVariant?.stockQuantity}`);
  console.log(`  - Total active 'HELD' reservations: ${heldReservations}`);

  // Assertions
  let passed = true;

  if (successful.length !== initialStock) {
    console.error(`❌ FAILURE: Expected exactly ${initialStock} successes, got ${successful.length}`);
    passed = false;
  }

  if (failed.length !== totalCompetitors - initialStock) {
    console.error(`❌ FAILURE: Expected exactly ${totalCompetitors - initialStock} failures, got ${failed.length}`);
    passed = false;
  }

  if (nonStockErrorCount > 0) {
    console.error(`❌ FAILURE: ${nonStockErrorCount} failures had unexpected error codes`);
    passed = false;
  }

  if (dbVariant?.stockQuantity !== 0) {
    console.error(`❌ FAILURE: Stock was expected to be 0, but is ${dbVariant?.stockQuantity}`);
    passed = false;
  }

  if (heldReservations !== initialStock) {
    console.error(`❌ FAILURE: Expected ${initialStock} reservations in DB, got ${heldReservations}`);
    passed = false;
  }

  // Cleanup
  console.log('Cleaning up test data...');
  await db.stockReservation.deleteMany({ where: { variantId: variant.id } });
  await db.productVariant.deleteMany({ where: { productId: product.id } });
  await db.product.deleteMany({ where: { id: product.id } });
  await db.category.deleteMany({ where: { id: category.id } });

  if (passed) {
    console.log('===============================================================');
    console.log('✅ TEST PASSED: Zero Overselling, Zero Negative Stock Guarantees Verified!');
    console.log('===============================================================');
    process.exit(0);
  } else {
    console.log('===============================================================');
    console.error('❌ TEST FAILED: Concurrency violation detected.');
    console.log('===============================================================');
    process.exit(1);
  }
}

runConcurrencyStressTest().catch((err) => {
  console.error('Fatal stress test failure:', err);
  process.exit(1);
});
