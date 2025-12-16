/**
 * Google Maps API utilities with modern API patterns and address parsing
 */

// Helper function to extract address components
const getComponent = (components: google.maps.places.PlaceResult['address_components'], type: string): string => {
  if (!components) return '';
  return components.find(c => c.types.includes(type))?.long_name || '';
};

/**
 * Parse Google Place result into structured address format
 * Uses intelligent priority-based extraction for address components
 */
export const parseGooglePlace = (place: google.maps.places.PlaceResult) => {
  const components = place.address_components || [];
  
  // 1. Extract Raw Components
  const streetNumber = getComponent(components, 'street_number');
  const route = getComponent(components, 'route');
  
  // Area / Line 3 Priority
  const sublocalityL1 = getComponent(components, 'sublocality_level_1');
  const sublocality = getComponent(components, 'sublocality');
  const neighborhood = getComponent(components, 'neighborhood');
  const area = sublocalityL1 || sublocality || neighborhood; // Wins the "Area" battle
  
  // City Priority
  const locality = getComponent(components, 'locality');
  const postalTown = getComponent(components, 'postal_town');
  const adminL2 = getComponent(components, 'administrative_area_level_2');
  const city = locality || postalTown || adminL2; // Wins the "City" battle
  
  const state = getComponent(components, 'administrative_area_level_1');
  const pincode = getComponent(components, 'postal_code');
  
  // 2. Intelligent Line 1 Construction
  let addressLine1 = '';
  // If the place name (e.g., "Belaku") is not just the street name or city name, use it.
  if (place.name && place.name !== route && place.name !== city) {
    addressLine1 = place.name; 
  } else {
    // Fallback if user selected a generic street location
    addressLine1 = streetNumber;
  }
  
  return {
    addressLine1: addressLine1,    // e.g. "Belaku, No.18"
    addressLine2: route,           // e.g. "Mudhaliyar Layout Rd"
    addressLine3: area,            // e.g. "Kasavanahalli"
    city: city,                    // e.g. "Bengaluru"
    state: state,                  // e.g. "Karnataka"
    pincode: pincode,              // e.g. "560035"
    coordinates: {
      lat: place.geometry?.location?.lat() || 0,
      lng: place.geometry?.location?.lng() || 0,
    },
  };
};

/**
 * Load Google Maps API script with async loading and loading=async parameter
 * This prevents the deprecation warning about loading the API directly
 */
export const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      resolve();
      return;
    }

    // Remove any existing scripts to avoid conflicts
    const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    existingScripts.forEach(script => script.remove());

    // Create script with async loading and loading=async parameter
    // This is the recommended way to load Google Maps API to avoid deprecation warnings
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=3.54&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Wait for API to be fully available
      const checkApi = () => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          resolve();
        } else {
          setTimeout(checkApi, 100);
        }
      };
      setTimeout(checkApi, 200);
    };

    script.onerror = (error) => {
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);
  });
};

/**
 * Initialize AutocompleteService (still used in current API)
 * Note: AutocompleteService is still the standard way to get predictions
 */
export const createAutocompleteService = (): google.maps.places.AutocompleteService | null => {
  if (typeof window === 'undefined' || !window.google?.maps?.places) {
    return null;
  }
  return new google.maps.places.AutocompleteService();
};

/**
 * Initialize PlacesService (still used in current API)
 * Note: PlacesService is still the standard way to get place details
 */
export const createPlacesService = (): google.maps.places.PlacesService | null => {
  if (typeof window === 'undefined' || !window.google?.maps?.places) {
    return null;
  }
  // Create a dummy div for PlacesService (required by Google Maps API)
  const dummyDiv = document.createElement('div');
  return new google.maps.places.PlacesService(dummyDiv);
};

/**
 * Create Marker (using standard Marker API)
 * Note: AdvancedMarkerElement requires a Map ID which we don't have configured
 * Using standard Marker avoids the "map is initialised without a valid Map ID" error
 */
export const createMarker = (
  map: google.maps.Map,
  position: google.maps.LatLng | google.maps.LatLngLiteral,
  options?: {
    title?: string;
    draggable?: boolean;
  }
): google.maps.Marker | null => {
  if (typeof window === 'undefined' || !window.google?.maps?.Marker) {
    return null;
  }

  return new google.maps.Marker({
    position,
    map,
    title: options?.title,
    draggable: options?.draggable,
    animation: google.maps.Animation.DROP,
  });
};


