import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { App } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { runDailySatisfactionJob, type SatisfactionJobPort } from '../src/application/dailySatisfactionJob';

import { loadFirestoreSatisfactionFacts } from './firestoreSatisfactionFacts';

const tenantId = 'prato-mineiro';
const databaseId = 'lidacomzapcrm-work-20261021';
const projectId = 'project-1300957a-ea82-4645-845';

export async function runFirestoreSatisfactionJob(
  app: App,
  input: { businessDate: string; now: string; enabled?: boolean },
  load?: SatisfactionJobPort['load'],
) {
  const scope = { ...input, tenantId, timeZone: 'America/Sao_Paulo' };
  return runDailySatisfactionJob(scope, {
    tenantId,
    async load(request) {
      if (app.options.projectId !== projectId) throw new Error('SATISFACTION_PROJECT_INVALID');
      return load ? load(request) : loadFirestoreSatisfactionFacts(getFirestore(app, databaseId), request);
    },
    async persist(entries) {
      const database = getFirestore(app, databaseId);
      if (entries.length > 5000 || entries.some(entry => entry.orderIds.length > 100)) throw new Error('SATISFACTION_BATCH_TOO_LARGE');
      let created = 0;
      for (const entry of entries) {
        const key = createHash('sha256')
          .update(JSON.stringify(entry.idempotencyKey))
          .digest('hex');
        const ref = database.collection('unified_satisfaction_audiences').doc(key);
        const draft = { ...entry, schema: 1, id: key };
        const inserted = await database.runTransaction(async transaction => {
          const persisted = await transaction.get(ref);
          if (persisted.exists) {
            const { actor, preparedAt, ...content } = persisted.data()!;
            if (typeof actor !== 'string' || !actor || !(preparedAt instanceof Timestamp) || !isDeepStrictEqual(content, draft)) throw new Error('SATISFACTION_DRAFT_CONFLICT');
            return false;
          }
          transaction.create(ref, { ...draft, actor: 'daily-satisfaction-job', preparedAt: FieldValue.serverTimestamp() });
          return true;
        });
        if (inserted) created++;
      }
      return { created, replayed: entries.length - created };
    },
  });
}
