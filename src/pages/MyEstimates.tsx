
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Home, LogOut, Phone, Mail } from 'lucide-react';
import { EstimateDocuSignButton } from '@/components/estimate-approval/EstimateDocuSignButton';

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
  // Use consolidated auth
  const { user } = useAuth();

  // Check for authenticated user
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

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

  // Fetch business info for contact details
  const { data: businessInfo } = useQuery({
    queryKey: ['business-info'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['business_phone', 'business_email', 'business_name']);
      
      if (error) throw error;
      
      const info: Record<string, string> = {};
      data?.forEach((setting) => {
        info[setting.setting_key] = setting.setting_value;
      });
      
      return info;
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg text-blue-900 mb-4">Please sign in to view your estimates.</p>
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (estimatesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-blue-900">Loading your estimates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-blue-900">My Estimates</h1>
              <p className="text-sm text-gray-600 hidden sm:block">View and manage your mobile home estimates</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <Home className="h-4 w-4 mr-2" />
                  New Estimate
                </Button>
                <Button variant="outline" size="sm" className="sm:hidden">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
              <Button 
                onClick={() => supabase.auth.signOut()} 
                variant="outline"
                size="sm"
                className="hidden sm:flex"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              <Button 
                onClick={() => supabase.auth.signOut()} 
                variant="outline"
                size="sm"
                className="sm:hidden"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {estimates.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <p className="text-gray-600 mb-4">You haven't created any estimates yet.</p>
              <Link to="/">
                <Button>Create Your First Estimate</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {estimates.map((estimate) => (
              <Card key={estimate.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg text-blue-900">
                        #{estimate.id.slice(-8)}
                      </CardTitle>
                      <p className="text-sm text-gray-500">
                        {format(new Date(estimate.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Badge className={getStatusColor(estimate.status)}>
                      {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Mobile Home Info */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Mobile Home</h4>
                      {estimate.mobile_homes ? (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium text-sm">
                            {estimate.mobile_homes.manufacturer} {estimate.mobile_homes.series}
                          </p>
                          <p className="text-gray-600 text-sm">{estimate.mobile_homes.model}</p>
                          <p className="text-green-600 font-semibold text-sm">
                            ${estimate.mobile_homes.price.toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">Mobile home details not available</p>
                      )}
                    </div>

                    {/* Additional Services */}
                    {getSelectedServices(estimate.selected_services).length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Additional Services</h4>
                        <div className="bg-gray-50 p-3 rounded-lg space-y-1">
                          {getSelectedServices(estimate.selected_services).map((service) => (
                            <div key={service.id} className="flex justify-between text-sm">
                              <span>{service.name}</span>
                              <span className="text-green-600">${service.price.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contact & Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Contact</h4>
                        <div className="space-y-1 text-sm">
                          <p><strong>Name:</strong> {estimate.customer_name}</p>
                          <p><strong>Phone:</strong> {estimate.customer_phone}</p>
                          <p><strong>Email:</strong> {estimate.customer_email}</p>
                        </div>
                      </div>
                      {(estimate.delivery_address || estimate.timeline) && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Details</h4>
                          <div className="space-y-1 text-sm">
                            {estimate.delivery_address && (
                              <p><strong>Address:</strong> {estimate.delivery_address}</p>
                            )}
                            {estimate.timeline && (
                              <p><strong>Timeline:</strong> {estimate.timeline}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional Requirements */}
                    {estimate.additional_requirements && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Additional Requirements</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {estimate.additional_requirements}
                        </p>
                      </div>
                    )}

                    {/* Total */}
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                           <p className="text-xl font-bold text-green-600">
                             Total: ${estimate.total_amount.toLocaleString()}
                           </p>
                           <p className="text-xs text-gray-500">*Final pricing may vary based on site conditions</p>
                         </div>
                         <div className="flex flex-col sm:flex-row gap-2">
                           <EstimateDocuSignButton
                             estimateId={estimate.id}
                             customerEmail={estimate.customer_email}
                             customerName={estimate.customer_name}
                             estimateNumber={estimate.id.slice(-8)}
                             documentType="estimate"
                             hasInvoice={false}
                           />
                         </div>
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Contact Footer */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600 mb-3">Questions about your estimates?</p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              {businessInfo?.business_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  <span>{businessInfo.business_phone}</span>
                </div>
              )}
              {businessInfo?.business_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{businessInfo.business_email}</span>
                </div>
              )}
              {!businessInfo?.business_phone && !businessInfo?.business_email && (
                <div className="flex flex-col sm:flex-row gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>(555) 123-4567</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>info@wholesalehomescarolinas.com</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyEstimates;
