// Google Maps API service for address autocomplete, geocoding, and places search
const GOOGLE_MAPS_API_KEY = 'AIzaSyBqLe3lHfzB5epezdgwdKDzkdFkECuUN1o';

export interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface GoogleGeocodeResult {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface GoogleReverseGeocodeResult {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

// Get place predictions for autocomplete with enhanced search
export const getPlacePredictions = async (input: string): Promise<GooglePlacePrediction[]> => {
  try {
    console.log('🔍 API Call - Searching for:', input);
    
    // Use autocomplete without strict type restrictions for better results
    // Adding location bias for India to get better context-aware results
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}&components=country:in&location=20.5937,78.9629&radius=2000000`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📍 API Response status:', data.status);
    
    if (data.status === 'OK' && data.predictions) {
      console.log('📍 Raw predictions count:', data.predictions.length);
      
      // Filter and rank results to prioritize addresses over businesses
      const rankedResults = data.predictions
        .map((prediction: any) => {
          // Calculate relevance score
          let score = 100; // Increased base score from 50 to 100 to be less aggressive
          const types = prediction.types || [];
          const desc = prediction.description.toLowerCase();
          
          // Prioritize address-related types
          if (types.includes('street_address')) score += 100;
          if (types.includes('premise')) score += 90;
          if (types.includes('subpremise')) score += 85;
          if (types.includes('route')) score += 80;
          if (types.includes('neighborhood')) score += 70;
          if (types.includes('locality')) score += 60;
          if (types.includes('sublocality')) score += 55;
          
          // Give establishments a decent boost (they're valid addresses)
          if (types.includes('establishment')) score += 30; // Increased from 10 to 30
          
          // Boost if description contains residential or commercial address keywords
          if (desc.includes('apartment') || desc.includes('apartments')) score += 50;
          if (desc.includes('building')) score += 40;
          if (desc.includes('house') || desc.includes('residency')) score += 40;
          if (desc.includes('flat') || desc.includes('plot')) score += 40;
          if (desc.includes('tower') || desc.includes('complex')) score += 35;
          if (desc.includes('villa') || desc.includes('bungalow')) score += 35;
          if (desc.includes('office') || desc.includes('coworking')) score += 30;
          
          // ONLY penalize clearly wrong results (ATMs, bank branches without addresses)
          if (types.includes('atm')) score -= 200; // Increased penalty
          if (desc.includes('atm')) score -= 200; // Increased penalty
          
          // Penalize banks ONLY if they don't seem to be address-related
          if (types.includes('bank') && !types.includes('premise') && !desc.includes('apartment') && !desc.includes('building')) {
            score -= 150; // Increased penalty
          }
          if (desc.includes('bank') && !desc.includes('apartment') && !desc.includes('building') && !desc.includes('complex')) {
            // Check if it's likely a bank branch (not an address)
            if (desc.includes('branch') || desc.match(/\bbank\b/i)) {
              score -= 150; // Increased penalty
            }
          }
          
          // Penalize finance only if not establishment
          if (types.includes('finance') && !types.includes('establishment') && !types.includes('premise')) {
            score -= 100;
          }
          
          console.log(`📍 ${prediction.description.substring(0, 50)}... | Score: ${score} | Types: ${types.join(', ')}`);
          
          return {
            ...prediction,
            relevanceScore: score
          };
        })
        // Sort by relevance score (highest first)
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
        // Only filter out very negative scores (ATMs, standalone banks)
        // Changed threshold from 0 to -50 to be even less aggressive
        .filter((result: any) => {
          const keep = result.relevanceScore > -50;
          if (!keep) {
            console.log(`❌ Filtered out: ${result.description} (score: ${result.relevanceScore})`);
          }
          return keep;
        })
        // Take top 10
        .slice(0, 10);
      
      console.log('✅ Final results count:', rankedResults.length);
      return rankedResults;
    }
    
    console.log('⚠️ No predictions returned');
    return [];
  } catch (error) {
    console.error('Error getting place predictions:', error);
    return [];
  }
};

// Get place details from place_id
export const getPlaceDetails = async (placeId: string): Promise<GoogleGeocodeResult | null> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}&fields=place_id,formatted_address,geometry,address_components`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.result) {
      return data.result;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
};

// Geocode an address to get coordinates
export const geocodeAddress = async (address: string): Promise<GoogleGeocodeResult[]> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&region=in`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results) {
      return data.results;
    }
    
    return [];
  } catch (error) {
    console.error('Error geocoding address:', error);
    return [];
  }
};

// Reverse geocode coordinates to get address
export const reverseGeocode = async (lat: number, lng: number): Promise<GoogleReverseGeocodeResult[]> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&region=in`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results) {
      return data.results;
    }
    
    return [];
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return [];
  }
};

