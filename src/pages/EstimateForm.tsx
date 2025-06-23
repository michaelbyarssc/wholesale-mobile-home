
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';

interface MobileHome {
  id: string;
  manufacturer: string;
  series: string;
  model: string;
  price: number;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
}

const EstimateForm = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  
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

  // Check for authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Pre-fill customer info if user is logged in
      if (user) {
        setCustomerInfo(prev => ({
          ...prev,
          email: user.email || ''
        }));
      }
    };
    
    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        setCustomerInfo(prev => ({
          ...prev,
          email: session.user.email || ''
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const calculateTotal = () => {
    const homePrice = selectedHome ? mobileHomes.find(h => h.id === selectedHome)?.price || 0 : 0;
    const servicesPrice = selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
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

  if (homesLoading || servicesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-blue-900">Loading mobile homes and services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            Wholesale Homes of the Carolinas
          </h1>
          <p className="text-lg text-green-700">Get Your Mobile Home Estimate</p>
          <div className="mt-4 flex justify-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <p className="text-blue-600">Welcome, {user.email}</p>
                <Link to="/my-estimates">
                  <Button variant="outline">
                    My Estimates
                  </Button>
                </Link>
                <Button 
                  onClick={() => supabase.auth.signOut()} 
                  variant="outline"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex gap-4">
                <Link to="/auth">
                  <Button variant="outline">
                    Sign In / Sign Up
                  </Button>
                </Link>
              </div>
            )}
            <Button 
              onClick={() => window.location.href = '/auth'} 
              variant="outline"
            >
              Admin Login
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Mobile Home Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900">Select Your Mobile Home</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mobileHomes.map((home) => (
                  <div
                    key={home.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedHome === home.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedHome(home.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg">{home.manufacturer} {home.series}</h3>
                        <p className="text-gray-600">{home.model}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ${home.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Services Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900">Additional Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <div key={service.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={service.id}
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={() => handleServiceToggle(service.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={service.id} className="font-medium cursor-pointer">
                        {service.name}
                      </Label>
                      {service.description && (
                        <p className="text-xs text-gray-500">{service.description}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        ${service.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900">Your Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Delivery Address</Label>
                <Textarea
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                  placeholder="Enter the full delivery address"
                />
              </div>
              <div>
                <Label htmlFor="contact">Preferred Contact Method</Label>
                <Select value={customerInfo.preferredContact} onValueChange={(value) => setCustomerInfo({...customerInfo, preferredContact: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="text">Text Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="timeline">Installation Timeline</Label>
                <Select value={customerInfo.timeline} onValueChange={(value) => setCustomerInfo({...customerInfo, timeline: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asap">As soon as possible</SelectItem>
                    <SelectItem value="1-2months">1-2 months</SelectItem>
                    <SelectItem value="3-6months">3-6 months</SelectItem>
                    <SelectItem value="6+months">6+ months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="requirements">Additional Requirements</Label>
                <Textarea
                  id="requirements"
                  value={customerInfo.requirements}
                  onChange={(e) => setCustomerInfo({...customerInfo, requirements: e.target.value})}
                  placeholder="Any special requirements or questions?"
                />
              </div>
            </CardContent>
          </Card>

          {/* Total and Submit */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-blue-900">Total Estimate:</h3>
                  <p className="text-sm text-gray-600">*Final pricing may vary based on site conditions</p>
                </div>
                <div className="text-4xl font-bold text-green-600">
                  ${calculateTotal().toLocaleString()}
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
              >
                Get My Estimate
              </Button>
              {!user && (
                <p className="text-sm text-gray-600 mt-2 text-center">
                  <Link to="/auth" className="text-blue-600 hover:underline">
                    Sign in or create an account
                  </Link> to save your estimates for future reference.
                </p>
              )}
            </CardContent>
          </Card>
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
