import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { SingleClientSessionManagerProvider } from '@/contexts/SingleClientSessionManager';
import { Toaster } from '@/components/ui/sonner';
import { SecurityEnhancements } from '@/components/SecurityEnhancements';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { validateSessionIntegrity, clearCorruptedSessions } from './utils/sessionCleanup';

// Clean up corrupted session data on app start
if (!validateSessionIntegrity()) {
  console.log('🔐 STARTUP: Cleaning corrupted session data');
  clearCorruptedSessions();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <SingleClientSessionManagerProvider>
              <App />
              <Toaster position="top-right" />
            </SingleClientSessionManagerProvider>
          </QueryClientProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);
