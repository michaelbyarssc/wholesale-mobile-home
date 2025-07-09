import { useState, useCallback } from 'react';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

export const useHomeComparison = () => {
  const [comparedHomes, setComparedHomes] = useState<MobileHome[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const addToComparison = useCallback((home: MobileHome) => {
    setComparedHomes(prev => {
      // Don't add if already exists
      if (prev.some(h => h.id === home.id)) return prev;
      
      // Limit to 4 homes for better UI
      if (prev.length >= 4) {
        return [...prev.slice(1), home];
      }
      
      return [...prev, home];
    });
  }, []);

  const removeFromComparison = useCallback((homeId: string) => {
    setComparedHomes(prev => prev.filter(h => h.id !== homeId));
  }, []);

  const clearComparison = useCallback(() => {
    setComparedHomes([]);
    setIsComparisonOpen(false);
  }, []);

  const isInComparison = useCallback((homeId: string) => {
    return comparedHomes.some(h => h.id === homeId);
  }, [comparedHomes]);

  const openComparison = useCallback(() => {
    if (comparedHomes.length > 0) {
      setIsComparisonOpen(true);
    }
  }, [comparedHomes.length]);

  const closeComparison = useCallback(() => {
    setIsComparisonOpen(false);
  }, []);

  return {
    comparedHomes,
    isComparisonOpen,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
    openComparison,
    closeComparison,
    comparisonCount: comparedHomes.length
  };
};