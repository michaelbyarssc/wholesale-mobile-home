import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { EstimateHeader } from '@/components/estimate/EstimateHeader';
import { CustomerInformation } from '@/components/estimate/CustomerInformation';
import { MobileHomeSelection } from '@/components/estimate/MobileHomeSelection';
import { ServicesSelection } from '@/components/estimate/ServicesSelection';
import { EstimateTotal } from '@/components/estimate/EstimateTotal';
import { ComparableHomesCard } from '@/components/estimate-approval/ComparableHomesCard';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import type { Database } from '@/integrations/supabase/types';

type HomeOption = Database['public']['Tables']['home_options']['Row'];

const EstimateForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cartItems, clearCart } = useShoppingCart(null); // Estimates can be anonymous
  const { markupPercentage, calculatePrice, calculateHomeOptionPrice } = useCustomerPricing(null);
  
  const [services, setServices] = useState<any[]>([]);
  const [mobileHomes, setMobileHomes] = useState<any[]>([]);

  useEffect(() => {
    fetchServices();
    fetchMobileHomes();
  }, []);

  // Load cart data after mobile homes are fetched
  useEffect(() => {
    if (mobileHomes.length > 0) {
      loadCartDataIfAvailable();
    }
  }, [mobileHomes]);

  const loadCartDataIfAvailable = () => {
    try {
      // Check if we have cart data in localStorage (from the cart)
      const cartForEstimate = localStorage.getItem('cart_for_estimate');
      if (cartForEstimate) {
        const cartData = JSON.parse(cartForEstimate);
        console.log('Loading cart data for estimate:', cartData);
        
        if (cartData && cartData.length > 0) {
          const firstCartItem = cartData[0];
          
          // Find the mobile home in our fetched list by ID to ensure we have the complete object
          const homeFromList = mobileHomes.find(home => home.id === firstCartItem.mobileHome.id);
          if (homeFromList) {
            setSelectedHome(homeFromList);
            console.log('Set selected home from cart:', homeFromList);
          } else {
            // Fallback to the cart data if not found in list
            setSelectedHome(firstCartItem.mobileHome);
            console.log('Using cart mobile home data as fallback:', firstCartItem.mobileHome);
          }
          
          // Set the services from cart
          if (firstCartItem.selectedServices && firstCartItem.selectedServices.length > 0) {
            setSelectedServices(firstCartItem.selectedServices);
            console.log('Set selected services from cart:', firstCartItem.selectedServices);
          }
          
          // Set the home options from cart
          if (firstCartItem.selectedHomeOptions && firstCartItem.selectedHomeOptions.length > 0) {
            setSelectedHomeOptions(firstCartItem.selectedHomeOptions);
            console.log('Set selected home options from cart:', firstCartItem.selectedHomeOptions);
          }
          
          // Clear the cart data from localStorage since we've loaded it
          localStorage.removeItem('cart_for_estimate');
          
          toast({
            title: "Cart Data Loaded",
            description: "Your cart selections have been imported into the estimate form.",
          });
        }
      }
    } catch (error) {
      console.error('Error loading cart data:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*');

      if (error) {
        console.error('Error fetching services:', error);
        toast({
          title: "Error",
          description: "Failed to load services. Please try again.",
          variant: "destructive",
        });
      } else {
        setServices(data || []);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: "Error",
        description: "Failed to load services. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchMobileHomes = async () => {
    try {
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('*')
        .eq('active', true);

      if (error) {
        console.error('Error fetching mobile homes:', error);
        toast({
          title: "Error",
          description: "Failed to load mobile homes. Please try again.",
          variant: "destructive",
        });
      } else {
        setMobileHomes(data || []);
      }
    } catch (error) {
      console.error('Error fetching mobile homes:', error);
      toast({
        title: "Error",
        description: "Failed to load mobile homes. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    preferredContact: '',
    timeline: '',
    requirements: ''
  });
  const [selectedHome, setSelectedHome] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedHomeOptions, setSelectedHomeOptions] = useState<{ option: HomeOption; quantity: number }[]>([]);
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [loading, setLoading] = useState(false);

  // Combine address fields for delivery and comparable homes search
  const getFullAddress = () => {
    const parts = [];
    if (customerInfo.address) parts.push(customerInfo.address);
    if (customerInfo.city) parts.push(customerInfo.city);
    if (customerInfo.state) parts.push(customerInfo.state);
    if (customerInfo.zipCode) parts.push(customerInfo.zipCode);
    return parts.join(', ');
  };

  // Debug logging
  const fullAddress = getFullAddress();
  console.log('EstimateForm render state:', {
    selectedHome: selectedHome?.id,
    selectedHomeName: selectedHome?.display_name || selectedHome?.model,
    customerAddress: fullAddress,
    bedrooms: selectedHome?.bedrooms,
    bathrooms: selectedHome?.bathrooms,
    shouldShowComps: !!(selectedHome && fullAddress && customerInfo.city)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHome) {
      toast({
        title: "Error",
        description: "Please select a mobile home",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-estimate-notifications', {
        body: {
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          delivery_address: getFullAddress(),
          mobile_home_id: selectedHome.id,
          selected_services: selectedServices,
          selected_home_options: selectedHomeOptions,
          additional_requirements: additionalRequirements,
          total_amount: calculateTotal()
        }
      });

      if (error) throw error;

      clearCart();
      toast({
        title: "Estimate Submitted!",
        description: "Your estimate has been submitted. You'll receive an email with details and approval link shortly.",
      });
      navigate('/');
    } catch (error) {
      console.error('Error submitting estimate:', error);
      toast({
        title: "Error",
        description: "Failed to submit estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    let total = selectedHome?.price || 0;
    
    // Add selected services
    selectedServices.forEach(serviceId => {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        total += service.price;
      }
    });

    // Add selected home options
    selectedHomeOptions.forEach(({ option, quantity }) => {
      const optionPrice = calculateHomeOptionPrice(option, selectedHome?.square_footage);
      total += optionPrice * quantity;
    });

    // Apply customer pricing if available
    if (markupPercentage) {
      total = total * (1 + markupPercentage / 100);
    }

    return total;
  };

  const handleMobileHomeSelect = (homeId: string) => {
    const home = mobileHomes.find(h => h.id === homeId);
    console.log('Selected mobile home:', home);
    setSelectedHome(home);
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
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

  const handleHomeOptionQuantityChange = (homeOptionId: string, quantity: number) => {
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

  const getAvailableServices = () => {
    if (!selectedHome) return [];
    
    return services.filter(service => {
      // Check if service is applicable to this mobile home
      const applicableManufacturers = service.applicable_manufacturers || [];
      const applicableSeries = service.applicable_series || [];
      
      const isManufacturerMatch = applicableManufacturers.length === 0 || 
        applicableManufacturers.includes(selectedHome.manufacturer);
      const isSeriesMatch = applicableSeries.length === 0 || 
        applicableSeries.includes(selectedHome.series);
      
      return isManufacturerMatch && isSeriesMatch && service.active;
    });
  };

  const getDependencies = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.dependencies || [];
  };

  const getMissingDependencies = (serviceId: string) => {
    const dependencies = getDependencies(serviceId);
    return dependencies.filter(depId => !selectedServices.includes(depId));
  };

  // Show comparables only if we have a selected home AND a complete address (including city)
  const showComparables = selectedHome && fullAddress && customerInfo.city && customerInfo.city.trim().length > 0;
  console.log('Should show comparable homes:', showComparables);

  return (
    <div className="min-h-screen bg-gray-50">
      <EstimateHeader 
        user={null}
        displayName="Guest"
        customerMarkup={markupPercentage}
      />
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <CustomerInformation 
            customerInfo={customerInfo}
            onCustomerInfoChange={setCustomerInfo}
          />
          
          <MobileHomeSelection 
            mobileHomes={mobileHomes}
            selectedMobileHome={selectedHome}
            onMobileHomeSelect={handleMobileHomeSelect}
            user={null}
          />
          
          <ServicesSelection 
            selectedHome={selectedHome}
            availableServices={getAvailableServices()}
            selectedServices={selectedServices}
            services={services}
            onServiceToggle={handleServiceToggle}
            calculatePrice={calculatePrice}
            getDependencies={getDependencies}
            getMissingDependencies={getMissingDependencies}
            selectedHomeOptions={selectedHomeOptions}
            onHomeOptionToggle={handleHomeOptionToggle}
            onHomeOptionQuantityChange={handleHomeOptionQuantityChange}
            user={null}
          />

          {/* Comparable Homes Card - with debug info */}
          {showComparables ? (
            <div>
              <div className="mb-2 p-2 bg-blue-100 text-blue-800 text-sm rounded">
                Debug: Showing comps for {selectedHome.display_name || selectedHome.model} at {fullAddress}
              </div>
              <ComparableHomesCard 
                deliveryAddress={fullAddress}
                mobileHomeBedrooms={selectedHome.bedrooms || 2}
                mobileHomeBathrooms={selectedHome.bathrooms || 1}
              />
            </div>
          ) : (
            <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
              <p className="font-medium">Comparable Homes will show here when:</p>
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>Mobile home is selected: {selectedHome ? '✓' : '✗'}</li>
                <li>Street address is entered: {customerInfo.address ? '✓' : '✗'}</li>
                <li>City is entered: {customerInfo.city ? '✓' : '✗'}</li>
                <li>State is selected: {customerInfo.state ? '✓' : '✗'}</li>
              </ul>
            </div>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Additional Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                placeholder="Any special requirements or notes..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-vertical min-h-[100px]"
              />
            </CardContent>
          </Card>
          
          <EstimateTotal 
            total={calculateTotal()}
            user={null}
            selectedHome={selectedHome}
            deliveryAddress={customerInfo.address && customerInfo.city && customerInfo.state && customerInfo.zipCode ? {
              street: customerInfo.address,
              city: customerInfo.city,
              state: customerInfo.state,
              zipCode: customerInfo.zipCode
            } : null}
          />

          <Button 
            type="submit" 
            disabled={loading || !selectedHome}
            className="w-full"
          >
            {loading ? 'Submitting...' : 'Submit Estimate'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default EstimateForm;
