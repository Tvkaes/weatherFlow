const isDev = typeof import.meta !== 'undefined' && Boolean((import.meta as { env?: Record<string, string> }).env?.DEV);

export const GEOCODING_API = isDev
  ? '/geocoding-api/v1/search'
  : 'https://geocoding-api.open-meteo.com/v1/search';
export const REVERSE_GEOCODING_API = isDev
  ? '/geocoding-api/v1/reverse'
  : 'https://geocoding-api.open-meteo.com/v1/reverse';

const normalizeText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

const similarityBoost = (query: string, candidate: string) => {
  if (!query || !candidate) return 0;
  const distance = levenshteinDistance(query, candidate);
  const maxLen = Math.max(query.length, candidate.length);
  if (!maxLen) return 0;
  const similarity = 1 - distance / maxLen;
  return Math.max(0, similarity) * 2; // scale 0-2
};

type GeocodingResultEntry = {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  population?: number;
};

export type GeocodingResult = {
  results?: GeocodingResultEntry[];
};

export type GeocodingSuggestion = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  population?: number;
  countryCode?: string;
  city: string;
};

export const fetchGeocodingSuggestions = async (
  query: string,
  options?: { limit?: number; signal?: AbortSignal }
): Promise<GeocodingSuggestion[]> => {
  const desiredLimit = Math.max(options?.limit ?? 5, 1);
  const fetchCount = Math.max(desiredLimit * 2, 12);
  const params = new URLSearchParams({
    name: query,
    count: String(fetchCount),
    language: 'es',
    format: 'json',
  });

  const response = await fetch(`${GEOCODING_API}?${params.toString()}`, {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch location suggestions');
  }

  const data: GeocodingResult = await response.json();
  if (!data.results) return [];

  const normalizedQuery = normalizeText(query);

  const scored = data.results.map((result, index) => {
    const normalizedName = normalizeText(result.name);
    const populationScore = Math.min((result.population ?? 0) / 1_000_000, 5);
    const exactMatchBoost = normalizedName === normalizedQuery ? 3 : 0;
    const prefixBoost = normalizedName.startsWith(normalizedQuery) ? 1 : 0;
    const containsBoost = normalizedName.includes(normalizedQuery) ? 0.5 : 0;
    const fuzzyBoost = similarityBoost(normalizedQuery, normalizedName);
    const englishMajorBoost = ['US', 'GB', 'CA', 'AU'].includes(result.country_code?.toUpperCase() ?? '') ? 0.3 : 0;
    const score = populationScore + exactMatchBoost + prefixBoost + containsBoost + englishMajorBoost + fuzzyBoost;
    return { result, index, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const popDiff = (b.result.population ?? 0) - (a.result.population ?? 0);
    if (popDiff !== 0) return popDiff;
    return a.index - b.index;
  });

  return scored.slice(0, desiredLimit).map(({ result }, sortedIndex) => {
    const labelParts = [result.name, result.admin1, result.country].filter(Boolean);
    return {
      id: String(result.id ?? `${result.name}-${result.latitude}-${result.longitude}-${sortedIndex}`),
      label: labelParts.join(', '),
      latitude: result.latitude,
      longitude: result.longitude,
      country: result.country,
      admin1: result.admin1,
      population: result.population,
      countryCode: result.country_code?.toUpperCase(),
      city: result.name,
    } satisfies GeocodingSuggestion;
  });
};

const reverseGeocodeOpenMeteo = async (
  latitude: number,
  longitude: number,
  options?: { language?: string; signal?: AbortSignal }
): Promise<string | null> => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    language: options?.language ?? 'es',
    format: 'json',
  });

  try {
    const response = await fetch(`${REVERSE_GEOCODING_API}?${params.toString()}`, {
      signal: options?.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data: GeocodingResult = await response.json();
    const entry = data.results?.[0];
    if (!entry) return null;

    const labelParts = [entry.name, entry.admin1, entry.country].filter((part) => Boolean(part && part.trim()));
    return labelParts.join(', ') || entry.name || null;
  } catch {
    return null;
  }
};

const reverseGeocodeBigDataCloud = async (
  latitude: number,
  longitude: number,
  options?: { language?: string; signal?: AbortSignal }
): Promise<string | null> => {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set('localityLanguage', options?.language ?? 'es');

  try {
    const response = await fetch(url.toString(), { signal: options?.signal });
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const city = data.city || data.locality || data.principalSubdivision || data.localityInfo?.informative?.[0]?.name;
    const state = data.principalSubdivision ?? data.localityInfo?.administrative?.[0]?.name;
    const country = data.countryName;
    const labelParts = [city, state, country].filter((part) => Boolean(part && part.trim()));

    if (labelParts.length) {
      return labelParts.join(', ');
    }

    return null;
  } catch {
    return null;
  }
};

const reverseGeocodeNominatim = async (
  latitude: number,
  longitude: number,
  options?: { language?: string; signal?: AbortSignal }
): Promise<string | null> => {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', latitude.toString());
  url.searchParams.set('lon', longitude.toString());
  url.searchParams.set('format', 'json');
  url.searchParams.set('zoom', '10');
  url.searchParams.set('accept-language', options?.language ?? 'es');

  try {
    const response = await fetch(url.toString(), {
      signal: options?.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const address = data.address ?? {};
    const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county;
    const state = address.state ?? address.region;
    const country = address.country;
    const labelParts = [city, state, country].filter((part) => Boolean(part && part.trim()));

    if (labelParts.length) {
      return labelParts.join(', ');
    }

    if (typeof data.display_name === 'string') {
      const fallbackParts = data.display_name.split(',').map((part: string) => part.trim()).filter(Boolean).slice(0, 3);
      if (fallbackParts.length) {
        return fallbackParts.join(', ');
      }
    }

    return null;
  } catch {
    return null;
  }
};

export const reverseGeocodeLabel = async (
  latitude: number,
  longitude: number,
  options?: { language?: string; signal?: AbortSignal }
): Promise<string | null> => {
  const attempts = [reverseGeocodeOpenMeteo, reverseGeocodeBigDataCloud, reverseGeocodeNominatim];

  for (const attempt of attempts) {
    const label = await attempt(latitude, longitude, options);
    if (label) return label;
  }

  return null;
};
