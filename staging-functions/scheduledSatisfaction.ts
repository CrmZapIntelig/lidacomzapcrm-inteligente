import { getApps, initializeApp } from 'firebase-admin/app';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { satisfactionBusinessDate } from '../src/application/dailySatisfactionPresentation';
import { runFirestoreSatisfactionJob } from './firestoreSatisfactionJob';

const projectId = 'project-1300957a-ea82-4645-845';
const timeZone = 'America/Sao_Paulo';

export function previousBusinessDate(scheduleTime: string): string {
  const localDay = satisfactionBusinessDate(scheduleTime, timeZone);
  const midnight = new Date(localDay + 'T00:00:00Z');
  midnight.setUTCDate(midnight.getUTCDate() - 1);
  return midnight.toISOString().slice(0, 10);
}

export const dailySatisfactionDrafts = onSchedule({
  schedule: '15 2 * * *',
  timeZone,
  region: 'southamerica-east1',
  serviceAccount: 'crm-satisfaction-drafts@' + projectId + '.iam.gserviceaccount.com',
  maxInstances: 1, concurrency: 1, timeoutSeconds: 300,
  retryCount: 3, minBackoffSeconds: 60, maxRetrySeconds: 3600,
}, async event => {
  if (process.env.GCLOUD_PROJECT !== projectId || process.env.FIRESTORE_EMULATOR_HOST !== undefined) {
    throw new Error('SATISFACTION_ENVIRONMENT_INVALID');
  }
  const businessDate = previousBusinessDate(event.scheduleTime);
  const app = getApps().find(candidate => candidate.name === 'satisfaction-drafts')
    ?? initializeApp({ projectId }, 'satisfaction-drafts');
  const result = await runFirestoreSatisfactionJob(app, {
    businessDate, now: new Date().toISOString(), enabled: true,
  });
  console.info('satisfaction-drafts', { businessDate, created: result.created, replayed: result.replayed });
});
