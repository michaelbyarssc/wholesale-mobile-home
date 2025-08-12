import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Map, MapPin, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox token will be provided via Supabase Edge Function or user input where needed
const MAPBOX_TOKEN = "";

type DriverLocation = {
  id: string;
  driver_id: string;
  delivery_id: string | null;
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy_meters: number | null;
  speed_mph: number | null;
  heading: number | null;
  address: string | null;
  driver_name?: string;
  delivery_number?: string;
};

export const DriverTrackingMap = ({ deliveryId }: { deliveryId?: string }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  // Query to fetch driver locations
  const { data: driverLocations, isLoading } = useQuery({
    queryKey: ['driver-locations', deliveryId],
    queryFn: async () => {
      let query = supabase
        .from('delivery_gps_tracking')
        .select(`
          *,
          driver:drivers(id, first_name, last_name),
          delivery:deliveries(id, delivery_number)
        `)
        .eq('is_active', true)
        .order('timestamp', { ascending: false });
      
      if (deliveryId) {
        query = query.eq('delivery_id', deliveryId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Process and format the data
      return data.map(loc => ({
        ...loc,
        driver_name: loc.driver ? `${loc.driver.first_name} ${loc.driver.last_name}` : 'Unknown Driver',
        delivery_number: loc.delivery?.delivery_number || 'No Delivery'
      })) as DriverLocation[];
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Set up the map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    // Note: token should be set before initializing this component
    if (!MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-95.7129, 37.0902], // Default to US center
      zoom: 3.5
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl());

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when driver locations change
  useEffect(() => {
    if (!map.current || !driverLocations?.length) return;

    // Keep track of drivers we've seen in this update
    const updatedDrivers = new Set<string>();

    // Update or add markers for each driver
    driverLocations.forEach(location => {
      const driverId = location.driver_id;
      updatedDrivers.add(driverId);

      // Create or update marker
      if (markers.current[driverId]) {
        markers.current[driverId].setLngLat([location.longitude, location.latitude]);
      } else {
        // Create element for the marker
        const el = document.createElement('div');
        el.className = 'driver-marker';
        el.innerHTML = `<div class="bg-primary rounded-full p-2 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
        </div>`;
        
        // Create popup content safely without HTML injection
        const popupEl = document.createElement('div');
        popupEl.className = 'p-2';
        const driverDiv = document.createElement('div');
        driverDiv.className = 'font-bold';
        driverDiv.textContent = location.driver_name || 'Driver';
        popupEl.appendChild(driverDiv);
        const deliveryDiv = document.createElement('div');
        deliveryDiv.className = 'text-sm';
        deliveryDiv.textContent = location.delivery_number || '';
        popupEl.appendChild(deliveryDiv);
        if (location.speed_mph) {
          const speedDiv = document.createElement('div');
          speedDiv.className = 'text-sm';
          speedDiv.textContent = `Speed: ${location.speed_mph} mph`;
          popupEl.appendChild(speedDiv);
        }
        const timeDiv = document.createElement('div');
        timeDiv.className = 'text-xs text-muted-foreground';
        timeDiv.textContent = `Last updated: ${new Date(location.timestamp).toLocaleTimeString()}`;
        popupEl.appendChild(timeDiv);

        const popup = new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupEl);

        // Add marker to map
        markers.current[driverId] = new mapboxgl.Marker(el)
          .setLngLat([location.longitude, location.latitude])
          .setPopup(popup)
          .addTo(map.current);
      }
    });

    // Remove markers for drivers that no longer exist
    Object.keys(markers.current).forEach(driverId => {
      if (!updatedDrivers.has(driverId)) {
        markers.current[driverId].remove();
        delete markers.current[driverId];
      }
    });

    // Fit map to bounds if there are markers
    if (Object.keys(markers.current).length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      driverLocations.forEach(location => {
        bounds.extend([location.longitude, location.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [driverLocations]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading driver locations...</div>;
  }

  if (!driverLocations || driverLocations.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Driver Tracking</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <MapPin className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground">No active drivers found</p>
          {deliveryId && (
            <Button variant="outline" className="mt-4">
              Assign Driver
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div>Driver Tracking</div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex gap-1 items-center">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              <span>{driverLocations.filter(d => d.speed_mph && d.speed_mph > 0).length} Active</span>
            </div>
            <div className="flex gap-1 items-center">
              <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
              <span>{driverLocations.filter(d => !d.speed_mph || d.speed_mph === 0).length} Stopped</span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {driverLocations.map(location => (
            <Badge 
              key={location.driver_id}
              variant={selectedDriver === location.driver_id ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => {
                setSelectedDriver(location.driver_id);
                if (map.current && markers.current[location.driver_id]) {
                  const marker = markers.current[location.driver_id];
                  map.current.flyTo({ 
                    center: marker.getLngLat(),
                    zoom: 13,
                    speed: 1.2 
                  });
                  marker.togglePopup();
                }
              }}
            >
              {location.driver_name}
            </Badge>
          ))}
        </div>
        <div ref={mapContainer} style={{ height: '400px', borderRadius: '0.5rem' }} />
      </CardContent>
    </Card>
  );
};
