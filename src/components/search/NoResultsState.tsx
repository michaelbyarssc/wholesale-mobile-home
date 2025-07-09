import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FilterX, TrendingUp, Lightbulb } from 'lucide-react';

interface NoResultsStateProps {
  searchQuery: string;
  onClearSearch: () => void;
  onClearFilters: () => void;
  onSearchSuggestion: (query: string) => void;
  hasActiveFilters: boolean;
  suggestedSearches?: string[];
}

export const NoResultsState: React.FC<NoResultsStateProps> = ({
  searchQuery,
  onClearSearch,
  onClearFilters,
  onSearchSuggestion,
  hasActiveFilters,
  suggestedSearches = [
    'Clayton homes',
    'Tru Series',
    '3 bedroom',
    'double wide',
    'energy efficient',
    'luxury features'
  ]
}) => {
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {hasSearch ? `No results for "${searchQuery}"` : 'No homes match your filters'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {hasSearch 
                ? "We couldn't find any homes matching your search term."
                : "Try adjusting your filters to see more options."
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {hasSearch && (
              <Button 
                onClick={onClearSearch}
                variant="outline" 
                className="w-full"
              >
                <Search className="h-4 w-4 mr-2" />
                Clear Search
              </Button>
            )}
            
            {hasActiveFilters && (
              <Button 
                onClick={onClearFilters}
                variant="outline" 
                className="w-full"
              >
                <FilterX className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            )}

            {!hasActiveFilters && !hasSearch && (
              <Button 
                onClick={() => window.location.reload()}
                variant="default" 
                className="w-full"
              >
                View All Homes
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      <div className="mt-8 w-full max-w-2xl">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4" />
            Suggestions
          </div>
        </div>

        {/* Search Suggestions */}
        {hasSearch && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3 flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Try these popular searches
            </h4>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestedSearches.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => onSearchSuggestion(suggestion)}
                  className="text-xs rounded-full"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Search Tips:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-center gap-1">
              <Badge variant="secondary" className="text-xs">•</Badge>
              Try broader search terms
            </div>
            <div className="flex items-center justify-center gap-1">
              <Badge variant="secondary" className="text-xs">•</Badge>
              Check spelling and try again
            </div>
            <div className="flex items-center justify-center gap-1">
              <Badge variant="secondary" className="text-xs">•</Badge>
              Use manufacturer names
            </div>
            <div className="flex items-center justify-center gap-1">
              <Badge variant="secondary" className="text-xs">•</Badge>
              Search by features or series
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};