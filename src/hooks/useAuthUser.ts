/**
 * @deprecated This hook has been replaced by useCompatibleAuth to prevent dual authentication systems.
 * Please use useCompatibleAuth instead.
 * 
 * This file is kept for reference but should not be used in new code.
 * The authentication system has been consolidated to use useMultiUserAuth as the single source of truth.
 */

console.warn('useAuthUser is deprecated. Please use useCompatibleAuth instead.');

export const useAuthUser = () => {
  throw new Error('useAuthUser has been deprecated. Please use useCompatibleAuth instead.');
};