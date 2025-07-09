import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FilterX, 
  Filter, 
  ChevronDown, 
  DollarSign, 
  Home, 
  Bed, 
  Bath, 
  Maximize, 
  Factory,
  Star,
  Bookmark,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import { FilterState } from '@/components/MobileHomeFilters';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface FilterPreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  filters: Partial<FilterState>;
  description: string;
}

interface AdvancedFilterPanelProps {
  homes: MobileHome[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  resultCount: number;
  isLoading?: boolean;
}

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  homes,
  filters,
  onFiltersChange,
  resultCount,
  isLoading = false
}) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['price', 'size']));
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>([]);

  // Calculate ranges and options
  const priceRange = React.useMemo(() => {
    const prices = homes.map(h => h.price).filter(Boolean);
    return prices.length > 0 ? [Math.min(...prices), Math.max(...prices)] as [number, number] : [0, 200000] as [number, number];
  }, [homes]);

  const squareFootageRange = React.useMemo(() => {
    const sqft = homes.map(h => h.square_footage).filter(Boolean);
    return sqft.length > 0 ? [Math.min(...sqft), Math.max(...sqft)] as [number, number] : [400, 2000] as [number, number];
  }, [homes]);

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

  // Predefined filter presets
  const filterPresets: FilterPreset[] = [
    {
      id: 'first-time-buyer',
      name: 'First-time Buyer',
      icon: <Home className="h-4 w-4" />,
      description: 'Affordable starter homes',
      filters: {
        priceRange: [priceRange[0], Math.floor(priceRange[0] + (priceRange[1] - priceRange[0]) * 0.4)],
        bedrooms: ['2', '3'],
        widthType: 'single'
      }
    },
    {
      id: 'family-home',
      name: 'Family Home',
      icon: <Bed className="h-4 w-4" />,
      description: 'Spacious homes for families',
      filters: {
        bedrooms: ['3', '4'],
        bathrooms: ['2', '3'],
        squareFootageRange: [Math.floor(squareFootageRange[1] * 0.6), squareFootageRange[1]],
        widthType: 'double'
      }
    },
    {
      id: 'luxury',
      name: 'Luxury',
      icon: <Star className="h-4 w-4" />,
      description: 'Premium features and finishes',
      filters: {
        priceRange: [Math.floor(priceRange[0] + (priceRange[1] - priceRange[0]) * 0.7), priceRange[1]],
        squareFootageRange: [Math.floor(squareFootageRange[1] * 0.8), squareFootageRange[1]],
        widthType: 'double'
      }
    },
    {
      id: 'energy-efficient',
      name: 'Energy Efficient',
      icon: <Factory className="h-4 w-4" />,
      description: 'Eco-friendly and efficient',
      filters: {
        features: ['Energy Efficient', 'Energy Star', 'Insulation Package']
      }
    }
  ];

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleSection = (section: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(section)) {
      newOpenSections.delete(section);
    } else {
      newOpenSections.add(section);
    }
    setOpenSections(newOpenSections);
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

  const applyPreset = (preset: FilterPreset) => {
    const newFilters = {
      ...filters,
      ...preset.filters,
      // Ensure ranges are properly set
      priceRange: preset.filters.priceRange || filters.priceRange,
      squareFootageRange: preset.filters.squareFootageRange || filters.squareFootageRange
    };
    onFiltersChange(newFilters);
  };

  const saveCurrentFilters = () => {
    const name = prompt('Enter a name for this filter preset:');
    if (name && name.trim()) {
      const newPreset: FilterPreset = {
        id: `custom-${Date.now()}`,
        name: name.trim(),
        icon: <Bookmark className="h-4 w-4" />,
        description: 'Custom saved filter',
        filters: { ...filters }
      };
      setSavedPresets([...savedPresets, newPreset]);
      // You could save to localStorage here
    }
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              {isLoading ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                resultCount
              )}
              {resultCount === 1 ? ' home' : ' homes'}
            </Badge>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs h-7"
              >
                <FilterX className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filter Presets */}
        <div>
          <h4 className="text-sm font-medium mb-3">Quick Filters</h4>
          <div className="grid grid-cols-2 gap-2">
            {filterPresets.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
                className="h-auto p-3 flex flex-col items-start gap-1 text-left"
              >
                <div className="flex items-center gap-2 w-full">
                  {preset.icon}
                  <span className="font-medium text-xs">{preset.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{preset.description}</span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Price Range */}
        <Collapsible open={openSections.has('price')} onOpenChange={() => toggleSection('price')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="font-medium">Price Range</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.has('price') && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div className="px-2">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>{formatPrice(filters.priceRange[0])}</span>
                <span>{formatPrice(filters.priceRange[1])}</span>
              </div>
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                min={priceRange[0]}
                max={priceRange[1]}
                step={1000}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatPrice(priceRange[0])}</span>
                <span>{formatPrice(priceRange[1])}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Size Filters */}
        <Collapsible open={openSections.has('size')} onOpenChange={() => toggleSection('size')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
            <div className="flex items-center gap-2">
              <Maximize className="h-4 w-4" />
              <span className="font-medium">Size & Layout</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.has('size') && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-4">
            {/* Square Footage */}
            <div className="px-2">
              <Label className="text-sm font-medium mb-2 block">Square Footage</Label>
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>{filters.squareFootageRange[0].toLocaleString()} sq ft</span>
                <span>{filters.squareFootageRange[1].toLocaleString()} sq ft</span>
              </div>
              <Slider
                value={filters.squareFootageRange}
                onValueChange={(value) => updateFilters({ squareFootageRange: value as [number, number] })}
                min={squareFootageRange[0]}
                max={squareFootageRange[1]}
                step={50}
                className="w-full"
              />
            </div>

            {/* Width Type */}
            <div className="px-2">
              <Label className="text-sm font-medium mb-2 block">Width Type</Label>
              <Select value={filters.widthType} onValueChange={(value: 'all' | 'single' | 'double') => updateFilters({ widthType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Widths</SelectItem>
                  <SelectItem value="single">Single Wide</SelectItem>
                  <SelectItem value="double">Double Wide</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bedrooms & Bathrooms */}
            <div className="grid grid-cols-2 gap-4 px-2">
              <div>
                <Label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Bed className="h-3 w-3" />
                  Bedrooms
                </Label>
                <div className="space-y-2">
                  {uniqueBedrooms.map((bedroom) => (
                    <div key={bedroom} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bedroom-${bedroom}`}
                        checked={filters.bedrooms.includes(bedroom.toString())}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFilters({ bedrooms: [...filters.bedrooms, bedroom.toString()] });
                          } else {
                            updateFilters({ bedrooms: filters.bedrooms.filter(b => b !== bedroom.toString()) });
                          }
                        }}
                      />
                      <Label htmlFor={`bedroom-${bedroom}`} className="text-sm">
                        {bedroom} {bedroom === 1 ? 'bed' : 'beds'}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <Bath className="h-3 w-3" />
                  Bathrooms
                </Label>
                <div className="space-y-2">
                  {uniqueBathrooms.map((bathroom) => (
                    <div key={bathroom} className="flex items-center space-x-2">
                      <Checkbox
                        id={`bathroom-${bathroom}`}
                        checked={filters.bathrooms.includes(bathroom.toString())}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFilters({ bathrooms: [...filters.bathrooms, bathroom.toString()] });
                          } else {
                            updateFilters({ bathrooms: filters.bathrooms.filter(b => b !== bathroom.toString()) });
                          }
                        }}
                      />
                      <Label htmlFor={`bathroom-${bathroom}`} className="text-sm">
                        {bathroom} {bathroom === 1 ? 'bath' : 'baths'}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Manufacturer */}
        <Collapsible open={openSections.has('manufacturer')} onOpenChange={() => toggleSection('manufacturer')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4" />
              <span className="font-medium">Manufacturer</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.has('manufacturer') && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 px-2">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {uniqueManufacturers.map((manufacturer) => {
                const count = homes.filter(h => h.manufacturer === manufacturer).length;
                return (
                  <div key={manufacturer} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
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
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Features */}
        <Collapsible open={openSections.has('features')} onOpenChange={() => toggleSection('features')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span className="font-medium">Features</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", openSections.has('features') && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 px-2">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uniqueFeatures.map((feature) => {
                const count = homes.filter(home => 
                  home.features && Array.isArray(home.features) && home.features.includes(feature)
                ).length;
                return (
                  <div key={feature} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
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
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Save Filters */}
        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={saveCurrentFilters}
              className="w-full"
            >
              <Bookmark className="h-3 w-3 mr-1" />
              Save Current Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};