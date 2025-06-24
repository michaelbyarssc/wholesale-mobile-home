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
  const { cart, clearCart } = useShoppingCart();
  const { customerPricing } = useCustomerPricing();
  
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    fetchServices();
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
  
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    deliveryAddress: ''
  });
  const [selectedHome, setSelectedHome] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [loading, setLoading] = useState(false);

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
          delivery_address: customerInfo.deliveryAddress,
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
    if (customerPricing?.markup_percentage) {
      total = total * (1 + customerPricing.markup_percentage / 100);
    }

    return total;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <EstimateHeader />
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <CustomerInformation 
            customerInfo={customerInfo}
            setCustomerInfo={setCustomerInfo}
          />
          
          <MobileHomeSelection 
            selectedHome={selectedHome}
            setSelectedHome={setSelectedHome}
          />
          
          <ServicesSelection 
            selectedServices={selectedServices}
            setSelectedServices={setSelectedServices}
            services={services}
          />

          {/* Add Comparable Homes Card */}
          {selectedHome && customerInfo.deliveryAddress && (
            <ComparableHomesCard 
              deliveryAddress={customerInfo.deliveryAddress}
              mobileHomeBedrooms={selectedHome.bedrooms || 0}
              mobileHomeBathrooms={selectedHome.bathrooms || 0}
            />
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
            selectedHome={selectedHome}
            selectedServices={selectedServices}
            loading={loading}
            total={calculateTotal()}
          />
        </form>
      </div>
    </div>
  );
};

export default EstimateForm;
