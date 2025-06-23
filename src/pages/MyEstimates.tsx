
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { User } from '@supabase/supabase-js';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Estimate {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string | null;
  preferred_contact: string | null;
  timeline: string | null;
  additional_requirements: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  mobile_homes: {
    manufacturer: string;
    series: string;
    model: string;
    price: number;
  } | null;
  selected_services: string[] | null;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

const MyEstimates = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  // Check for authenticated user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (!user) {
        navigate('/auth');
      }
    };
    
    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch user's estimates
  const { data: estimates = [], isLoading: estimatesLoading, refetch } = useQuery({
    queryKey: ['user-estimates', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          mobile_homes (
            manufacturer,
            series,
            model,
            price
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Estimate[];
    },
    enabled: !!user
  });

  // Fetch services to display names
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price');
      
      if (error) throw error;
      return data as Service[];
    }
  });

  const getSelectedServices = (serviceIds: string[] | null) => {
    if (!serviceIds || !services.length) return [];
    return services.filter(service => serviceIds.includes(service.id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-blue-900">Please sign in to view your estimates.</p>
          <Link to="/auth">
            <Button className="mt-4">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (estimatesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-blue-900">Loading your estimates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            My Estimates
          </h1>
          <p className="text-lg text-green-700">View and manage your mobile home estimates</p>
          <div className="mt-4 flex justify-center gap-4">
            <Link to="/">
              <Button variant="outline">
                Create New Estimate
              </Button>
            </Link>
            <Button 
              onClick={() => supabase.auth.signOut()} 
              variant="outline"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {estimates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600 mb-4">You haven't created any estimates yet.</p>
            <Link to="/">
              <Button>Create Your First Estimate</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {estimates.map((estimate) => (
              <Card key={estimate.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl text-blue-900">
                        Estimate #{estimate.id.slice(-8)}
                      </CardTitle>
                      <p className="text-gray-600">
                        Created on {format(new Date(estimate.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Badge className={getStatusColor(estimate.status)}>
                      {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Mobile Home</h4>
                      {estimate.mobile_homes ? (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium">
                            {estimate.mobile_homes.manufacturer} {estimate.mobile_homes.series}
                          </p>
                          <p className="text-gray-600">{estimate.mobile_homes.model}</p>
                          <p className="text-green-600 font-semibold">
                            ${estimate.mobile_homes.price.toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500">Mobile home details not available</p>
                      )}

                      {getSelectedServices(estimate.selected_services).length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Additional Services</h4>
                          <div className="space-y-1">
                            {getSelectedServices(estimate.selected_services).map((service) => (
                              <div key={service.id} className="flex justify-between text-sm">
                                <span>{service.name}</span>
                                <span className="text-green-600">${service.price.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><strong>Name:</strong> {estimate.customer_name}</p>
                        <p><strong>Email:</strong> {estimate.customer_email}</p>
                        <p><strong>Phone:</strong> {estimate.customer_phone}</p>
                        {estimate.delivery_address && (
                          <p><strong>Delivery Address:</strong> {estimate.delivery_address}</p>
                        )}
                        {estimate.preferred_contact && (
                          <p><strong>Preferred Contact:</strong> {estimate.preferred_contact}</p>
                        )}
                        {estimate.timeline && (
                          <p><strong>Timeline:</strong> {estimate.timeline}</p>
                        )}
                      </div>

                      {estimate.additional_requirements && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Additional Requirements</h4>
                          <p className="text-sm text-gray-600">{estimate.additional_requirements}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          Total: ${estimate.total_amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">*Final pricing may vary based on site conditions</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Business Contact Info */}
        <div className="mt-8 text-center text-gray-600">
          <p className="mb-2">Questions about your estimates? Contact us:</p>
          <p>Phone: (555) 123-4567 | Email: info@wholesalehomescarolinas.com</p>
        </div>
      </div>
    </div>
  );
};

export default MyEstimates;
