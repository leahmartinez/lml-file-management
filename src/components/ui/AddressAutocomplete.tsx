/**
 * Address Autocomplete Component
 * Uses Google Places Autocomplete API for address suggestions
 */

import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, placeDetails?: AddressComponents) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
  countryRestrict?: string; // e.g., 'au' for Australia
}

export interface AddressComponents {
  streetNumber?: string;
  route?: string; // Street name
  locality?: string; // City
  administrativeArea?: string; // State
  postalCode?: string;
  country?: string;
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Start typing an address...',
  required = false,
  id = 'address-autocomplete',
  className = '',
  disabled = false,
  countryRestrict = 'au',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    // Load Google Maps API
    const loadGoogleMaps = () => {
      // Check if already loaded
      if ((window as any).google && (window as any).google.maps) {
        setIsLoaded(true);
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Wait for it to load
        const checkInterval = setInterval(() => {
          if ((window as any).google && (window as any).google.maps) {
            setIsLoaded(true);
            clearInterval(checkInterval);
          }
        }, 100);
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        setIsUnavailable(true);
        return;
      }

      // Load the script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsLoaded(true);
      };
      script.onerror = () => {
        setIsUnavailable(true);
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    // Initialize autocomplete
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: countryRestrict ? { country: countryRestrict } : undefined,
      fields: ['address_components', 'formatted_address', 'geometry'],
      types: ['address'],
    });

    autocompleteRef.current = autocomplete;

    // Handle place selection
    const handlePlaceSelect = () => {
      const place = autocomplete.getPlace();

      if (!place.address_components) {
        return;
      }

      // Parse address components
      const components: AddressComponents = {
        formattedAddress: place.formatted_address || '',
        latitude: place.geometry?.location?.lat(),
        longitude: place.geometry?.location?.lng(),
      };

      place.address_components.forEach((component) => {
        const types = component.types;

        if (types.includes('street_number')) {
          components.streetNumber = component.long_name;
        }
        if (types.includes('route')) {
          components.route = component.long_name;
        }
        if (types.includes('locality')) {
          components.locality = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          components.administrativeArea = component.short_name;
        }
        if (types.includes('postal_code')) {
          components.postalCode = component.long_name;
        }
        if (types.includes('country')) {
          components.country = component.long_name;
        }
      });

      onChange(place.formatted_address || '', components);
    };

    autocomplete.addListener('place_changed', handlePlaceSelect);

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange, countryRestrict]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isLoaded ? placeholder : isUnavailable ? 'Enter address...' : 'Loading Google Maps...'}
        required={required}
        className={className}
        disabled={disabled || (!isLoaded && !isUnavailable)}
        autoComplete="off"
      />
      {!isLoaded && !isUnavailable && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      )}
      {isUnavailable && (
        <p className="mt-1 text-xs text-muted-foreground">
          Address autocomplete is unavailable. Enter the address manually.
        </p>
      )}
    </div>
  );
};

AddressAutocomplete.displayName = 'AddressAutocomplete';
