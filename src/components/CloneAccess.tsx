import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, cloneOperatorUid } from '../lib/firebase';
import LoginView from './LoginView';

// Mount database subscribers only after authorization; denied listeners do not retry on login.
export default function CloneAccess({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  if (user === undefined) return <p role="status">Verificando acesso…</p>;
  if (!user) return <LoginView />;
  if (user.uid !== cloneOperatorUid || !user.emailVerified) return <main className="p-8">
    <h1>Acesso restrito</h1><p>Entre com a conta administrativa autorizada.</p>
    <button onClick={() => void signOut(auth)}>Trocar conta</button>
  </main>;
  return <>{children}</>;
}
