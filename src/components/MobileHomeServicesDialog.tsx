import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { useConditionalServices } from '@/hooks/useConditionalServices';
import { formatPrice } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type HomeOption = Database['public']['Tables']['home_options']['Row'];

interface MobileHomeServicesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mobileHome: MobileHome | null;
  onAddToCart: (home: MobileHome, selectedServices: string[], selectedHomeOptions: { option: HomeOption; quantity: number }[]) => void;
  user: User;
}

export const MobileHomeServicesDialog = ({
  isOpen,
  onClose,
  mobileHome,
  onAddToCart,
  user
}: MobileHomeServicesDialogProps) => {
  console.log('🔍 MobileHomeServicesDialog: Rendering with props:', {
    isOpen,
    mobileHome: mobileHome?.id,
    userId: user?.id
  });
  
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedHomeOptions, setSelectedHomeOptions] = useState<{ option: HomeOption; quantity: number }[]>([]);
  const { calculateMobileHomePrice, calculateServicePrice, calculateHomeOptionPrice, calculateTotalPrice } = useCustomerPricing(user);

  // Fetch all services
  const { data: allServices = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      console.log('MobileHomeServicesDialog: Fetching services');
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      console.log('MobileHomeServicesDialog: Services fetched:', data?.length);
      return data as Service[];
    }
  });

  // Fetch all home options
  const { data: allHomeOptions = [] } = useQuery({
    queryKey: ['home-options'],
    queryFn: async () => {
      console.log('MobileHomeServicesDialog: Fetching home options');
      const { data, error } = await supabase
        .from('home_options')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      console.log('MobileHomeServicesDialog: Home options fetched:', data?.length);
      return data as HomeOption[];
    }
  });

  // Use conditional services hook
  const { availableServices, getServicePrice } = useConditionalServices(
    allServices,
    mobileHome?.id || null,
    mobileHome ? [mobileHome] : [],
    selectedServices
  );

  console.log('MobileHomeServicesDialog: Available services:', availableServices?.length);

  // Reset selections when dialog opens/closes or mobile home changes
  useEffect(() => {
    if (isOpen && mobileHome) {
      console.log('MobileHomeServicesDialog: Resetting selections for dialog open');
      setSelectedServices([]);
      setSelectedHomeOptions([]);
    }
  }, [isOpen, mobileHome?.id]);

  const handleServiceToggle = (serviceId: string) => {
    console.log('🔍 Service toggle clicked:', serviceId);
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleHomeOptionToggle = (option: HomeOption) => {
    console.log('🔍 Home option toggle clicked:', option.id);
    setSelectedHomeOptions(prev => {
      const existing = prev.find(item => item.option.id === option.id);
      if (existing) {
        return prev.filter(item => item.option.id !== option.id);
      } else {
        return [...prev, { option, quantity: 1 }];
      }
    });
  };

  const handleAddToCart = () => {
    console.log('🔍 Add to cart clicked with:', {
      homeId: mobileHome?.id,
      selectedServices,
      selectedHomeOptions
    });
    
    if (!mobileHome) {
      console.error('No mobile home selected');
      return;
    }
    
    onAddToCart(mobileHome, selectedServices, selectedHomeOptions);
    onClose();
  };

  const getSelectedServicesData = () => {
    return allServices.filter(service => selectedServices.includes(service.id));
  };

  // Don't render if dialog is closed or no mobile home
  if (!isOpen || !mobileHome) {
    return null;
  }

  const totalPrice = calculateTotalPrice(mobileHome, getSelectedServicesData(), selectedHomeOptions);
  const homeName = mobileHome.display_name || `${mobileHome.manufacturer} ${mobileHome.model}`;
  
  console.log('MobileHomeServicesDialog: Rendering dialog for home:', homeName);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Customize Your Home</DialogTitle>
          <DialogDescription>
            Add services and options to your {homeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mobile Home Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{homeName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Size:</span>
                  <div className="font-semibold">
                    {mobileHome.width_feet && mobileHome.length_feet 
                      ? `${mobileHome.width_feet}' × ${mobileHome.length_feet}'`
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Sq Ft:</span>
                  <div className="font-semibold">{mobileHome.square_footage || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-gray-600">Bed/Bath:</span>
                  <div className="font-semibold">
                    {mobileHome.bedrooms && mobileHome.bathrooms 
                      ? `${mobileHome.bedrooms}/${mobileHome.bathrooms}`
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Base Price:</span>
                  <div className="font-semibold text-green-600">
                    {formatPrice(calculateMobileHomePrice(mobileHome))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Section */}
          {availableServices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Available Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {availableServices.map((service) => {
                    const finalPrice = calculateServicePrice(service);
                    const isSelected = selectedServices.includes(service.id);
                    
                    return (
                      <div 
                        key={service.id} 
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleServiceToggle(service.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => handleServiceToggle(service.id)}
                          />
                          <div>
                            <div className="font-medium">{service.name}</div>
                            {service.description && (
                              <div className="text-sm text-gray-600">{service.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {formatPrice(finalPrice)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Home Options Section */}
          {allHomeOptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Home Options & Upgrades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allHomeOptions.map((option) => {
                    const selectedOption = selectedHomeOptions.find(item => item.option.id === option.id);
                    const isSelected = !!selectedOption;
                    const optionPrice = calculateHomeOptionPrice(option, mobileHome.square_footage || undefined);
                    
                    return (
                      <div 
                        key={option.id} 
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              console.log('🔍 Checkbox changed for option:', option.id, 'checked:', checked);
                              handleHomeOptionToggle(option);
                            }}
                          />
                          <div>
                            <div className="font-medium">{option.name}</div>
                            {option.description && (
                              <div className="text-sm text-gray-600">{option.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {formatPrice(optionPrice)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Total and Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Separator />
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Price:</span>
                  <span className="text-green-600">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddToCart}
                    className="flex-1"
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
