import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type SearchHistory = Database['public']['Tables']['search_history']['Row'];

export const useSearchHistory = (user: User | null) => {
  const queryClient = useQueryClient();

  // Fetch search history for the user
  const { data: searchHistory = [], isLoading } = useQuery({
    queryKey: ['search-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user?.id || null)
        .order('created_at', { ascending: false })
        .limit(10); // Only keep recent 10 searches
        
      if (error) {
        console.error('Error fetching search history:', error);
        throw error;
      }
      
      return data as SearchHistory[];
    }
  });

  // Add search to history
  const addToHistoryMutation = useMutation({
    mutationFn: async ({ searchQuery, resultCount }: { 
      searchQuery: string; 
      resultCount: number 
    }) => {
      // Only save meaningful searches (at least 2 characters)
      if (searchQuery.trim().length < 2) return;
      
      // Check if this search already exists recently
      const existingSearch = searchHistory.find(
        h => h.search_query.toLowerCase() === searchQuery.toLowerCase()
      );
      
      if (existingSearch) {
        // Update existing search timestamp
        const { error } = await supabase
          .from('search_history')
          .update({ created_at: new Date().toISOString(), result_count: resultCount })
          .eq('id', existingSearch.id);
          
        if (error) throw error;
      } else {
        // Insert new search
        const { error } = await supabase
          .from('search_history')
          .insert({
            user_id: user?.id || null,
            search_query: searchQuery.trim(),
            result_count: resultCount
          });
          
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history', user?.id] });
    }
  });

  // Clear search history
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user?.id || null);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history', user?.id] });
    }
  });

  const addToHistory = useCallback((searchQuery: string, resultCount: number) => {
    // Debounce to avoid too many database calls
    const timeoutId = setTimeout(() => {
      addToHistoryMutation.mutate({ searchQuery, resultCount });
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [addToHistoryMutation]);

  const clearHistory = useCallback(() => {
    clearHistoryMutation.mutate();
  }, [clearHistoryMutation]);

  // Get unique search suggestions based on history
  const getSearchSuggestions = useCallback((currentQuery: string) => {
    if (!currentQuery || currentQuery.length < 2) return [];
    
    const query = currentQuery.toLowerCase();
    return searchHistory
      .filter(h => h.search_query.toLowerCase().includes(query) && h.search_query !== currentQuery)
      .slice(0, 5)
      .map(h => h.search_query);
  }, [searchHistory]);

  return {
    searchHistory,
    isLoading,
    addToHistory,
    clearHistory,
    getSearchSuggestions,
    isClearing: clearHistoryMutation.isPending
  };
};