import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SearchResultsHeaderProps {
  searchQuery: string;
  resultCount: number;
  totalCount: number;
  onClearSearch: () => void;
  hasActiveFilters?: boolean;
  onToggleFilters?: () => void;
}

export const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  searchQuery,
  resultCount,
  totalCount,
  onClearSearch,
  hasActiveFilters = false,
  onToggleFilters
}) => {
  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 mb-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <span className="font-medium text-gray-900">
              Search Results
            </span>
          </div>
          
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
            {resultCount} of {totalCount} homes
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {onToggleFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFilters}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">
                {hasActiveFilters ? 'Filters Active' : 'Filters'}
              </span>
              <span className="sm:hidden">Filters</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-xs">
                  !
                </Badge>
              )}
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSearch}
            className="flex items-center gap-2 text-primary border-primary/30 hover:bg-primary/10"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Clear Search</span>
            <span className="sm:hidden">Clear</span>
          </Button>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-primary/20">
        <p className="text-sm text-gray-600">
          Showing results for{' '}
          <span className="font-medium text-gray-900 bg-primary/10 px-2 py-1 rounded">
            "{searchQuery}"
          </span>
        </p>
      </div>
    </div>
  );
};