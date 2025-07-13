import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/loading/LoadingSpinner';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useRealTimeTracking } from '@/hooks/useRealTimeTracking';
import { Truck, MapPin, Calendar, Phone, Mail, Package, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const CustomerDeliveryPortal = () => {
  const { trackingToken } = useParams();
  const [searchParams] = useSearchParams();
  const [inputToken, setInputToken] = useState('');
  const [currentToken, setCurrentToken] = useState(trackingToken || searchParams.get('token') || '');

  // Fetch delivery information using tracking token
  const { data: trackingSession, isLoading, error } = useQuery({
    queryKey: ['customer-tracking', currentToken],
    queryFn: async () => {
      if (!currentToken) return null;
      
      const { data, error } = await supabase
        .from('customer_tracking_sessions')
        .select(`
          *,
          order:orders(
            id,
            customer_name,
            customer_email,
            customer_phone,
            order_number,
            total_value,
            status
          )
        `)
        .eq('session_token', currentToken)
        .eq('active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!currentToken,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch delivery details
  const { data: delivery } = useQuery({
    queryKey: ['delivery-details', trackingSession?.order_id],
    queryFn: async () => {
      if (!trackingSession?.order_id) return null;
      
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          mobile_home:mobile_homes(
            manufacturer,
            series,
            model,
            display_name
          ),
          status_history:delivery_status_history(
            new_status,
            previous_status,
            created_at,
            notes
          )
        `)
        .eq('invoice_id', trackingSession.order_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!trackingSession?.order_id,
  });

  // Real-time GPS tracking
  const trackingResult = useRealTimeTracking({
    trackingToken: currentToken,
    enabled: !!delivery?.id && delivery?.status === 'in_transit',
  });

  const currentLocation = trackingResult?.trackingData?.current_location;
  const estimatedArrival = trackingResult?.trackingData?.estimated_arrival;

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputToken.trim()) {
      setCurrentToken(inputToken.trim());
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'scheduled': return 20;
      case 'in_transit': return 60;
      case 'delivered': return 100;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'in_transit': return 'bg-yellow-500';
      case 'delivered': return 'bg-green-500';
      case 'completed': return 'bg-green-600';
      case 'delayed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (!currentToken) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={null} userProfile={null} cartItems={[]} isLoading={false} onLogout={() => {}} onToggleCart={() => {}} />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Truck className="h-6 w-6" />
                  Track Your Delivery
                </CardTitle>
                <CardDescription>
                  Enter your tracking number to view your delivery status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTokenSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="tracking-token" className="block text-sm font-medium mb-2">
                      Tracking Number
                    </label>
                    <Input
                      id="tracking-token"
                      placeholder="Enter your tracking number (e.g., track_abc123...)"
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={!inputToken.trim()}>
                    Track Delivery
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={null} userProfile={null} cartItems={[]} isLoading={true} onLogout={() => {}} onToggleCart={() => {}} />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <LoadingSpinner />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !trackingSession) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={null} userProfile={null} cartItems={[]} isLoading={false} onLogout={() => {}} onToggleCart={() => {}} />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-red-600">
                  <AlertCircle className="h-6 w-6" />
                  Tracking Not Found
                </CardTitle>
                <CardDescription>
                  We couldn't find a delivery with that tracking number. Please check your tracking number and try again.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button onClick={() => setCurrentToken('')} variant="outline">
                  Try Different Tracking Number
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const order = trackingSession.order;
  const progress = getStatusProgress(delivery?.status || 'scheduled');

  return (
    <div className="min-h-screen bg-background">
      <Header user={null} userProfile={null} cartItems={[]} isLoading={false} onLogout={() => {}} onToggleCart={() => {}} />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Delivery Tracking</h1>
            <p className="text-muted-foreground">Track your mobile home delivery in real-time</p>
          </div>

          {/* Status Overview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Delivery Status</span>
                <Badge className={getStatusColor(delivery?.status || 'scheduled')}>
                  {formatStatus(delivery?.status || 'Scheduled')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
                
                {delivery?.status === 'in_transit' && estimatedArrival && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Estimated Arrival: {format(new Date(estimatedArrival), 'MMM dd, yyyy at h:mm a')}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Order Number</label>
                  <p className="font-mono">{order.order_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer</label>
                  <p>{order.customer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mobile Home</label>
                  <p>{delivery?.mobile_home?.display_name || `${delivery?.mobile_home?.manufacturer} ${delivery?.mobile_home?.series}`}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Delivery Address</label>
                  <p>{delivery?.delivery_address}</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer Phone</label>
                  <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline">
                    {order.customer_phone}
                  </a>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Customer Email</label>
                  <a href={`mailto:${order.customer_email}`} className="text-blue-600 hover:underline">
                    {order.customer_email}
                  </a>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Support</label>
                  <p>
                    <a href="tel:864-680-4030" className="text-blue-600 hover:underline">864-680-4030</a>
                    <br />
                    <a href="mailto:Info@WholesaleMobileHome.com" className="text-blue-600 hover:underline">
                      Info@WholesaleMobileHome.com
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Location (if in transit) */}
          {delivery?.status === 'in_transit' && currentLocation && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Current Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-green-800">
                    Your delivery is currently in transit and will arrive soon!
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    GPS coordinates: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          {delivery?.status_history && delivery.status_history.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Delivery Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {delivery.status_history
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((status, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-2 ${getStatusColor(status.new_status)}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{formatStatus(status.new_status)}</h4>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(status.created_at), 'MMM dd, yyyy h:mm a')}
                          </span>
                        </div>
                        {status.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{status.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CustomerDeliveryPortal;