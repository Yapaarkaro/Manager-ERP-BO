// Web-specific Google Maps API service using the JavaScript API to avoid CORS issues
// This uses the google.maps library loaded via script tag in WebMapView

import { parseGooglePlace, createAutocompleteService, createPlacesService, loadGoogleMapsScript } from '@/utils/googleMaps';

export interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

// Get place predictions for autocomplete using Google Maps JavaScript API
export const getPlacePredictions = async (input: string): Promise<GooglePlacePrediction[]> => {
  try {
    console.log('🔍 Web API Call - Searching for:', input);
    
    // Ensure Google Maps API is loaded
    if (typeof window === 'undefined' || !window.google || !window.google.maps || !window.google.maps.places) {
      console.log('⏳ Google Maps API not loaded, attempting to load...');
      const GOOGLE_MAPS_API_KEY = 'AIzaSyBqLe3lHfzB5epezdgwdKDzkdFkECuUN1o';
      try {
        await loadGoogleMapsScript(GOOGLE_MAPS_API_KEY);
      } catch (error) {
        console.error('❌ Failed to load Google Maps API:', error);
        return [];
      }
    }

    // Create AutocompleteService instance using utility
    const service = createAutocompleteService();
    if (!service) {
      console.error('❌ Failed to create AutocompleteService');
      return [];
    }
    
    // Create request
    const request = {
      input,
      componentRestrictions: { country: 'in' },
      location: new google.maps.LatLng(20.5937, 78.9629),
      radius: 2000000,
    };

    // Return a promise that resolves with predictions
    return new Promise((resolve) => {
      service.getPlacePredictions(request, (predictions, status) => {
        console.log('📍 Web API Response status:', status);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          console.log('📍 Raw predictions count:', predictions.length);
          
          // Transform to match our interface
          const formattedPredictions: GooglePlacePrediction[] = predictions.map(prediction => ({
            place_id: prediction.place_id || '',
            description: prediction.description || '',
            structured_formatting: {
              main_text: prediction.structured_formatting?.main_text || '',
              secondary_text: prediction.structured_formatting?.secondary_text || '',
            },
          }));
          
          console.log('✅ Final results count:', formattedPredictions.length);
          resolve(formattedPredictions.slice(0, 10));
        } else {
          console.log('⚠️ No predictions returned, status:', status);
          resolve([]);
        }
      });
    });
  } catch (error) {
    console.error('❌ Error getting place predictions:', error);
    return [];
  }
};

// Get place details using Google Maps JavaScript API
export const getPlaceDetails = async (placeId: string): Promise<any> => {
  try {
    console.log('🔍 Web API - Getting place details for:', placeId);
    
    // Ensure Google Maps API is loaded
    if (typeof window === 'undefined' || !window.google || !window.google.maps || !window.google.maps.places) {
      console.log('⏳ Google Maps API not loaded, attempting to load...');
      const GOOGLE_MAPS_API_KEY = 'AIzaSyBqLe3lHfzB5epezdgwdKDzkdFkECuUN1o';
      try {
        await loadGoogleMapsScript(GOOGLE_MAPS_API_KEY);
      } catch (error) {
        console.error('❌ Failed to load Google Maps API:', error);
        return null;
      }
    }

    // Create PlacesService using utility
    const service = createPlacesService();
    if (!service) {
      console.error('❌ Failed to create PlacesService');
      return null;
    }
    
    const request = {
      placeId,
      fields: ['place_id', 'formatted_address', 'geometry', 'address_components'],
    };

    return new Promise((resolve) => {
      service.getDetails(request, (place, status) => {
        console.log('📍 Web API Place Details status:', status);
        
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          console.log('✅ Place details received');
          // Use parseGooglePlace for better address parsing
          const parsedPlace = parseGooglePlace(place);
          // Merge with original place data for compatibility
          resolve({
            ...place,
            ...parsedPlace,
            // Keep original geometry for compatibility
            geometry: place.geometry,
          });
        } else {
          console.log('⚠️ No place details returned, status:', status);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('❌ Error getting place details:', error);
    return null;
  }
};

