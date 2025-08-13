// Environment detection utilities

export const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname.includes('lovableproject.com') ||
   window.location.hostname.includes('127.0.0.1'));

export const isProduction = !isDevelopment;

// Console logging that respects environment
export const devLog = (message: string, ...args: any[]) => {
  if (isDevelopment) {
    console.log(message, ...args);
  }
};

export const devWarn = (message: string, ...args: any[]) => {
  if (isDevelopment) {
    console.warn(message, ...args);
  }
};

export const devError = (message: string, ...args: any[]) => {
  if (isDevelopment) {
    console.error(message, ...args);
  }
};

// Safe error logging for production
export const safeLog = (message: string, ...args: any[]) => {
  try {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  } catch (error) {
    // Silently fail in production
  }
};