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
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

export interface FilterState {
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
}

export const MobileHomeFilters: React.FC<MobileHomeFiltersProps> = ({
  homes,
  filters,
  onFiltersChange,
  isCollapsed,
  onToggleCollapse
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
      <div className="mb-6">
        <Button 
          onClick={onToggleCollapse}
          variant="outline" 
          className="w-full flex items-center justify-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Show Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              {[
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
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Mobile Homes
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button onClick={clearAllFilters} variant="ghost" size="sm">
                <FilterX className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button onClick={onToggleCollapse} variant="ghost" size="sm">
              Hide Filters
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Width Type Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Home Width</Label>
          <div className="flex gap-2">
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
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Price Range */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Price Range: ${filters.priceRange[0].toLocaleString()} - ${filters.priceRange[1].toLocaleString()}
          </Label>
          <Slider
            min={priceRange[0]}
            max={priceRange[1]}
            step={5000}
            value={filters.priceRange}
            onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
            className="w-full"
          />
        </div>

        {/* Square Footage Range */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Square Footage: {filters.squareFootageRange[0]} - {filters.squareFootageRange[1]} sq ft
          </Label>
          <Slider
            min={squareFootageRange[0]}
            max={squareFootageRange[1]}
            step={50}
            value={filters.squareFootageRange}
            onValueChange={(value) => updateFilters({ squareFootageRange: value as [number, number] })}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Bedrooms */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Bedrooms</Label>
          <div className="flex flex-wrap gap-2">
            {uniqueBedrooms.map(count => (
              <div key={count} className="flex items-center space-x-2">
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
                />
                <Label htmlFor={`bedrooms-${count}`} className="text-sm">
                  {count} {count === 1 ? 'Bedroom' : 'Bedrooms'}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Bathrooms */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Bathrooms</Label>
          <div className="flex flex-wrap gap-2">
            {uniqueBathrooms.map(count => (
              <div key={count} className="flex items-center space-x-2">
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
                />
                <Label htmlFor={`bathrooms-${count}`} className="text-sm">
                  {count} {count === 1 ? 'Bathroom' : 'Bathrooms'}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Manufacturers */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Manufacturer</Label>
          <div className="flex flex-wrap gap-2">
            {uniqueManufacturers.map(manufacturer => (
              <div key={manufacturer} className="flex items-center space-x-2">
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
                />
                <Label htmlFor={`manufacturer-${manufacturer}`} className="text-sm">
                  {manufacturer}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        {uniqueFeatures.length > 0 && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Features</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {uniqueFeatures.map(feature => (
                <div key={feature} className="flex items-center space-x-2">
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
                  />
                  <Label htmlFor={`feature-${feature}`} className="text-sm">
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