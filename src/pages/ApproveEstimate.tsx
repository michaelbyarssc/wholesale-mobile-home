
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ApproveEstimate = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();
  
  const [estimate, setEstimate] = useState<any>(null);
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
            display_name
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
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/approve-estimate?token=${token}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabase.supabaseKey}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve estimate');
      }

      setApproved(true);
      toast({
        title: "Estimate Approved!",
        description: `Your estimate has been approved and converted to invoice ${result.invoiceNumber}. You should receive an email shortly.`,
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
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading estimate...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
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
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Estimate Approved!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Approve Your Estimate</CardTitle>
          <p className="text-gray-600">
            Please review your estimate details and approve to convert it to an invoice.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <p><span className="font-medium">Name:</span> {estimate.customer_name}</p>
              <p><span className="font-medium">Phone:</span> {estimate.customer_phone}</p>
              <p><span className="font-medium">Email:</span> {estimate.customer_email}</p>
              {estimate.delivery_address && (
                <p className="md:col-span-2">
                  <span className="font-medium">Delivery:</span> {estimate.delivery_address}
                </p>
              )}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Mobile Home</h3>
            <p className="text-sm">{homeDisplayName}</p>
          </div>

          {estimate.additional_requirements && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Additional Requirements</h3>
              <p className="text-sm">{estimate.additional_requirements}</p>
            </div>
          )}

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">Total Amount</h3>
            <p className="text-2xl font-bold text-yellow-900">${estimate.total_amount?.toLocaleString()}</p>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="font-semibold text-amber-900 mb-2">Important Notice</h3>
            <p className="text-sm text-amber-800">
              By approving this estimate, you agree to the total amount shown above. 
              This will create an invoice that is due on receipt. We will contact you to arrange payment and delivery.
            </p>
          </div>

          <Button 
            onClick={handleApprove}
            disabled={approving}
            className="w-full"
            size="lg"
          >
            {approving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Approving...
              </>
            ) : (
              'Approve Estimate'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApproveEstimate;
