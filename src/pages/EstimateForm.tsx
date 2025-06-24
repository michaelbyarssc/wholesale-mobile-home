
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

const EstimateForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cartItems, clearCart } = useShoppingCart();
  const { markupPercentage, calculatePrice } = useCustomerPricing();
  
  const [services, setServices] = useState<any[]>([]);
  const [mobileHomes, setMobileHomes] = useState<any[]>([]);

  useEffect(() => {
    fetchServices();
    fetchMobileHomes();
  }, []);

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
          delivery_address: fullAddress,
          mobile_home_id: selectedHome.id,
          selected_services: selectedServices,
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
            selectedHome={selectedHome?.id || ''}
            availableServices={getAvailableServices()}
            selectedServices={selectedServices}
            services={services}
            onServiceToggle={handleServiceToggle}
            calculatePrice={calculatePrice}
            getDependencies={getDependencies}
            getMissingDependencies={getMissingDependencies}
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
