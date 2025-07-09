import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, X, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface SearchSuggestion {
  id: string;
  type: 'model' | 'manufacturer' | 'feature' | 'series';
  text: string;
  count?: number;
}

interface RecentSearch {
  query: string;
  timestamp: Date;
}

interface GlobalSearchBarProps {
  homes: MobileHome[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  homes,
  searchQuery,
  onSearchChange,
  placeholder = "Search by model, manufacturer, features...",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [popularSearches] = useState<string[]>([
    'Tru Series', 'Clayton', '3 bedroom', 'double wide', 'energy efficient'
  ]);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('mobileHomeRecentSearches');
    if (stored) {
      try {
        const parsed = JSON.parse(stored).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setRecentSearches(parsed.slice(0, 5)); // Keep only recent 5
      } catch (e) {
        console.error('Error parsing recent searches:', e);
      }
    }
  }, []);

  // Generate suggestions based on search query
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const newSuggestions: SearchSuggestion[] = [];

    // Model suggestions
    homes.forEach(home => {
      const model = home.model.toLowerCase();
      const displayName = home.display_name?.toLowerCase();
      
      if (model.includes(query) || displayName?.includes(query)) {
        const text = home.display_name || `${home.manufacturer} ${home.model}`;
        if (!newSuggestions.find(s => s.text === text)) {
          newSuggestions.push({
            id: `model-${home.id}`,
            type: 'model',
            text: text
          });
        }
      }
    });

    // Manufacturer suggestions
    const manufacturers = [...new Set(homes.map(h => h.manufacturer))];
    manufacturers.forEach(manufacturer => {
      if (manufacturer.toLowerCase().includes(query)) {
        const count = homes.filter(h => h.manufacturer === manufacturer).length;
        newSuggestions.push({
          id: `manufacturer-${manufacturer}`,
          type: 'manufacturer',
          text: manufacturer,
          count
        });
      }
    });

    // Series suggestions
    const series = [...new Set(homes.map(h => h.series))];
    series.forEach(s => {
      if (s.toLowerCase().includes(query)) {
        const count = homes.filter(h => h.series === s).length;
        newSuggestions.push({
          id: `series-${s}`,
          type: 'series',
          text: `${s} Series`,
          count
        });
      }
    });

    // Feature suggestions
    const allFeatures = new Set<string>();
    homes.forEach(home => {
      if (home.features && Array.isArray(home.features)) {
        home.features.forEach(feature => {
          if (typeof feature === 'string' && feature.toLowerCase().includes(query)) {
            allFeatures.add(feature);
          }
        });
      }
    });

    Array.from(allFeatures).forEach(feature => {
      const count = homes.filter(home => 
        home.features && Array.isArray(home.features) && home.features.includes(feature)
      ).length;
      newSuggestions.push({
        id: `feature-${feature}`,
        type: 'feature',
        text: feature,
        count
      });
    });

    setSuggestions(newSuggestions.slice(0, 8)); // Limit to 8 suggestions
  }, [searchQuery, homes]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (query: string) => {
    onSearchChange(query);
    
    // Add to recent searches if not empty
    if (query.trim()) {
      const newSearch: RecentSearch = {
        query: query.trim(),
        timestamp: new Date()
      };
      
      const updatedRecent = [
        newSearch,
        ...recentSearches.filter(s => s.query !== query.trim())
      ].slice(0, 5);
      
      setRecentSearches(updatedRecent);
      localStorage.setItem('mobileHomeRecentSearches', JSON.stringify(updatedRecent));
    }
    
    setIsOpen(false);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    handleSearch(suggestion.text);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('mobileHomeRecentSearches');
  };

  const getTypeIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'model': return '🏠';
      case 'manufacturer': return '🏭';
      case 'series': return '📋';
      case 'feature': return '⭐';
      default: return '🔍';
    }
  };

  const getTypeColor = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'model': return 'bg-blue-100 text-blue-800';
      case 'manufacturer': return 'bg-green-100 text-green-800';
      case 'series': return 'bg-purple-100 text-purple-800';
      case 'feature': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div ref={searchRef} className={cn("relative w-full max-w-2xl", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10 h-12 text-base rounded-full border-2 border-muted focus:border-primary"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSearch('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted-foreground/10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl border-2">
          <CardContent className="p-0">
            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-3 border-b">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Suggestions</h4>
                <div className="space-y-1">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left"
                    >
                      <span className="text-lg">{getTypeIcon(suggestion.type)}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{suggestion.text}</span>
                        {suggestion.count && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({suggestion.count} homes)
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary" className={cn("text-xs", getTypeColor(suggestion.type))}>
                        {suggestion.type}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && suggestions.length === 0 && (
              <div className="p-3 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Recent Searches
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearRecentSearches}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </Button>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(search.query)}
                      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left"
                    >
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{search.query}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            {suggestions.length === 0 && searchQuery.length === 0 && (
              <div className="p-3">
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Popular Searches
                </h4>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((search) => (
                    <Button
                      key={search}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch(search)}
                      className="text-xs h-7 rounded-full"
                    >
                      {search}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {suggestions.length === 0 && searchQuery.length >= 2 && (
              <div className="p-3 text-center text-muted-foreground">
                <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No suggestions found for "{searchQuery}"</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};