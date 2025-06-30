import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { useConditionalServices } from '@/hooks/useConditionalServices';
import { formatPrice } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Service = Database['public']['Tables']['services']['Row'];
type HomeOption = Database['public']['Tables']['home_options']['Row'];

interface ServicesSelectionProps {
  selectedHome: any;
  availableServices: Service[];
  selectedServices: string[];
  services: Service[];
  onServiceToggle: (serviceId: string) => void;
  calculatePrice: (cost: number) => number;
  getDependencies: (serviceId: string) => string[];
  getMissingDependencies: (serviceId: string) => string[];
  selectedHomeOptions?: { option: HomeOption; quantity: number }[];
  onHomeOptionToggle?: (homeOption: HomeOption) => void;
  onHomeOptionQuantityChange?: (homeOptionId: string, quantity: number) => void;
  user?: any;
}

export const ServicesSelection = ({
  selectedHome,
  availableServices,
  selectedServices,
  services,
  onServiceToggle,
  calculatePrice,
  getDependencies,
  getMissingDependencies,
  selectedHomeOptions = [],
  onHomeOptionToggle,
  onHomeOptionQuantityChange,
  user
}: ServicesSelectionProps) => {
  const { calculateHomeOptionPrice } = useCustomerPricing(user);

  // Fix: Pass the actual home object and its ID correctly to useConditionalServices
  const mobileHomes = selectedHome ? [selectedHome] : [];
  const selectedHomeId = selectedHome?.id || null;
  
  console.log('🔍 POPUP DEBUG - ServicesSelection Props:', {
    selectedHome: selectedHome,
    selectedHomeId: selectedHomeId,
    mobileHomesLength: mobileHomes.length,
    servicesLength: services.length,
    availableServicesLength: availableServices.length,
    selectedServices: selectedServices,
    calculatePrice: typeof calculatePrice,
    user: user ? 'present' : 'missing'
  });

  const { getServicePrice } = useConditionalServices(services, selectedHomeId, mobileHomes, selectedServices);

  // Fetch home options
  const { data: homeOptions = [] } = useQuery({
    queryKey: ['home-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_options')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as HomeOption[];
    }
  });

  const isServiceDisabled = (service: Service) => {
    const missingDeps = getMissingDependencies(service.id);
    return missingDeps.length > 0;
  };

  const getServiceStatusBadges = (service: Service) => {
    const badges = [];
    
    if (service.requires_admin) {
      badges.push(<Badge key="admin" variant="outline" className="text-xs">Admin Required</Badge>);
    }
    
    const dependencies = getDependencies(service.id);
    if (dependencies.length > 0) {
      const depNames = dependencies.map(depId => 
        services.find(s => s.id === depId)?.name
      ).filter(Boolean);
      badges.push(
        <Badge key="deps" variant="outline" className="text-xs">
          Requires: {depNames.join(', ')}
        </Badge>
      );
    }

    // Add badge showing home width type
    if (selectedHome) {
      const homeWidth = selectedHome.width_feet || 0;
      const isDoubleWide = homeWidth > 16;
      badges.push(
        <Badge key="width" variant="outline" className="text-xs">
          {isDoubleWide ? 'Double Wide' : 'Single Wide'} Pricing
        </Badge>
      );
    }

    return badges;
  };

  return (
    <div className="space-y-6">
      {/* Debug Information Card - ALWAYS VISIBLE */}
      <Card className="border-2 border-red-500 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">🚨 DEBUG INFORMATION - PLEASE SHARE THIS WITH AI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <div><strong>Selected Home:</strong> {selectedHome ? `${selectedHome.model} (ID: ${selectedHome.id})` : 'None'}</div>
            <div><strong>Home Width:</strong> {selectedHome?.width_feet || 'Unknown'}ft ({(selectedHome?.width_feet || 0) > 16 ? 'Double' : 'Single'} Wide)</div>
            <div><strong>Services Array Length:</strong> {services.length}</div>
            <div><strong>Available Services Length:</strong> {availableServices.length}</div>
            <div><strong>Mobile Homes Array:</strong> {mobileHomes.length} items</div>
            <div><strong>User Present:</strong> {user ? 'Yes' : 'No'}</div>
            <div><strong>Calculate Price Function:</strong> {typeof calculatePrice}</div>
            
            {/* Find vinyl skirting service and show its data */}
            {(() => {
              const vinylService = services.find(s => s.name && s.name.toLowerCase().includes('vinyl') && s.name.toLowerCase().includes('skirting'));
              if (vinylService) {
                const serviceCost = getServicePrice(vinylService.id);
                const displayPrice = calculatePrice(serviceCost);
                return (
                  <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
                    <div><strong>🎯 VINYL SKIRTING SERVICE FOUND:</strong></div>
                    <div>Name: "{vinylService.name}"</div>
                    <div>ID: {vinylService.id}</div>
                    <div>Base Price: {vinylService.price}</div>
                    <div>Cost: {vinylService.cost}</div>
                    <div>Single Wide Price: {vinylService.single_wide_price}</div>
                    <div>Double Wide Price: {vinylService.double_wide_price}</div>
                    <div>Raw Service Cost (from getServicePrice): {serviceCost}</div>
                    <div>Final Display Price (after calculatePrice): {displayPrice}</div>
                    <div>Is in Available Services: {availableServices.some(s => s.id === vinylService.id) ? 'Yes' : 'No'}</div>
                  </div>
                );
              }
              return <div className="text-orange-600">❌ No vinyl skirting service found in services array</div>;
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Services Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-900">Additional Services</CardTitle>
          {selectedHome && (
            <p className="text-sm text-gray-600">
              Services available for your selected mobile home ({selectedHome.width_feet || 0}' wide - {selectedHome.width_feet > 16 ? 'Double Wide' : 'Single Wide'})
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!selectedHome ? (
            <p className="text-gray-500 text-center py-4">
              Please select a mobile home first to see available services
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableServices.map((service) => {
                const isDisabled = isServiceDisabled(service);
                
                // Get service cost from conditional pricing
                const serviceCost = getServicePrice(service.id);
                const displayPrice = calculatePrice(serviceCost);
                
                // Special debug for vinyl skirting
                const serviceName = (service.name || '').toLowerCase();
                const isVinylSkirting = serviceName.includes('vinyl') && serviceName.includes('skirting');
                
                console.log(`🔍 POPUP - Processing Service: ${service.name}, ID: ${service.id}, serviceCost: ${serviceCost}, displayPrice: ${displayPrice}, isVinylSkirting: ${isVinylSkirting}`);
                
                return (
                  <div 
                    key={service.id} 
                    className={`p-3 border rounded-lg ${
                      isDisabled ? 'opacity-50 bg-gray-50' : ''
                    } ${isVinylSkirting ? 'border-2 border-yellow-400 bg-yellow-50' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={service.id}
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => onServiceToggle(service.id)}
                        disabled={isDisabled}
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor={service.id} 
                          className={`font-medium cursor-pointer ${
                            isDisabled ? 'cursor-not-allowed' : ''
                          } ${isVinylSkirting ? 'text-yellow-800' : ''}`}
                        >
                          {service.name} {isVinylSkirting ? '🎯' : ''}
                        </Label>
                        {service.description && (
                          <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                        )}

                        <p className="text-sm text-gray-600 mt-1">
                          {formatPrice(displayPrice)}
                          <span className="text-xs text-gray-400 ml-1">
                            ({selectedHome.width_feet > 16 ? 'Double' : 'Single'} Wide)
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {getServiceStatusBadges(service)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Home Options Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-900">Home Options</CardTitle>
          {selectedHome && (
            <p className="text-sm text-gray-600">
              Additional options you can add to your mobile home
            </p>
          )}
        </CardHeader>
        <CardContent>
          {!selectedHome ? (
            <p className="text-gray-500 text-center py-4">
              Please select a mobile home first to see available home options
            </p>
          ) : homeOptions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No home options available
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {homeOptions.map((homeOption) => {
                const selectedOption = selectedHomeOptions.find(item => item.option.id === homeOption.id);
                const isSelected = !!selectedOption;
                const optionPrice = calculateHomeOptionPrice(homeOption, selectedHome.square_footage || undefined);
                
                return (
                  <div key={homeOption.id} className="p-3 border rounded-lg">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={homeOption.id}
                        checked={isSelected}
                        onCheckedChange={() => onHomeOptionToggle?.(homeOption)}
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor={homeOption.id}
                          className="font-medium cursor-pointer"
                        >
                          {homeOption.name}
                        </Label>
                        {homeOption.description && (
                          <p className="text-xs text-gray-500 mt-1">{homeOption.description}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-1">
                          {homeOption.pricing_type === 'per_sqft' ? (
                            <>
                              {formatPrice(optionPrice)}
                              <span className="text-xs text-gray-400 ml-1">
                                (${calculatePrice(homeOption.price_per_sqft || 0).toFixed(2)}/sq ft)
                              </span>
                            </>
                          ) : (
                            formatPrice(optionPrice)
                          )}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {homeOption.pricing_type === 'per_sqft' ? 'Per Sq Ft' : 'Fixed Price'}
                          </Badge>
                        </div>
                        {isSelected && onHomeOptionQuantityChange && (
                          <div className="flex items-center space-x-2 mt-2">
                            <Label htmlFor={`qty-${homeOption.id}`} className="text-xs">Qty:</Label>
                            <Input
                              id={`qty-${homeOption.id}`}
                              type="number"
                              min="1"
                              value={selectedOption?.quantity || 1}
                              onChange={(e) => onHomeOptionQuantityChange(homeOption.id, parseInt(e.target.value) || 1)}
                              className="w-16 h-8 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
