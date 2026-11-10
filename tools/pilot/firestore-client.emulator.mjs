import assert from 'node:assert/strict';
import test from 'node:test';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getDocFromServer, getFirestore, terminate } from 'firebase/firestore';

test('Firestore Node client receives a rules decision over the emulator transport', { timeout: 20000 }, async () => {
  const endpoint = process.env.FIRESTORE_EMULATOR_HOST ?? '';
  assert.match(endpoint, /^127\.0\.0\.1:\d+$/);
  const app = initializeApp({ projectId: 'demo-lidacom' });
  const db = getFirestore(app);
  try {
    connectFirestoreEmulator(db, '127.0.0.1', Number(endpoint.split(':')[1]));
    await assert.rejects(getDocFromServer(doc(db, 'unified_orders', 'transport-check')), { code: 'permission-denied' });
  } finally {
    await terminate(db);
    await deleteApp(app);
  }
});
