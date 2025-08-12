import React, { useEffect } from 'react';

interface SecurityEnhancementsProps {
  children: React.ReactNode;
}

/**
 * SecurityEnhancements component that adds client-side security headers
 * and implements CSRF protection for the application
 */
export const SecurityEnhancements: React.FC<SecurityEnhancementsProps> = ({ children }) => {
  useEffect(() => {
    // Add security headers via meta tags
    const addSecurityHeaders = () => {
      // Content Security Policy
      let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!cspMeta) {
        cspMeta = document.createElement('meta');
        cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
        cspMeta.setAttribute('content', 
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://esm.sh https://api.mapbox.com; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "img-src 'self' data: https: blob:; " +
          "connect-src 'self' https://vgdreuwmisludqxphsph.supabase.co wss://vgdreuwmisludqxphsph.supabase.co https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com; " +
          "frame-ancestors 'none'; " +
          "base-uri 'self'; " +
          "worker-src 'self' blob:;"
        );
        document.head.appendChild(cspMeta);
      }

      // X-Content-Type-Options
      let xContentType = document.querySelector('meta[http-equiv="X-Content-Type-Options"]');
      if (!xContentType) {
        xContentType = document.createElement('meta');
        xContentType.setAttribute('http-equiv', 'X-Content-Type-Options');
        xContentType.setAttribute('content', 'nosniff');
        document.head.appendChild(xContentType);
      }

      // X-Frame-Options
      let xFrame = document.querySelector('meta[http-equiv="X-Frame-Options"]');
      if (!xFrame) {
        xFrame = document.createElement('meta');
        xFrame.setAttribute('http-equiv', 'X-Frame-Options');
        xFrame.setAttribute('content', 'DENY');
        document.head.appendChild(xFrame);
      }

      // X-XSS-Protection
      let xXSS = document.querySelector('meta[http-equiv="X-XSS-Protection"]');
      if (!xXSS) {
        xXSS = document.createElement('meta');
        xXSS.setAttribute('http-equiv', 'X-XSS-Protection');
        xXSS.setAttribute('content', '1; mode=block');
        document.head.appendChild(xXSS);
      }

      // Referrer Policy
      let referrer = document.querySelector('meta[name="referrer"]');
      if (!referrer) {
        referrer = document.createElement('meta');
        referrer.setAttribute('name', 'referrer');
        referrer.setAttribute('content', 'strict-origin-when-cross-origin');
        document.head.appendChild(referrer);
      }
    };

    // Generate and store CSRF token for form submissions
    const generateCSRFToken = () => {
      const token = 'csrf_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('csrf_token', token);
      return token;
    };

    // Add CSRF token to forms
    const addCSRFToForms = () => {
      const forms = document.querySelectorAll('form');
      const csrfToken = sessionStorage.getItem('csrf_token') || generateCSRFToken();
      
      forms.forEach(form => {
        let csrfInput = form.querySelector('input[name="csrf_token"]') as HTMLInputElement;
        if (!csrfInput) {
          csrfInput = document.createElement('input');
          csrfInput.type = 'hidden';
          csrfInput.name = 'csrf_token';
          csrfInput.value = csrfToken;
          form.appendChild(csrfInput);
        }
      });
    };

    // Initialize security measures
    addSecurityHeaders();
    generateCSRFToken();
    
    // Set up form protection with a slight delay to catch dynamically added forms
    const setupFormProtection = () => {
      addCSRFToForms();
    };
    setupFormProtection();
    const formInterval = setInterval(setupFormProtection, 5000);

    // Cleanup
    return () => {
      clearInterval(formInterval);
    };
  }, []);

  return <>{children}</>;
};

// CSRF token validation utility
export const validateCSRFToken = (token: string): boolean => {
  const sessionToken = sessionStorage.getItem('csrf_token');
  return token === sessionToken && token.startsWith('csrf_');
};

// Secure form submission wrapper
export const secureFormSubmit = async (
  formData: FormData,
  submitFunction: (data: FormData) => Promise<any>
) => {
  const csrfToken = formData.get('csrf_token') as string;
  
  if (!validateCSRFToken(csrfToken)) {
    throw new Error('Invalid CSRF token. Please refresh the page and try again.');
  }

  // Remove CSRF token from form data before submission
  formData.delete('csrf_token');
  
  return await submitFunction(formData);
};