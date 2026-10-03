import { FirestoreRequestError } from './firestoreAtomicPort';
import type { FirestoreRequestPort } from './firestoreAtomicPort';

/** Sole cloud HTTP boundary; explicit new credential resolver supplied by host.
 * Never imports Firebase/frontend, consults legacy credentials, starts listeners or sends messages. */
export class StagingFirestoreHttp implements FirestoreRequestPort {
  private readonly root = 'projects/lidacomzapcrm-staging/databases/(default)/documents';
  constructor(environment: { appEnv: string; projectId: string }, private readonly accessToken: () => Promise<string>) {
    if (typeof window !== 'undefined') throw new Error('SERVER_ONLY_STAGING_PERSISTENCE');
    if (environment.appEnv !== 'staging' || environment.projectId !== 'lidacomzapcrm-staging') throw new Error('ISOLATED_STAGING_REQUIRED');
  }
  async request<T>(path: string, method: 'GET' | 'POST', body?: unknown, missingAllowed = false): Promise<T | undefined> {
    const allowed = path === `${this.root}:beginTransaction` || path === `${this.root}:commit` || path === `${this.root}:rollback` || new RegExp(`^${this.root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/stg_inbound_synthetic/[a-f0-9]{64}\\?transaction=[A-Za-z0-9%_+=/-]+$`).test(path);
    if (!allowed || (method === 'POST') !== path.includes('/documents:')) throw new Error('STAGING_PATH_FORBIDDEN');
    // Commit cannot target another collection/project, even via a malformed injected caller.
    if (path.endsWith(':commit')) {
      const writes = (body as { writes?: { update?: { name?: string } }[] })?.writes;
      if (!writes?.length || writes.some(w => !new RegExp(`^${this.root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/stg_inbound_synthetic/[a-f0-9]{64}$`).test(w.update?.name ?? ''))) throw new Error('STAGING_WRITE_FORBIDDEN');
    }
    const token = await this.accessToken();
    if (!token) throw new Error('STAGING_CREDENTIAL_REQUIRED');
    let response: Response;
    try {
      response = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
        method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
      });
    } catch { throw new Error('STAGING_FIRESTORE_TRANSPORT_UNAVAILABLE'); }
    if (response.status === 404 && missingAllowed && method === 'GET') return undefined;
    if (!response.ok) throw new FirestoreRequestError(response.status);
    return await response.json() as T;
  }
}
