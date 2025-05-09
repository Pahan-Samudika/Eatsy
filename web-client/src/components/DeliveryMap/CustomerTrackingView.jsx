import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { deliveryAPI } from "../../services/delivery-service";
import { orderAPI } from "../../services/order-service";
import {
  IoLocationSharp,
  IoTimeOutline,
  IoCheckmarkCircleOutline,
  IoStorefrontOutline,
  IoCallOutline,
  IoWarningOutline,
  IoReload,
} from "react-icons/io5";
import { TbTruckDelivery } from "react-icons/tb";

// Import mapboxgl directly
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Get token from environment
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Set token directly
if (MAPBOX_TOKEN) {
  console.log("Setting Mapbox token:", MAPBOX_TOKEN.substring(0, 5) + "...");
  mapboxgl.accessToken = MAPBOX_TOKEN;
} else {
  console.warn("Mapbox token is missing. Please check your .env file.");
}

// Create a fallback component when map fails to load
const MapLoadError = ({ error, onRetry }) => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-base-200 p-4">
    <div className="bg-error/10 p-6 rounded-lg text-center max-w-md">
      <IoWarningOutline className="mx-auto text-4xl text-error mb-3" />
      <h3 className="font-bold text-lg mb-2">Map Failed to Load</h3>
      <p className="mb-4">{error}</p>
      <p className="text-sm mb-4 text-base-content/70">
        This could be due to network issues, an ad blocker, or missing
        dependencies.
      </p>
      <button onClick={onRetry} className="btn btn-error btn-sm">
        <IoReload className="mr-1" /> Retry
      </button>
    </div>
  </div>
);

