import { deleteApp, initializeApp } from 'firebase/app';
import { browserPopupRedirectResolver, GoogleAuthProvider, initializeAuth, inMemoryPersistence, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { requireTestOrderWebConfiguration } from '../src/application/testOrderSession';
import type { TestOrderSessionAuth, TestOrderWebConfiguration } from '../src/application/testOrderSession';

/** Independent named Auth app; no operational Firebase module, Firestore, analytics or disk persistence. */
export async function connectTestOrderFirebase(config: TestOrderWebConfiguration): Promise<TestOrderSessionAuth> {
  const checked = requireTestOrderWebConfiguration(config, window.location.origin);
  if (!checked) throw new Error('ORDER_SESSION_CONFIGURATION_INVALID');
  const app = initializeApp(checked.firebase, `orders-test-${crypto.randomUUID()}`);
  let auth: ReturnType<typeof initializeAuth>;
  try { auth = initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver }); }
  catch { await deleteApp(app); throw new Error('ORDER_SESSION_CONFIGURATION_INVALID'); }
  const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
  let disposed = false;
  return {
    subscribe(user, error) {
      return onAuthStateChanged(auth, current => {
        if (!disposed) user(current ? { uid: current.uid, emailVerified: current.emailVerified, providerIds: current.providerData.map(p => p.providerId) } : null);
      }, () => { if (!disposed) error(); });
    },
    currentUid: () => disposed ? null : auth.currentUser?.uid ?? null,
    async getIdToken(uid) {
      const current = auth.currentUser;
      if (disposed || !current || current.uid !== uid) return null;
      const token = await current.getIdToken();
      return !disposed && auth.currentUser === current ? token : null;
    },
    async signIn() { if (disposed) throw new Error('ORDER_ACCESS_DISABLED'); await signInWithPopup(auth, provider); },
    async signOut() { if (!disposed) await signOut(auth); },
    async dispose() {
      if (disposed) return; disposed = true;
      try { await signOut(auth); } finally { await deleteApp(app); }
    },
  };
}
