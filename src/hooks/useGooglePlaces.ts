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
  const [status, setStatus] = useState('Initializing...');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    // Get the API key from Supabase secrets via edge function
    const loadApiKey = async () => {
      try {
        setStatus('Fetching Google Maps API key...');
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error) {
          setStatus('Failed to get API key');
          console.error('Failed to get Google Maps API key:', error);
          return;
        }
        
        if (data?.apiKey) {
          setStatus('Loading Google Maps...');
          loadGoogleMapsScript(data.apiKey);
        } else {
          setStatus('No API key received');
        }
      } catch (error) {
        setStatus('Error loading API key');
        console.error('Error loading Google Maps API key:', error);
      }
    };

    loadApiKey();
  }, []);

  const loadGoogleMapsScript = (key: string) => {
    // Check if script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setStatus('Google Maps already loaded');
      setIsLoaded(true);
      return;
    }

    // Check if script is already in DOM
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      setStatus('Google Maps script found, waiting...');
      return;
    }

    setStatus('Loading Google Maps script...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setStatus('Google Maps loaded successfully');
      setIsLoaded(true);
    };
    script.onerror = () => {
      setStatus('Failed to load Google Maps');
      console.error('Failed to load Google Maps script');
    };
    
    document.head.appendChild(script);
  };

  const initializeAutocomplete = (
    inputElement: HTMLInputElement,
    onPlaceSelect: (place: PlaceResult) => void
  ) => {
    if (!isLoaded || !window.google?.maps?.places) {
      setStatus('Google Maps not ready');
      console.warn('Google Maps Places API not loaded yet');
      return null;
    }

    setStatus('Initializing autocomplete...');
    const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address']
    });

    setStatus('Autocomplete ready - start typing!');

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      // Alert for debugging on iPad
      alert(`Place selected: ${place.formatted_address || 'No formatted address'}`);
      
      if (!place.address_components) {
        alert('No address components found');
        return;
      }

      alert(`Found ${place.address_components.length} address components`);
      
      const placeResult = parseAddressComponents(place.address_components, place.formatted_address || '');
      
      alert(`Parsed result: Street="${placeResult.street}" City="${placeResult.city}" State="${placeResult.state}" ZIP="${placeResult.zipCode}"`);
      
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

    components.forEach((component) => {
      const types = component.types;
      
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
    status,
    initializeAutocomplete,
    clearAutocomplete
  };
};