import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { IoLocationSharp, IoNavigate, IoInformation, IoLayersOutline } from 'react-icons/io5';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.error('Mapbox token is missing. Please check your .env file.');
}

mapboxgl.accessToken = MAPBOX_TOKEN;
// Configure Mapbox for better performance and fewer telemetry errors
mapboxgl.setRTLTextPlugin('https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js', null, true);

// Silence errors related to telemetry being blocked
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorText = args.join(' ');
  if (
    errorText.includes('events.mapbox.com') || 
    errorText.includes('ERR_BLOCKED_BY_CLIENT') ||
    errorText.includes('net::ERR_BLOCKED_BY_CLIENT')
  ) {
    // Silently ignore telemetry errors
    return;
  }
  originalConsoleError(...args);
};

const MapContainer = ({ mapRef, restaurantLocation, customerLocation, deliveryPersonMarkerRef, showMarkers, nearbyOrders, onOrderClick }) => {
  
  const mapContainerRef = useRef(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState('streets-v12');
  const [showLegend, setShowLegend] = useState(false);
  const [mapError, setMapError] = useState(null);
  const markersRef = useRef(new Map()); // Store markers by ID

  const createMarker = (iconUrl, coordinates, mapInstance, id, onClick = null, tooltip = '', color = '#000') => {
    // Check if marker already exists
    if (markersRef.current.has(id)) {
      // Update existing marker position
      const existingMarker = markersRef.current.get(id);
      existingMarker.setLngLat(coordinates);
      return existingMarker;
    }
    
    // Create new marker with custom element
    const element = document.createElement('div');
    element.className = 'custom-marker';
    element.style.backgroundImage = `url(${iconUrl})`;
    element.style.backgroundSize = 'cover'; // Changed from 'contain' to 'cover'
    element.style.backgroundPosition = 'center center'; // Ensure image is centered
    element.style.backgroundRepeat = 'no-repeat';
    element.style.width = '32px'; // Standardize size
    element.style.height = '32px'; // Standardize size
    element.style.cursor = onClick ? 'pointer' : 'default';
    
    // Add a solid background to ensure visibility
    element.style.backgroundColor = 'white';
    element.style.borderRadius = '50%';
    element.style.border = `2px solid ${color}`;
    element.style.boxSizing = 'border-box';
    
    // Add shadow for better visibility
    element.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    
    // Hover effect without transforms
    element.addEventListener('mouseenter', () => {
      element.style.boxShadow = '0 3px 7px rgba(0,0,0,0.5)';
      element.style.border = `3px solid ${color}`;
    });
    
    element.addEventListener('mouseleave', () => {
      element.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      element.style.border = `2px solid ${color}`;
    });
    
    // Verify image is loading correctly
    const img = new Image();
    img.onload = () => {
      console.log(`Marker image loaded successfully: ${iconUrl}`);
    };
    img.onerror = () => {
      console.error(`Failed to load marker image: ${iconUrl}`);
      // Fall back to a colored div if image fails
      element.style.backgroundImage = 'none';
      element.style.backgroundColor = color;
      const text = document.createElement('span');
      text.textContent = id.charAt(0).toUpperCase();
      text.style.color = 'white';
      text.style.fontSize = '14px';
      text.style.fontWeight = 'bold';
      text.style.position = 'absolute';
      text.style.top = '50%';
      text.style.left = '50%';
      text.style.transform = 'translate(-50%, -50%)';
      element.appendChild(text);
    };
    img.src = iconUrl;

    // Create popup if tooltip is provided
    let popup = null;
    if (tooltip) {
      popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        closeOnClick: false,
        className: 'custom-popup'
      }).setText(tooltip);
    }

    // Create and add the marker
    const marker = new mapboxgl.Marker({
      element,
      anchor: 'center'
    })
    .setLngLat(coordinates)
    .addTo(mapInstance);
      
    // Add popup if available
    if (popup) {
      marker.setPopup(popup);
      
      // Show popup on hover
      element.addEventListener('mouseenter', () => {
        marker.togglePopup();
      });
      
      element.addEventListener('mouseleave', () => {
        setTimeout(() => {
          if (marker.getPopup().isOpen()) {
            marker.togglePopup();
          }
        }, 300);
      });
    }
    
    // Add click handler if provided
    if (onClick) {
      element.addEventListener('click', onClick);
    }
    
    // Store the marker reference
    markersRef.current.set(id, marker);
    return marker;
  };

  // Predefined marker icons with direct URLs to ensure they load properly
  const markerIcons = {
    delivery: 'https://img.icons8.com/fluency/48/delivery.png',
    restaurant: 'https://img.icons8.com/fluency/48/restaurant.png',
    customer: 'https://img.icons8.com/fluency/48/user-location.png',
    order: 'https://img.icons8.com/fluency/48/shopping-basket-2.png'
  };

  // Initialize map only once
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && !mapInitialized) {
      try {
        setIsLoading(true);

        // Debug Mapbox token
        console.log("Mapbox token available:", !!MAPBOX_TOKEN);
        
        // Validate coordinates before initializing the map
        const defaultCenter = [80.0379, 7.0698];
        const centerCoordinates =
          restaurantLocation?.location?.coordinates &&
          Array.isArray(restaurantLocation.location.coordinates) &&
          restaurantLocation.location.coordinates.length === 2 &&
          !isNaN(restaurantLocation.location.coordinates[0]) &&
          !isNaN(restaurantLocation.location.coordinates[1])
            ? restaurantLocation.location.coordinates
            : Array.isArray(restaurantLocation) && restaurantLocation.length === 2
            ? restaurantLocation
            : defaultCenter;

        console.log("Map center coordinates:", centerCoordinates);

        // Force proper dimensions on container before initializing
        mapContainerRef.current.style.width = '100%';
        mapContainerRef.current.style.height = '100%';
        mapContainerRef.current.style.minHeight = '500px';

        // Create the map with explicit error handling and telemetry options disabled
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: `mapbox://styles/mapbox/${mapStyle}`,
          center: centerCoordinates,
          zoom: 15,
          attributionControl: true,
          preserveDrawingBuffer: true,
          collectResourceTiming: false,     // Disable performance data collection
          trackResize: true,                // Still track resize but don't send telemetry
          failIfMajorPerformanceCaveat: false, // Don't bail on slow devices
          localIdeographFontFamily: "'Noto Sans', 'Noto Sans CJK SC', sans-serif"
        });

        // Add debug listener for map load
        mapRef.current.on('load', () => {
          console.log("Map loaded successfully");
          setMapInitialized(true);
          setIsLoading(false);
          
          // Initialize delivery person marker with reliable icon
          deliveryPersonMarkerRef.current = createMarker(
            markerIcons.delivery, 
            centerCoordinates, 
            mapRef.current, 
            'delivery-person',
            null,
            'Delivery Person',
            '#3498db'
          );
        });

        // Add error handling with more details
        mapRef.current.on('error', (e) => {
          console.error('Map error:', e);
          setMapError(e.error || "An error occurred loading the map");
          setIsLoading(false);
          
          // Show user-friendly error
          const errorDiv = document.createElement('div');
          errorDiv.className = 'map-error-message';
          errorDiv.innerHTML = 'There was a problem loading the map. Please refresh the page.';
          mapContainerRef.current.appendChild(errorDiv);
        });

        return () => {
          // Clean up markers when component unmounts
          markersRef.current.forEach(marker => marker.remove());
          markersRef.current.clear();
        };
      } catch (error) {
        console.error('Error initializing Mapbox map:', error);
        setMapError(error.message || "Failed to initialize map");
        setIsLoading(false);
      }
    }
  }, [mapStyle]); // Run when map style changes

  // Change map style
  const changeMapStyle = (style) => {
    setMapStyle(style);
    if (mapRef.current) {
      mapRef.current.setStyle(`mapbox://styles/mapbox/${style}`);
    }
  };

  // Center map on delivery person
  const centerOnDeliveryPerson = () => {
    if (mapRef.current && deliveryPersonMarkerRef.current) {
      const position = deliveryPersonMarkerRef.current.getLngLat();
      mapRef.current.flyTo({
        center: [position.lng, position.lat],
        zoom: 15,
        speed: 0.8
      });
    }
  };

  // Handle geolocation updates
  useEffect(() => {
    if (mapRef.current && deliveryPersonMarkerRef.current && mapInitialized) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (deliveryPersonMarkerRef.current) {
            deliveryPersonMarkerRef.current.setLngLat([longitude, latitude]);
          }
        },
        (error) => {
          console.error('Error watching position:', error);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [mapInitialized]);

  // Handle restaurant and customer marker updates
  useEffect(() => {
    if (mapRef.current && mapInitialized && showMarkers) {
      if (restaurantLocation && Array.isArray(restaurantLocation) && restaurantLocation.length === 2) {
        createMarker(
          markerIcons.restaurant, 
          restaurantLocation, 
          mapRef.current, 
          'restaurant',
          null,
          'Restaurant Location',
          '#e74c3c'
        );
      }

      if (customerLocation && Array.isArray(customerLocation) && customerLocation.length === 2) {
        createMarker(
          markerIcons.customer, 
          customerLocation, 
          mapRef.current, 
          'customer',
          null,
          'Customer Location',
          '#2ecc71'
        );
      }
    }
  }, [restaurantLocation, customerLocation, showMarkers, mapInitialized]);

  // Handle nearby orders marker updates
  useEffect(() => {
    if (mapRef.current && mapInitialized && nearbyOrders) {
      console.log("MapContainer: Processing nearby orders:", nearbyOrders);
      
      // Log to track whether this effect is triggered with orders
      if (Array.isArray(nearbyOrders) && nearbyOrders.length > 0) {
        console.log(`Adding ${nearbyOrders.length} order markers to map`);
      } else {
        console.log("No nearby orders to add to map", nearbyOrders);
        return; // Don't proceed if no orders
      }
      
      // Remove old order markers that aren't in the new list
      const currentOrderIds = nearbyOrders.map(order => order.orderId || order._id);
      
      markersRef.current.forEach((marker, id) => {
        if (id.startsWith('order-') && !currentOrderIds.includes(id.replace('order-', ''))) {
          marker.remove();
          markersRef.current.delete(id);
        }
      });
      
      // Add or update order markers
      nearbyOrders.forEach((order) => {
        // Ensure we have an ID
        const orderId = order.orderId || order._id;
        if (!orderId) {
          console.warn("Order without ID:", order);
          return;
        }
        
        // Ensure we have restaurant location
        if (!order.restaurantLocation || 
            !Array.isArray(order.restaurantLocation) || 
            order.restaurantLocation.length !== 2 ||
            isNaN(order.restaurantLocation[0]) || 
            isNaN(order.restaurantLocation[1])) {
          console.warn("Invalid restaurant location for order:", orderId, order.restaurantLocation);
          return;
        }
        
        console.log(`Adding marker for order ${orderId} at location ${order.restaurantLocation}`);
        
        createMarker(
          markerIcons.order, 
          order.restaurantLocation, 
          mapRef.current, 
          `order-${orderId}`, 
          () => onOrderClick(order),
          `Order #${order.orderRefNo || orderId}`,
          '#f39c12'
        );
      });
    }
  }, [nearbyOrders, mapInitialized, onOrderClick]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Debug information for map issues */}
      {mapError && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '20px',
          borderRadius: '5px',
          zIndex: 1000,
          maxWidth: '80%',
          textAlign: 'center'
        }}>
          <h3>Map Error</h3>
          <p>{mapError}</p>
          <p>Please check your network connection and refresh the page.</p>
          <code>Token format valid: {MAPBOX_TOKEN && typeof MAPBOX_TOKEN === 'string' ? 'Yes' : 'No'}</code>
        </div>
      )}

      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          color: 'white',
          flexDirection: 'column'
        }}>
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-3">Loading map...</p>
        </div>
      )}

      {/* Map Controls Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '10px',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {/* Legend toggle button */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="btn btn-circle btn-sm shadow-lg bg-base-100 text-base-content hover:bg-primary hover:text-primary-content"
          title="Show map legend"
        >
          <IoInformation size={18} />
        </button>

        {/* Center on delivery person button */}
        <button
          onClick={centerOnDeliveryPerson}
          className="btn btn-circle btn-sm shadow-lg bg-base-100 text-base-content hover:bg-primary hover:text-primary-content"
          title="Center on your location"
        >
          <IoLocationSharp size={18} />
        </button>

        {/* Map style toggle */}
        <div className="dropdown dropdown-top">
          <div tabIndex={0} role="button" className="btn btn-circle btn-sm shadow-lg bg-base-100 text-base-content hover:bg-primary hover:text-primary-content">
            <IoLayersOutline size={18} />
          </div>
          <ul tabIndex={0} className="dropdown-content z-[1] p-2 shadow-lg bg-base-100 rounded-box w-52">
            <li><button
              onClick={() => changeMapStyle('streets-v12')}
              className={`btn btn-sm w-full justify-start ${mapStyle === 'streets-v12' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Streets
            </button></li>
            <li><button
              onClick={() => changeMapStyle('satellite-streets-v12')}
              className={`btn btn-sm w-full justify-start ${mapStyle === 'satellite-streets-v12' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Satellite
            </button></li>
            <li><button
              onClick={() => changeMapStyle('light-v11')}
              className={`btn btn-sm w-full justify-start ${mapStyle === 'light-v11' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Light
            </button></li>
            <li><button
              onClick={() => changeMapStyle('dark-v11')}
              className={`btn btn-sm w-full justify-start ${mapStyle === 'dark-v11' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Dark
            </button></li>
          </ul>
        </div>
      </div>

      {/* Map Legend */}
      {showLegend && (
        <div style={{
          position: 'absolute',
          left: '10px',
          bottom: '110px',
          backgroundColor: 'white',
          boxShadow: '0 0 10px rgba(0,0,0,0.2)',
          borderRadius: '5px',
          padding: '10px',
          zIndex: 5,
          maxWidth: '200px'
        }}>
          <h3 className="text-sm font-bold mb-2">Map Legend</h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <div style={{
                backgroundImage: `url(${markerIcons.delivery})`,
                backgroundSize: 'contain',
                width: '20px',
                height: '20px',
                marginRight: '5px'
              }}></div>
              <span className="text-xs">Delivery Person</span>
            </div>
            <div className="flex items-center">
              <div style={{
                backgroundImage: `url(${markerIcons.restaurant})`,
                backgroundSize: 'contain',
                width: '20px',
                height: '20px',
                marginRight: '5px'
              }}></div>
              <span className="text-xs">Restaurant</span>
            </div>
            <div className="flex items-center">
              <div style={{
                backgroundImage: `url(${markerIcons.customer})`,
                backgroundSize: 'contain',
                width: '20px',
                height: '20px',
                marginRight: '5px'
              }}></div>
              <span className="text-xs">Customer</span>
            </div>
            <div className="flex items-center">
              <div style={{
                backgroundImage: `url(${markerIcons.order})`,
                backgroundSize: 'contain',
                width: '20px',
                height: '20px',
                marginRight: '5px'
              }}></div>
              <span className="text-xs">Order</span>
            </div>
          </div>
        </div>
      )}

      {/* Explicitly set dimensions and add debugging border */}
      <div 
        ref={mapContainerRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          minHeight: '500px', 
          backgroundColor: '#f0f0f0',
          border: mapError ? '2px solid red' : 'none'
        }} 
      />

      {/* Nearby Orders Indicator */}
      {nearbyOrders && nearbyOrders.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '5px 15px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          zIndex: 5,
          fontSize: '13px',
          fontWeight: 'bold'
        }}>
          {nearbyOrders.length} Nearby Order{nearbyOrders.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default MapContainer;
