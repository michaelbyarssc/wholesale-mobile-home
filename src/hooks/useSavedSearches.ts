import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { FilterState } from '@/components/MobileHomeFilters';

type SavedSearch = Database['public']['Tables']['saved_searches']['Row'];
type SavedSearchInsert = Database['public']['Tables']['saved_searches']['Insert'];

export const useSavedSearches = (user: User | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch saved searches for the user
  const { data: savedSearches = [], isLoading } = useQuery({
    queryKey: ['saved-searches', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching saved searches:', error);
        throw error;
      }
      
      return data as SavedSearch[];
    },
    enabled: !!user
  });

  // Save a new search
  const saveSearchMutation = useMutation({
    mutationFn: async ({ name, searchQuery, filters }: { 
      name: string; 
      searchQuery: string; 
      filters: FilterState 
    }) => {
      if (!user) throw new Error('User not logged in');
      
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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', user?.id] });
      toast({
        title: "Search Saved",
        description: "Your search has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error('Error saving search:', error);
      toast({
        title: "Error",
        description: "Failed to save search. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update last used timestamp
  const updateLastUsedMutation = useMutation({
    mutationFn: async (searchId: string) => {
      const { error } = await supabase
        .from('saved_searches')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', searchId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', user?.id] });
    }
  });

  // Delete a saved search
  const deleteSearchMutation = useMutation({
    mutationFn: async (searchId: string) => {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-searches', user?.id] });
      toast({
        title: "Search Deleted",
        description: "Saved search has been deleted.",
      });
    },
    onError: (error) => {
      console.error('Error deleting search:', error);
      toast({
        title: "Error",
        description: "Failed to delete search. Please try again.",
        variant: "destructive",
      });
    }
  });

  const saveSearch = useCallback((name: string, searchQuery: string, filters: FilterState) => {
    saveSearchMutation.mutate({ name, searchQuery, filters });
  }, [saveSearchMutation]);

  const applySavedSearch = useCallback((savedSearch: SavedSearch) => {
    updateLastUsedMutation.mutate(savedSearch.id);
    return {
      searchQuery: savedSearch.search_query || '',
      filters: (savedSearch.filters as unknown as FilterState) || {
        searchQuery: '',
        priceRange: [0, 200000] as [number, number],
        squareFootageRange: [400, 2000] as [number, number],
        bedrooms: [],
        bathrooms: [],
        manufacturers: [],
        features: [],
        widthType: 'all' as const
      }
    };
  }, [updateLastUsedMutation]);

  const deleteSearch = useCallback((searchId: string) => {
    deleteSearchMutation.mutate(searchId);
  }, [deleteSearchMutation]);

  return {
    savedSearches,
    isLoading,
    saveSearch,
    applySavedSearch,
    deleteSearch,
    isSaving: saveSearchMutation.isPending,
    isDeleting: deleteSearchMutation.isPending
  };
};