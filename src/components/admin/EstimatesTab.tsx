
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EstimateGroup } from './estimates/EstimateGroup';
import { useToast } from '@/hooks/use-toast';

interface Estimate {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  total_amount: number;
  status: string;
  created_at: string;
  user_id: string | null;
  mobile_homes: {
    manufacturer: string;
    series: string;
    model: string;
  };
}

interface GroupedEstimate {
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  estimates: Estimate[];
}

export const EstimatesTab = () => {
  const { toast } = useToast();
  
  const { data: estimates = [], isLoading, refetch } = useQuery({
    queryKey: ['estimates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          mobile_homes (
            manufacturer,
            series,
            model
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Estimate[];
    }
  });

  const updateEstimateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('estimates')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('Error updating estimate:', error);
    } else {
      refetch();
    }
  };

  const deleteEstimate = async (id: string) => {
    const { error } = await supabase
      .from('estimates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting estimate:', error);
    } else {
      refetch();
    }
  };

  const resendEstimate = async (id: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-estimate-notifications', {
        body: { estimateId: id }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Estimate Resent",
        description: "The estimate has been sent to the customer and admins again.",
      });
    } catch (error) {
      console.error('Error resending estimate:', error);
      toast({
        title: "Error",
        description: "Failed to resend the estimate. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Group estimates by user
  const groupedEstimates = React.useMemo(() => {
    const groups = new Map<string, GroupedEstimate>();
    
    estimates.forEach((estimate) => {
      const key = estimate.user_id || 'anonymous';
      
      if (!groups.has(key)) {
        groups.set(key, {
          user_id: estimate.user_id,
          customer_name: estimate.customer_name,
          customer_email: estimate.customer_email,
          estimates: []
        });
      }
      
      groups.get(key)!.estimates.push(estimate);
    });
    
    return Array.from(groups.values()).sort((a, b) => {
      // Sort by most recent estimate
      const aLatest = Math.max(...a.estimates.map(e => new Date(e.created_at).getTime()));
      const bLatest = Math.max(...b.estimates.map(e => new Date(e.created_at).getTime()));
      return bLatest - aLatest;
    });
  }, [estimates]);

  // Filter open estimates (pending and contacted)
  const openEstimates = React.useMemo(() => {
    return estimates.filter(estimate => 
      estimate.status === 'pending' || estimate.status === 'contacted'
    );
  }, [estimates]);

  const groupedOpenEstimates = React.useMemo(() => {
    const groups = new Map<string, GroupedEstimate>();
    
    openEstimates.forEach((estimate) => {
      const key = estimate.user_id || 'anonymous';
      
      if (!groups.has(key)) {
        groups.set(key, {
          user_id: estimate.user_id,
          customer_name: estimate.customer_name,
          customer_email: estimate.customer_email,
          estimates: []
        });
      }
      
      groups.get(key)!.estimates.push(estimate);
    });
    
    return Array.from(groups.values()).sort((a, b) => {
      // Sort by most recent estimate
      const aLatest = Math.max(...a.estimates.map(e => new Date(e.created_at).getTime()));
      const bLatest = Math.max(...b.estimates.map(e => new Date(e.created_at).getTime()));
      return bLatest - aLatest;
    });
  }, [openEstimates]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm md:text-base">Loading estimates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-lg md:text-xl">Customer Estimates</CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Estimates ({estimates.length})</TabsTrigger>
            <TabsTrigger value="open">Open Estimates ({openEstimates.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            <div className="space-y-4">
              {groupedEstimates.map((group) => (
                <EstimateGroup
                  key={group.user_id || 'anonymous'}
                  group={group}
                  onStatusUpdate={updateEstimateStatus}
                  onDelete={deleteEstimate}
                  onResend={resendEstimate}
                />
              ))}
              
              {groupedEstimates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No estimates found.
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="open">
            <div className="space-y-4">
              {groupedOpenEstimates.map((group) => (
                <EstimateGroup
                  key={group.user_id || 'anonymous'}
                  group={group}
                  onStatusUpdate={updateEstimateStatus}
                  onDelete={deleteEstimate}
                  onResend={resendEstimate}
                />
              ))}
              
              {groupedOpenEstimates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No open estimates found.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
