/**
 * Client entry. Mounts the React tree into #root, wrapped in the Convex provider
 * (which no-ops when no backend URL is configured — see ConvexProvider.tsx).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { AppConvexProvider } from './ConvexProvider';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootEl).render(
  <StrictMode>
    <AppConvexProvider>
      <App />
    </AppConvexProvider>
  </StrictMode>,
);
