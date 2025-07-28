// Secure logging utility that filters sensitive data
const ENVIRONMENT = window?.location?.hostname === 'localhost' ? 'development' : 'production';

// Sensitive fields to filter from logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'key',
  'secret',
  'authorization',
  'auth',
  'session',
  'email',
  'phone',
  'address',
  'ssn',
  'credit_card',
  'api_key'
];

// Filter sensitive data from objects
const filterSensitiveData = (data: any): any => {
  if (typeof data === 'string') {
    // Don't log potential tokens, emails, or other sensitive strings
    if (data.length > 50 || data.includes('@') || data.includes('bearer') || data.includes('token')) {
      return '[FILTERED]';
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(filterSensitiveData);
  }
  
  if (data && typeof data === 'object') {
    const filtered: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        filtered[key] = '[FILTERED]';
      } else {
        filtered[key] = filterSensitiveData(value);
      }
    }
    return filtered;
  }
  
  return data;
};

export const logger = {
  log: (message: string, ...data: any[]) => {
    if (ENVIRONMENT === 'development') {
      const filteredData = data.map(filterSensitiveData);
      console.log(message, ...filteredData);
    }
  },
  
  warn: (message: string, ...data: any[]) => {
    if (ENVIRONMENT === 'development') {
      const filteredData = data.map(filterSensitiveData);
      console.warn(message, ...filteredData);
    }
  },
  
  error: (message: string, ...data: any[]) => {
    const filteredData = data.map(filterSensitiveData);
    console.error(message, ...filteredData);
  },
  
  debug: (message: string, ...data: any[]) => {
    if (ENVIRONMENT === 'development') {
      const filteredData = data.map(filterSensitiveData);
      console.debug(message, ...filteredData);
    }
  }
};