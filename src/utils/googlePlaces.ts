const GOOGLE_AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const GOOGLE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

type GooglePrediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type GoogleAutocompleteResponse = {
  status: string;
  predictions?: GooglePrediction[];
};

type GoogleAddressComponent = {
  long_name: string;
  short_name?: string;
  types?: string[];
};

type GoogleDetailsResponse = {
  status: string;
  result?: {
    name?: string;
    formatted_address?: string;
    geometry?: { location?: { lat: number; lng: number } };
    address_components?: GoogleAddressComponent[];
  };
};

const getApiKey = () => {
  const key = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error('Missing Google Places API key. Set VITE_GOOGLE_PLACES_API_KEY in your environment.');
  }
  return key;
};

export type PlaceSuggestion = {
  id: string;
  placeId: string;
  primaryText: string;
  secondaryText?: string;
  description: string;
};

export type PlaceDetails = {
  latitude: number;
  longitude: number;
  name: string;
  formattedAddress?: string;
  country?: string;
  admin1?: string;
};

export const fetchPlaceSuggestions = async (query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const key = getApiKey();
  const params = new URLSearchParams({
    input: trimmed,
    key,
    language: 'en',
    types: '(cities)',
  });

  const response = await fetch(`${GOOGLE_AUTOCOMPLETE_URL}?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error('Google Places autocomplete request failed');
  }

  const data: GoogleAutocompleteResponse = await response.json();
  if (data.status !== 'OK' || !Array.isArray(data.predictions)) {
    return [];
  }

  return data.predictions.map((prediction) => {
    const { place_id: placeId, description, structured_formatting: formatting } = prediction;
    return {
      id: placeId,
      placeId,
      description,
      primaryText: formatting?.main_text ?? description,
      secondaryText: formatting?.secondary_text ?? undefined,
    } satisfies PlaceSuggestion;
  });
};

export const fetchPlaceDetails = async (placeId: string, signal?: AbortSignal): Promise<PlaceDetails> => {
  const key = getApiKey();
  const params = new URLSearchParams({
    place_id: placeId,
    key,
    language: 'en',
    fields: 'geometry/location,name,formatted_address,address_components',
  });

  const response = await fetch(`${GOOGLE_DETAILS_URL}?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error('Google Places details request failed');
  }

  const data: GoogleDetailsResponse = await response.json();
  if (data.status !== 'OK' || !data.result?.geometry?.location) {
    throw new Error('Google Places details response missing geometry');
  }

  const { lat, lng } = data.result.geometry.location;
  const components = data.result.address_components ?? [];
  const country = components.find((component) => component.types?.includes('country'));
  const admin1 = components.find((component) => component.types?.includes('administrative_area_level_1'));

  return {
    latitude: lat,
    longitude: lng,
    name: data.result.name ?? data.result.formatted_address ?? 'Location',
    formattedAddress: data.result.formatted_address,
    country: country?.long_name,
    admin1: admin1?.long_name,
  } satisfies PlaceDetails;
};
