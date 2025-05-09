import mapboxgl from 'mapbox-gl';

/**
 * Draws a route on a Mapbox map between multiple waypoints
 * @param {Object} mapRef - Reference to the Mapbox map instance
 * @param {Array} waypoints - Array of coordinate pairs [lng, lat] for each waypoint
 * @param {Object} options - Options for route drawing (color, width, etc.)
 * @returns {Promise<Object>} - Route information including duration
 */
export const drawRoute = async (mapRef, waypoints, options = {}) => {
  if (!mapRef || !waypoints || waypoints.length < 2) {
    throw new Error('Invalid map reference or waypoints');
  }

  // Set default options
  const {
    color = '#3887be',
    width = 5,
    opacity = 0.75,
    fitBounds = true,
    padding = 50,
    profile = 'driving', // 'driving', 'walking', 'cycling'
  } = options;

  // Format waypoints for the API
  const coordinatesString = waypoints
    .map(waypoint => `${waypoint[0]},${waypoint[1]}`)
    .join(';');

  // Call Mapbox Directions API
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinatesString}?alternatives=false&geometries=geojson&overview=full&steps=false&access_token=${mapboxgl.accessToken}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Direction API returned ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.routes || data.routes.length === 0) {
    throw new Error("No routes found between these locations.");
  }

  const route = data.routes[0].geometry;
  const duration = Math.ceil(data.routes[0].duration / 60); // Convert to minutes
  const distance = Math.round(data.routes[0].distance / 100) / 10; // Convert to km and round to 1 decimal

  // Clean up existing route if it exists
  if (mapRef.getLayer('route')) {
    mapRef.removeLayer('route');
  }
  if (mapRef.getSource('route')) {
    mapRef.removeSource('route');
  }

  // Add the route source and layer
  mapRef.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: route
    }
  });

  mapRef.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': color,
      'line-width': width,
      'line-opacity': opacity
    }
  });

  // Fit map to the route bounds if requested
  if (fitBounds) {
    const coords = route.coordinates;
    const bounds = coords.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new mapboxgl.LngLatBounds(coords[0], coords[0]));

    mapRef.fitBounds(bounds, {
      padding,
      maxZoom: 15,
      duration: 1000
    });
  }

  return {
    duration, // minutes
    distance, // kilometers
    route: route,
    bounds: route.coordinates
  };
};

/**
 * Clears any existing route from the map
 * @param {Object} mapRef - Reference to the Mapbox map instance
 */
export const clearRoute = (mapRef) => {
  if (!mapRef) return;
  
  // Remove existing route layer and source if they exist
  if (mapRef.getLayer('route')) {
    mapRef.removeLayer('route');
  }
  if (mapRef.getSource('route')) {
    mapRef.removeSource('route');
  }
};

export default { drawRoute, clearRoute };
