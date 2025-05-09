import React, { useState, useRef, useEffect, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import MapContainer from "./MapContainer";
import OrderDetails from "./OrderDetails";
import ActiveStatusButton from "./ActiveStatusButton";
import NearbyOrdersPanel from "./NearbyOrdersPanel";
import { deliveryAPI } from "../../services/delivery-service";
import { orderAPI } from "../../services/order-service";
import { userAPI } from "../../services/user-service";
import axios from "axios";
import { useDispatch } from "react-redux";
import { useToast } from "../../utils/alert-utils/ToastUtil";
import { formatCustomDate } from "../../utils/format-utils/DateUtil";
import {
  IoFilter,
  IoClose,
  IoSearch,
  IoCheckmarkCircle,
  IoTimeOutline,
  IoCarOutline,
  IoEyeOffOutline,
  IoEyeOutline,
} from "react-icons/io5";
import { useDeliveryPerson } from "../../utils/redux-utils/redux-delivery";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.error("Mapbox token is missing. Please check your .env file.");
}

mapboxgl.accessToken = MAPBOX_TOKEN;

const DELIVERY_API_URL = import.meta.env.VITE_DELIVERY_API_URL;

const DeliveryMap = ({ mode = "delivery", orderData = null }) => {
  const toast = useToast();
  const mapRef = useRef(null);
  const deliveryPersonMarkerRef = useRef(null);
  const deliveryPerson = useDeliveryPerson();
  const DELIVERY_PERSON_ID = deliveryPerson?.id;
  const dispatch = useDispatch();
  const fetchingDataRef = useRef(false);

  const [orderDetails, setOrderDetails] = useState(orderData);
  const [nearbyOrders, setNearbyOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showMarkers, setShowMarkers] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNearbyOrders, setShowNearbyOrders] = useState(true);

  const getStatusInfo = (status) => {
    switch (status) {
      case "pending":
        return {
          color: "#f39c12",
          bgColor: "rgba(243, 156, 18, 0.1)",
          icon: <IoTimeOutline />,
          label: "Pending",
        };
      case "accepted":
        return {
          color: "#3498db",
          bgColor: "rgba(52, 152, 219, 0.1)",
          icon: <IoTimeOutline />,
          label: "Accepted",
        };
      case "rejected":
        return {
          color: "#e74c3c",
          bgColor: "rgba(231, 76, 60, 0.1)",
          icon: <IoClose />,
          label: "Rejected",
        };
      case "paid":
        return {
          color: "#2ecc71",
          bgColor: "rgba(46, 204, 113, 0.1)",
          icon: <IoCheckmarkCircle />,
          label: "Paid",
        };
      case "preparing":
        return {
          color: "#f1c40f",
          bgColor: "rgba(241, 196, 15, 0.1)",
          icon: <IoTimeOutline />,
          label: "Preparing",
        };
      case "ready":
        return {
          color: "#27ae60",
          bgColor: "rgba(39, 174, 96, 0.1)",
          icon: <IoCheckmarkCircle />,
          label: "Ready",
        };
      case "assigned":
        return {
          color: "#3498db",
          bgColor: "rgba(52, 152, 219, 0.1)",
          icon: <IoCarOutline />,
          label: "Assigned",
        };
      case "pickup":
        return {
          color: "#9b59b6",
          bgColor: "rgba(155, 89, 182, 0.1)",
          icon: <IoCarOutline />,
          label: "Picked Up",
        };
      case "delivered":
        return {
          color: "#2ecc71",
          bgColor: "rgba(46, 204, 113, 0.1)",
          icon: <IoCheckmarkCircle />,
          label: "Delivered",
        };
      default:
        return {
          color: "#6c757d",
          bgColor: "rgba(108, 117, 125, 0.1)",
          icon: <IoTimeOutline />,
          label: status
            ? status.charAt(0).toUpperCase() + status.slice(1)
            : "Unknown",
        };
    }
  };

  const clearExistingRoute = useCallback(() => {
    if (!mapRef.current) return;

    if (mapRef.current.getLayer("route")) {
      mapRef.current.removeLayer("route");
    }
    if (mapRef.current.getSource("route")) {
      mapRef.current.removeSource("route");
    }

    setEstimatedDuration(null);
  }, []);

  const handleOrderClick = useCallback(
    (order) => {
      clearExistingRoute();

      setOrderDetails(order);
      setShowOrderDetails(true);
      setShowMarkers(true);
    },
    [clearExistingRoute]
  );

  const handleCloseOrderDetails = useCallback(() => {
    setShowOrderDetails(false);
    setOrderDetails(null);
    setShowMarkers(false); // Hide all location markers when closing details
  }, [clearExistingRoute]);

  const fetchAndDrawRoute = useCallback(async () => {
    if (!deliveryPersonMarkerRef.current || !orderDetails || !mapRef.current) {
      console.error("Map or markers not initialized.");
      toast.error("Cannot get directions - map not fully loaded.");
      return;
    }

    toast.info("Calculating route...");

    try {
      const deliveryPersonLocation =
        deliveryPersonMarkerRef.current.getLngLat();

      // Debug all possible location fields in orderDetails
      console.log("Order details location fields:", {
        restaurantLocation: orderDetails.restaurantLocation,
        customerLocation: orderDetails.customerLocation,
        deliveryLocation: orderDetails.deliveryLocation,
        origOrder: orderDetails,
      });

      // Get coordinates from delivery location if other locations are missing
      let restaurantCoords = null;
      let customerCoords = null;

      // STEP 1: Extract restaurant coordinates with better fallbacks
      if (orderDetails.restaurantLocation) {
        if (
          Array.isArray(orderDetails.restaurantLocation) &&
          orderDetails.restaurantLocation.length === 2 &&
          !isNaN(orderDetails.restaurantLocation[0]) &&
          !isNaN(orderDetails.restaurantLocation[1])
        ) {
          restaurantCoords = [79.9171, 6.903];
        } else if (
          orderDetails.restaurantLocation.coordinates &&
          Array.isArray(orderDetails.restaurantLocation.coordinates)
        ) {
          restaurantCoords = [79.9171, 6.903];
        }
      }

      // STEP 2: Extract customer coordinates with multiple fallbacks
      // Try all possible locations where customer coordinates might be stored
      if (orderDetails.customerLocation) {
        if (
          Array.isArray(orderDetails.customerLocation) &&
          orderDetails.customerLocation.length === 2 &&
          !isNaN(orderDetails.customerLocation[0]) &&
          !isNaN(orderDetails.customerLocation[1])
        ) {
          customerCoords = orderDetails.customerLocation;
        } else if (
          orderDetails.customerLocation.coordinates &&
          Array.isArray(orderDetails.customerLocation.coordinates)
        ) {
          customerCoords = orderDetails.customerLocation.coordinates;
        }
      }

      // If customer coordinates still not found, check deliveryLocation
      if (!customerCoords && orderDetails.deliveryLocation) {
        if (
          orderDetails.deliveryLocation.location &&
          orderDetails.deliveryLocation.location.coordinates &&
          Array.isArray(orderDetails.deliveryLocation.location.coordinates) &&
          orderDetails.deliveryLocation.location.coordinates.length === 2
        ) {
          customerCoords =  [79.9078, 6.8846];
        } else if (Array.isArray(orderDetails.deliveryLocation.coordinates)) {
          customerCoords =  [79.9078, 6.8846];
        }
      }

      // STEP 3: If we still don't have both coordinates, generate a placeholder route
      if (!restaurantCoords) {
        console.warn(
          "Missing restaurant coordinates, using delivery person location"
        );
        // Use delivery person's location with a slight offset to create a valid route
        const offset = 0.01; // ~1km offset
        restaurantCoords = [79.9171, 6.903];
        toast.warning("Using approximate restaurant location");
      }

      if (!customerCoords) {
        console.warn(
          "Missing customer coordinates, using delivery person location"
        );
        // Use delivery person's location with a different offset
        const offset = 0.01;
        customerCoords = [79.9078, 6.8846];
        toast.warning("Using approximate customer location");
      }

      // Debug the final coordinates we'll use
      console.log("Using coordinates for route:", {
        deliveryPerson: [
          deliveryPersonLocation.lng,
          deliveryPersonLocation.lat,
        ],
        restaurant: restaurantCoords,
        customer: customerCoords,
      });

      // Build coordinates string for directions API
      const coordinates = `${deliveryPersonLocation.lng},${deliveryPersonLocation.lat};${restaurantCoords[0]},${restaurantCoords[1]};${customerCoords[0]},${customerCoords[1]}`;

      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?alternatives=false&geometries=geojson&overview=full&steps=false&access_token=${mapboxgl.accessToken}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Direction API returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        throw new Error("No routes found between these locations.");
      }

      const route = data.routes[0].geometry;
      const duration = Math.ceil(data.routes[0].duration / 60);

      if (mapRef.current.getLayer("route")) {
        mapRef.current.removeLayer("route");
      }
      if (mapRef.current.getSource("route")) {
        mapRef.current.removeSource("route");
      }

      mapRef.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: route,
        },
      });

      mapRef.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#3887be",
          "line-width": 5,
          "line-opacity": 0.75,
        },
      });

      setShowMarkers(true);

      const coords = route.coordinates;
      const bounds = coords.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(coords[0], coords[0]));

      mapRef.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
        duration: 1000,
      });

      setEstimatedDuration(duration);

      toast.success(`Route calculated! ETA: ${duration} minutes`);
    } catch (error) {
      console.error("Error fetching or drawing route:", error);
      toast.error(`Failed to get directions: ${error.message}`);
    }
  }, [orderDetails, toast]);

  const handleCallCustomer = useCallback(() => {
    if (orderDetails && orderDetails.customerPhone) {
      window.open(`tel:${orderDetails.customerPhone}`, "_self");
    } else {
      toast.error("Customer phone number not available");
    }
  }, [orderDetails, toast]);

  const handleUpdateStatus = useCallback(async (status) => {
    console.log("Update status to:", status);
  }, []);

  const toggleActiveStatus = useCallback(() => {
    setIsActive((prev) => !prev);
  }, []);

  const toggleMyOrders = useCallback(() => {
    setShowMyOrders((prev) => !prev);
  }, []);

  const toggleNearbyOrders = useCallback(() => {
    setShowNearbyOrders((prev) => !prev);
  }, []);

  // Improved assignment handler that prevents double assignments
  const handleAssignOrder = useCallback(
    async (orderId, orderData = null) => {
      if (!DELIVERY_PERSON_ID) {
        toast.error("Delivery person ID is missing. Please log in again.");
        return false;
      }

      try {
        // Find the order - either from provided data or nearby orders
        let orderToAssign = orderData
          ? null
          : nearbyOrders.find((order) => order.orderId === orderId);

        if (!orderToAssign && !orderData) {
          console.error("Order not found in nearbyOrders:", orderId);
          toast.error("Order not found in nearby orders.");
          return false;
        }

        // Check if order is already assigned
        const status = orderData?.status || orderToAssign?.status;
        if (
          status === "assigned" ||
          status === "picked_up" ||
          status === "delivered"
        ) {
          console.error("Order already assigned:", orderId, status);
          toast.error(
            "This order is already assigned and cannot be reassigned."
          );
          return false;
        }

        toast.info("Assigning order...");

        // Prepare the payload with provided orderData or from nearbyOrders
        const payload = orderData
          ? {
              id: orderId,
              deliveryPersonId: DELIVERY_PERSON_ID,
              restaurantId: orderData.restaurantId,
              customerId: orderData.customerId,
              deliveryLocation: {
                location: {
                  type: "Point",
                  coordinates: orderData.customerLocation,
                },
                address: orderData.deliveryLocation,
              },
            }
          : {
              id: orderId,
              deliveryPersonId: DELIVERY_PERSON_ID,
              restaurantId:
                orderToAssign.restaurantId || orderToAssign.restaurantID,
              customerId: orderToAssign.customerId || orderToAssign.customerID,
              deliveryLocation: {
                location: {
                  type: "Point",
                  coordinates: orderToAssign.customerLocation,
                },
                address:
                  orderToAssign.deliveryLocation || "No address provided",
              },
            };

        console.log("Sending assignment payload:", payload);

        let response;
        try {
          response = await axios.post(
            deliveryAPI.assignDeliveryPerson(),
            payload
          );
          console.log(
            "Assignment successful with primary endpoint:",
            response.data
          );
        } catch (primaryError) {
          console.error(
            "Primary assign endpoint failed:",
            primaryError.message
          );

          if (primaryError.response) {
            console.error(
              "Server response details:",
              primaryError.response.status,
              primaryError.response.data
            );
          }

          toast.info("Trying alternative assignment method...");
          response = await axios.post(
            deliveryAPI.assignDeliveryPersonFallback(),
            payload
          );
          console.log(
            "Assignment successful with fallback endpoint:",
            response.data
          );
        }

        toast.success("Order assigned successfully!");

        setNearbyOrders((prev) =>
          prev.filter(
            (order) =>
              order.orderId !== orderId ||
              order.status === "assigned" ||
              order.status === "picked_up" ||
              order.status === "delivered"
          )
        );

        const assignedOrder = orderData
          ? {
              orderId: orderId,
              status: "assigned",
              deliveryPersonId: DELIVERY_PERSON_ID,
              restaurantId: orderData.restaurantId,
              customerId: orderData.customerId,
              customerLocation: orderData.customerLocation,
              deliveryLocation: orderData.deliveryLocation,
            }
          : {
              ...orderToAssign,
              status: "assigned",
              deliveryPersonId: DELIVERY_PERSON_ID,
            };

        setMyOrders((prev) => {
          const orderExists = prev.some((order) => order.orderId === orderId);
          if (!orderExists) {
            return [...prev, assignedOrder];
          }
          return prev;
        });

        fetchOrderHistory();

        return true;
      } catch (error) {
        console.error("Error assigning order:", error);

        let errorMessage = "Failed to assign order. Please try again.";

        if (error.response) {
          console.error(
            "Server error details:",
            error.response.status,
            error.response.data
          );
          errorMessage =
            error.response.data?.message ||
            error.response.data?.error ||
            errorMessage;
        }

        toast.error(errorMessage);
        return false;
      }
    },
    [DELIVERY_PERSON_ID, nearbyOrders, toast]
  );

  const fetchOrderHistory = async () => {
    try {
      const response = await axios.get(
        deliveryAPI.getDeliveryPersonById(DELIVERY_PERSON_ID)
      );
      if (response.status === 200) {
        const historyOrders = response.data.filter(
          (order) => order.status !== "pending" && order.status !== "delivered"
        );
        setMyOrders(historyOrders);
      }
    } catch (error) {
      console.error("Error fetching order history:", error);
    }
  };

  useEffect(() => {
    if (mode === "delivery" && DELIVERY_PERSON_ID && !fetchingDataRef.current) {
      fetchingDataRef.current = true;

      const fetchNearbyOrders = async () => {
        try {
          setIsLoading(true);
          let latitude = 6.915582;
          let longitude = 79.974036;

          // Debug API URL construction
          console.log("Order API debug:", orderAPI.debugEndpoints());

          // Get current location
          if (navigator.geolocation) {
            try {
              const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: true,
                  timeout: 5000,
                  maximumAge: 0,
                });
              });
              latitude = position.coords.latitude;
              longitude = position.coords.longitude;
            } catch (locationError) {
              console.warn(
                "Couldn't get current location, using default:",
                locationError
              );
            }
          }

          console.log(
            "Fetching nearby orders at coordinates:",
            latitude,
            longitude
          );
          const nearbyOrdersUrl = orderAPI.getNearbyOrders(latitude, longitude);
          console.log("Nearby orders URL:", nearbyOrdersUrl);

          // Make sure we're using the right API URL
          console.log("Orders API URL:", import.meta.env.VITE_ORDERS_API_URL);

          // Try fetching with fetch API if axios fails
          let responseData;
          try {
            const response = await axios.get(nearbyOrdersUrl);
            console.log("Nearby orders response:", response);
            responseData = response.data;
          } catch (axiosError) {
            console.warn(
              "Axios request failed, trying with fetch API:",
              axiosError
            );

            // Fallback to fetch API
            const fetchResponse = await fetch(nearbyOrdersUrl);
            if (!fetchResponse.ok) {
              throw new Error(`HTTP error! Status: ${fetchResponse.status}`);
            }
            responseData = await fetchResponse.json();
            console.log("Fetch API response:", responseData);
          }

          if (
            !responseData ||
            !Array.isArray(responseData) ||
            responseData.length === 0
          ) {
            console.log("No nearby orders found or empty response");
            setNearbyOrders([]);
            setIsLoading(false);
            return;
          }

          // For testing: if we can't get real data, use sample data
          if (responseData.length === 0) {
            console.log("Using sample data for testing");
            responseData = getSampleOrders(latitude, longitude);
          }

          const ordersPromises = responseData.map(async (order) => {
            console.log("Processing order:", order._id || order.orderId);

            // Check if already assigned to another delivery person
            if (
              order.status === "assigned" ||
              order.status === "picked_up" ||
              order.status === "delivered"
            ) {
              if (
                order.deliveryPersonId &&
                order.deliveryPersonId !== DELIVERY_PERSON_ID
              ) {
                console.log(
                  "Order already assigned to another delivery person:",
                  order._id
                );
                return null;
              }
            }

            // Skip rejected orders
            if (order.status === "rejected") {
              console.log("Skipping rejected order:", order._id);
              return null;
            }

            try {
              // Fetch restaurant data
              const restaurantId = order.restaurantID || order.restaurantId;
              console.log("Fetching restaurant:", restaurantId);

              if (!restaurantId) {
                console.error("Missing restaurant ID for order:", order._id);
                return null;
              }

              const restaurantResponse = await axios.get(
                userAPI.getRestaurantByID(restaurantId)
              );
              const restaurant = restaurantResponse.data;

              if (!restaurant) {
                console.error("Restaurant not found:", restaurantId);
                return null;
              }

              // Ensure restaurant has location data
              if (
                !restaurant.location?.coordinates ||
                !Array.isArray(restaurant.location.coordinates) ||
                restaurant.location.coordinates.length !== 2
              ) {
                console.error(
                  "Invalid restaurant location:",
                  restaurant.location
                );
                return null;
              }

              // Fetch customer data
              let customerDetails = { name: "Customer" };
              try {
                const customerId = order.customerID || order.customerId;
                if (customerId) {
                  const customerResponse = await axios.get(
                    userAPI.getCustomerByID(customerId)
                  );
                  customerDetails = customerResponse.data || {
                    name: "Customer",
                  };
                }
              } catch (customerError) {
                console.warn("Couldn't fetch customer details:", customerError);
              }

              // Ensure delivery location exists
              if (
                !order.deliveryLocation ||
                !order.deliveryLocation.location ||
                !order.deliveryLocation.location.coordinates
              ) {
                console.error(
                  "Invalid delivery location for order:",
                  order._id
                );
                return null;
              }

              // Calculate distance (with error handling)
              let distance = 0;
              try {
                distance = calculateDistance(
                  latitude,
                  longitude,
                  restaurant.location.coordinates[1],
                  restaurant.location.coordinates[0]
                ).toFixed(1);
              } catch (distError) {
                console.warn("Error calculating distance:", distError);
              }

              return {
                orderId: order._id || order.orderId,
                orderRefNo: order.refNo || "N/A",
                customerName: customerDetails.name || "Customer",
                customerPhone: customerDetails.phone || "",
                restaurantName: restaurant.name,
                restaurantId: restaurantId,
                customerId: order.customerID || order.customerId,
                restaurantLocation: restaurant.location.coordinates,
                customerLocation: order.deliveryLocation.location.coordinates,
                deliveryAddress:
                  order.deliveryLocation.address || "No address provided",
                items: order.items || [],
                totalAmount:
                  (order.restaurantCost || 0) + (order.deliveryCost || 0),
                status: order.status || "pending",
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                distance: distance,
              };
            } catch (error) {
              console.error(`Error processing order ${order._id}:`, error);
              return null;
            }
          });

          const processedOrders = await Promise.all(ordersPromises);
          const filteredOrders = processedOrders.filter(
            (order) => order !== null
          );

          console.log(
            `Processed ${filteredOrders.length} valid orders out of ${responseData.length} total`
          );

          // Sort by distance
          filteredOrders.sort(
            (a, b) => parseFloat(a.distance) - parseFloat(b.distance)
          );

          setNearbyOrders(filteredOrders);

          // Always set the visibility to true when we have orders
          if (filteredOrders.length > 0) {
            setShowNearbyOrders(true);
            console.log(
              "Setting showNearbyOrders to true because we have orders"
            );
          }
        } catch (error) {
          console.error("Error fetching nearby orders:", error);
          if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
          }
          toast.error("Failed to fetch nearby orders. Please try again later.");
          setNearbyOrders([]);
        } finally {
          setIsLoading(false);
        }
      };

      // Helper function to generate sample orders for testing
      const getSampleOrders = (lat, lng) => {
        console.log("Generating sample orders for testing");
        return [
          {
            _id: "sample-order-1",
            status: "ready",
            restaurantID: "restaurant-1",
            customerID: "customer-1",
            refNo: "ORD-1234",
            items: [{ name: "Pizza", quantity: 1 }],
            restaurantCost: 25.99,
            deliveryCost: 5,
            deliveryLocation: {
              location: {
                type: "Point",
                coordinates: [lng + 0.01, lat - 0.01], // Slightly offset from current location
              },
              address: "123 Sample St, Sample City",
            },
            createdAt: new Date().toISOString(),
          },
          {
            _id: "sample-order-2",
            status: "ready",
            restaurantID: "restaurant-2",
            customerID: "customer-2",
            refNo: "ORD-5678",
            items: [{ name: "Burger", quantity: 2 }],
            restaurantCost: 18.99,
            deliveryCost: 4,
            deliveryLocation: {
              location: {
                type: "Point",
                coordinates: [lng - 0.02, lat + 0.02], // Different offset
              },
              address: "456 Test Ave, Test Town",
            },
            createdAt: new Date().toISOString(),
          },
        ];
      };

      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(deg2rad(lat1)) *
            Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return d;
      };

      const deg2rad = (deg) => {
        return deg * (Math.PI / 180);
      };

      fetchNearbyOrders();
      fetchOrderHistory();
    }
  }, [mode, DELIVERY_PERSON_ID, toast]);

  useEffect(() => {
    if (
      showMarkers &&
      orderDetails?.restaurantLocation &&
      orderDetails?.customerLocation &&
      !estimatedDuration
    ) {
      // fetchAndDrawRoute();
    }
  }, [showMarkers, orderDetails, estimatedDuration, fetchAndDrawRoute]);

  const filterOrders = (orders) => {
    if (!orders) return [];

    return orders.filter((order) => {
      // Status filtering
      if (orderFilter !== "all") {
        // Handle alias for "pickup" status
        if (orderFilter === "picked_up" && order.status === "pickup") {
          // Pass through - these are equivalent statuses
        } 
        // For all other statuses, exact match required
        else if (order.status !== orderFilter) {
          return false;
        }
      }

      // Search term filtering (unchanged)
      if (searchTerm.trim() !== "") {
        const search = searchTerm.toLowerCase();
        return (
          (order.orderRefNo &&
            order.orderRefNo.toLowerCase().includes(search)) ||
          (order.restaurantName &&
            order.restaurantName.toLowerCase().includes(search)) ||
          (order.customerName &&
            order.customerName.toLowerCase().includes(search)) ||
          (order.deliveryAddress &&
            order.deliveryAddress.toLowerCase().includes(search))
        );
      }

      return true;
    });
  };

  const filteredMyOrders = filterOrders(myOrders);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "800px",
        border: "1px solid #ccc",
        overflow: "hidden",
      }}
    >
      <MapContainer
        mapRef={mapRef}
        restaurantLocation={
          orderDetails?.restaurantLocation || [79.9171, 6.903]
        }
        customerLocation={orderDetails?.customerLocation || [79.9078, 6.8846]}
        deliveryPersonMarkerRef={deliveryPersonMarkerRef}
        showMarkers={showMarkers}
        nearbyOrders={mode === "delivery" ? nearbyOrders : []}
        onOrderClick={handleOrderClick}
      />

      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          background: "rgba(0,0,0,0.5)",
          color: "white",
          padding: "5px",
          fontSize: "12px",
          zIndex: 1500,
        }}
      >
        Map Ref: {mapRef.current ? "Created" : "Not Created"}
      </div>

      {mode === "delivery" && (
        <>
          <ActiveStatusButton
            isActive={isActive}
            toggleActiveStatus={toggleActiveStatus}
          />
          <button
            onClick={toggleMyOrders}
            className="btn btn-sm btn-primary absolute top-2 left-8 z-[1000] shadow-lg"
          >
            {showMyOrders ? "Hide My Orders" : "My Orders"}
          </button>

          {nearbyOrders.length > 0 && (
            <button
              onClick={toggleNearbyOrders}
              className="btn btn-sm btn-secondary absolute top-20 right-6 z-[1000] shadow-lg flex items-center gap-1"
              title={
                showNearbyOrders ? "Hide nearby orders" : "Show nearby orders"
              }
            >
              {showNearbyOrders ? <IoEyeOffOutline /> : <IoEyeOutline />}
              Nearby Orders
            </button>
          )}

          {/* Debug indicator for nearby orders count */}
          <div className="absolute top-2 right-2 z-[900] badge badge-sm badge-info">
            {nearbyOrders.length} nearby orders
          </div>

          {showMyOrders && (
            <div className="absolute top-12 left-4 z-[1000] bg-base-100 p-4 rounded-lg shadow-xl w-96 max-h-[70vh] overflow-hidden flex flex-col border border-base-300">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold">My Orders</h3>
                <button
                  onClick={toggleMyOrders}
                  className="btn btn-sm btn-circle btn-ghost"
                >
                  <IoClose />
                </button>
              </div>

              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search orders..."
                    className="input input-bordered input-sm w-full pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <IoSearch className="absolute left-2 top-2 text-base-content/50" />
                </div>
                <select
                  className="select select-bordered select-sm"
                  value={orderFilter}
                  onChange={(e) => setOrderFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="paid">Paid</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="assigned">Assigned</option>
                  <option value="pickup">Picked Up</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="loading loading-spinner loading-md"></div>
                  </div>
                ) : filteredMyOrders.length > 0 ? (
                  <div className="space-y-2">
                    {filteredMyOrders.map((order) => {
                      const statusInfo = getStatusInfo(order.status);
                      return (
                        <div
                          key={order.orderId}
                          className="card card-compact bg-base-200 hover:bg-base-300 cursor-pointer transition-colors"
                          onClick={() => handleOrderClick(order)}
                        >
                          <div className="card-body">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold">
                                  {order.orderRefNo || order.orderId}
                                </h4>
                                <p className="text-xs opacity-70">
                                  {formatCustomDate(order.createdAt)}
                                </p>
                              </div>
                              <div
                                className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                                style={{
                                  backgroundColor: statusInfo.bgColor,
                                  color: statusInfo.color,
                                }}
                              >
                                {statusInfo.icon} {statusInfo.label}
                              </div>
                            </div>

                            <div className="text-sm grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                              <div>
                                <span className="opacity-70">From:</span>
                                <span className="font-medium ml-1">
                                  {order.restaurantName || "Restaurant"}
                                </span>
                              </div>
                              <div>
                                <span className="opacity-70">To:</span>
                                <span className="font-medium ml-1">
                                  {order.customerName || "Customer"}
                                </span>
                              </div>
                              {order.deliveryAddress && (
                                <div className="col-span-2 truncate">
                                  <span className="opacity-70">Address:</span>
                                  <span className="ml-1">
                                    {order.deliveryAddress}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-base-content/60">
                    <p className="mb-1">No orders found</p>
                    <p className="text-xs">
                      {searchTerm || orderFilter !== "all"
                        ? "Try changing your search or filter"
                        : "Your assigned orders will appear here"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === "delivery" && nearbyOrders.length > 0 && (
            <NearbyOrdersPanel
              orders={nearbyOrders}
              isVisible={showNearbyOrders}
              isLoading={isLoading}
              onToggleVisibility={toggleNearbyOrders}
              onOrderClick={handleOrderClick}
              onMyOrdersClick={toggleMyOrders}
            />
          )}
        </>
      )}

      {showOrderDetails && orderDetails && (
        <OrderDetails
          orderDetails={orderDetails}
          fetchAndDrawRoute={fetchAndDrawRoute}
          handleCallCustomer={handleCallCustomer}
          estimatedDuration={estimatedDuration}
          handleAssignOrder={handleAssignOrder}
          handleUpdateStatus={handleUpdateStatus}
          setOrders={setMyOrders}
          onClose={handleCloseOrderDetails}
          deliveryPersonId={DELIVERY_PERSON_ID} // Pass the delivery person ID here
        />
      )}
    </div>
  );
};

export default DeliveryMap;
