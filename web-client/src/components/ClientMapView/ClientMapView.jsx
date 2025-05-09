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

const ClientMapView = ({ orderData }) => {
  const mapRef = useRef(null);
  const deliveryPersonMarkerRef = useRef(null);
  const didFetchRef = useRef(false);

  const [orderDetails, setOrderDetails] = useState(orderData);
  const [showMarkers, setShowMarkers] = useState(false);

  // Fetch order details only once
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderData || didFetchRef.current) return;
      
      didFetchRef.current = true;
      
      if (!orderData.restaurantLocation || !orderData.customerLocation) {
        try {
          const response = await axios.get(orderAPI.getOrderByID(orderData._id));
          const order = response.data;

          const restaurantResponse = await axios.get(userAPI.getRestaurantByID(order.restaurantID));
          const restaurant = restaurantResponse.data;

          const updatedOrderDetails = {
            orderId: order._id,
            customerName: order.customerID,
            restaurantName: restaurant.name,
            restaurantLocation: restaurant.location.coordinates,
            customerLocation: order.deliveryLocation.location.coordinates,
            items: order.items,
            status: order.status,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          };

          setOrderDetails(updatedOrderDetails);
          setShowMarkers(true);
        } catch (error) {
          console.error('Error fetching order details:', error);
        }
      } else {
        setOrderDetails(orderData);
        setShowMarkers(true);
      }
    };

    fetchOrderDetails();
  }, [orderData]);

  // Draw route once when orderDetails is available and markers are shown
  useEffect(() => {
    const drawRoute = async () => {
      if (!orderDetails || !showMarkers || !mapRef.current) return;
      
      try {
        const restaurantCoordinates = orderDetails.restaurantLocation;
        const customerCoordinates = orderDetails.customerLocation;
        
        // Validate coordinates
        if (!Array.isArray(restaurantCoordinates) || restaurantCoordinates.length !== 2 || 
            !Array.isArray(customerCoordinates) || customerCoordinates.length !== 2) {
          console.error('Invalid coordinates');
          return;
        }
        
        // Fetch and draw the route
        const coordinates = `${restaurantCoordinates[0]},${restaurantCoordinates[1]};${customerCoordinates[0]},${customerCoordinates[1]}`;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!data.routes || data.routes.length === 0) {
          console.error('No routes found:', data);
          return;
        }

        const route = data.routes[0].geometry;

        if (mapRef.current.getSource('route')) {
          mapRef.current.getSource('route').setData({
            type: 'Feature',
            geometry: route,
          });
        } else {
          // Only add the source and layer once
          mapRef.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: route,
            },
          });

          mapRef.current.addLayer({
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
        }

        // Fly to the route once
        mapRef.current.flyTo({ 
          center: restaurantCoordinates, 
          zoom: 12,
          speed: 0.8  // Slower animation to prevent dizziness
        });
      } catch (error) {
        console.error('Error drawing route:', error);
      }
    };

    // Add event listener to ensure the map is loaded before drawing the route
    if (mapRef.current) {
      if (mapRef.current.loaded()) {
        drawRoute();
      } else {
        mapRef.current.once('load', drawRoute);
      }
    }
  }, [orderDetails, showMarkers]);

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
