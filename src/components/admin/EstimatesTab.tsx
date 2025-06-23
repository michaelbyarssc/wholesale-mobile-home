
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Estimate {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  total_amount: number;
  status: string;
  created_at: string;
  mobile_homes: {
    manufacturer: string;
    series: string;
    model: string;
  };
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading estimates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Estimates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Mobile Home</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimates.map((estimate) => (
                <TableRow key={estimate.id}>
                  <TableCell className="font-medium">
                    {estimate.customer_name}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{estimate.customer_phone}</div>
                      <div className="text-gray-500">{estimate.customer_email}</div>
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
      </CardContent>
    </Card>
  );
};
