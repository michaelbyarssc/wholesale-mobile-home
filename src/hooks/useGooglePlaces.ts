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

    setStatus('Creating autocomplete...');
    
    try {
      const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address']
      });

      setStatus('Autocomplete created, binding events...');

      // Method 1: Standard addListener
      autocomplete.addListener('place_changed', () => {
        setStatus('🎯 Standard listener fired!');
        handlePlaceChanged(autocomplete, onPlaceSelect);
      });

      // Method 2: Google event listener
      google.maps.event.addListener(autocomplete, 'place_changed', () => {
        setStatus('🎯 Google event listener fired!');
        handlePlaceChanged(autocomplete, onPlaceSelect);
      });

      // Method 5: Direct input monitoring for mobile devices
      let lastCheckedValue = '';
      
      const checkInputValue = () => {
        const currentValue = inputElement.value.trim();
        
        if (currentValue !== lastCheckedValue && currentValue.length > 10) {
          lastCheckedValue = currentValue;
          setStatus(`🔍 Checking: "${currentValue}"`);
          
          // Try to get place data
          setTimeout(() => {
            const place = autocomplete.getPlace();
            
            if (place && place.address_components) {
              setStatus('🎯 Found place data!');
              handlePlaceChanged(autocomplete, onPlaceSelect);
            } else {
              // Try manual geocoding as fallback
              setStatus('🔄 Trying manual geocoding...');
              manualGeocode(currentValue, onPlaceSelect);
            }
          }, 300);
        }
      };

      // Check on various events
      inputElement.addEventListener('input', checkInputValue);
      inputElement.addEventListener('change', checkInputValue);
      inputElement.addEventListener('blur', checkInputValue);
      
      // Also poll every 2 seconds
      const pollInterval = setInterval(checkInputValue, 2000);
      (inputElement as any)._pollInterval = pollInterval;

      // Method 3: Listen for input focus loss (when user clicks a suggestion)
      inputElement.addEventListener('blur', () => {
        setStatus('🎯 Input blur detected, checking autocomplete...');
        setTimeout(() => {
          const place = autocomplete.getPlace();
          setStatus(`🔍 Blur check: place=${!!place}, components=${!!place?.address_components}, name=${place?.name || 'none'}`);
          if (place && place.address_components) {
            setStatus('🎯 Found place on blur!');
            handlePlaceChanged(autocomplete, onPlaceSelect);
          } else if (place) {
            setStatus(`🔍 Place found but incomplete: ${JSON.stringify(Object.keys(place))}`);
          }
        }, 100);
      });

      // Method 4: Listen for Enter key
      inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          setStatus('🎯 Enter key detected, checking autocomplete...');
          setTimeout(() => {
            const place = autocomplete.getPlace();
            setStatus(`🔍 Enter check: place=${!!place}, components=${!!place?.address_components}`);
            if (place && place.address_components) {
              setStatus('🎯 Found place on Enter!');
              handlePlaceChanged(autocomplete, onPlaceSelect);
            } else if (place) {
              setStatus(`🔍 Enter place incomplete: ${place.name || place.formatted_address || 'no name'}`);
            }
          }, 100);
        }
      });

      autocompleteRef.current = autocomplete;
      setStatus('Autocomplete ready - start typing and SELECT from dropdown!');
      
      return autocomplete;
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      return null;
    }
  };

  // Manual geocoding fallback for when autocomplete doesn't work
  const manualGeocode = async (address: string, onPlaceSelect: (place: PlaceResult) => void) => {
    try {
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ address: address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setStatus('✅ Manual geocoding successful!');
          const result = results[0];
          
          if (result.address_components) {
            const placeResult = parseAddressComponents(result.address_components, result.formatted_address || '');
            onPlaceSelect(placeResult);
          }
        } else {
          setStatus('❌ Manual geocoding failed');
        }
      });
    } catch (error) {
      setStatus('❌ Geocoding error');
    }
  };

  const handlePlaceChanged = (autocomplete: google.maps.places.Autocomplete, onPlaceSelect: (place: PlaceResult) => void) => {
    const place = autocomplete.getPlace();
    
    if (!place.address_components) {
      setStatus('❌ No address components found');
      return;
    }

    setStatus(`✅ Processing ${place.address_components.length} components...`);
    const placeResult = parseAddressComponents(place.address_components, place.formatted_address || '');
    setStatus(`✅ Parsed: ${placeResult.city}, ${placeResult.state} ${placeResult.zipCode}`);
    onPlaceSelect(placeResult);
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
    
    // Clear polling intervals
    const inputs = document.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
      if ((input as any)._pollInterval) {
        clearInterval((input as any)._pollInterval);
        (input as any)._pollInterval = null;
      }
    });
  };

  return {
    isLoaded,
    status,
    initializeAutocomplete,
    clearAutocomplete
  };
};