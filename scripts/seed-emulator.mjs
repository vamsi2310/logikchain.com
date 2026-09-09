import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from '../functions/node_modules/firebase-admin/lib/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'logikchain-dev';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT,
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function seed() {
  console.log('Reading seed/Logikchain_Seed_Data.md...');
  const seedText = readFileSync(join(root, 'seed', 'Logikchain_Seed_Data.md'), 'utf8')
    .replace(/^# Content type: JSON\s*/, '');
  const data = JSON.parse(seedText);

  console.log('Seeding Auth users...');
  const password = 'emulator-only-password';
  for (const u of data.users) {
    try {
      await auth.getUser(u.id);
      console.log(`  Auth user ${u.id} (${u.email}) exists`);
    } catch {
      await auth.createUser({
        uid: u.id,
        email: u.email,
        password,
        displayName: u.name,
        phoneNumber: u.phone,
      });
      console.log(`  Auth user ${u.id} (${u.email}) created`);
    }
  }

  console.log('Seeding Firestore collections...');
  const batch = db.batch();

  // 1. Countries
  for (const c of data.countries || []) {
    batch.set(db.collection('Countries').doc(c.id), c, { merge: true });
  }

  // 2. States
  for (const s of data.states || []) {
    batch.set(db.collection('States').doc(s.id), s, { merge: true });
  }

  // 3. Districts
  for (const d of data.districts || []) {
    batch.set(db.collection('Districts').doc(d.id), d, { merge: true });
  }

  // 4. Hubs & Villages
  for (const h of data.hubs || []) {
    const { villages, ...hubData } = h;
    batch.set(db.collection('Hubs').doc(h.id), hubData, { merge: true });
    for (const v of villages || []) {
      batch.set(db.collection('Villages').doc(v.id), v, { merge: true });
    }
  }

  // 5. Routes
  for (const r of data.routes || []) {
    batch.set(db.collection('Routes').doc(r.id), r, { merge: true });
  }

  // 6. SubscriptionPlans
  for (const p of data.subscriptionPlans || []) {
    batch.set(db.collection('SubscriptionPlans').doc(p.id), p, { merge: true });
  }

  // 7. PlanTariffs
  for (const t of data.planTariffs || []) {
    batch.set(db.collection('PlanTariffs').doc(t.id), t, { merge: true });
  }

  // 8. SubscriptionOffers
  for (const o of data.subscriptionOffers || []) {
    batch.set(db.collection('SubscriptionOffers').doc(o.id), o, { merge: true });
  }

  // 9. OfferDiscountCodes
  for (const c of data.offerDiscountCodes || []) {
    batch.set(db.collection('OfferDiscountCodes').doc(c.id), c, { merge: true });
  }

  // 10. PlatformSubscriptions
  for (const sub of data.platformSubscriptions || []) {
    batch.set(db.collection('PlatformSubscriptions').doc(sub.id), sub, { merge: true });
  }

  // 11. UserProfiles
  for (const u of data.users || []) {
    batch.set(db.collection('UserProfiles').doc(u.id), u, { merge: true });
  }

  // 12. Sample product, pamphlet, and gig fixtures for testing
  const sampleProduct = {
    id: 'product_sample_01',
    productId: 'product_sample_01',
    name: 'Sample Rice 25kg',
    price: 1200,
    unit: 'bag',
    stock: 100,
    supplierId: 'supplier1',
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  batch.set(db.collection('Products').doc(sampleProduct.id), sampleProduct, { merge: true });

  const samplePamphlet = {
    id: 'pamphlet_sample_01',
    pamphletId: 'pamphlet_sample_01',
    title: 'Sample Weekly Pamphlet',
    supplierId: 'supplier1',
    productIds: ['product_sample_01'],
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  batch.set(db.collection('Pamphlets').doc(samplePamphlet.id), samplePamphlet, { merge: true });

  const sampleGig = {
    id: 'gig_sample_01',
    gigId: 'gig_sample_01',
    title: 'Sample Morning Run',
    supplierId: 'supplier1',
    vehicleId: 'vehicle1',
    routeId: 'route_prakasam_01',
    pamphletId: 'pamphlet_sample_01',
    merchantIds: ['merchant1'],
    status: 'scheduled',
    date: '2026-09-10',
    createdAt: new Date().toISOString(),
  };
  batch.set(db.collection('Gigs').doc(sampleGig.id), sampleGig, { merge: true });

  await batch.commit();
  console.log('Firestore seed commit succeeded!');
  console.log('Seeding complete.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
