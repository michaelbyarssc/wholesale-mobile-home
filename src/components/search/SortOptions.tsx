import React from 'react';
import { ArrowUpDown, DollarSign, Home, Calendar, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type SortOption = 
  | 'featured'
  | 'price-low'
  | 'price-high'
  | 'sqft-low'
  | 'sqft-high'
  | 'newest'
  | 'bedrooms-high'
  | 'bedrooms-low';

interface SortOptionsProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  resultCount?: number;
  className?: string;
}

const sortOptions = [
  {
    value: 'featured' as SortOption,
    label: 'Featured',
    icon: TrendingUp,
    description: 'Our recommended homes'
  },
  {
    value: 'price-low' as SortOption,
    label: 'Price: Low to High',
    icon: DollarSign,
    description: 'Most affordable first'
  },
  {
    value: 'price-high' as SortOption,
    label: 'Price: High to Low',
    icon: DollarSign,
    description: 'Premium homes first'
  },
  {
    value: 'sqft-high' as SortOption,
    label: 'Largest First',
    icon: Home,
    description: 'By square footage'
  },
  {
    value: 'sqft-low' as SortOption,
    label: 'Smallest First',
    icon: Home,
    description: 'Compact homes first'
  },
  {
    value: 'newest' as SortOption,
    label: 'Newest',
    icon: Calendar,
    description: 'Recently added'
  },
  {
    value: 'bedrooms-high' as SortOption,
    label: 'Most Bedrooms',
    icon: Home,
    description: 'More rooms first'
  },
  {
    value: 'bedrooms-low' as SortOption,
    label: 'Fewest Bedrooms',
    icon: Home,
    description: 'Fewer rooms first'
  }
];

export const SortOptions: React.FC<SortOptionsProps> = ({
  sortBy,
  onSortChange,
  resultCount,
  className = ""
}) => {
  const currentSort = sortOptions.find(option => option.value === sortBy);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowUpDown className="h-4 w-4" />
        <span className="hidden sm:inline">Sort by:</span>
      </div>
      
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-auto min-w-[160px] h-10">
          <div className="flex items-center gap-2">
            {currentSort && <currentSort.icon className="h-4 w-4" />}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent className="w-80">
          {sortOptions.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 py-1">
                <option.icon className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {resultCount !== undefined && (
        <Badge variant="outline" className="ml-2 hidden sm:inline-flex">
          {resultCount} home{resultCount === 1 ? '' : 's'}
        </Badge>
      )}
    </div>
  );
};