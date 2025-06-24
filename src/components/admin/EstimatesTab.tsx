import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
        <CardTitle className="text-lg md:text-xl">Customer Estimates ({estimates.length} total)</CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {groupedEstimates.map((group) => (
            <Collapsible key={group.user_id || 'anonymous'} defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 md:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                  <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform ui-state-closed:rotate-[-90deg]" />
                  <div className="text-left min-w-0 flex-1">
                    <h3 className="font-semibold text-sm md:text-lg truncate">{group.customer_name}</h3>
                    <p className="text-xs md:text-sm text-gray-600 truncate">{group.customer_email}</p>
                    <p className="text-xs md:text-sm text-blue-600">
                      {group.estimates.length} estimate{group.estimates.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-xs md:text-sm font-medium">
                    ${group.estimates.reduce((sum, est) => sum + est.total_amount, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(Math.max(...group.estimates.map(e => new Date(e.created_at).getTime()))), 'MMM dd, yyyy')}
                  </p>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="mt-2">
                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {group.estimates.map((estimate) => (
                      <Card key={estimate.id} className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div className="font-mono text-xs">
                              #{estimate.id.slice(-8)}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              estimate.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              estimate.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                              estimate.status === 'converted' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {estimate.status}
                            </span>
                          </div>
                          
                          <div className="text-sm">
                            <div className="font-medium">{estimate.customer_phone}</div>
                            <div className="text-gray-600">
                              {estimate.mobile_homes ? 
                                `${estimate.mobile_homes.manufacturer} ${estimate.mobile_homes.series} ${estimate.mobile_homes.model}` 
                                : 'N/A'
                              }
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="font-semibold text-lg">
                              ${estimate.total_amount?.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(estimate.created_at), 'MMM dd, yyyy')}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 pt-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full"
                              onClick={() => updateEstimateStatus(estimate.id, 'contacted')}
                            >
                              Mark Contacted
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full"
                              onClick={() => updateEstimateStatus(estimate.id, 'converted')}
                            >
                              Mark Converted
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Estimate ID</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Mobile Home</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.estimates.map((estimate) => (
                          <TableRow key={estimate.id}>
                            <TableCell className="font-mono text-sm">
                              #{estimate.id.slice(-8)}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{estimate.customer_phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {estimate.mobile_homes ? 
                                `${estimate.mobile_homes.manufacturer} ${estimate.mobile_homes.series} ${estimate.mobile_homes.model}` 
                                : 'N/A'
                              }
                            </TableCell>
                            <TableCell className="font-semibold">
                              ${estimate.total_amount?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                estimate.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                estimate.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                                estimate.status === 'converted' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {estimate.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {format(new Date(estimate.created_at), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateEstimateStatus(estimate.id, 'contacted')}
                                >
                                  Mark Contacted
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateEstimateStatus(estimate.id, 'converted')}
                                >
                                  Mark Converted
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
          
          {groupedEstimates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No estimates found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
