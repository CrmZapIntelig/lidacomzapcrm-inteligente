import React from 'react';
import { createRoot } from 'react-dom/client';
import configuration from './configuration.json';
import { TestOrderSession } from '../src/application/testOrderSession';
import { PrivateOrdersApp } from './PrivateOrdersApp';
import './style.css';

// Disabled configuration never imports/initializes the Firebase SDK or operational App.
const session = new TestOrderSession(configuration, { origin: window.location.origin,
  connect: async config => (await import('./firebaseSession')).connectTestOrderFirebase(config),
});
createRoot(document.getElementById('root')!).render(<PrivateOrdersApp session={session} />);
