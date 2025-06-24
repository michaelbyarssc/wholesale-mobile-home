
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Remove all non-digits and check if it's a valid US phone number
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  return /^[0-9]{10}$/.test(digitsOnly);
};

export const validatePasswordComplexity = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Type definition for password strength check response
export interface PasswordStrengthResponse {
  valid: boolean;
  errors: string[];
}

// Type guard to check if the response matches our expected structure
export const isPasswordStrengthResponse = (data: any): data is PasswordStrengthResponse => {
  return data && 
         typeof data === 'object' && 
         typeof data.valid === 'boolean' && 
         Array.isArray(data.errors);
};

export const sanitizeInput = (input: string): string => {
  // Remove potential XSS characters and trim whitespace
  return input
    .replace(/[<>\"'&]/g, '')
    .trim();
};

export const sanitizeHtml = (html: string): string => {
  // Basic HTML sanitization - in production, consider using a library like DOMPurify
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const rateLimitKey = (userId: string, action: string): string => {
  return `rate_limit:${userId}:${action}`;
};

// Generate CSRF token
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Validate CSRF token
export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  return token === sessionToken && token.length === 64;
};
