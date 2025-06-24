
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { MapPin, Home, Bed, Bath, Calendar, DollarSign, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/utils';

interface ComparableHome {
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage?: number;
  listingDate?: string;
}

interface ComparableHomesCardProps {
  deliveryAddress: string;
  mobileHomeBedrooms: number;
  mobileHomeBathrooms: number;
}

export const ComparableHomesCard = ({ 
  deliveryAddress, 
  mobileHomeBedrooms, 
  mobileHomeBathrooms 
}: ComparableHomesCardProps) => {
  const [comparables, setComparables] = useState<ComparableHome[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchAddress, setSearchAddress] = useState(deliveryAddress || '');
  const [searchRadius, setSearchRadius] = useState('5');
  const [hasSearched, setHasSearched] = useState(false);

  const searchComparables = async () => {
    if (!searchAddress.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-comparable-homes', {
        body: {
          address: searchAddress,
          bedrooms: mobileHomeBedrooms,
          bathrooms: mobileHomeBathrooms,
          radius: parseInt(searchRadius)
        }
      });

      if (error) {
        console.error('Error fetching comparables:', error);
        setComparables([]);
      } else {
        setComparables(data?.comparables || []);
        setHasSearched(true);
      }
    } catch (err) {
      console.error('Network error:', err);
      setComparables([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader className="bg-indigo-50 border-b">
        <CardTitle className="text-indigo-900 flex items-center gap-2">
          <Home className="h-5 w-5" />
          Comparable Mobile Homes in Your Area
        </CardTitle>
        <p className="text-sm text-indigo-700 mt-1">
          See similar mobile homes for sale near your delivery location to help make an informed decision.
        </p>
      </CardHeader>
      <CardContent className="p-6">
        {/* Search Controls */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Search Location
              </label>
              <Input
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Enter address, city, or ZIP code"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Search Radius
              </label>
              <Select value={searchRadius} onValueChange={setSearchRadius}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">Within 2 miles</SelectItem>
                  <SelectItem value="5">Within 5 miles</SelectItem>
                  <SelectItem value="10">Within 10 miles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={searchComparables} 
            disabled={loading || !searchAddress.trim()}
            className="w-full md:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Find Comparable Homes
              </>
            )}
          </Button>
        </div>

        <Separator className="mb-6" />

        {/* Search Criteria Display */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Search Criteria:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              {Math.max(1, mobileHomeBedrooms - 1)} - {mobileHomeBedrooms + 1} beds
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {Math.max(1, mobileHomeBathrooms - 1)} - {mobileHomeBathrooms + 1} baths
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Within {searchRadius} miles
            </div>
            <div className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              Mobile homes only
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
            <p className="text-gray-600">Searching for comparable homes...</p>
          </div>
        ) : hasSearched && comparables.length === 0 ? (
          <div className="text-center py-8">
            <Home className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">No comparable mobile homes found in this area.</p>
            <p className="text-sm text-gray-500">Try expanding your search radius or adjusting the location.</p>
          </div>
        ) : comparables.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 mb-3">
              Found {comparables.length} comparable mobile home{comparables.length !== 1 ? 's' : ''}:
            </h4>
            {comparables.map((home, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <div className="flex items-start gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-900">{home.address}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Bed className="h-4 w-4" />
                      {home.bedrooms} bed{home.bedrooms !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Bath className="h-4 w-4" />
                      {home.bathrooms} bath{home.bathrooms !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-lg font-bold text-green-600">
                      <DollarSign className="h-4 w-4" />
                      {formatPrice(home.price)}
                    </div>
                    {home.squareFootage && (
                      <p className="text-sm text-gray-600">{home.squareFootage.toLocaleString()} sq ft</p>
                    )}
                    {home.listingDate && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        Listed {new Date(home.listingDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {hasSearched && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> These are comparable mobile homes currently for sale in your area. 
              Prices may vary based on condition, age, features, and location within the search radius.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
