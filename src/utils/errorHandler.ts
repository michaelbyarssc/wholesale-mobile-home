// Secure error handling utility
import { logger } from './logger';

export interface SafeError {
  message: string;
  code?: string;
  statusCode?: number;
}

// Map of internal errors to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  'auth/user-not-found': 'Invalid credentials provided',
  'auth/wrong-password': 'Invalid credentials provided',
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/user-disabled': 'This account has been disabled',
  'auth/email-already-in-use': 'An account with this email already exists',
  'database/permission-denied': 'You do not have permission to perform this action',
  'database/not-found': 'The requested resource was not found',
  'validation/invalid-input': 'Please check your input and try again',
  'rate-limit/too-many-requests': 'Too many requests. Please try again later',
  'network/connection-error': 'Network error. Please check your connection',
};

export const handleError = (error: any): SafeError => {
  // Log the full error for debugging (will be filtered in production)
  logger.error('Error occurred:', error);

  // Extract error information safely
  const errorMessage = error?.message || 'An unexpected error occurred';
  const errorCode = error?.code || error?.status || 'unknown';

  // Return user-friendly error message
  const userMessage = ERROR_MESSAGES[errorCode] || 
                     ERROR_MESSAGES[errorMessage] || 
                     'Something went wrong. Please try again.';

  return {
    message: userMessage,
    code: errorCode,
    statusCode: error?.statusCode || 500
  };
};

export const createErrorResponse = (error: any) => {
  const safeError = handleError(error);
  return {
    success: false,
    error: safeError.message,
    code: safeError.code
  };
};

// Security headers for responses
export const getSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'",
});