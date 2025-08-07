import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bookmark, BookmarkPlus, Search, Trash2, Clock } from 'lucide-react';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { useAuth } from '@/contexts/AuthContext';
import type { FilterState } from '@/components/MobileHomeFilters';
import type { Database } from '@/integrations/supabase/types';

type SavedSearch = Database['public']['Tables']['saved_searches']['Row'];

interface SavedSearchesProps {
  currentFilters: FilterState;
  currentSearchQuery: string;
  onApplySearch: (searchQuery: string, filters: FilterState) => void;
  resultCount?: number;
}

export const SavedSearches: React.FC<SavedSearchesProps> = ({
  currentFilters,
  currentSearchQuery,
  onApplySearch,
  resultCount
}) => {
  const { user } = useAuth();
  const { savedSearches, saveSearch, updateSearchUsage, deleteSearch, isLoading } = useSavedSearches(user);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSearch = async () => {
    if (!searchName.trim()) return;

    setIsSaving(true);
    const result = await saveSearch(searchName.trim(), currentSearchQuery, currentFilters);
    if (result) {
      setSearchName('');
      setIsDialogOpen(false);
    }
    setIsSaving(false);
  };

  const handleApplySearch = async (search: SavedSearch) => {
    await updateSearchUsage(search.id);
    const filters = search.filters as unknown as FilterState;
    onApplySearch(search.search_query || '', filters);
  };

  const getActiveFiltersCount = (filters: any) => {
    if (!filters) return 0;
    
    let count = 0;
    if (filters.widthType && filters.widthType !== 'all') count++;
    if (filters.bedrooms && filters.bedrooms.length > 0) count += filters.bedrooms.length;
    if (filters.bathrooms && filters.bathrooms.length > 0) count += filters.bathrooms.length;
    if (filters.manufacturers && filters.manufacturers.length > 0) count += filters.manufacturers.length;
    if (filters.features && filters.features.length > 0) count += filters.features.length;
    if (filters.priceRange) count++;
    if (filters.squareFootageRange) count++;
    
    return count;
  };

  if (!user) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Sign in to save your searches</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bookmark className="h-5 w-5" />
            Saved Searches
          </CardTitle>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <BookmarkPlus className="h-4 w-4" />
                Save Current
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Search</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Search Name</label>
                  <Input
                    placeholder="e.g., 3BR Double Wide Under $80k"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveSearch()}
                  />
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Current search includes:</p>
                  <ul className="space-y-1">
                    {currentSearchQuery && <li>• Search: "{currentSearchQuery}"</li>}
                    {resultCount !== undefined && <li>• {resultCount} results</li>}
                    <li>• {getActiveFiltersCount(currentFilters)} active filters</li>
                  </ul>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveSearch} 
                    disabled={!searchName.trim() || isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Search'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-4">Loading saved searches...</div>
        ) : savedSearches.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No saved searches yet</p>
            <p className="text-xs">Save your current search to access it later</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 cursor-pointer" onClick={() => handleApplySearch(search)}>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{search.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {getActiveFiltersCount(search.filters)} filters
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {search.search_query && (
                      <span className="truncate">"{search.search_query}"</span>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(search.last_used_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplySearch(search)}
                    className="text-xs"
                  >
                    Apply
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSearch(search.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};