import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlaceResult {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  formattedAddress: string;
}

export const useGooglePlaces = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    // Get the API key from Supabase secrets via edge function
    const loadApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error) {
          console.error('Failed to get Google Maps API key:', error);
          return;
        }
        
        if (data?.apiKey) {
          loadGoogleMapsScript(data.apiKey);
        }
      } catch (error) {
        console.error('Error loading Google Maps API key:', error);
      }
    };

    loadApiKey();
  }, []);

  const loadGoogleMapsScript = (key: string) => {
    // Check if script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already in DOM
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };
    
    document.head.appendChild(script);
  };

  const initializeAutocomplete = (
    inputElement: HTMLInputElement,
    onPlaceSelect: (place: PlaceResult) => void
  ) => {
    if (!isLoaded || !window.google?.maps?.places) {
      console.warn('Google Maps Places API not loaded yet');
      return null;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      console.log('🏠 Google Places - Place selected:', place);
      
      if (!place.address_components) {
        console.warn('No address components found');
        return;
      }

      console.log('🏠 Google Places - Address components:', place.address_components);
      
      const placeResult = parseAddressComponents(place.address_components, place.formatted_address || '');
      console.log('🏠 Google Places - Parsed result:', placeResult);
      
      onPlaceSelect(placeResult);
    });

    autocompleteRef.current = autocomplete;
    return autocomplete;
  };

  const parseAddressComponents = (
    components: google.maps.GeocoderAddressComponent[],
    formattedAddress: string
  ): PlaceResult => {
    let street = '';
    let city = '';
    let state = '';
    let zipCode = '';

    console.log('🏠 Parsing components:', components);

    components.forEach((component) => {
      const types = component.types;
      
      console.log(`🏠 Component: ${component.long_name} - Types:`, types);
      
      if (types.includes('street_number')) {
        street = component.long_name + ' ';
      } else if (types.includes('route')) {
        street += component.long_name;
      } else if (types.includes('locality')) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.short_name;
      } else if (types.includes('postal_code')) {
        zipCode = component.long_name;
      }
    });

    const result = {
      street: street.trim(),
      city,
      state,
      zipCode,
      formattedAddress
    };
    
    console.log('🏠 Final parsed result:', result);
    return result;
  };

  const clearAutocomplete = () => {
    if (autocompleteRef.current && window.google?.maps?.event) {
      window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }
  };

  return {
    isLoaded,
    initializeAutocomplete,
    clearAutocomplete
  };
};