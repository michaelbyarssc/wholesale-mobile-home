
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { User } from '@supabase/supabase-js';
import { useNavigate, Link } from 'react-router-dom';

interface Estimate {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address: string;
  total_amount: number;
  status: string;
  created_at: string;
  mobile_homes: {
    manufacturer: string;
    series: string;
    model: string;
  };
}

const MyEstimates = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
    };
    
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: estimates = [], isLoading, refetch } = useQuery({
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
            model
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Estimate[];
    },
    enabled: !!user
  });

  if (!user) {
    return null; // Will redirect to auth
  }

  if (isLoading) {
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
          <p className="text-lg text-green-700">View your saved mobile home estimates</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Your Estimates</CardTitle>
          </CardHeader>
          <CardContent>
            {estimates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">You haven't created any estimates yet.</p>
                <Link to="/">
                  <Button>Create Your First Estimate</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mobile Home</TableHead>
                      <TableHead>Delivery Address</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estimates.map((estimate) => (
                      <TableRow key={estimate.id}>
                        <TableCell>
                          {estimate.mobile_homes ? 
                            `${estimate.mobile_homes.manufacturer} ${estimate.mobile_homes.series} ${estimate.mobile_homes.model}` 
                            : 'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          {estimate.delivery_address || 'Not specified'}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
