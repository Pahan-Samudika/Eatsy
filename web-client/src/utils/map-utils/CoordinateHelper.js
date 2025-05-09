/**
 * Helper utility for extracting and validating coordinates from various data formats
 */

/**
 * Extracts valid coordinates from different possible object structures
 * @param {Object|Array} locationData - Location data which may contain coordinates
 * @returns {Array|null} - [lng, lat] array or null if no valid coordinates
 */
export const extractCoordinates = (locationData) => {
  if (!locationData) return null;
  
  // Case 1: Direct array of coordinates [lng, lat]
  if (Array.isArray(locationData) && locationData.length === 2 && 
      !isNaN(locationData[0]) && !isNaN(locationData[1])) {
    return locationData;
  }
  
  // Case 2: Object with coordinates array { coordinates: [lng, lat] }
  if (locationData.coordinates && 
      Array.isArray(locationData.coordinates) && 
      locationData.coordinates.length === 2 &&
      !isNaN(locationData.coordinates[0]) && 
      !isNaN(locationData.coordinates[1])) {
    return locationData.coordinates;
  }
  
  // Case 3: Nested GeoJSON structure { location: { coordinates: [lng, lat] } }
  if (locationData.location && locationData.location.coordinates && 
      Array.isArray(locationData.location.coordinates) && 
      locationData.location.coordinates.length === 2 &&
      !isNaN(locationData.location.coordinates[0]) && 
      !isNaN(locationData.location.coordinates[1])) {
    return locationData.location.coordinates;
  }
  
  // Case 4: Separate lat/lng properties { lat: number, lng: number }
  if ('lat' in locationData && 'lng' in locationData && 
      !isNaN(locationData.lng) && !isNaN(locationData.lat)) {
    return [locationData.lng, locationData.lat];
  }
  
  // Case 5: Separate lat/lng properties with different naming { latitude: number, longitude: number }
  if ('latitude' in locationData && 'longitude' in locationData && 
      !isNaN(locationData.longitude) && !isNaN(locationData.latitude)) {
    return [locationData.longitude, locationData.latitude];
  }
  
  return null;
};

/**
 * Calculates the distance between two coordinate points in kilometers
 * @param {Array} coords1 - First coordinates [lng, lat]
 * @param {Array} coords2 - Second coordinates [lng, lat]
 * @returns {number} - Distance in kilometers
 */
export const calculateDistance = (coords1, coords2) => {
  const [lng1, lat1] = coords1;
  const [lng2, lat2] = coords2;
  
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lng2 - lng1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
};

/**
 * Converts degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} - Radians
 */
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

/**
 * Creates a slightly offset coordinate from a base coordinate
 * Useful for creating demonstration routes
 * @param {Array} baseCoords - Base coordinates [lng, lat]
 * @param {number} offsetKm - Offset in kilometers
 * @param {string} direction - Direction of offset ('north', 'east', 'south', 'west')
 * @returns {Array} - New coordinates [lng, lat]
 */
export const offsetCoordinates = (baseCoords, offsetKm = 1, direction = 'north') => {
  const [lng, lat] = baseCoords;
  
  // Rough approximation: 1 degree of latitude = 111 km
  const latOffset = offsetKm / 111;
  
  // Longitude degrees per km varies with latitude
  const lngOffset = offsetKm / (111 * Math.cos(deg2rad(lat)));
  
  switch (direction.toLowerCase()) {
    case 'north':
      return [lng, lat + latOffset];
    case 'east':
      return [lng + lngOffset, lat];
    case 'south':
      return [lng, lat - latOffset];
    case 'west':
      return [lng - lngOffset, lat];
    case 'northeast':
      return [lng + lngOffset * 0.7, lat + latOffset * 0.7];
    case 'southeast':
      return [lng + lngOffset * 0.7, lat - latOffset * 0.7];
    case 'southwest':
      return [lng - lngOffset * 0.7, lat - latOffset * 0.7];
    case 'northwest':
      return [lng - lngOffset * 0.7, lat + latOffset * 0.7];
    default:
      return baseCoords;
  }
};

export default {
  extractCoordinates,
  calculateDistance,
  offsetCoordinates
};
