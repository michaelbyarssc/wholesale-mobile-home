import React from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker, measureCoreWebVitals } from './utils/performance'
import { validateSessionIntegrity, clearCorruptedSessions } from './utils/sessionCleanup'

// Initialize performance monitoring and service worker
if (typeof window !== 'undefined') {
  // Clean up corrupted session data on app start
  if (!validateSessionIntegrity()) {
    console.log('🔐 STARTUP: Cleaning corrupted session data');
    clearCorruptedSessions();
  }
  
  // Register service worker for better caching
  registerServiceWorker();
  
  // Measure Core Web Vitals
  measureCoreWebVitals();
  
  // Add global error handler for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });
  
  // Add global error handler for script errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });
  
  // Performance optimizations
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Preload critical resources during idle time
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    });
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

root.render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
