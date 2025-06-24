
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import { useConditionalServices } from '@/hooks/useConditionalServices';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { MobileHomeSelection } from '@/components/estimate/MobileHomeSelection';
import { ServicesSelection } from '@/components/estimate/ServicesSelection';
import { CustomerInformation } from '@/components/estimate/CustomerInformation';
import { EstimateTotal } from '@/components/estimate/EstimateTotal';
import { EstimateHeader } from '@/components/estimate/EstimateHeader';

interface MobileHome {
  id: string;
  manufacturer: string;
  series: string;
  model: string;
  price: number;
  cost: number;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  dependencies?: string[];
  applicable_manufacturers?: string[];
  applicable_series?: string[];
  requires_admin?: boolean;
  conditional_pricing?: any;
}

const EstimateForm = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{first_name: string, last_name: string} | null>(null);
  
  const [selectedHome, setSelectedHome] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    preferredContact: '',
    timeline: '',
    requirements: ''
  });

  // Get customer pricing
  const { customerMarkup, calculatePrice, loading: pricingLoading } = useCustomerPricing(user);

  // Check for authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Get user profile if user is logged in
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData);
        }

        // Pre-fill customer info if user is logged in
        setCustomerInfo(prev => ({
          ...prev,
          email: user.email || ''
        }));
      }
    };
    
    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        // Get user profile when auth state changes
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', session.user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData);
        }

        setCustomerInfo(prev => ({
          ...prev,
          email: session.user.email || ''
        }));
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getUserDisplayName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    } else if (userProfile?.first_name) {
      return userProfile.first_name;
    }
    return null;
  };

  // Fetch mobile homes from database
  const { data: mobileHomes = [], isLoading: homesLoading } = useQuery({
    queryKey: ['mobile-homes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('*')
        .eq('active', true)
        .order('series', { ascending: true });
      
      if (error) throw error;
      return data as MobileHome[];
    }
  });

  // Fetch services from database
  const { data: services = [], isLoading: servicesLoading } = useQuery({
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

  const {
    availableServices,
    getServicePrice,
    getDependencies,
    getMissingDependencies,
    getServicesByDependency
  } = useConditionalServices(services, selectedHome, mobileHomes, selectedServices);

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
        toast({
          title: "Cannot Remove Service",
          description: `This service is required by: ${selectedDependentServices.map(s => s.name).join(', ')}`,
          variant: "destructive",
        });
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

        toast({
          title: "Missing Dependencies",
          description: `Please select these services first: ${missingServiceNames.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      setSelectedServices(prev => [...prev, serviceId]);
    }
  };

  const calculateTotal = () => {
    if (pricingLoading) {
      return 0; // Return 0 while loading
    }

    const selectedMobileHome = selectedHome ? mobileHomes.find(h => h.id === selectedHome) : null;
    const homePrice = selectedMobileHome ? calculatePrice(selectedMobileHome.cost || selectedMobileHome.price) : 0;
    
    const servicesPrice = selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      if (!service) return total;
      
      const serviceCost = service.cost || service.price;
      return total + calculatePrice(serviceCost);
    }, 0);
    
    console.log('Calculating total:', { homePrice, servicesPrice, total: homePrice + servicesPrice });
    return homePrice + servicesPrice;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedHome || !customerInfo.name || !customerInfo.phone || !customerInfo.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a mobile home.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save estimate to database
      const { data, error } = await supabase
        .from('estimates')
        .insert({
          customer_name: customerInfo.name,
          customer_phone: customerInfo.phone,
          customer_email: customerInfo.email,
          delivery_address: customerInfo.address,
          preferred_contact: customerInfo.preferredContact,
          timeline: customerInfo.timeline,
          additional_requirements: customerInfo.requirements,
          mobile_home_id: selectedHome,
          selected_services: selectedServices,
          total_amount: calculateTotal(),
          user_id: user?.id || null, // Link to user if logged in
        })
        .select()
        .single();

      if (error) throw error;

      // Send email and SMS notifications
      await supabase.functions.invoke('send-estimate-notifications', {
        body: { estimateId: data.id }
      });

      toast({
        title: "Estimate Submitted!",
        description: user 
          ? "Your estimate has been saved to your account and we'll send you a copy via email and text."
          : "We'll send your estimate via email and text shortly.",
      });

      // Reset form
      setSelectedHome('');
      setSelectedServices([]);
      setCustomerInfo({
        name: '',
        phone: '',
        email: user?.email || '',
        address: '',
        preferredContact: '',
        timeline: '',
        requirements: ''
      });

    } catch (error) {
      console.error('Error submitting estimate:', error);
      toast({
        title: "Error",
        description: "There was a problem submitting your estimate. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (homesLoading || servicesLoading || pricingLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-blue-900">Loading mobile homes and services...</p>
        </div>
      </div>
    );
  }

  const displayName = getUserDisplayName();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <EstimateHeader 
          user={user}
          displayName={displayName}
          customerMarkup={customerMarkup}
        />

        <form onSubmit={handleSubmit} className="space-y-8">
          <MobileHomeSelection
            mobileHomes={mobileHomes}
            selectedHome={selectedHome}
            onSelectHome={setSelectedHome}
            calculatePrice={calculatePrice}
          />

          <ServicesSelection
            selectedHome={selectedHome}
            availableServices={availableServices}
            selectedServices={selectedServices}
            services={services}
            onServiceToggle={handleServiceToggle}
            calculatePrice={calculatePrice}
            getDependencies={getDependencies}
            getMissingDependencies={getMissingDependencies}
          />

          <CustomerInformation
            customerInfo={customerInfo}
            onCustomerInfoChange={setCustomerInfo}
          />

          <EstimateTotal
            total={calculateTotal()}
            user={user}
          />
        </form>

        {/* Business Contact Info */}
        <div className="mt-8 text-center text-gray-600">
          <p className="mb-2">Questions? Contact us:</p>
          <p>Phone: (555) 123-4567 | Email: info@wholesalehomescarolinas.com</p>
        </div>
      </div>
    </div>
  );
};

export default EstimateForm;
