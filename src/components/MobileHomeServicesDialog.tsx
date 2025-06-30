import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useConditionalServices } from '@/hooks/useConditionalServices';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { formatPrice } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type HomeOption = Database['public']['Tables']['home_options']['Row'];

interface MobileHomeServicesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mobileHome: MobileHome | null;
  onAddToCart: (home: MobileHome, selectedServices: string[], selectedHomeOptions: { option: HomeOption; quantity: number }[]) => void;
  user: any;
}

interface SelectedHomeOption {
  option: HomeOption;
  quantity: number;
}

export const MobileHomeServicesDialog = ({
  isOpen,
  onClose,
  mobileHome,
  onAddToCart,
  user
}: MobileHomeServicesDialogProps) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedHomeOptions, setSelectedHomeOptions] = useState<SelectedHomeOption[]>([]);
  const { calculatePrice, calculateHomeOptionPrice } = useCustomerPricing(user);

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as Service[];
    }
  });

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

  // Handle null mobileHome case by providing safe defaults to the hook
  const mobileHomes = mobileHome ? [mobileHome] : [];
  const selectedHomeId = mobileHome?.id || null;
  
  const {
    availableServices,
    getServicePrice,
    getDependencies,
    getMissingDependencies,
    getServicesByDependency
  } = useConditionalServices(services, selectedHomeId, mobileHomes, selectedServices);

  // Don't render dialog content if mobileHome is null
  if (!mobileHome) {
    return null;
  }

  const handleServiceToggle = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    if (selectedServices.includes(serviceId)) {
      // Removing service - check if other services depend on it
      const dependentServices = getServicesByDependency(serviceId);
      const selectedDependentServices = dependentServices.filter(s => 
        selectedServices.includes(s.id)
      );

      if (selectedDependentServices.length > 0) {
        alert(`Cannot remove service. This service is required by: ${selectedDependentServices.map(s => s.name).join(', ')}`);
        return;
      }

      setSelectedServices(prev => prev.filter(id => id !== serviceId));
    } else {
      // Adding service - check dependencies
      const missingDeps = getMissingDependencies(serviceId);
      if (missingDeps.length > 0) {
        const missingServiceNames = missingDeps.map(depId => 
          services.find(s => s.id === depId)?.name
        ).filter(Boolean);

        alert(`Please select these services first: ${missingServiceNames.join(', ')}`);
        return;
      }

      setSelectedServices(prev => [...prev, serviceId]);
    }
  };

  const handleHomeOptionToggle = (homeOption: HomeOption) => {
    setSelectedHomeOptions(prev => {
      const existingIndex = prev.findIndex(item => item.option.id === homeOption.id);
      if (existingIndex >= 0) {
        // Remove the option
        return prev.filter(item => item.option.id !== homeOption.id);
      } else {
        // Add the option with quantity 1
        return [...prev, { option: homeOption, quantity: 1 }];
      }
    });
  };

  const updateHomeOptionQuantity = (homeOptionId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedHomeOptions(prev => prev.filter(item => item.option.id !== homeOptionId));
    } else {
      setSelectedHomeOptions(prev => 
        prev.map(item => 
          item.option.id === homeOptionId 
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const calculateTotal = () => {
    const homePrice = calculatePrice(mobileHome.cost || mobileHome.price);
    const servicesPrice = selectedServices.reduce((total, serviceId) => {
      const serviceCost = getServicePrice(serviceId);
      return total + calculatePrice(serviceCost);
    }, 0);
    const homeOptionsPrice = selectedHomeOptions.reduce((total, { option, quantity }) => {
      const optionPrice = calculateHomeOptionPrice(option, mobileHome.square_footage || undefined);
      return total + (optionPrice * quantity);
    }, 0);
    return homePrice + servicesPrice + homeOptionsPrice;
  };

  const handleAddToCart = () => {
    onAddToCart(mobileHome, selectedServices, selectedHomeOptions);
    setSelectedServices([]);
    setSelectedHomeOptions([]);
    onClose();
  };

  const getHomeName = (home: MobileHome) => {
    return home.display_name || `${home.series} ${home.model}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add {getHomeName(mobileHome)} to Cart
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Home Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selected Mobile Home</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{getHomeName(mobileHome)}</h3>
                  <p className="text-sm text-gray-600">
                    {mobileHome.width_feet && mobileHome.length_feet 
                      ? `${mobileHome.width_feet}' × ${mobileHome.length_feet}'` 
                      : 'N/A'}
                    {mobileHome.square_footage && (
                      <span className="ml-2">({mobileHome.square_footage} sq ft)</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">
                    {formatPrice(calculatePrice(mobileHome.cost || mobileHome.price))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Optional Services</CardTitle>
              <p className="text-sm text-gray-600">
                Select any additional services you'd like to include
              </p>
            </CardHeader>
            <CardContent>
              {availableServices.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No optional services available for this mobile home
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableServices.map((service) => {
                    const isSelected = selectedServices.includes(service.id);
                    
                    // Get service cost from conditional pricing
                    const serviceCost = getServicePrice(service.id);
                    const displayPrice = calculatePrice(serviceCost);
                    
                    return (
                      <div key={service.id} className="flex items-start space-x-3 p-3 border rounded">
                        <Checkbox
                          id={service.id}
                          checked={isSelected}
                          onCheckedChange={() => handleServiceToggle(service.id)}
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={service.id}
                            className="font-medium cursor-pointer"
                          >
                            {service.name}
                          </Label>
                          {service.description && (
                            <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                          )}

                          <p className="text-sm text-gray-600 mt-1">
                            {formatPrice(displayPrice)}
                            <span className="text-xs text-gray-400 ml-1">
                              ({mobileHome.width_feet > 16 ? 'Double' : 'Single'} Wide)
                            </span>
                          </p>
                          {service.requires_admin && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Admin Required
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Home Options Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Home Options</CardTitle>
              <p className="text-sm text-gray-600">
                Select any home options you'd like to add
              </p>
            </CardHeader>
            <CardContent>
              {homeOptions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No home options available
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {homeOptions.map((homeOption) => {
                    const selectedOption = selectedHomeOptions.find(item => item.option.id === homeOption.id);
                    const isSelected = !!selectedOption;
                    const optionPrice = calculateHomeOptionPrice(homeOption, mobileHome.square_footage || undefined);
                    
                    return (
                      <div key={homeOption.id} className="flex items-start space-x-3 p-3 border rounded">
                        <Checkbox
                          id={homeOption.id}
                          checked={isSelected}
                          onCheckedChange={() => handleHomeOptionToggle(homeOption)}
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
                          <Badge variant="outline" className="text-xs mt-1">
                            {homeOption.pricing_type === 'per_sqft' ? 'Per Sq Ft' : 'Fixed Price'}
                          </Badge>
                          {isSelected && (
                            <div className="flex items-center space-x-2 mt-2">
                              <Label htmlFor={`qty-${homeOption.id}`} className="text-xs">Qty:</Label>
                              <Input
                                id={`qty-${homeOption.id}`}
                                type="number"
                                min="1"
                                value={selectedOption.quantity}
                                onChange={(e) => updateHomeOptionQuantity(homeOption.id, parseInt(e.target.value) || 1)}
                                className="w-16 h-8 text-xs"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-green-600">{formatPrice(calculateTotal())}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAddToCart}>
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
