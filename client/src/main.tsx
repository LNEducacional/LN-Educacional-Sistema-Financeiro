import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppProviders } from './app/providers';
import { AppRoutes } from './app/routes';
import { AuthProvider } from './features/auth/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </AppProviders>
  </StrictMode>
);