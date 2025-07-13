import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Truck, Home, Phone, Mail, RefreshCw } from 'lucide-react';
import { useRealTimeTracking } from '@/hooks/useRealTimeTracking';
import { supabase } from '@/integrations/supabase/client';

interface CustomerTrackingMapProps {
  trackingToken: string;
  height?: string;
}

export const CustomerTrackingMap = ({ trackingToken, height = "500px" }: CustomerTrackingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const routeLayerRef = useRef<string | null>(null);

  const { trackingData, isLoading, refetch, isConnected } = useRealTimeTracking({
    trackingToken,
    enabled: true
  });

  // Fetch Mapbox token from Supabase secrets, environment, or storage
  useEffect(() => {
    const fetchMapboxToken = async () => {
      // First try localStorage
      const storedToken = localStorage.getItem('mapbox_token');
      if (storedToken) {
        console.log('CustomerTrackingMap: Using stored token from localStorage');
        setMapboxToken(storedToken);
        return;
      }

      // Then try to get from Supabase secrets via edge function
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: secretData, error } = await supabase.functions.invoke('get-mapbox-token');
          if (secretData?.token && !error) {
            console.log('CustomerTrackingMap: Using token from Supabase secrets');
            setMapboxToken(secretData.token);
            return;
          }
        }
      } catch (error) {
        console.log('CustomerTrackingMap: Could not fetch token from Supabase secrets:', error);
      }

      // Finally try environment variable
      const envToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
      if (envToken && envToken !== 'your-token-here') {
        console.log('CustomerTrackingMap: Using env token');
        setMapboxToken(envToken);
      } else {
        console.log('CustomerTrackingMap: No valid token found');
      }
    };

    fetchMapboxToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) {
      console.log('CustomerTrackingMap: Map initialization blocked - container:', !!mapContainer.current, 'token:', !!mapboxToken);
      return;
    }

    console.log('CustomerTrackingMap: Initializing map with token:', mapboxToken.substring(0, 20) + '...');
    
    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-98.5795, 39.8283], // Center of US
        zoom: 4,
      });

      map.current.on('load', () => {
        console.log('CustomerTrackingMap: Map loaded successfully');
      });

      map.current.on('error', (e) => {
        console.error('CustomerTrackingMap: Map error:', e);
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      console.log('CustomerTrackingMap: Map created successfully');
    } catch (error) {
      console.error('CustomerTrackingMap: Error creating map:', error);
    }

    return () => {
      console.log('CustomerTrackingMap: Cleaning up map');
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Geocode addresses and get routes
  const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].center as [number, number];
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  const getRoute = async (start: [number, number], end: [number, number]): Promise<any | null> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxToken}`
      );
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0];
      }
    } catch (error) {
      console.error('Routing error:', error);
    }
    return null;
  };

  // Update map with tracking data
  useEffect(() => {
    if (!map.current || !mapboxToken || !trackingData) return;

    const updateMap = async () => {
      // Clear existing markers and routes
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};

      if (routeLayerRef.current && map.current?.getLayer(routeLayerRef.current)) {
        map.current.removeLayer(routeLayerRef.current);
        map.current.removeSource(routeLayerRef.current);
        routeLayerRef.current = null;
      }

      const bounds = new mapboxgl.LngLatBounds();

      // Geocode addresses
      const pickupCoords = await geocodeAddress(trackingData.pickup_address);
      const deliveryCoords = await geocodeAddress(trackingData.delivery_address);

      if (pickupCoords && deliveryCoords) {
        // Get and display route
        const route = await getRoute(pickupCoords, deliveryCoords);
        if (route) {
          const routeLayerId = 'delivery-route';
          routeLayerRef.current = routeLayerId;

          map.current!.addSource(routeLayerId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route.geometry
            }
          });

          map.current!.addLayer({
            id: routeLayerId,
            type: 'line',
            source: routeLayerId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3b82f6',
              'line-width': 4,
              'line-opacity': 0.8
            }
          });

          bounds.extend(pickupCoords);
          bounds.extend(deliveryCoords);
        }

        // Add pickup marker
        const pickupMarker = document.createElement('div');
        pickupMarker.innerHTML = `
          <div class="w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"/>
            </svg>
          </div>
        `;

        const pickupPopup = new mapboxgl.Popup({ offset: [0, -15] }).setHTML(`
          <div class="p-2">
            <div class="font-semibold text-sm text-blue-600">Pickup Location</div>
            <div class="text-xs text-gray-600">${trackingData.pickup_address}</div>
          </div>
        `);

        markersRef.current.pickup = new mapboxgl.Marker(pickupMarker)
          .setLngLat(pickupCoords)
          .setPopup(pickupPopup)
          .addTo(map.current!);

        // Add delivery marker
        const deliveryMarker = document.createElement('div');
        deliveryMarker.innerHTML = `
          <div class="w-8 h-8 bg-green-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </div>
        `;

        const deliveryPopup = new mapboxgl.Popup({ offset: [0, -15] }).setHTML(`
          <div class="p-2">
            <div class="font-semibold text-sm text-green-600">Your Delivery Address</div>
            <div class="text-xs text-gray-600">${trackingData.delivery_address}</div>
          </div>
        `);

        markersRef.current.delivery = new mapboxgl.Marker(deliveryMarker)
          .setLngLat(deliveryCoords)
          .setPopup(deliveryPopup)
          .addTo(map.current!);
      }

      // Add driver location if available
      if (trackingData.current_location) {
        const driverMarker = document.createElement('div');
        driverMarker.innerHTML = `
          <div class="w-10 h-10 bg-red-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center animate-pulse">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
            </svg>
          </div>
        `;

        const driverPopup = new mapboxgl.Popup({ offset: [0, -15] }).setHTML(`
          <div class="p-3">
            <div class="font-semibold text-sm text-red-600 mb-2">Your Driver</div>
            <div class="space-y-1 text-xs">
              <p><strong>Driver:</strong> ${trackingData.driver_name}</p>
              ${trackingData.estimated_arrival ? `<p><strong>ETA:</strong> ${new Date(trackingData.estimated_arrival).toLocaleTimeString()}</p>` : ''}
            </div>
          </div>
        `);

        markersRef.current.driver = new mapboxgl.Marker(driverMarker)
          .setLngLat([trackingData.current_location.longitude, trackingData.current_location.latitude])
          .setPopup(driverPopup)
          .addTo(map.current!);

        bounds.extend([trackingData.current_location.longitude, trackingData.current_location.latitude]);
      }

      // Fit bounds to show all markers
      if (!bounds.isEmpty()) {
        map.current!.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15,
        });
      }
    };

    updateMap();
  }, [trackingData, mapboxToken]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'delayed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'in_transit': return 'On the Way';
      case 'completed': return 'Delivered';
      case 'delayed': return 'Delayed';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trackingData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tracking Information Not Available</h3>
          <p className="text-muted-foreground">
            Please check your tracking link or contact customer service.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Truck className="h-5 w-5" />
                <span>Delivery #{trackingData.order_number}</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {trackingData.customer_info.name}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(trackingData.status)}>
                {getStatusText(trackingData.status)}
              </Badge>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Map */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Live Tracking</span>
            </CardTitle>
            <Button onClick={() => refetch()} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div 
            ref={mapContainer} 
            className="w-full rounded-lg border bg-gray-100"
            style={{ 
              height,
              minHeight: height,
              position: 'relative'
            }}
          />
        </CardContent>
      </Card>

      {/* Delivery Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Home className="h-5 w-5" />
              <span>Delivery Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Pickup Address</label>
              <p className="text-sm">{trackingData.pickup_address}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Delivery Address</label>
              <p className="text-sm">{trackingData.delivery_address}</p>
            </div>
            {trackingData.estimated_arrival && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Estimated Arrival</label>
                <p className="text-sm font-medium text-green-600">
                  {new Date(trackingData.estimated_arrival).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Truck className="h-5 w-5" />
              <span>Your Driver</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Driver Name</label>
              <p className="text-sm font-medium">{trackingData.driver_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contact</label>
              <div className="flex items-center space-x-2 mt-1">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{trackingData.customer_info.phone}</span>
              </div>
            </div>
            {trackingData.current_location && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Driver Status</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Currently delivering</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};