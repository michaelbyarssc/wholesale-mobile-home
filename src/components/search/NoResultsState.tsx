import React from 'react';
import { Search, Filter, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface NoResultsStateProps {
  searchQuery: string;
  onClearSearch: () => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

export const NoResultsState: React.FC<NoResultsStateProps> = ({
  searchQuery,
  onClearSearch,
  onClearFilters,
  hasActiveFilters = false
}) => {
  return (
    <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
            <Home className="h-3 w-3 text-orange-600" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No mobile homes found
        </h3>
        
        <p className="text-gray-600 mb-6 max-w-md">
          We couldn't find any mobile homes matching{' '}
          <span className="font-medium">"{searchQuery}"</span>
          {hasActiveFilters && ' with your current filters'}.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onClearSearch}
            variant="default"
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Clear Search
          </Button>
          
          {hasActiveFilters && onClearFilters && (
            <Button
              onClick={onClearFilters}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p className="mb-2">Try:</p>
          <ul className="list-disc list-inside space-y-1 text-left">
            <li>Checking your spelling</li>
            <li>Using different keywords</li>
            <li>Searching for manufacturer names</li>
            <li>Looking for specific features</li>
            {hasActiveFilters && <li>Removing some filters</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};