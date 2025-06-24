import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Loader2, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ApproveEstimate = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();
  
  const [estimate, setEstimate] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid approval link');
      setLoading(false);
      return;
    }

    fetchEstimate();
  }, [token]);

  const fetchEstimate = async () => {
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          mobile_homes (
            manufacturer,
            series,
            model,
            display_name,
            price,
            bedrooms,
            bathrooms,
            square_footage
          )
        `)
        .eq('approval_token', token)
        .single();

      if (error || !data) {
        setError('Estimate not found or link has expired');
        return;
      }

      if (data.approved_at) {
        setApproved(true);
        setError('This estimate has already been approved');
        return;
      }

      setEstimate(data);

      // Fetch selected services
      if (data.selected_services && data.selected_services.length > 0) {
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .in('id', data.selected_services);

        if (!servicesError) {
          setServices(servicesData || []);
        }
      }
    } catch (err) {
      console.error('Error fetching estimate:', err);
      setError('Failed to load estimate');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!token) return;
    
    setApproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('approve-estimate', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) {
        throw error;
      }

      setApproved(true);
      toast({
        title: "Estimate Approved!",
        description: "Your estimate has been approved and converted to an invoice. You should receive an email confirmation shortly.",
      });
    } catch (err) {
      console.error('Approval error:', err);
      toast({
        title: "Approval Failed",
        description: err instanceof Error ? err.message : "Failed to approve estimate",
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading your estimate...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {approved ? 'Already Approved' : 'Error'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            {approved && (
              <p className="text-sm text-gray-500">
                If you need assistance, please contact us directly.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="bg-green-50 border-b border-green-200">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Estimate Approved Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-gray-700 mb-4">
              Thank you for approving your estimate. It has been converted to an invoice and you should receive an email confirmation shortly.
            </p>
            <p className="text-sm text-gray-500">
              We will contact you soon to arrange payment and delivery.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mobileHome = estimate?.mobile_homes;
  const homeDisplayName = mobileHome?.display_name || 
    `${mobileHome?.manufacturer} ${mobileHome?.series} ${mobileHome?.model}`;

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const estimateNumber = estimate?.id.slice(-8).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Professional Header */}
        <div className="bg-white shadow-lg rounded-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="h-8 w-8" />
                  <h1 className="text-3xl font-bold">Wholesale Homes of the Carolinas</h1>
                </div>
                <p className="text-blue-100 text-lg">Premium Mobile Home Solutions</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">ESTIMATE</p>
                <p className="text-blue-100">#{estimateNumber}</p>
                <p className="text-blue-100">{currentDate}</p>
              </div>
            </div>
          </div>
          
          {/* Company Information */}
          <div className="p-6 bg-gray-50 border-b">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-600" />
                <span className="text-gray-700">(555) 123-4567</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-gray-700">sales@wholesomehomes.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-gray-700">Charlotte, NC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="text-blue-900">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Customer Name</label>
                  <p className="text-lg font-medium text-gray-900">{estimate.customer_name}</p>
                </div>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Email</label>
                  <p className="text-gray-900">{estimate.customer_email}</p>
                </div>
              </div>
              <div>
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Phone</label>
                  <p className="text-gray-900">{estimate.customer_phone}</p>
                </div>
                {estimate.delivery_address && (
                  <div className="mb-4">
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Delivery Address</label>
                    <p className="text-gray-900">{estimate.delivery_address}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Home Details */}
        <Card className="mb-6 shadow-lg">
          <CardHeader className="bg-green-50 border-b">
            <CardTitle className="text-green-900">Mobile Home Specifications</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{homeDisplayName}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-600">Manufacturer:</span>
                    <span className="text-gray-900">{mobileHome?.manufacturer}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-600">Series:</span>
                    <span className="text-gray-900">{mobileHome?.series}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-600">Model:</span>
                    <span className="text-gray-900">{mobileHome?.model}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="space-y-3">
                  {mobileHome?.bedrooms && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="font-medium text-gray-600">Bedrooms:</span>
                      <span className="text-gray-900">{mobileHome.bedrooms}</span>
                    </div>
                  )}
                  {mobileHome?.bathrooms && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="font-medium text-gray-600">Bathrooms:</span>
                      <span className="text-gray-900">{mobileHome.bathrooms}</span>
                    </div>
                  )}
                  {mobileHome?.square_footage && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                      <span className="font-medium text-gray-600">Square Footage:</span>
                      <span className="text-gray-900">{mobileHome.square_footage} sq ft</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="font-medium text-gray-600">Base Price:</span>
                    <span className="text-lg font-bold text-green-600">${mobileHome?.price?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        {services.length > 0 && (
          <Card className="mb-6 shadow-lg">
            <CardHeader className="bg-amber-50 border-b">
              <CardTitle className="text-amber-900">Additional Services</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {services.map((service) => (
                  <div key={service.id} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">{service.name}</p>
                      {service.description && (
                        <p className="text-sm text-gray-600">{service.description}</p>
                      )}
                    </div>
                    <span className="text-lg font-semibold text-gray-900">${service.price?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Requirements */}
        {estimate.additional_requirements && (
          <Card className="mb-6 shadow-lg">
            <CardHeader className="bg-purple-50 border-b">
              <CardTitle className="text-purple-900">Additional Requirements</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-700 whitespace-pre-wrap">{estimate.additional_requirements}</p>
            </CardContent>
          </Card>
        )}

        {/* Total and Terms */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-8">
            <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-300">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Total Investment</h3>
                <p className="text-gray-600 mt-1">All services and fees included</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-green-600">${estimate.total_amount?.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">USD</p>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg mb-6">
              <h4 className="font-bold text-blue-900 mb-3">Terms & Conditions</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• This estimate is valid for 30 days from the date issued</li>
                <li>• Final pricing may vary based on site conditions and delivery requirements</li>
                <li>• Upon approval, this estimate becomes a binding agreement</li>
                <li>• Payment terms: Due upon receipt of invoice</li>
                <li>• Delivery and setup are included in the quoted price</li>
              </ul>
            </div>

            <div className="text-center">
              <Button 
                onClick={handleApprove}
                disabled={approving}
                className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 text-lg font-semibold rounded-lg shadow-lg transform transition hover:scale-105"
                size="lg"
              >
                {approving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-3" />
                    Processing Approval...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-3" />
                    Approve Estimate & Create Invoice
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-600 mt-4">
                By clicking "Approve", you agree to the terms and conditions outlined above.
                An invoice will be generated and sent to your email address.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>© 2024 Wholesale Homes of the Carolinas. All rights reserved.</p>
          <p className="mt-1">Thank you for choosing us for your mobile home needs.</p>
        </div>
      </div>
    </div>
  );
};

export default ApproveEstimate;
