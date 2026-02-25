/**
 * Builds map embed URLs from BUSINESS_INFO.location.
 * Uses OpenStreetMap for the iframe (reliable, no API key); Google Maps link for directions.
 */

export interface MapLocation {
  lat: number;
  lng: number;
}

const MAP_ZOOM_DELTA = 0.008;

/**
 * Returns an OpenStreetMap embed URL for the given coordinates.
 * Works in iframes without API keys and is not blocked by typical CSP.
 */
export function getMapEmbedUrl(location: MapLocation): string {
  const { lat, lng } = location;
  const minLon = lng - MAP_ZOOM_DELTA;
  const minLat = lat - MAP_ZOOM_DELTA;
  const maxLon = lng + MAP_ZOOM_DELTA;
  const maxLat = lat + MAP_ZOOM_DELTA;
  const bbox = [minLon, minLat, maxLon, maxLat].map((n) => n.toFixed(5)).join("%2C");
  const marker = `${lat.toFixed(5)}%2C${lng.toFixed(5)}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
}
