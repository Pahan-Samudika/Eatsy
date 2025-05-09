/**
 * Utility functions for validating and normalizing location data for maps
 */

/**
 * Validates and extracts coordinates from various location data structures
 * @param {Object|Array} locationData - Location data in various possible formats
 * @returns {Array|null} - Normalized [longitude, latitude] array or null if invalid
 */
export const normalizeCoordinates = (locationData) => {
  // Handle null/undefined
  if (!locationData) return null;
  
  // Handle direct array format [lng, lat]
  if (Array.isArray(locationData) && 
      locationData.length === 2 && 
      !isNaN(locationData[0]) && 
      !isNaN(locationData[1])) {
    return locationData;
  }
  
  // Handle {coordinates: [lng, lat]} format
  if (locationData.coordinates && 
      Array.isArray(locationData.coordinates) && 
      locationData.coordinates.length === 2 &&
      !isNaN(locationData.coordinates[0]) &&
      !isNaN(locationData.coordinates[1])) {
    return locationData.coordinates;
  }
  
  // Handle {location: {coordinates: [lng, lat]}} format
  if (locationData.location && 
      locationData.location.coordinates && 
      Array.isArray(locationData.location.coordinates) && 
      locationData.location.coordinates.length === 2 &&
      !isNaN(locationData.location.coordinates[0]) &&
      !isNaN(locationData.location.coordinates[1])) {
    return locationData.location.coordinates;
  }
  
  // Handle {lat, lng} format
  if (locationData.lat !== undefined && 
      locationData.lng !== undefined &&
      !isNaN(locationData.lng) &&
      !isNaN(locationData.lat)) {
    return [locationData.lng, locationData.lat];
  }
  
  // Handle {latitude, longitude} format
  if (locationData.latitude !== undefined && 
      locationData.longitude !== undefined &&
      !isNaN(locationData.longitude) &&
      !isNaN(locationData.latitude)) {
    return [locationData.longitude, locationData.latitude];
  }
  
  // No valid format found
  return null;
};

/**
 * Validates if coordinates are within valid GPS range
 * @param {Array} coordinates - [longitude, latitude] array
 * @returns {boolean} - Whether coordinates are valid
 */
export const isValidGpsCoordinates = (coordinates) => {
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }
  
  const [lng, lat] = coordinates;
  
  // Check if values are numbers and within valid GPS ranges
  return !isNaN(lng) && !isNaN(lat) && 
         lng >= -180 && lng <= 180 && 
         lat >= -90 && lat <= 90;
};

/**
 * Gets a human-readable description of why location data is invalid
 * @param {Object|Array} locationData - Location data to validate
 * @returns {string|null} - Error description or null if valid
 */
export const getLocationValidationError = (locationData) => {
  if (!locationData) return "Location data is null or undefined";
  
  const coordinates = normalizeCoordinates(locationData);
  
  if (!coordinates) {
    return "Location data is in an unrecognized format";
  }
  
  if (!isValidGpsCoordinates(coordinates)) {
    return "Coordinates are outside valid GPS range";
  }
  
  return null; // Valid location
};

export default {
  normalizeCoordinates,
  isValidGpsCoordinates,
  getLocationValidationError
};
