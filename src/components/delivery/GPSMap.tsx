import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, RefreshCw, Car, Home, Key } from 'lucide-react';
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
  scheduled_pickup_date?: string;
  scheduled_delivery_date?: string;
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
  const routesRef = useRef<{ [key: string]: string }>({});  // Store route layer IDs

  // Fetch delivery locations with GPS data and planned routes
  const { data: deliveries = [], isLoading, refetch } = useQuery({
    queryKey: ['delivery-tracking-data', selectedDelivery],
    queryFn: async () => {
      // Fetch deliveries that are scheduled or in transit
      const query = supabase
        .from('deliveries')
        .select(`
          id,
          delivery_number,
          customer_name,
          pickup_address,
          delivery_address,
          status,
          scheduled_pickup_date,
          scheduled_delivery_date,
          delivery_gps_tracking (
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
        .in('status', ['scheduled', 'in_transit'])
        .order('created_at', { ascending: false });

      if (selectedDelivery) {
        query.eq('id', selectedDelivery);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process data to get latest location for each delivery
      const processedDeliveries: DeliveryLocation[] = data.map(delivery => {
        const latestGPS = delivery.delivery_gps_tracking?.[0];
        return {
          id: delivery.id,
          delivery_number: delivery.delivery_number,
          customer_name: delivery.customer_name,
          pickup_address: delivery.pickup_address,
          delivery_address: delivery.delivery_address,
          status: delivery.status,
          scheduled_pickup_date: delivery.scheduled_pickup_date,
          scheduled_delivery_date: delivery.scheduled_delivery_date,
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
    refetchInterval: 15000, // Refresh every 15 seconds for real-time tracking
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

  // Update markers and routes when deliveries data changes
  useEffect(() => {
    if (!map.current || !mapboxToken) return;

    const updateMapData = async () => {
      // Clear existing markers and routes
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};

      // Clear existing route layers
      Object.values(routesRef.current).forEach(layerId => {
        if (map.current?.getLayer(layerId)) {
          map.current.removeLayer(layerId);
          map.current.removeSource(layerId);
        }
      });
      routesRef.current = {};

      if (!deliveries.length) return;

      const bounds = new mapboxgl.LngLatBounds();
      let hasValidLocations = false;

      for (const delivery of deliveries) {
        // Geocode pickup and delivery addresses
        const pickupCoords = await geocodeAddress(delivery.pickup_address);
        const deliveryCoords = await geocodeAddress(delivery.delivery_address);

        if (!pickupCoords || !deliveryCoords) continue;

        // Get route between pickup and delivery
        const route = await getRoute(pickupCoords, deliveryCoords);
        
        if (route) {
          // Add route to map
          const routeLayerId = `route-${delivery.id}`;
          routesRef.current[delivery.id] = routeLayerId;

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
              'line-color': delivery.status === 'in_transit' ? '#3b82f6' : '#64748b',
              'line-width': delivery.status === 'in_transit' ? 4 : 3,
              'line-opacity': delivery.status === 'in_transit' ? 0.8 : 0.6
            }
          });

          // Add route to bounds
          route.geometry.coordinates.forEach((coord: [number, number]) => {
            bounds.extend(coord);
          });
          hasValidLocations = true;
        }

        // Add pickup marker
        const pickupMarker = document.createElement('div');
        pickupMarker.className = 'pickup-marker';
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
            <div class="text-xs text-gray-600">${delivery.pickup_address}</div>
          </div>
        `);

        new mapboxgl.Marker(pickupMarker)
          .setLngLat(pickupCoords)
          .setPopup(pickupPopup)
          .addTo(map.current!);

        bounds.extend(pickupCoords);

        // Add delivery destination marker
        const deliveryMarker = document.createElement('div');
        deliveryMarker.className = 'delivery-marker';
        deliveryMarker.innerHTML = `
          <div class="w-8 h-8 bg-green-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </div>
        `;

        const deliveryPopup = new mapboxgl.Popup({ offset: [0, -15] }).setHTML(`
          <div class="p-2">
            <div class="font-semibold text-sm text-green-600">Delivery Destination</div>
            <div class="text-xs text-gray-600">${delivery.delivery_address}</div>
            <div class="text-xs text-gray-500 mt-1">Customer: ${delivery.customer_name}</div>
          </div>
        `);

        new mapboxgl.Marker(deliveryMarker)
          .setLngLat(deliveryCoords)
          .setPopup(deliveryPopup)
          .addTo(map.current!);

        bounds.extend(deliveryCoords);

        // Add driver current location marker if available (in transit)
        if (delivery.current_location && delivery.status === 'in_transit') {
          const driverMarker = document.createElement('div');
          driverMarker.className = 'driver-marker animate-pulse';
          driverMarker.innerHTML = `
            <div class="w-10 h-10 bg-red-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
              </svg>
            </div>
          `;

          const driverPopup = new mapboxgl.Popup({ offset: [0, -15] }).setHTML(`
            <div class="p-3 min-w-64">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-semibold text-sm text-red-600">${delivery.delivery_number}</h3>
                <span class="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                  LIVE
                </span>
              </div>
              <div class="space-y-1 text-xs text-gray-600">
                <p><strong>Driver:</strong> ${delivery.current_location.driver_name}</p>
                ${delivery.current_location.speed_mph ? 
                  `<p><strong>Speed:</strong> ${Math.round(delivery.current_location.speed_mph)} mph</p>` : 
                  ''
                }
                <p><strong>Last Update:</strong> ${new Date(delivery.current_location.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          `);

          const driverMarkerInstance = new mapboxgl.Marker(driverMarker)
            .setLngLat([delivery.current_location.longitude, delivery.current_location.latitude])
            .setPopup(driverPopup)
            .addTo(map.current!);

          markersRef.current[`driver-${delivery.id}`] = driverMarkerInstance;
          bounds.extend([delivery.current_location.longitude, delivery.current_location.latitude]);
        }
      }

      // Fit map to show all locations
      if (hasValidLocations) {
        map.current!.fitBounds(bounds, {
          padding: 50,
          maxZoom: 15,
        });
      }
    };

    updateMapData();
  }, [deliveries, mapboxToken]);

  // Fetch Mapbox token from environment or storage
  useEffect(() => {
    const storedToken = localStorage.getItem('mapbox_token');
    const envToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    
    if (storedToken) {
      setMapboxToken(storedToken);
    } else if (envToken && envToken !== 'your-token-here') {
      setMapboxToken(envToken);
    }
  }, []);

  const handleTokenSubmit = (token: string) => {
    localStorage.setItem('mapbox_token', token);
    setMapboxToken(token);
  };

  // Component for Mapbox token input
  const MapboxTokenInput = ({ onTokenSubmit }: { onTokenSubmit: (token: string) => void }) => {
    const [token, setToken] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (token.trim()) {
        onTokenSubmit(token.trim());
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            placeholder="Enter your Mapbox public token (pk.eyJ1...)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
        <Button type="submit" className="w-full" disabled={!token.trim()}>
          Set Token & Load Map
        </Button>
      </form>
    );
  };

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
          <div className="space-y-4">
            <div className="text-center py-4">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Mapbox API token required for GPS tracking
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Get your free token at <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a>
              </p>
            </div>
            <MapboxTokenInput onTokenSubmit={handleTokenSubmit} />
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
                  No scheduled or active deliveries
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Scheduled deliveries show planned routes, active deliveries show real-time tracking
                </p>
              </div>
            )}

            {deliveries.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliveries.map(delivery => (
                  <div
                    key={delivery.id}
                    className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (map.current) {
                        // Focus on the route or driver location
                        if (delivery.current_location) {
                          map.current.flyTo({
                            center: [delivery.current_location.longitude, delivery.current_location.latitude],
                            zoom: 14,
                            duration: 1000,
                          });
                          markersRef.current[`driver-${delivery.id}`]?.getPopup().addTo(map.current);
                        } else {
                          // Focus on the route
                          const routeLayer = routesRef.current[delivery.id];
                          if (routeLayer && map.current.getSource(routeLayer)) {
                            map.current.flyTo({
                              zoom: 10,
                              duration: 1000,
                            });
                          }
                        }
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{delivery.delivery_number}</span>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={delivery.status === 'in_transit' ? 'default' : 'secondary'} 
                          className="text-xs"
                        >
                          {delivery.status === 'in_transit' ? 'LIVE' : 'SCHEDULED'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{delivery.customer_name}</p>
                    
                    {delivery.status === 'in_transit' && delivery.current_location ? (
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="flex items-center space-x-1 text-green-600">
                          <Navigation className="h-3 w-3" />
                          <span>{delivery.current_location.driver_name}</span>
                        </span>
                        {delivery.current_location.speed_mph && (
                          <span className="text-blue-600">
                            {Math.round(delivery.current_location.speed_mph)} mph
                          </span>
                        )}
                        <span className="text-gray-500">
                          {new Date(delivery.current_location.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Home className="h-3 w-3" />
                          <span>Route planned</span>
                        </div>
                        {delivery.scheduled_delivery_date && (
                          <div className="mt-1">
                            Scheduled: {new Date(delivery.scheduled_delivery_date).toLocaleDateString()}
                          </div>
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