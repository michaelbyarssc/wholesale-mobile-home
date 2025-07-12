import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, RefreshCw, Car, Home } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GPSMapProps {
  deliveryId?: string;
  height?: string;
  showControls?: boolean;
}

interface DeliveryLocation {
  id: string;
  delivery_number: string;
  customer_name: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
  current_location?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    speed_mph?: number;
    driver_name: string;
  };
}

export const GPSMap = ({ deliveryId, height = "400px", showControls = true }: GPSMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(deliveryId || null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  // Fetch delivery locations with GPS data
  const { data: deliveries = [], isLoading, refetch } = useQuery({
    queryKey: ['delivery-gps-data', selectedDelivery],
    queryFn: async () => {
      const query = supabase
        .from('deliveries')
        .select(`
          id,
          delivery_number,
          customer_name,
          pickup_address,
          delivery_address,
          status,
          delivery_gps_tracking!inner (
            latitude,
            longitude,
            timestamp,
            speed_mph,
            drivers (
              first_name,
              last_name
            )
          )
        `)
        .eq('status', 'in_transit')
        .order('timestamp', { referencedTable: 'delivery_gps_tracking', ascending: false });

      if (selectedDelivery) {
        query.eq('id', selectedDelivery);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process data to get latest location for each delivery
      const processedDeliveries: DeliveryLocation[] = data.map(delivery => {
        const latestGPS = delivery.delivery_gps_tracking[0];
        return {
          id: delivery.id,
          delivery_number: delivery.delivery_number,
          customer_name: delivery.customer_name,
          pickup_address: delivery.pickup_address,
          delivery_address: delivery.delivery_address,
          status: delivery.status,
          current_location: latestGPS ? {
            latitude: latestGPS.latitude,
            longitude: latestGPS.longitude,
            timestamp: latestGPS.timestamp,
            speed_mph: latestGPS.speed_mph,
            driver_name: `${latestGPS.drivers.first_name} ${latestGPS.drivers.last_name}`,
          } : undefined,
        };
      });

      return processedDeliveries;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    }), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Update markers when deliveries data changes
  useEffect(() => {
    if (!map.current || !deliveries.length) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidLocations = false;

    deliveries.forEach(delivery => {
      if (!delivery.current_location) return;

      const { latitude, longitude } = delivery.current_location;
      
      // Create custom marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'delivery-marker';
      markerElement.innerHTML = `
        <div class="w-10 h-10 bg-primary rounded-full border-4 border-white shadow-lg flex items-center justify-center cursor-pointer">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
          </svg>
        </div>
      `;

      // Create popup
      const popup = new mapboxgl.Popup({ offset: [0, -15] }).setHTML(`
        <div class="p-3 min-w-64">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-sm">${delivery.delivery_number}</h3>
            <span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
              ${delivery.status.replace('_', ' ')}
            </span>
          </div>
          <div class="space-y-1 text-xs text-gray-600">
            <p><strong>Customer:</strong> ${delivery.customer_name}</p>
            <p><strong>Driver:</strong> ${delivery.current_location.driver_name}</p>
            ${delivery.current_location.speed_mph ? 
              `<p><strong>Speed:</strong> ${Math.round(delivery.current_location.speed_mph)} mph</p>` : 
              ''
            }
            <p><strong>Last Update:</strong> ${new Date(delivery.current_location.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([longitude, latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current[delivery.id] = marker;
      bounds.extend([longitude, latitude]);
      hasValidLocations = true;
    });

    // Fit map to show all markers
    if (hasValidLocations) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      });
    }
  }, [deliveries]);

  // Try to get Mapbox token from a temporary input or env
  useEffect(() => {
    const token = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTR5aG84dmsxZWk2MnJzaDd5dzB6ZnR6In0.placeholder'; // This will be replaced with actual token
    setMapboxToken(token);
  }, []);

  if (!mapboxToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>GPS Tracking Map</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Mapbox API token required for GPS tracking
            </p>
            <p className="text-sm text-muted-foreground">
              Please configure your Mapbox token in the settings
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Live GPS Tracking</span>
          </CardTitle>
          {showControls && (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center space-x-1">
                <Car className="h-3 w-3" />
                <span>{deliveries.length} Active</span>
              </Badge>
              <Button 
                onClick={() => refetch()} 
                size="sm" 
                variant="outline"
                className="flex items-center space-x-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Refresh</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div 
              ref={mapContainer} 
              className="w-full rounded-lg border"
              style={{ height }}
            />
            
            {deliveries.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  No active deliveries with GPS tracking
                </p>
              </div>
            )}

            {deliveries.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliveries.map(delivery => (
                  <div
                    key={delivery.id}
                    className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      if (delivery.current_location && map.current) {
                        map.current.flyTo({
                          center: [delivery.current_location.longitude, delivery.current_location.latitude],
                          zoom: 14,
                          duration: 1000,
                        });
                        // Show popup
                        markersRef.current[delivery.id]?.getPopup().addTo(map.current);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{delivery.delivery_number}</span>
                      <Badge variant="outline" className="text-xs">
                        {delivery.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{delivery.customer_name}</p>
                    {delivery.current_location && (
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="flex items-center space-x-1">
                          <Navigation className="h-3 w-3" />
                          <span>{delivery.current_location.driver_name}</span>
                        </span>
                        {delivery.current_location.speed_mph && (
                          <span>
                            {Math.round(delivery.current_location.speed_mph)} mph
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};