import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { deliveryAPI } from "../../services/delivery-service";
import { IoClose } from 'react-icons/io5';

const OrderDetails = ({ 
  orderDetails, 
  fetchAndDrawRoute, 
  handleCallCustomer, 
  estimatedDuration, 
  handleAssignOrder, 
  handleUpdateStatus,
  setOrders,
  onClose,
  deliveryPersonId // Add deliveryPersonId prop to know which delivery person is assigning
}) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Get status color based on current status
  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#f39c12';
      case 'assigned': return '#3498db';
      case 'delivered': return '#2ecc71';
      default: return '#6c757d';
    }
  };

  // Implement the order status update function
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setIsUpdatingStatus(true);
      const response = await axios.put(deliveryAPI.updateOrderStatus(orderId), { status: newStatus });
      if (response.status === 200) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.orderId === orderId ? { ...order, status: newStatus } : order
          )
        );
        toast.success("Order status updated successfully!");
      } else {
        throw new Error("Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Function to handle status updates and call the API
  const handleStatusUpdate = (newStatus) => {
    if (orderDetails && orderDetails.orderId) {
      updateOrderStatus(orderDetails.orderId, newStatus);
      // Also call the existing handleUpdateStatus if provided
      if (handleUpdateStatus) {
        handleUpdateStatus(newStatus);
      }
    } else {
      toast.error("Order ID is missing. Cannot update status.");
    }
  };

  // Implement the assign order function with improved validation
  const assignOrderToDeliveryPerson = async () => {
    if (!orderDetails?.orderId) {
      toast.error("Missing order ID. Cannot assign order.");
      return;
    }
    
    if (!deliveryPersonId) {
      toast.error("Missing delivery person ID. Please log in again.");
      return;
    }
    
    // Check if already assigned
    if (orderDetails.status === 'assigned' || orderDetails.status === 'picked_up' || orderDetails.status === 'delivered') {
      toast.error("This order is already assigned and cannot be reassigned.");
      return;
    }

    // Check if assigned to another delivery person
    if (orderDetails.deliveryPersonId && orderDetails.deliveryPersonId !== deliveryPersonId) {
      toast.error("This order is already assigned to another delivery person.");
      return;
    }

    try {
      setIsAssigning(true);
      
      // Debug missing fields in orderDetails
      console.log("OrderDetails contents:", orderDetails);
      
      // Extract restaurant and customer IDs (check multiple possible field names)
      const restaurantId = orderDetails.restaurantId || orderDetails.restaurantID;
      const customerId = orderDetails.customerId || orderDetails.customerID;
      
      if (!restaurantId) {
        console.error("Missing restaurantId in orderDetails:", orderDetails);
        toast.error("Missing restaurant information");
        return;
      }
      
      if (!customerId) {
        console.error("Missing customerId in orderDetails:", orderDetails);
        toast.error("Missing customer information");
        return;
      }
      
      // Make sure coordinates are in the correct format
      if (!Array.isArray(orderDetails.customerLocation) || orderDetails.customerLocation.length !== 2) {
        console.error("Invalid customer location coordinates:", orderDetails.customerLocation);
        toast.error("Invalid location data");
        return;
      }
      
      // Instead of making the API call directly here, delegate to the parent handler
      if (handleAssignOrder) {
        const orderData = {
          orderId: orderDetails.orderId,
          restaurantId: restaurantId,
          customerId: customerId,
          customerLocation: orderDetails.customerLocation,
          deliveryLocation: orderDetails.deliveryLocation || "No address provided"
        };
        
        const success = await handleAssignOrder(orderDetails.orderId, orderData);
        
        // If the parent handler was successful, update the local UI state
        if (success) {
          // Update current order details
          orderDetails.status = "assigned";
          orderDetails.deliveryPersonId = deliveryPersonId;
          
          // Update orders list if setOrders is provided
          if (setOrders) {
            setOrders(prevOrders => {
              if (!Array.isArray(prevOrders)) return [];
              
              return prevOrders.map(order => 
                order.orderId === orderDetails.orderId 
                  ? { ...order, status: "assigned", deliveryPersonId } 
                  : order
              );
            });
          }
        }
      } else {
        toast.error("Assignment handler not available");
      }
    } catch (error) {
      console.error("Error preparing order assignment:", error);
      toast.error(error.message || "Failed to prepare order assignment");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        backgroundColor: '#1e1e1e',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
        width: '380px',
        color: '#fff',
        transition: 'all 0.3s ease',
        border: '1px solid #333',
      }}
    >
      {/* Header with status indicator and close button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '15px',
        borderBottom: '1px solid #333',
        paddingBottom: '10px'
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: '18px', 
          fontWeight: 'bold' 
        }}>Delivery Details</h3>
        
        <div className="flex items-center gap-2">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: '#2d2d2d', 
            padding: '6px 12px', 
            borderRadius: '20px' 
          }}>
            <span style={{ 
              height: '10px', 
              width: '10px', 
              borderRadius: '50%', 
              backgroundColor: getStatusColor(orderDetails?.status),
              marginRight: '6px' 
            }}></span>
            <span style={{ fontSize: '14px', textTransform: 'capitalize' }}>
              {orderDetails?.status || 'Unknown'}
            </span>
          </div>
          
          {/* Add close button */}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <IoClose />
          </button>
        </div>
      </div>
      
      {/* Customer info section */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '15px',
        backgroundColor: '#2a2a2a',
        padding: '12px',
        borderRadius: '8px'
      }}>
        <img
          src="https://images.unsplash.com/photo-1656416571067-5d3d9fa8fd0a?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Customer"
          style={{
            width: '55px',
            height: '55px',
            borderRadius: '50%',
            marginRight: '15px',
            border: '2px solid #3498db',
            objectFit: 'cover'
          }}
        />
        <div>
          <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>{orderDetails.customerName}</h3>
          <button
            onClick={handleCallCustomer}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: '#4CAF50',
              border: '1px solid #4CAF50',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              fontSize: '13px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span style={{ marginRight: '5px' }}>📞</span> Call Customer
          </button>
        </div>
      </div>
      
      {/* Order details section */}
      <div style={{ 
        backgroundColor: '#2a2a2a', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '15px'
      }}>
        <p style={{ 
          margin: '8px 0', 
          display: 'flex', 
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '8px', opacity: 0.7 }}>📍</span>
          <span style={{ fontWeight: 'bold', marginRight: '5px' }}>Address:</span>
          <span style={{ flex: 1, fontSize: '14px' }}>
            {/* Fix: Properly access the address string instead of trying to render the object */}
            {typeof orderDetails.deliveryAddress === 'string' 
              ? orderDetails.deliveryAddress 
              : typeof orderDetails.deliveryLocation === 'object' && orderDetails.deliveryLocation?.address 
                ? orderDetails.deliveryLocation.address
                : "No address available"}
          </span>
        </p>
        
        <p style={{ 
          margin: '12px 0 8px 0', 
          display: 'flex', 
          justifyContent: 'space-between'
        }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px', opacity: 0.7 }}>💰</span>
            <span style={{ fontWeight: 'bold' }}>Total:</span>
          </span>
          <span style={{ 
            backgroundColor: '#3d3d3d', 
            padding: '4px 12px', 
            borderRadius: '4px',
            fontWeight: 'bold'
          }}>{orderDetails.totalAmount}</span>
        </p>
        
        {estimatedDuration && (
          <p style={{ 
            margin: '12px 0 4px 0', 
            display: 'flex', 
            alignItems: 'center' 
          }}>
            <span style={{ marginRight: '8px', opacity: 0.7 }}>⏱️</span>
            <span style={{ fontWeight: 'bold', marginRight: '5px' }}>ETA:</span>
            <span style={{ 
              backgroundColor: '#3d3d3d', 
              padding: '4px 12px', 
              borderRadius: '4px',
              color: '#f39c12',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>{estimatedDuration} minutes</span>
          </p>
        )}
        
        {/* Order items preview (simplified) */}
        <div style={{ 
          marginTop: '12px', 
          paddingTop: '12px', 
          borderTop: '1px solid #444' 
        }}>
          <p style={{ 
            fontSize: '13px', 
            margin: '0',
            color: '#aaa'
          }}>
            {orderDetails.items ? 
              `${orderDetails.items.length} items in order` : 
              'Order items information not available'}
          </p>
        </div>
      </div>
      
      {/* Action buttons */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginTop: '15px' 
      }}>
        <button
          onClick={() => {
            // Directly call fetchAndDrawRoute without any pre-validation
            // The utility function we created will handle all the validation
            fetchAndDrawRoute();
          }}
          style={{
            padding: '12px',
            backgroundColor: '#3887be',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2a6d9e'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3887be'}
        >
          <span style={{ marginRight: '6px' }}>🗺️</span>
          Navigation
        </button>
        
        {(!orderDetails?.status || 
          (orderDetails?.status === "ready" || 
           orderDetails?.status === "pending" || 
           orderDetails?.status === "accepted" || 
           orderDetails?.status === "preparing")) && 
          !orderDetails?.deliveryPersonId ? (
          <button
            onClick={assignOrderToDeliveryPerson}
            disabled={isAssigning || 
                     orderDetails?.status === 'assigned' || 
                     orderDetails?.status === 'picked_up' || 
                     orderDetails?.status === 'delivered' ||
                     (orderDetails?.deliveryPersonId && orderDetails?.deliveryPersonId !== deliveryPersonId)}
            style={{
              padding: '12px',
              backgroundColor: '#FF4500',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: isAssigning ? 'default' : 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              opacity: (isAssigning || 
                       orderDetails?.status === 'assigned' || 
                       orderDetails?.status === 'picked_up' || 
                       orderDetails?.status === 'delivered' ||
                       (orderDetails?.deliveryPersonId && orderDetails?.deliveryPersonId !== deliveryPersonId)) ? 0.5 : 1
            }}
            onMouseOver={(e) => !isAssigning && (e.currentTarget.style.backgroundColor = '#d63c00')}
            onMouseOut={(e) => !isAssigning && (e.currentTarget.style.backgroundColor = '#FF4500')}
          >
            {isAssigning ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (orderDetails?.deliveryPersonId && orderDetails?.deliveryPersonId !== deliveryPersonId) ? (
              <>
                <span style={{ marginRight: '6px' }}>❌</span>
                Already Assigned
              </>
            ) : (
              <>
                <span style={{ marginRight: '6px' }}>✅</span>
                Assign To Me
              </>
            )}
          </button>
        ) : (
          orderDetails?.status === "assigned" ? (
            <button
              onClick={() => handleStatusUpdate("picked_up")}
              disabled={isUpdatingStatus}
              style={{
                padding: '12px',
                backgroundColor: '#9b59b6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: isUpdatingStatus ? 'default' : 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                opacity: isUpdatingStatus ? 0.7 : 1
              }}
              onMouseOver={(e) => !isUpdatingStatus && (e.currentTarget.style.backgroundColor = '#8e44ad')}
              onMouseOut={(e) => !isUpdatingStatus && (e.currentTarget.style.backgroundColor = '#9b59b6')}
            >
              {isUpdatingStatus ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <span style={{ marginRight: '6px' }}>🛵</span>
                  Pick Up Order
                </>
              )}
            </button>
          ) : orderDetails?.status === "picked_up" ? (
            <button
              onClick={() => handleStatusUpdate("delivered")}
              disabled={isUpdatingStatus}
              style={{
                padding: '12px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: isUpdatingStatus ? 'default' : 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                opacity: isUpdatingStatus ? 0.7 : 1
              }}
              onMouseOver={(e) => !isUpdatingStatus && (e.currentTarget.style.backgroundColor = '#218838')}
              onMouseOut={(e) => !isUpdatingStatus && (e.currentTarget.style.backgroundColor = '#28a745')}
            >
              {isUpdatingStatus ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <span style={{ marginRight: '6px' }}>✓</span>
                  Complete Delivery
                </>
              )}
            </button>
          ) : null
        )}
      </div>
    </div>
  );
};

export default OrderDetails;
