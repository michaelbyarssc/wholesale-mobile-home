import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, History, Save, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { User } from '@supabase/supabase-js';
import { FilterState } from '@/components/MobileHomeFilters';

interface AdvancedSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount?: number;
  placeholder?: string;
  className?: string;
  user?: User | null;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export const AdvancedSearchBar: React.FC<AdvancedSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  resultCount,
  placeholder = "Search mobile homes...",
  className = "",
  user,
  filters,
  onFiltersChange
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { searchHistory, addToHistory, getSearchSuggestions } = useSearchHistory(user);
  const { savedSearches, saveSearch, applySavedSearch, deleteSearch } = useSavedSearches(user);

  // Add to search history when search changes
  useEffect(() => {
    if (searchQuery && resultCount !== undefined) {
      const cleanup = addToHistory(searchQuery, resultCount);
      return cleanup;
    }
  }, [searchQuery, resultCount, addToHistory]);

  const handleClear = useCallback(() => {
    onSearchChange('');
    inputRef.current?.focus();
  }, [onSearchChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    } else if (e.key === 'ArrowDown') {
      setIsCommandOpen(true);
    }
  }, [handleClear]);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    onSearchChange(suggestion);
    setIsCommandOpen(false);
    inputRef.current?.focus();
  }, [onSearchChange]);

  const handleSavedSearchSelect = useCallback((savedSearch: any) => {
    const { searchQuery: newQuery, filters: newFilters } = applySavedSearch(savedSearch);
    onSearchChange(newQuery);
    onFiltersChange(newFilters);
    setIsCommandOpen(false);
  }, [applySavedSearch, onSearchChange, onFiltersChange]);

  const handleSaveSearch = useCallback(() => {
    if (saveName.trim() && (searchQuery || hasActiveFilters(filters))) {
      saveSearch(saveName.trim(), searchQuery, filters);
      setSaveName('');
      setIsSaveDialogOpen(false);
    }
  }, [saveName, searchQuery, filters, saveSearch]);

  const hasActiveFilters = (filters: FilterState) => {
    return filters.bedrooms.length > 0 ||
           filters.bathrooms.length > 0 ||
           filters.manufacturers.length > 0 ||
           filters.features.length > 0 ||
           filters.widthType !== 'all';
  };

  const suggestions = getSearchSuggestions(searchQuery);
  const canSave = user && (searchQuery.trim() || hasActiveFilters(filters));

  return (
    <div className={`relative w-full ${className}`}>
      <div className={`relative transition-all duration-200 ${
        isFocused ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (suggestions.length > 0 || savedSearches.length > 0) {
              setIsCommandOpen(true);
            }
          }}
          onBlur={() => {
            setIsFocused(false);
            // Delay closing to allow click on suggestions
            setTimeout(() => setIsCommandOpen(false), 150);
          }}
          className="pl-10 pr-32 h-12 text-base border-2 transition-all duration-200"
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {resultCount !== undefined && searchQuery && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
              {resultCount} found
            </Badge>
          )}
          
          {user && (
            <Popover open={isCommandOpen} onOpenChange={setIsCommandOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <History className="h-3 w-3" />
                  <span className="sr-only">Search history</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search history and saved searches..." />
                  <CommandList className="max-h-64">
                    <CommandEmpty>No suggestions found.</CommandEmpty>
                    
                    {suggestions.length > 0 && (
                      <CommandGroup heading="Recent Searches">
                        {suggestions.map((suggestion, index) => (
                          <CommandItem
                            key={`suggestion-${index}`}
                            onSelect={() => handleSuggestionSelect(suggestion)}
                            className="cursor-pointer"
                          >
                            <History className="mr-2 h-4 w-4 text-muted-foreground" />
                            {suggestion}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    
                    {savedSearches.length > 0 && (
                      <CommandGroup heading="Saved Searches">
                        {savedSearches.map((saved) => (
                          <CommandItem
                            key={saved.id}
                            onSelect={() => handleSavedSearchSelect(saved)}
                            className="cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              <Save className="mr-2 h-4 w-4 text-primary" />
                              <div>
                                <div className="font-medium">{saved.name}</div>
                                {saved.search_query && (
                                  <div className="text-xs text-muted-foreground">
                                    "{saved.search_query}"
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSearch(saved.id);
                              }}
                              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          
          {canSave && (
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted text-primary"
                >
                  <Save className="h-3 w-3" />
                  <span className="sr-only">Save search</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Save Search
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="save-name">Search Name</Label>
                    <Input
                      id="save-name"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="e.g., 3BR Double Wide Under 90k"
                      className="mt-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveSearch();
                        }
                      }}
                    />
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <div className="font-medium mb-2">This search includes:</div>
                    {searchQuery && (
                      <div>• Search: "{searchQuery}"</div>
                    )}
                    {hasActiveFilters(filters) && (
                      <div>• Active filters</div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveSearch}
                      disabled={!saveName.trim()}
                      className="flex-1"
                    >
                      Save Search
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsSaveDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
      </div>
      
      {searchQuery && (
        <div className="absolute top-full left-0 right-0 mt-2 text-sm text-muted-foreground">
          Searching in names, descriptions, features, and manufacturers
        </div>
      )}
    </div>
  );
};