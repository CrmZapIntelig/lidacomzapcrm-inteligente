import { fixtureId } from './stagingOperationalOrders';
import { requireTestOrderOrigin } from './testOrderProtocol';
import { createTestOrderHttpClient } from './testOrderHttpClient';
import type { TestOrderHttpClientOptions } from './testOrderHttpClient';
import type { TestOrderClient } from './testOrderAccess';

export interface TestOrderWebConfiguration {
  schema: 1; mode: 'TEST'; enabled: true; origin: string; tenantId: string; actorId: string;
  firebase: { projectId: string; authDomain: string; apiKey: string; appId: string };
}
export interface TestOrderSessionUser { uid: string; emailVerified: boolean; providerIds: readonly string[] }
export interface TestOrderSessionAuth {
  subscribe(user: (value: TestOrderSessionUser | null) => void, error: () => void): () => void;
  currentUid(): string | null;
  getIdToken(uid: string): Promise<string | null>;
  signIn(): Promise<void>; signOut(): Promise<void>; dispose(): Promise<void>;
}
export interface TestOrderSessionState {
  phase: 'disabled' | 'connecting' | 'signedOut' | 'signingIn' | 'checking' | 'ready' | 'signingOut' | 'error';
  message: string; client: TestOrderClient | null; canSignIn: boolean; canSignOut: boolean;
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
export function requireTestOrderWebConfiguration(input: unknown, currentOrigin: string): TestOrderWebConfiguration | null {
  if (!record(input) || input.schema !== 1 || input.mode !== 'TEST' || typeof input.enabled !== 'boolean') throw new Error('ORDER_SESSION_CONFIGURATION_INVALID');
  if (!input.enabled) {
    if (!keys(input, ['schema', 'mode', 'enabled'])) throw new Error('ORDER_SESSION_CONFIGURATION_INVALID');
    return null;
  }
  if (!keys(input, ['schema', 'mode', 'enabled', 'origin', 'tenantId', 'actorId', 'firebase']) ||
      typeof input.origin !== 'string' || currentOrigin !== input.origin ||
      typeof input.tenantId !== 'string' || !fixtureId(input.tenantId) || typeof input.actorId !== 'string' || !fixtureId(input.actorId) ||
      !record(input.firebase) || !keys(input.firebase, ['projectId', 'authDomain', 'apiKey', 'appId']) ||
      input.firebase.projectId !== 'lidacomzapcrm-staging' || input.firebase.authDomain !== 'lidacomzapcrm-staging.firebaseapp.com' ||
      typeof input.firebase.apiKey !== 'string' || !/^[A-Za-z0-9_-]{20,128}$/.test(input.firebase.apiKey) ||
      typeof input.firebase.appId !== 'string' || !/^1:\d+:web:[a-f0-9]+$/.test(input.firebase.appId)) throw new Error('ORDER_SESSION_CONFIGURATION_INVALID');
  try { requireTestOrderOrigin(input.origin); } catch { throw new Error('ORDER_SESSION_CONFIGURATION_INVALID'); }
  return structuredClone(input) as unknown as TestOrderWebConfiguration;
}

/** Session lifecycle for the separate private entry. Never imports the legacy App or Firebase bootstrap.
 * Client actor/tenant are expected response bindings, not authorization; the server still verifies UID. */
export class TestOrderSession {
  private config: TestOrderWebConfiguration | null = null;
  private auth: TestOrderSessionAuth | null = null;
  private unsubscribe?: () => void;
  private started = false;
  private disposed = false;
  private acceptUsers = true;
  private generation = 0;
  private context: string | null = null;
  private readonly listeners = new Set<() => void>();
  private state: TestOrderSessionState = { phase: 'disabled', message: 'O acesso de testes ainda não está ativado.', client: null, canSignIn: false, canSignOut: false };
  constructor(input: unknown, private readonly dependencies: {
    origin: string; connect: (config: TestOrderWebConfiguration) => Promise<TestOrderSessionAuth>;
    createClient?: (options: TestOrderHttpClientOptions) => TestOrderClient;
  }) {
    try {
      this.config = requireTestOrderWebConfiguration(input, dependencies.origin);
      if (this.config) this.state = { ...this.state, phase: 'connecting', message: 'Preparando acesso…' };
    } catch { this.state = { ...this.state, phase: 'error', message: 'O acesso de testes precisa de configuração.' }; }
  }
  get snapshot(): TestOrderSessionState { return { ...this.state }; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private publish(phase: TestOrderSessionState['phase'], message: string, client: TestOrderClient | null = null) {
    if (this.disposed) return;
    const busy = ['connecting', 'signingIn', 'checking', 'signingOut'].includes(phase);
    const uid = this.auth?.currentUid();
    this.state = { phase, message, client, canSignIn: !!this.auth && !uid && !busy, canSignOut: !!uid && !['signingIn', 'signingOut'].includes(phase) };
    for (const listener of this.listeners) listener();
  }
  private invalidate() { this.context = null; return ++this.generation; }
  async start() {
    if (this.started || this.disposed || !this.config) return;
    this.started = true;
    try {
      const auth = await this.dependencies.connect(structuredClone(this.config));
      if (this.disposed) { await auth.dispose(); return; }
      this.auth = auth;
      this.unsubscribe = auth.subscribe(user => { void this.changeUser(user); }, () => {
        this.invalidate(); this.acceptUsers = false; this.publish('error', 'Não foi possível verificar sua sessão. Entre novamente.');
      });
    } catch { this.invalidate(); this.publish('error', 'Não foi possível preparar o acesso. Recarregue a página.'); }
  }
  private async changeUser(user: TestOrderSessionUser | null) {
    if (this.disposed || !this.acceptUsers) return;
    const generation = this.invalidate();
    if (!user) { this.publish('signedOut', 'Entre com a conta Google autorizada para os testes.'); return; }
    if (!this.auth || !this.config || typeof user.uid !== 'string' || !user.uid || user.uid.length > 128 ||
        !user.emailVerified || !user.providerIds.includes('google.com') || this.auth.currentUid() !== user.uid) {
      this.publish('error', 'Use uma conta Google verificada e autorizada para os testes.'); return;
    }
    const auth = this.auth, config = this.config, uid = user.uid;
    const contextKey = `${uid}:${generation}`; this.context = contextKey;
    this.publish('checking', 'Verificando acesso aos pedidos…');
    try {
      const client = (this.dependencies.createClient ?? createTestOrderHttpClient)({ origin: config.origin, tenantId: config.tenantId, actorId: config.actorId,
        contextKey, currentContextKey: () => this.disposed || auth.currentUid() !== uid ? null : this.context,
        getIdToken: async () => {
          if (this.context !== contextKey || auth.currentUid() !== uid) return null;
          const token = await auth.getIdToken(uid);
          return this.context === contextKey && auth.currentUid() === uid ? token : null;
        },
      });
      const page = await client.list();
      if (this.disposed || this.generation !== generation || auth.currentUid() !== uid) return;
      if (page.mode !== 'TEST' || page.tenantId !== config.tenantId || page.actorId !== config.actorId || !Array.isArray(page.orders)) throw new Error('ORDER_VIEW_CONTEXT_MISMATCH');
      this.publish('ready', 'Conta conectada ao ambiente de testes.', client);
    } catch {
      if (this.disposed || this.generation !== generation) return;
      this.invalidate(); this.publish('error', 'Não foi possível liberar os pedidos. Confira a conta autorizada ou tente entrar novamente.');
    }
  }
  async signIn() {
    if (!this.state.canSignIn || !this.auth || this.disposed) return;
    this.acceptUsers = true; const generation = this.generation;
    this.publish('signingIn', 'Conclua o acesso na janela do Google.');
    try { await this.auth.signIn(); }
    catch { if (!this.disposed && this.generation === generation) this.publish('error', 'O acesso não foi concluído. Você pode tentar novamente.'); }
  }
  async signOut() {
    if (!this.state.canSignOut || !this.auth || this.disposed) return;
    this.acceptUsers = false; this.invalidate(); this.publish('signingOut', 'Saindo da conta…');
    try { await this.auth.signOut(); this.publish('signedOut', 'Você saiu da conta.'); }
    catch { this.publish('error', 'Os pedidos foram fechados. Tente sair da conta novamente.'); }
  }
  async dispose() {
    if (this.disposed) return;
    this.disposed = true; this.acceptUsers = false; this.invalidate(); this.unsubscribe?.(); this.listeners.clear();
    this.state = { phase: 'disabled', message: '', client: null, canSignIn: false, canSignOut: false };
    await this.auth?.dispose().catch(() => undefined);
  }
}