// Extract address components from Google result
export const extractAddressComponents = (result: GoogleGeocodeResult | GoogleReverseGeocodeResult) => {
  const components = result.address_components;
  const extracted: any = {
    formatted_address: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
  };

  components.forEach(component => {
    const types = component.types;
    
    // Address Line 1: street_number + route
    if (types.includes('street_number')) {
      extracted.street_number = component.long_name;
    }
    if (types.includes('route')) {
      extracted.route = component.long_name;
    }
    
    // Address Line 2/Additional: floor, suite, subpremise, establishment
    if (types.includes('floor')) {
      extracted.floor = component.long_name;
    }
    if (types.includes('suite')) {
      extracted.suite = component.long_name;
    }
    if (types.includes('subpremise')) {
      extracted.subpremise = component.long_name;
    }
    if (types.includes('establishment')) {
      extracted.establishment = component.long_name;
    }
    
    // City: locality OR postal_town OR sublocality_level_1 (priority order)
    if (types.includes('locality')) {
      if (!extracted.city) extracted.city = component.long_name;
      extracted.locality = component.long_name;
    }
    if (types.includes('postal_town')) {
      if (!extracted.city) extracted.city = component.long_name;
      extracted.postal_town = component.long_name;
    }
    if (types.includes('sublocality_level_1')) {
      if (!extracted.city) extracted.city = component.long_name;
      extracted.sublocality_level_1 = component.long_name;
    }
    
    // Capture other sublocality levels for area/additional info
    if (types.includes('sublocality')) {
      extracted.sublocality = component.long_name;
    }
    if (types.includes('sublocality_level_2')) {
      extracted.sublocality_level_2 = component.long_name;
    }
    if (types.includes('sublocality_level_3')) {
      extracted.sublocality_level_3 = component.long_name;
    }
    
    // Neighborhood (for Address Line 2)
    if (types.includes('neighborhood')) {
      extracted.neighborhood = component.long_name;
    }
    
    // Administrative levels
    if (types.includes('administrative_area_level_2')) {
      extracted.district = component.long_name;
      extracted.administrative_area_level_2 = component.long_name;
    }
    
    // State: administrative_area_level_1
    if (types.includes('administrative_area_level_1')) {
      extracted.state = component.long_name;
      extracted.state_code = component.short_name;
      extracted.administrative_area_level_1 = component.long_name;
    }
    
    // Pincode: postal_code
    if (types.includes('postal_code')) {
      extracted.pincode = component.long_name;
      extracted.postal_code = component.long_name;
    }
    
    // Country
    if (types.includes('country')) {
      extracted.country = component.long_name;
      extracted.country_code = component.short_name;
    }
    
    // Premise (for building/complex names)
    if (types.includes('premise')) {
      extracted.premise = component.long_name;
    }
  });

  // Create a more comprehensive street address
  if (extracted.street_number && extracted.route) {
    extracted.street = `${extracted.street_number} ${extracted.route}`;
  } else if (extracted.route) {
    extracted.street = extracted.route;
  } else if (extracted.premise) {
    extracted.street = extracted.premise;
  } else {
    // Try to extract street from formatted address, but filter out codes
    const addressParts = extracted.formatted_address.split(',');
    if (addressParts.length > 0) {
      const firstPart = addressParts[0].trim();
      // Check if it's a code (like VJ99+78R) or a proper address
      const isCode = /^[A-Z0-9]+\+[A-Z0-9]+$/.test(firstPart);
      if (!isCode) {
        extracted.street = firstPart;
      } else {
        // If it's a code, try to get a better street from other parts
        for (let i = 1; i < Math.min(addressParts.length, 3); i++) {
          const part = addressParts[i].trim();
          if (part && !/^[A-Z0-9]+\+[A-Z0-9]+$/.test(part)) {
            extracted.street = part;
            break;
          }
        }
        // If still no good street, use the code as fallback
        if (!extracted.street) {
          extracted.street = firstPart;
        }
      }
    }
  }

  // Create area for Address Line 2 from available components
  // Priority: sublocality levels > neighborhood > establishment > premise > district > formatted address fallback
  // Build area from multiple components if available
  const areaParts: string[] = [];
  
  // Priority 1: Use sublocality levels (most specific neighborhood/area names)
  if (extracted.sublocality_level_2) {
    areaParts.push(extracted.sublocality_level_2);
  }
  if (extracted.sublocality_level_3 && !areaParts.includes(extracted.sublocality_level_3)) {
    areaParts.push(extracted.sublocality_level_3);
  }
  if (extracted.sublocality && !areaParts.includes(extracted.sublocality)) {
    areaParts.push(extracted.sublocality);
  }
  
  // Priority 2: Use neighborhood if available and not already included
  if (extracted.neighborhood && !areaParts.includes(extracted.neighborhood)) {
    areaParts.push(extracted.neighborhood);
  }
  
  // Priority 3: Use establishment or premise (building name) if no sublocality found
  if (areaParts.length === 0) {
    if (extracted.establishment) {
      areaParts.push(extracted.establishment);
    } else if (extracted.premise && extracted.premise !== extracted.street) {
      // Only use premise if it's different from street (to avoid duplication)
      areaParts.push(extracted.premise);
    }
  }
  
  // Priority 4: Use district as fallback if still no area
  if (areaParts.length === 0 && extracted.district) {
    areaParts.push(extracted.district);
  }
  
  // Priority 5: Extract from formatted address if still no area
  if (areaParts.length === 0 && extracted.formatted_address) {
    const addressParts = extracted.formatted_address.split(',').map(p => p.trim());
    // Skip first part (usually street), last part (usually country), and parts that are city/state/pincode
    for (let i = 1; i < addressParts.length - 1; i++) {
      const part = addressParts[i];
      // Skip if it's the city, state, pincode, or country
      if (part !== extracted.city && 
          part !== extracted.state && 
          part !== extracted.pincode && 
          part !== extracted.country &&
          !/^\d{6}$/.test(part) && // Not a pincode
          part.length > 0) {
        areaParts.push(part);
        break; // Take the first valid part
      }
    }
  }
  
  // Set the area field
  extracted.area = areaParts.join(', ');
  
  console.log('🔍 extractAddressComponents - Final area:', extracted.area);
  console.log('🔍 extractAddressComponents - areaParts:', areaParts);

  console.log('🔍 Extracted address components:', extracted);
  return extracted;
};

// Search for places nearby
export const searchNearbyPlaces = async (lat: number, lng: number, radius: number = 1000, type?: string): Promise<any[]> => {
  try {
    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${GOOGLE_MAPS_API_KEY}`;
    
    if (type) {
      url += `&type=${type}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results) {
      return data.results;
    }
    
    return [];
  } catch (error) {
    console.error('Error searching nearby places:', error);
    return [];
  }
};
