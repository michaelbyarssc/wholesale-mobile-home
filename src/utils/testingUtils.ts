/**
 * Testing utilities for development and debugging
 */

import { clearAllSessionData } from './sessionControl';

/**
 * Immediately clear all sessions and refresh the page - for testing only
 */
export const clearSessionsAndRefresh = () => {
  if (typeof window !== 'undefined') {
    console.log('🧪 TEST: Clearing all sessions and refreshing page');
    clearAllSessionData();
    window.location.reload();
  }
};

/**
 * Add global testing utilities to window object in development
 */
export const addGlobalTestingUtils = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).wmhTestUtils = {
      clearSessions: clearSessionsAndRefresh,
      clearLocalStorage: () => {
        localStorage.clear();
        console.log('🧪 TEST: LocalStorage cleared');
      },
      showStorageKeys: () => {
        const keys = Object.keys(localStorage);
        console.log('🧪 TEST: LocalStorage keys:', keys);
        return keys;
      }
    };
    
    console.log('🧪 TEST: Global testing utilities added to window.wmhTestUtils');
    console.log('🧪 TEST: Available methods:');
    console.log('  - wmhTestUtils.clearSessions() - Clear all sessions and refresh');
    console.log('  - wmhTestUtils.clearLocalStorage() - Clear all localStorage');
    console.log('  - wmhTestUtils.showStorageKeys() - Show all localStorage keys');
  }
};