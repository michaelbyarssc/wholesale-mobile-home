
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingState } from '@/components/estimate-approval/LoadingState';
import { ErrorState } from '@/components/estimate-approval/ErrorState';
import { SuccessState } from '@/components/estimate-approval/SuccessState';
import { EstimateHeader } from '@/components/estimate-approval/EstimateHeader';
import { CustomerInformationCard } from '@/components/estimate-approval/CustomerInformationCard';
import { MobileHomeDetailsCard } from '@/components/estimate-approval/MobileHomeDetailsCard';
import { ServicesCard } from '@/components/estimate-approval/ServicesCard';
import { AdditionalRequirementsCard } from '@/components/estimate-approval/AdditionalRequirementsCard';
import { TotalAndApprovalCard } from '@/components/estimate-approval/TotalAndApprovalCard';
import { EstimateFooter } from '@/components/estimate-approval/EstimateFooter';

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
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} approved={approved} />;
  }

  if (approved) {
    return <SuccessState />;
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
        <EstimateHeader estimateNumber={estimateNumber} currentDate={currentDate} />
        <CustomerInformationCard estimate={estimate} />
        <MobileHomeDetailsCard mobileHome={mobileHome} homeDisplayName={homeDisplayName} />
        <ServicesCard services={services} />
        <AdditionalRequirementsCard additionalRequirements={estimate.additional_requirements} />
        <TotalAndApprovalCard 
          totalAmount={estimate.total_amount} 
          approving={approving} 
          onApprove={handleApprove} 
        />
        <EstimateFooter />
      </div>
    </div>
  );
};

export default ApproveEstimate;