const CustomerTrackingView = ({
  orderId,
  restaurantLocation,
  customerLocation,
  deliveryPersonId = null,
  showAllLocations = true,
  refreshInterval = 10000,
  useRealTimeLocation = true,
  onClose = () => {},
  onError = () => {},
}) => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef(new Map());
  const locationUpdateIntervalRef = useRef(null);
  const routeLayerIdRef = useRef("route-to-customer");
  const isComponentMountedRef = useRef(true);

  const [order, setOrder] = useState(null);
  const [deliveryPerson, setDeliveryPerson] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [mapError, setMapError] = useState(null);
  const [mapInitAttempted, setMapInitAttempted] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(null);

  // Validate coordinates for markers
  const validateCoordinates = useCallback((coords, name) => {
    if (!Array.isArray(coords) || coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
      console.warn(`Invalid ${name} coordinates:`, coords);
      return false;
    }
    return true;
  }, []);

  // Add a marker with retry
  const addMarker = useCallback((id, coordinates, title, color) => {
    if (!mapRef.current) {
      console.warn("Map not initialized for marker:", id);
      return null;
    }
    
    try {
      if (!validateCoordinates(coordinates, id)) {
        console.warn(`Skipping marker ${id} due to invalid coordinates:`, coordinates);
        return null;
      }
      
      // Remove existing marker
      if (markersRef.current.has(id)) {
        markersRef.current.get(id).remove();
      }
      
      // Create marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.backgroundColor = color;
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      
      if (id === 'deliveryPerson') {
        el.style.animation = 'pulse 1.5s infinite';
        // Add animation style if not already added
        if (!document.getElementById('marker-animations')) {
          const style = document.createElement('style');
          style.id = 'marker-animations';
          style.textContent = `
            @keyframes pulse {
              0% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.4); }
              70% { box-shadow: 0 0 0 10px rgba(52, 152, 219, 0); }
              100% { box-shadow: 0 0 0 0 rgba(52, 152, 219, 0); }
            }
          `;
          document.head.appendChild(style);
        }
      }
      
      // Create popup
      const popup = new mapboxgl.Popup({ 
        offset: 25,
        closeButton: false,
        className: 'custom-popup'
      }).setText(title);
      
      // Create and add marker to map
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(mapRef.current);
      
      // Store marker reference
      markersRef.current.set(id, marker);
      console.log(`Added marker: ${id} at ${coordinates}`);
      
      return marker;
    } catch (error) {
      console.error(`Error adding marker ${id}:`, error);
      return null;
    }
  }, [validateCoordinates]);

  // Draw route between two points
  const drawRoute = useCallback(async (start, end) => {
    if (!mapRef.current || !validateCoordinates(start, 'route-start') || !validateCoordinates(end, 'route-end')) {
      console.warn('Unable to draw route - invalid coordinates or map not ready');
      return;
    }
    
    try {
      const routeId = routeLayerIdRef.current;
      
      // Remove existing route if any
      if (mapRef.current.getLayer(routeId)) {
        mapRef.current.removeLayer(routeId);
      }
      if (mapRef.current.getSource(routeId)) {
        mapRef.current.removeSource(routeId);
      }
      
      console.log(`Drawing route from [${start}] to [${end}]`);
      
      // Fetch directions from Mapbox API
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&steps=true&access_token=${mapboxgl.accessToken}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        console.warn('No routes found');
        return;
      }
      
      const route = data.routes[0].geometry;
      const duration = Math.ceil(data.routes[0].duration / 60); // minutes
      
      // Set estimated time
      setEstimatedTime(duration);
      
      // Add route to map
      mapRef.current.addSource(routeId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route
        }
      });
      
      mapRef.current.addLayer({
        id: routeId,
        type: 'line',
        source: routeId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3887be',
          'line-width': 5,
          'line-opacity': 0.75,
          'line-dasharray': [1, 1]
        }
      });
      
      console.log('Route drawn successfully');
    } catch (error) {
      console.error('Error drawing route:', error);
    }
  }, [validateCoordinates]);

  // Fit map to show all points
  const fitMapToAllPoints = useCallback(() => {
    if (!mapRef.current) return;
    
    const points = [];
    if (restaurantLocation && validateCoordinates(restaurantLocation, 'restaurant')) {
      points.push(restaurantLocation);
    }
    if (customerLocation && validateCoordinates(customerLocation, 'customer')) {
      points.push(customerLocation);
    }
    if (deliveryLocation && validateCoordinates(deliveryLocation, 'delivery')) {
      points.push(deliveryLocation);
    }
    
    if (points.length < 2) {
      console.warn('Not enough valid points to fit bounds');
      return;
    }
    
    try {
      // Create a bounds object that includes all points
      const bounds = points.reduce((bounds, point) => {
        return bounds.extend(point);
      }, new mapboxgl.LngLatBounds(points[0], points[0]));
      
      // Fit the map to those bounds
      mapRef.current.fitBounds(bounds, {
        padding: 80, // Add some padding around points
        maxZoom: 15
      });
    } catch (error) {
      console.error('Error fitting map to points:', error);
    }
  }, [restaurantLocation, customerLocation, deliveryLocation, validateCoordinates]);

  // Retry loading the map
  const handleRetry = useCallback(() => {
    console.log("Retrying map initialization");
    setMapLoadError(null);
    setMapError(null);
    setMapInitAttempted(false);
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && !mapInitAttempted) {
      setMapInitAttempted(true);
      
      try {
        // Check for token
        if (!MAPBOX_TOKEN) {
          throw new Error("Mapbox access token is missing. Please check your .env file.");
        }
        
        // Set explicit dimensions on container
        if (mapContainerRef.current) {
          mapContainerRef.current.style.width = '100%';
          mapContainerRef.current.style.height = '100%';
          mapContainerRef.current.style.minHeight = '500px';
        }
        
        console.log("Initializing map with container:", mapContainerRef.current);
        
        // Initialize map
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: restaurantLocation || [79.9171, 6.903],
          zoom: 14,
          attributionControl: true,
          failIfMajorPerformanceCaveat: false, // Don't fail on slow devices
          preserveDrawingBuffer: true,
          trackResize: true
        });
        
        // Add load handler
        mapRef.current.on('load', () => {
          console.log("Mapbox map loaded successfully");
          setMapInitialized(true);
          
          // Add markers after map has loaded
          if (restaurantLocation) {
            addMarker('restaurant', restaurantLocation, 'Restaurant', '#e74c3c');
          }
          
          if (customerLocation) {
            addMarker('customer', customerLocation, 'Your Location', '#2ecc71');
          }
          
          // Fit map to show all points
          if (showAllLocations) {
            fitMapToAllPoints();
          }
        });
        
        // Add error handler
        mapRef.current.on('error', (e) => {
          console.error("Mapbox error:", e);
          setMapError(`Map error: ${e.error?.message || "Unknown error"}`);
          onError(e.error?.message || "Unknown map error");
        });
        
      } catch (error) {
        console.error("Failed to initialize map:", error);
        setMapLoadError(error.message || "Failed to initialize map");
        setIsLoading(false);
      }
    }
    
    // Use a timeout to detect map loading failures
    const mapLoadTimeoutId = setTimeout(() => {
      if (!mapInitialized && !mapLoadError && !mapError) {
        setMapLoadError("Map initialization timed out. Please check your internet connection.");
        setIsLoading(false);
      }
    }, 15000); // 15 seconds timeout
    
    // Cleanup function
    return () => {
      clearTimeout(mapLoadTimeoutId);
      isComponentMountedRef.current = false;
      
      if (locationUpdateIntervalRef.current) {
        clearInterval(locationUpdateIntervalRef.current);
      }
      
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error("Error removing map:", e);
        }
        mapRef.current = null;
      }
    };
  }, [restaurantLocation, customerLocation, addMarker, fitMapToAllPoints, onError, showAllLocations, mapInitialized, mapLoadError, mapError]);

  // Fetch order data
  useEffect(() => {
    const fetchOrderData = async () => {
      if (!orderId) return;
      
      try {
        setIsLoading(true);
        
        const orderResponse = await axios.get(orderAPI.getOrderByID(orderId));
        if (!isComponentMountedRef.current) return;
        
        if (orderResponse.status === 200) {
          const orderData = orderResponse.data;
          console.log("Order data:", orderData);
          setOrder(orderData);
          
          // Set status step based on order status
          switch(orderData.status) {
            case 'delivered': setCurrentStep(3); break;
            case 'pickup': case 'picked_up': case 'assigned': setCurrentStep(2); break;
            case 'preparing': case 'ready': case 'paid': setCurrentStep(1); break;
            default: setCurrentStep(0);
          }
          
          // Try to get delivery person data if available
          if (orderData.deliveryPersonId || deliveryPersonId) {
            const dpId = orderData.deliveryPersonId || deliveryPersonId;
            try {
              const dpResponse = await axios.get(deliveryAPI.getDeliveryPersonById(dpId));
              if (!isComponentMountedRef.current) return;
              
              if (dpResponse.status === 200) {
                setDeliveryPerson(dpResponse.data);
                
                // Check for current location
                if (dpResponse.data.currentLocation?.coordinates) {
                  setDeliveryLocation(dpResponse.data.currentLocation.coordinates);
                } else {
                  // Fallback to random location near restaurant
                  const randomOffset = () => (Math.random() - 0.5) * 0.01;
                  const mockLocation = restaurantLocation ? 
                    [restaurantLocation[0] + randomOffset(), restaurantLocation[1] + randomOffset()] : 
                    null;
                  
                  if (mockLocation) {
                    setDeliveryLocation(mockLocation);
                  }
                }
              }
            } catch (e) {
              console.warn("Failed to load delivery person data:", e);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching order data:", error);
      } finally {
        if (isComponentMountedRef.current) {
          setIsLoading(false);
        }
      }
    };
    
    fetchOrderData();
  }, [orderId, deliveryPersonId, restaurantLocation]);

  // Update delivery person marker when location changes
  useEffect(() => {
    if (mapInitialized && deliveryLocation) {
      addMarker('deliveryPerson', deliveryLocation, 'Delivery Person', '#3498db');
      
      // If both locations are set, draw route
      if (customerLocation) {
        drawRoute(deliveryLocation, customerLocation);
      }
      
      // Fit map to all points
      if (showAllLocations) {
        fitMapToAllPoints();
      }
    }
  }, [mapInitialized, deliveryLocation, customerLocation, addMarker, drawRoute, fitMapToAllPoints, showAllLocations]);

  // Return error state if map fails to load
  if (mapLoadError || mapError) {
    return (
      <MapLoadError 
        error={mapLoadError || mapError} 
        onRetry={handleRetry} 
      />
    );
  }

  // Get status description based on order status
  const getStatusDescription = () => {
    if (!order) return 'Tracking your order';
    
    switch (order.status) {
      case 'pending': return 'Your order has been placed and is pending acceptance';
      case 'accepted': return 'Your order has been accepted by the restaurant';
      case 'rejected': return 'Your order has been rejected by the restaurant';
      case 'paid': return 'Your payment has been received';
      case 'preparing': return 'The restaurant is preparing your order';
      case 'ready': return 'Your order is ready for pickup';
      case 'assigned': return 'A delivery person has been assigned to your order';
      case 'pickup': case 'picked_up': return 'Your order has been picked up and is on the way';
      case 'delivered': return 'Your order has been delivered';
      default: return 'Tracking your order';
    }
  };

  // Render component
  return (
    <div className="relative h-[500px] w-full">
      {/* Map container */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 z-0 map-container"
        style={{ height: "500px", width: "100%" }}
      />
      
      {/* Status overlay */}
      <div className="absolute top-4 left-0 right-0 z-10 mx-auto w-11/12 max-w-3xl">
        <div className="bg-base-100 rounded-lg shadow-xl p-4">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-bold">Order Tracking</h2>
            {order && (
              <div className="flex items-center">
                <div className="text-sm mr-2">
                  <span className="opacity-70">Order: </span>
                  <span className="font-medium">{order.refNo || order.id}</span>
                </div>
                {order.status === 'rejected' && (
                  <div className="badge badge-error">Rejected</div>
                )}
              </div>
            )}
          </div>
          
          {/* Progress tracker */}
          <div className="relative mb-6">
            <div className="flex justify-between mb-2">
              {[
                { label: 'Order Placed', icon: <IoCheckmarkCircleOutline size={18} /> },
                { label: 'Preparing', icon: <IoStorefrontOutline size={18} /> },
                { label: 'On the Way', icon: <TbTruckDelivery size={18} /> },
                { label: 'Delivered', icon: <IoLocationSharp size={18} /> }
              ].map((step, index) => (
                <div key={index} className="text-center flex-1">
                  <div 
                    className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center
                             ${index <= currentStep ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content'}
                             ${order?.status === 'rejected' && index > 0 ? 'bg-base-300 opacity-50' : ''}`}
                  >
                    {step.icon}
                  </div>
                  <p className={`text-xs mt-1 ${index <= currentStep ? 'text-primary font-medium' : 'opacity-70'}
                               ${order?.status === 'rejected' && index > 0 ? 'opacity-50' : ''}`}>
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="h-1 absolute left-0 top-4 w-full -z-10 bg-base-300">
              <div 
                className={`h-full transition-all duration-500 ${order?.status === 'rejected' ? 'bg-error' : 'bg-primary'}`}
                style={{ 
                  width: order?.status === 'rejected' 
                    ? '25%' // Only first step for rejected orders
                    : `${Math.max(0, (currentStep / 3) * 100)}%` 
                }}
              ></div>
            </div>
          </div>
          
          {/* Status message and ETA */}
          <div className="flex justify-between items-center">
            <div>
              <p className={`font-semibold ${order?.status === 'rejected' ? 'text-error' : ''}`}>
                {getStatusDescription()}
              </p>
              {estimatedTime && currentStep >= 2 && currentStep < 3 && (
                <div className="flex items-center text-sm text-base-content/70 mt-1">
                  <IoTimeOutline className="mr-1" />
                  <span>ETA: {estimatedTime} minutes</span>
                </div>
              )}
              {order?.status === 'rejected' && (
                <p className="text-sm text-error-content/70 mt-1">
                  Please contact the restaurant for more information.
                </p>
              )}
            </div>
            
            {/* Delivery person info */}
            {deliveryPerson && ['assigned', 'pickup', 'picked_up'].includes(order?.status) && (
              <div className="flex items-center">
                <div className="bg-base-200 py-1 px-3 rounded-lg flex items-center">
                  <div className="w-8 h-8 bg-base-300 rounded-full overflow-hidden mr-2">
                    {deliveryPerson.profileImage ? (
                      <img src={deliveryPerson.profileImage} alt={deliveryPerson.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary text-primary-content">
                        {deliveryPerson.name?.charAt(0) || 'D'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{deliveryPerson.name || 'Delivery Partner'}</p>
                    <p className="text-xs opacity-70">Delivery Partner</p>
                  </div>
                  {deliveryPerson.phone && (
                    <a 
                      href={`tel:${deliveryPerson.phone}`}
                      className="btn btn-circle btn-xs btn-primary ml-3"
                    >
                      <IoCallOutline size={14} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-base-300 bg-opacity-50 z-20 flex items-center justify-center">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      )}
    </div>
  );
};

CustomerTrackingView.displayName = "CustomerTrackingView";

export default CustomerTrackingView;
