/**
 * Phone number utility functions for SMS notifications
 */

/**
 * Formats a phone number to XXX-XXX-XXXX format
 * @param phoneInput - Raw phone number input
 * @returns Formatted phone number or original if invalid
 */
export function formatPhoneNumber(phoneInput: string): string {
  if (!phoneInput) return '';
  
  // Remove all non-digits
  const digitsOnly = phoneInput.replace(/[^0-9]/g, '');
  
  // If it starts with 1 and is 11 digits, remove the 1
  let cleanNumber = digitsOnly;
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    cleanNumber = digitsOnly.slice(1);
  }
  
  // If it's 10 digits, format as XXX-XXX-XXXX
  if (cleanNumber.length === 10) {
    return `${cleanNumber.slice(0, 3)}-${cleanNumber.slice(3, 6)}-${cleanNumber.slice(6)}`;
  }
  
  // Return original if not 10 digits
  return phoneInput;
}

/**
 * Validates if a phone number is in the correct format
 * @param phoneNumber - Phone number to validate
 * @returns True if valid format
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  
  const digitsOnly = phoneNumber.replace(/[^0-9]/g, '');
  return digitsOnly.length === 10 || (digitsOnly.length === 11 && digitsOnly.startsWith('1'));
}

/**
 * Converts phone number to Twilio format (+1XXXXXXXXXX)
 * @param phoneNumber - Formatted phone number (XXX-XXX-XXXX)
 * @returns Twilio format phone number
 */
export function toTwilioFormat(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  const digitsOnly = phoneNumber.replace(/[^0-9]/g, '');
  
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }
  
  return phoneNumber;
}