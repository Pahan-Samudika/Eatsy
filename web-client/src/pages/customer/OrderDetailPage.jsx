import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { IoLocationOutline, IoStorefrontOutline, IoTimeOutline } from 'react-icons/io5';
import { TbTruckDelivery } from 'react-icons/tb';
import axios from 'axios';
import { orderAPI } from '../../services/order-service';
import { useToast } from '../../utils/alert-utils/ToastUtil';
import FallbackMap from '../../components/DeliveryMap/FallbackMap';

// Lazy load the map component to prevent it from blocking page load
const CustomerTrackingView = lazy(() => import('../../components/DeliveryMap/CustomerTrackingView'));

// Create a fallback for when map fails to load
const MapErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="bg-error/10 p-4 rounded-lg text-center">
    <h3 className="font-bold text-error mb-2">Map Failed to Load</h3>
    <p className="mb-2">{error?.message || "There was a problem loading the map component."}</p>
    <button 
      className="btn btn-sm btn-error" 
      onClick={resetErrorBoundary}
    >
      Try Again
    </button>
  </div>
);

// Simple loading component for Suspense
const MapLoading = () => (
  <div className="flex flex-col items-center justify-center bg-base-200 p-8 rounded-lg h-[400px]">
    <div className="loading loading-spinner loading-lg"></div>
    <p className="mt-4">Loading map...</p>
  </div>
);

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const toast = useToast();
  
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [order, setOrder] = useState(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mapKey, setMapKey] = useState(0); // Add key for forcing remount
  const [mapError, setMapError] = useState(null);
  const [mapFailed, setMapFailed] = useState(false);
  
  const initialFetchDoneRef = useRef(false);
  const intervalIdRef = useRef(null);
  const mapboxTokenExists = useRef(!!import.meta.env.VITE_MAPBOX_TOKEN);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;
    
    setIsLoadingOrder((prev) => initialFetchDoneRef.current ? false : true);
    setError(null);
    
    try {
      const response = await axios.get(orderAPI.getOrderByID(orderId));
      
      if (response.status === 200) {
        const orderData = response.data;
        console.log('Fetched Order Data:', orderData);
        
        // Set restaurantLocation
        orderData.restaurantLocation = [79.9171, 6.9030]; // Provided [lng, lat]
        
        // Normalize deliveryLocation to [lng, lat]
        if (!orderData.deliveryLocation || !orderData.deliveryLocation.location?.coordinates || !Array.isArray(orderData.deliveryLocation.location.coordinates) || orderData.deliveryLocation.location.coordinates.length !== 2) {
          console.warn('Invalid deliveryLocation, using default');
          orderData.deliveryLocation = { coordinates: [79.9828, 6.9291] }; // Default from provided data
        } else {
          orderData.deliveryLocation.coordinates = [
            Number(orderData.deliveryLocation.location.coordinates[1]) || 79.9828, // lng
            Number(orderData.deliveryLocation.location.coordinates[0]) || 6.9291   // lat
          ];
        }
        
        setOrder(orderData);
        initialFetchDoneRef.current = true;
      } else {
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }
    } catch (err) {
      setError(`Failed to load order details: ${err.message}`);
      if (!initialFetchDoneRef.current) {
        toast.error(`Error loading order: ${err.message}`);
      }
      console.error('Order Fetch Error:', err);
    } finally {
      setIsLoadingOrder(false);
    }
  }, [orderId, toast]);

  useEffect(() => {
    let isMounted = true;
    
    const getUserLocation = () => {
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        return;
      }
      
      setIsLoadingLocation(true);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (isMounted) {
            const location = [position.coords.longitude, position.coords.latitude];
            setUserLocation(location);
            setIsLoadingLocation(false);
            console.log('User Location:', location);
          }
        },
        (error) => {
          if (isMounted) {
            setIsLoadingLocation(false);
            console.error('Geolocation Error:', error);
          }
        },
        { enableHighAccuracy: true }
      );
    };
    
    getUserLocation();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!initialFetchDoneRef.current) {
      fetchOrderDetails();
    }
    
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
    }
    
    if (order && ['assigned', 'picked_up'].includes(order.status)) {
      intervalIdRef.current = setInterval(() => {
        fetchOrderDetails();
      }, 60000);
    }
    
    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [fetchOrderDetails, order?.status]);

  const handleManualRefresh = useCallback(() => {
    fetchOrderDetails();
    // Reset map on manual refresh
    setRefreshKey(prev => prev + 1);
    setMapKey(prev => prev + 1);
    setMapError(null);
    setMapFailed(false);
  }, [fetchOrderDetails]);

  const handleMapError = useCallback((error) => {
    console.error("Map error:", error);
    setMapError(error.message || "Map failed to load correctly");
    setMapFailed(true);
    toast.error("Map view encountered an error. Try refreshing the page.");
  }, [toast]);

  const resetMapError = useCallback(() => {
    setMapError(null);
    setMapKey(prev => prev + 1);
    setMapFailed(false);
  }, []);

  const actualCustomerLocation = userLocation || 
    (order?.deliveryLocation?.coordinates || [79.9828, 6.9291]);

  console.log('Rendering CustomerTrackingView with:', {
    orderId: order?.orderId || order?._id,
    status: order?.status,
    restaurantLocation: order?.restaurantLocation,
    customerLocation: actualCustomerLocation,
    deliveryPersonId: order?.deliveryPersonId
  });

  if (isLoadingOrder && !order) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
        <p className="mt-4">Loading order details...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!order && !isLoadingOrder) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <p>Order not found. Please check the order ID and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        Order Details
        <button 
          onClick={handleManualRefresh} 
          className="btn btn-sm btn-circle ml-2"
          title="Refresh order data"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </button>
      </h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
        <div className="card bg-base-100 shadow-md p-4">
          <p><span className="font-medium">Order ID:</span> {order?.orderId || order?._id || orderId}</p>
          <p><span className="font-medium">Status:</span> {order?.status || 'Unknown'}</p>
          <p><span className="font-medium">Reference Number:</span> {order?.refNo || 'N/A'}</p>
          <p><span className="font-medium">Created:</span> {order?.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-100 p-2 rounded-full">
                <IoLocationOutline className="text-blue-600 text-xl" />
              </div>
              <h3 className="font-semibold">Your Location</h3>
            </div>
            <p className="text-sm">
              {isLoadingLocation ? 'Getting your location...' : 
                (actualCustomerLocation ? 'Current location detected' : 'Location not available')}
            </p>
          </div>
        </div>
        
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-orange-100 p-2 rounded-full">
                <IoStorefrontOutline className="text-orange-600 text-xl" />
              </div>
              <h3 className="font-semibold">Restaurant</h3>
            </div>
            <p className="text-sm">{order?.restaurantName || 'Restaurant information not available'}</p>
          </div>
        </div>
        
        <div className="card bg-base-100 shadow-md">
          <div className="card-body p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-100 p-2 rounded-full">
                <TbTruckDelivery className="text-green-600 text-xl" />
              </div>
              <h3 className="font-semibold">Delivery Person</h3>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">
                {order?.deliveryPersonId ? 'Delivery person assigned' : 'No delivery person assigned'}
              </p>
              {order?.estimatedTime && (
                <div className="flex items-center text-xs bg-base-200 py-1 px-2 rounded-full">
                  <IoTimeOutline className="mr-1" />
                  <span>ETA: {order.estimatedTime} min</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {order && ['assigned', 'picked_up', 'delivered'].includes(order.status) ? (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Live Tracking</h2>
          
          {mapFailed ? (
            <FallbackMap 
              restaurantName={order?.restaurantName || 'Restaurant'}
              customerName="You"
              deliveryName="Delivery Person"
              estimatedTime={order?.estimatedTime}
            />
          ) : (
            <div className="relative rounded-lg overflow-hidden border border-base-300" style={{ height: '500px' }}>
              <Suspense fallback={<MapLoading />}>
                <CustomerTrackingView 
                  key={`tracking-${refreshKey}-${mapKey}`}
                  orderId={order.orderId || order._id}
                  restaurantLocation={order.restaurantLocation}
                  customerLocation={actualCustomerLocation}
                  deliveryPersonId={order?.deliveryPersonId}
                  showAllLocations={true}
                  refreshInterval={60000}
                  useRealTimeLocation={true}
                  onError={handleMapError}
                />
              </Suspense>
            </div>
          )}
          
          <div className="flex gap-2 mt-2 text-xs text-base-content/60">
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
              Your Location
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1"></span>
              Restaurant
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
              Delivery Person
            </div>
            <div className="flex items-center ml-auto">
              <span className="inline-block w-6 h-1 bg-blue-500 mr-1 rounded-full"></span>
              Delivery Route
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Live Tracking</h2>
          <div className="alert alert-info">
            <p>Live tracking is not available for this order status ({order?.status || 'unknown'}).</p>
          </div>
        </div>
      )}
      
      {order?.items && order.items.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Order Items</h2>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name || 'Unknown Item'}</td>
                    <td>{item.quantity || 1}</td>
                    <td>${item.price?.toFixed(2) || 'N/A'}</td>
                    <td>${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" className="text-right font-bold">Subtotal</td>
                  <td>${(order.restaurantCost || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan="3" className="text-right font-bold">Delivery Fee</td>
                  <td>${(order.deliveryCost || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan="3" className="text-right font-bold">Total</td>
                  <td className="font-bold">${((order.restaurantCost || 0) + (order.deliveryCost || 0)).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;