import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import MapContainer from '../DeliveryMap/MapContainer';
import { orderAPI } from '../../services/order-service';
import { userAPI } from '../../services/user-service';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.error('Mapbox token is missing. Please check your .env file.');
}

mapboxgl.accessToken = MAPBOX_TOKEN;

// Default coordinates (lng, lat) in Colombo
const RESTAURANT_LOCATION = [79.8612, 6.9271]; // Colombo Fort
const DELIVERY_PERSON_LOCATION = [79.8700, 6.9150]; // Near Galle Face
const CUSTOMER_LOCATION = [79.8800, 6.9000]; // Bambalapitiya

const ClientMapView = ({ orderData }) => {
  const mapRef = useRef(null);
  const deliveryPersonMarkerRef = useRef(null);
  const didFetchRef = useRef(false);

  const [orderDetails, setOrderDetails] = useState(orderData);
  const [showMarkers, setShowMarkers] = useState(false);

  // Add fallback locations if not present
  const getLocations = (details) => {
    const restaurantLocation =
      details?.restaurantLocation && Array.isArray(details.restaurantLocation)
        ? details.restaurantLocation
        : RESTAURANT_LOCATION;
    const customerLocation =
      details?.customerLocation && Array.isArray(details.customerLocation)
        ? details.customerLocation
        : CUSTOMER_LOCATION;
    const deliveryPersonLocation = DELIVERY_PERSON_LOCATION;
    return { restaurantLocation, customerLocation, deliveryPersonLocation };
  };

  const fetchOrderDetails = async () => {
    if (!orderData) {
      setOrderDetails({
        _id: "order",
        restaurantLocation: RESTAURANT_LOCATION,
        customerLocation: CUSTOMER_LOCATION,
      });
      setShowMarkers(true);
      drawMarkersAndRoute({
        restaurantLocation: RESTAURANT_LOCATION,
        customerLocation: CUSTOMER_LOCATION,
        deliveryPersonLocation: DELIVERY_PERSON_LOCATION,
      });
      return;
    }

    if (!orderData.restaurantLocation || !orderData.customerLocation) {
      try {
        const response = await axios.get(orderAPI.getOrderByID(orderData._id));
        const order = response.data;
        const restaurantResponse = await axios.get(userAPI.getRestaurantByID(order.restaurantID));
        const restaurant = restaurantResponse.data;

        const updatedOrderDetails = {
          ...order,
          restaurantLocation: restaurant.location?.coordinates || RESTAURANT_LOCATION,
          customerLocation: order.deliveryLocation?.location?.coordinates || CUSTOMER_LOCATION,
          deliveryPersonLocation: DELIVERY_PERSON_LOCATION,
        };

        setOrderDetails(updatedOrderDetails);
        setShowMarkers(true);
        drawMarkersAndRoute(updatedOrderDetails);
      } catch (error) {
        console.error('Error fetching order details:', error);
      }
    } else {
      setOrderDetails({
        ...orderData,
        deliveryPersonLocation: DELIVERY_PERSON_LOCATION,
      });
      setShowMarkers(true);
      drawMarkersAndRoute({
        ...orderData,
        deliveryPersonLocation: DELIVERY_PERSON_LOCATION,
      });
    }
  };

  // Draw path among delivery person, restaurant, and customer
  const drawMarkersAndRoute = async (details) => {
    if (!details) return;
    const { restaurantLocation, customerLocation, deliveryPersonLocation } = getLocations(details);

    if (mapRef.current) {
      // Remove existing route if present
      if (mapRef.current.getLayer && mapRef.current.getLayer('route')) {
        mapRef.current.removeLayer('route');
      }
      if (mapRef.current.getSource && mapRef.current.getSource('route')) {
        mapRef.current.removeSource('route');
      }

      // Add markers
      new mapboxgl.Marker({ color: 'green' })
        .setLngLat(deliveryPersonLocation)
        .setPopup(new mapboxgl.Popup().setText('Delivery Person'))
        .addTo(mapRef.current);

    }

    // Draw route: delivery person -> restaurant -> customer
    const coordinates = [
      deliveryPersonLocation,
      restaurantLocation,
      customerLocation,
    ];
    const coordsStr = coordinates.map((c) => `${c[0]},${c[1]}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsStr}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        console.error('No routes found:', data);
        return;
      }

      const route = data.routes[0].geometry;

      // Wait for map to be fully loaded before adding source/layer
      if (mapRef.current) {
        // If map is not loaded, wait for 'load' event
        if (!mapRef.current.isStyleLoaded()) {
          mapRef.current.once('load', () => {
            addRouteLayer(mapRef.current, route, restaurantLocation);
          });
        } else {
          addRouteLayer(mapRef.current, route, restaurantLocation);
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  // Helper to add the route layer
  const addRouteLayer = (map, route, center) => {
    if (map.getLayer('route')) {
      map.removeLayer('route');
    }
    if (map.getSource('route')) {
      map.removeSource('route');
    }
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: route,
      },
    });
    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3887be',
        'line-width': 5,
      },
    });
    map.flyTo({ center, zoom: 13 });
  };

  useEffect(() => {
    fetchOrderDetails();
    // eslint-disable-next-line
  }, [orderData]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '800px' }}>
      <MapContainer
        mapRef={mapRef}
        restaurantLocation={orderDetails?.restaurantLocation}
        customerLocation={orderDetails?.customerLocation}
        deliveryPersonMarkerRef={deliveryPersonMarkerRef}
        showMarkers={showMarkers}
        nearbyOrders={[]}
        onOrderClick={() => {}}
      />
    </div>
  );
};

export default ClientMapView;
