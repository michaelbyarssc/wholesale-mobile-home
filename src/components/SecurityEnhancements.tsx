import React, { useEffect } from 'react';
import { generateCSRFToken as genCSRFUtil, validateCSRFToken as validateCSRFUtil } from '@/utils/security';

interface SecurityEnhancementsProps {
  children: React.ReactNode;
}

/**
 * SecurityEnhancements component that implements CSRF protection
 * Security headers are now properly handled in index.html
 */
export const SecurityEnhancements: React.FC<SecurityEnhancementsProps> = ({ children }) => {
  useEffect(() => {
    // Only add client-side security measures that actually work in meta tags
    const addClientSideSecurity = () => {
      // Only add referrer policy as it works via meta tag
      let referrer = document.querySelector('meta[name="referrer"]');
      if (!referrer) {
        referrer = document.createElement('meta');
        referrer.setAttribute('name', 'referrer');
        referrer.setAttribute('content', 'strict-origin-when-cross-origin');
        document.head.appendChild(referrer);
      }
    };

    // Generate or retrieve a secure CSRF token using crypto
    const generateOrGetCSRFToken = () => {
      const existing = sessionStorage.getItem('csrf_token');
      if (existing) return existing;
      const token = genCSRFUtil();
      sessionStorage.setItem('csrf_token', token);
      return token;
    };

    // Add CSRF token to forms
    const addCSRFToForms = () => {
      const forms = document.querySelectorAll('form');
      const csrfToken = generateOrGetCSRFToken();
      
      forms.forEach(form => {
        let csrfInput = form.querySelector('input[name="csrf_token"]') as HTMLInputElement;
        if (!csrfInput) {
          csrfInput = document.createElement('input');
          csrfInput.type = 'hidden';
          csrfInput.name = 'csrf_token';
          csrfInput.value = csrfToken;
          form.appendChild(csrfInput);
        } else {
          csrfInput.value = csrfToken;
        }
      });
    };

    // Initialize security measures
    addClientSideSecurity();
    generateOrGetCSRFToken();
    
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
  const sessionToken = sessionStorage.getItem('csrf_token') || '';
  return validateCSRFUtil(token, sessionToken);
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