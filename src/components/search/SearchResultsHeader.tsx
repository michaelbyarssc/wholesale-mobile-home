import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  SortAsc, 
  SortDesc, 
  Grid3X3, 
  List, 
  Filter,
  Search,
  TrendingUp,
  DollarSign,
  Maximize,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortOption = 'price-asc' | 'price-desc' | 'size-asc' | 'size-desc' | 'name-asc' | 'name-desc' | 'newest' | 'popularity';
export type ViewMode = 'grid' | 'list';

interface SearchResultsHeaderProps {
  searchQuery: string;
  resultCount: number;
  totalCount: number;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isLoading?: boolean;
  onToggleFilters?: () => void;
  showFilterToggle?: boolean;
  hasActiveFilters?: boolean;
}

export const SearchResultsHeader: React.FC<SearchResultsHeaderProps> = ({
  searchQuery,
  resultCount,
  totalCount,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  isLoading = false,
  onToggleFilters,
  showFilterToggle = false,
  hasActiveFilters = false
}) => {
  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { value: 'price-asc', label: 'Price: Low to High', icon: <DollarSign className="h-3 w-3" /> },
    { value: 'price-desc', label: 'Price: High to Low', icon: <DollarSign className="h-3 w-3" /> },
    { value: 'size-asc', label: 'Size: Small to Large', icon: <Maximize className="h-3 w-3" /> },
    { value: 'size-desc', label: 'Size: Large to Small', icon: <Maximize className="h-3 w-3" /> },
    { value: 'name-asc', label: 'Name: A to Z', icon: <SortAsc className="h-3 w-3" /> },
    { value: 'name-desc', label: 'Name: Z to A', icon: <SortDesc className="h-3 w-3" /> },
    { value: 'newest', label: 'Newest First', icon: <Clock className="h-3 w-3" /> },
    { value: 'popularity', label: 'Most Popular', icon: <TrendingUp className="h-3 w-3" /> }
  ];

  const getResultText = () => {
    if (isLoading) {
      return "Searching...";
    }

    if (searchQuery.trim()) {
      if (resultCount === 0) {
        return `No results found for "${searchQuery}"`;
      }
      return `${resultCount.toLocaleString()} result${resultCount === 1 ? '' : 's'} for "${searchQuery}"`;
    }

    if (resultCount < totalCount) {
      return `Showing ${resultCount.toLocaleString()} of ${totalCount.toLocaleString()} homes`;
    }

    return `${resultCount.toLocaleString()} home${resultCount === 1 ? '' : 's'} available`;
  };

  const getSelectedSort = () => {
    return sortOptions.find(option => option.value === sortBy) || sortOptions[0];
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-b bg-background">
      {/* Results Info */}
      <div className="flex items-center gap-3">
        {showFilterToggle && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilters}
            className={cn(
              "md:hidden",
              hasActiveFilters && "border-primary text-primary"
            )}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-xs">
                !
              </Badge>
            )}
          </Button>
        )}
        
        <div className="flex items-center gap-2">
          {searchQuery.trim() && (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {getResultText()}
          </span>
          
          {resultCount < totalCount && !searchQuery.trim() && (
            <Badge variant="secondary" className="text-xs">
              Filtered
            </Badge>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full sm:w-48">
            <div className="flex items-center gap-2">
              {getSelectedSort().icon}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Mode Toggle */}
        <div className="flex rounded-lg border">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="rounded-r-none border-r"
          >
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Grid</span>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">List</span>
          </Button>
        </div>
      </div>
    </div>
  );
};