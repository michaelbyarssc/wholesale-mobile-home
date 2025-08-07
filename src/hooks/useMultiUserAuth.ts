// Legacy wrapper for backward compatibility - use useAuth() from AuthContext instead
import { useAuth } from '@/contexts/AuthContext';

export const useMultiUserAuth = () => {
  console.warn('🚨 DEPRECATED: useMultiUserAuth is deprecated. Use useAuth() from AuthContext instead.');
  return useAuth();
};