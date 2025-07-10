import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { FilterState } from '@/components/MobileHomeFilters';

type SavedSearch = Database['public']['Tables']['saved_searches']['Row'];

export const useSavedSearches = (user?: User | null) => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved searches when user changes
  useEffect(() => {
    if (user) {
      loadSavedSearches();
    } else {
      setSavedSearches([]);
    }
  }, [user]);

  const loadSavedSearches = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false });

      if (error) throw error;
      setSavedSearches(data || []);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSearch = useCallback(async (name: string, searchQuery: string, filters: FilterState) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          name,
          search_query: searchQuery,
          filters: filters as any
        })
        .select()
        .single();

      if (error) throw error;

      setSavedSearches(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error saving search:', error);
      return null;
    }
  }, [user]);

  const updateSearchUsage = useCallback(async (searchId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', searchId);

      if (error) throw error;

      // Update local state
      setSavedSearches(prev => 
        prev.map(search => 
          search.id === searchId 
            ? { ...search, last_used_at: new Date().toISOString() }
            : search
        ).sort((a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime())
      );
    } catch (error) {
      console.error('Error updating search usage:', error);
    }
  }, [user]);

  const deleteSearch = useCallback(async (searchId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId);

      if (error) throw error;

      setSavedSearches(prev => prev.filter(search => search.id !== searchId));
    } catch (error) {
      console.error('Error deleting search:', error);
    }
  }, [user]);

  return {
    savedSearches,
    isLoading,
    saveSearch,
    updateSearchUsage,
    deleteSearch,
    loadSavedSearches
  };
};