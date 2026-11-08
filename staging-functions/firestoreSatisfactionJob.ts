import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { runDailySatisfactionJob, type SatisfactionJobPort } from '../src/application/dailySatisfactionJob';

const tenantId = 'prato-mineiro';
const databaseId = 'lidacomzapcrm-work-20261021';
const projectId = 'project-1300957a-ea82-4645-845';

export async function runFirestoreSatisfactionJob(
  app: App,
  input: { businessDate: string; now: string; enabled?: boolean },
  load: SatisfactionJobPort['load'],
) {
  const scope = { ...input, tenantId, timeZone: 'America/Sao_Paulo' };
  return runDailySatisfactionJob(scope, {
    tenantId,
    async load(request) {
      if (app.options.projectId !== projectId) throw new Error('SATISFACTION_PROJECT_INVALID');
      return load(request);
    },
    async persist(entries) {
      const database = getFirestore(app, databaseId);
      let created = 0;
      for (const entry of entries) {
        const key = createHash('sha256')
          .update(JSON.stringify([entry.tenantId, entry.businessDate, entry.contactId]))
          .digest('hex');
        const ref = database.collection('satisfactionDrafts').doc(key);
        const draft = { ...entry, schemaVersion: 1 };
        const inserted = await database.runTransaction(async transaction => {
          const persisted = await transaction.get(ref);
          if (persisted.exists) {
            if (!isDeepStrictEqual(persisted.data(), draft)) throw new Error('SATISFACTION_DRAFT_CONFLICT');
            return false;
          }
          transaction.create(ref, draft);
          return true;
        });
        if (inserted) created++;
      }
      return { created, replayed: entries.length - created };
    },
  });
}
