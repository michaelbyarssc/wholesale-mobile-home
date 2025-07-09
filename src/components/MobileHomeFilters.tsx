import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FilterX, Filter } from 'lucide-react';
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

export interface FilterState {
  searchQuery: string;
  priceRange: [number, number];
  squareFootageRange: [number, number];
  bedrooms: string[];
  bathrooms: string[];
  manufacturers: string[];
  features: string[];
  widthType: 'all' | 'single' | 'double';
}

interface MobileHomeFiltersProps {
  homes: MobileHome[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  showSearch?: boolean;
  searchResultCount?: number;
}

export const MobileHomeFilters: React.FC<MobileHomeFiltersProps> = ({
  homes,
  filters,
  onFiltersChange,
  isCollapsed,
  onToggleCollapse,
  showSearch = true,
  searchResultCount
}) => {
  // Calculate min/max values from available homes
  const priceRange = React.useMemo(() => {
    const prices = homes.map(h => h.price).filter(Boolean);
    return prices.length > 0 ? [Math.min(...prices), Math.max(...prices)] as [number, number] : [0, 200000] as [number, number];
  }, [homes]);

  const squareFootageRange = React.useMemo(() => {
    const sqft = homes.map(h => h.square_footage).filter(Boolean);
    return sqft.length > 0 ? [Math.min(...sqft), Math.max(...sqft)] as [number, number] : [400, 2000] as [number, number];
  }, [homes]);

  // Get unique values for dropdowns
  const uniqueManufacturers = React.useMemo(() => 
    [...new Set(homes.map(h => h.manufacturer).filter(Boolean))].sort(),
    [homes]
  );

  const uniqueBedrooms = React.useMemo(() =>
    [...new Set(homes.map(h => h.bedrooms).filter(Boolean))].sort((a, b) => a - b),
    [homes]
  );

  const uniqueBathrooms = React.useMemo(() =>
    [...new Set(homes.map(h => h.bathrooms).filter(Boolean))].sort((a, b) => a - b),
    [homes]
  );

  // Extract all unique features from all homes
  const uniqueFeatures = React.useMemo(() => {
    const allFeatures = new Set<string>();
    homes.forEach(home => {
      if (home.features && Array.isArray(home.features)) {
        home.features.forEach(feature => {
          if (typeof feature === 'string') {
            allFeatures.add(feature);
          }
        });
      }
    });
    return Array.from(allFeatures).sort();
  }, [homes]);

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      searchQuery: '',
      priceRange: priceRange,
      squareFootageRange: squareFootageRange,
      bedrooms: [],
      bathrooms: [],
      manufacturers: [],
      features: [],
      widthType: 'all'
    });
  };

  const hasActiveFilters = 
    filters.searchQuery.trim() !== '' ||
    filters.priceRange[0] > priceRange[0] ||
    filters.priceRange[1] < priceRange[1] ||
    filters.squareFootageRange[0] > squareFootageRange[0] ||
    filters.squareFootageRange[1] < squareFootageRange[1] ||
    filters.bedrooms.length > 0 ||
    filters.bathrooms.length > 0 ||
    filters.manufacturers.length > 0 ||
    filters.features.length > 0 ||
    filters.widthType !== 'all';

  if (isCollapsed) {
    return (
      <div className="mb-4 sm:mb-6">
        <Button 
          onClick={onToggleCollapse}
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 py-3 touch-manipulation"
          size="lg"
        >
          <Filter className="h-4 w-4" />
          <span className="text-base">Show Filters</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
              {[
                filters.searchQuery.trim() !== '' ? 1 : 0,
                filters.widthType !== 'all' ? 1 : 0,
                filters.priceRange[0] > priceRange[0] || filters.priceRange[1] < priceRange[1] ? 1 : 0,
                filters.squareFootageRange[0] > squareFootageRange[0] || filters.squareFootageRange[1] < squareFootageRange[1] ? 1 : 0,
                filters.bedrooms.length,
                filters.bathrooms.length,
                filters.manufacturers.length,
                filters.features.length
              ].reduce((a, b) => a + b, 0)} active
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-4 sm:mb-6">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            Filter Mobile Homes
          </CardTitle>
          <div className="flex gap-1 sm:gap-2">
            {hasActiveFilters && (
              <Button onClick={clearAllFilters} variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                <FilterX className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Clear All</span>
                <span className="sm:hidden">Clear</span>
              </Button>
            )}
            <Button onClick={onToggleCollapse} variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
              <span className="hidden sm:inline">Hide Filters</span>
              <span className="sm:hidden">Hide</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Advanced Search Bar */}
        {showSearch && (
          <div>
            <Label className="text-sm font-medium mb-3 block">Search Mobile Homes</Label>
            <GlobalSearchBar
              searchQuery={filters.searchQuery}
              onSearchChange={(query) => updateFilters({ searchQuery: query })}
              resultCount={searchResultCount}
              placeholder="Search by name, manufacturer, features..."
              className="w-full"
            />
          </div>
        )}
        
        {showSearch && <Separator />}
        {/* Width Type Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Home Width</Label>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2">
            {[
              { key: 'all', label: 'All Homes' },
              { key: 'single', label: 'Single Wide' },
              { key: 'double', label: 'Double Wide' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                onClick={() => updateFilters({ widthType: key as FilterState['widthType'] })}
                variant={filters.widthType === key ? "default" : "outline"}
                size="sm"
                className="text-xs sm:text-sm touch-manipulation"
              >
                <span className="sm:hidden">
                  {key === 'all' ? 'All' : key === 'single' ? 'Single' : 'Double'}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Price Range */}
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Price Range: ${filters.priceRange[0].toLocaleString()} - ${filters.priceRange[1].toLocaleString()}
          </Label>
          <div className="px-2">
            <Slider
              min={priceRange[0]}
              max={priceRange[1]}
              step={5000}
              value={filters.priceRange}
              onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
              className="w-full touch-manipulation"
            />
          </div>
        </div>

        {/* Square Footage Range */}
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Square Footage: {filters.squareFootageRange[0]} - {filters.squareFootageRange[1]} sq ft
          </Label>
          <div className="px-2">
            <Slider
              min={squareFootageRange[0]}
              max={squareFootageRange[1]}
              step={50}
              value={filters.squareFootageRange}
              onValueChange={(value) => updateFilters({ squareFootageRange: value as [number, number] })}
              className="w-full touch-manipulation"
            />
          </div>
        </div>

        <Separator />

        {/* Bedrooms */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Bedrooms</Label>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4">
            {uniqueBedrooms.map(count => (
              <div key={count} className="flex items-center space-x-2 touch-manipulation">
                <Checkbox
                  id={`bedrooms-${count}`}
                  checked={filters.bedrooms.includes(count.toString())}
                  onCheckedChange={(checked) => {
                    const countStr = count.toString();
                    if (checked) {
                      updateFilters({ bedrooms: [...filters.bedrooms, countStr] });
                    } else {
                      updateFilters({ bedrooms: filters.bedrooms.filter(b => b !== countStr) });
                    }
                  }}
                  className="h-5 w-5"
                />
                <Label htmlFor={`bedrooms-${count}`} className="text-sm touch-manipulation cursor-pointer">
                  {count} {count === 1 ? 'Bedroom' : 'Bedrooms'}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Bathrooms */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Bathrooms</Label>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4">
            {uniqueBathrooms.map(count => (
              <div key={count} className="flex items-center space-x-2 touch-manipulation">
                <Checkbox
                  id={`bathrooms-${count}`}
                  checked={filters.bathrooms.includes(count.toString())}
                  onCheckedChange={(checked) => {
                    const countStr = count.toString();
                    if (checked) {
                      updateFilters({ bathrooms: [...filters.bathrooms, countStr] });
                    } else {
                      updateFilters({ bathrooms: filters.bathrooms.filter(b => b !== countStr) });
                    }
                  }}
                  className="h-5 w-5"
                />
                <Label htmlFor={`bathrooms-${count}`} className="text-sm touch-manipulation cursor-pointer">
                  {count} {count === 1 ? 'Bathroom' : 'Bathrooms'}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Manufacturers */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Manufacturer</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {uniqueManufacturers.map(manufacturer => (
              <div key={manufacturer} className="flex items-center space-x-2 touch-manipulation">
                <Checkbox
                  id={`manufacturer-${manufacturer}`}
                  checked={filters.manufacturers.includes(manufacturer)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateFilters({ manufacturers: [...filters.manufacturers, manufacturer] });
                    } else {
                      updateFilters({ manufacturers: filters.manufacturers.filter(m => m !== manufacturer) });
                    }
                  }}
                  className="h-5 w-5"
                />
                <Label htmlFor={`manufacturer-${manufacturer}`} className="text-sm touch-manipulation cursor-pointer">
                  {manufacturer}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        {uniqueFeatures.length > 0 && (
          <div>
            <Label className="text-sm font-medium mb-3 block">Features</Label>
            <div className="grid grid-cols-1 gap-2 max-h-48 sm:max-h-40 overflow-y-auto border rounded-lg p-3">
              {uniqueFeatures.map(feature => (
                <div key={feature} className="flex items-center space-x-2 touch-manipulation">
                  <Checkbox
                    id={`feature-${feature}`}
                    checked={filters.features.includes(feature)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateFilters({ features: [...filters.features, feature] });
                      } else {
                        updateFilters({ features: filters.features.filter(f => f !== feature) });
                      }
                    }}
                    className="h-5 w-5"
                  />
                  <Label htmlFor={`feature-${feature}`} className="text-sm touch-manipulation cursor-pointer leading-tight">
                    {feature}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};