import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import CloneAccess from './components/CloneAccess';
import { isCloneEnvironment } from './lib/firebase';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCloneEnvironment ? <CloneAccess><App /></CloneAccess> : <App />}
  </StrictMode>,
);
