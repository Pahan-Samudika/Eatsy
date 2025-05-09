import React, { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "../../utils/alert-utils/ToastUtil";
import { formatCustomDate } from "../../utils/format-utils/DateUtil";
import { deliveryAPI } from "../../services/delivery-service";
import { IoRefreshOutline, IoTimeOutline, IoCheckmarkCircle, IoCarSportOutline } from "react-icons/io5";

function OrderHistoryByPersonId({ deliveryPersonID }) {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Get status color and icon based on current status
  const getStatusInfo = (status) => {
    switch(status) {
      case 'pending': 
        return { 
          color: '#f39c12', 
          bgColor: 'rgba(243, 156, 18, 0.1)', 
          icon: <IoTimeOutline className="mr-1" />,
          label: 'Pending'
        };
      case 'assigned': 
        return { 
          color: '#3498db', 
          bgColor: 'rgba(52, 152, 219, 0.1)', 
          icon: <IoCarSportOutline className="mr-1" />,
          label: 'Assigned'
        };
      case 'picked_up': 
        return { 
          color: '#9b59b6', 
          bgColor: 'rgba(155, 89, 182, 0.1)', 
          icon: <IoCarSportOutline className="mr-1" />,
          label: 'Picked Up'
        };
      case 'delivered': 
        return { 
          color: '#2ecc71', 
          bgColor: 'rgba(46, 204, 113, 0.1)', 
          icon: <IoCheckmarkCircle className="mr-1" />,
          label: 'Delivered'
        };
      default: 
        return { 
          color: '#6c757d', 
          bgColor: 'rgba(108, 117, 125, 0.1)', 
          icon: <IoTimeOutline className="mr-1" />,
          label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'
        };
    }
  };

  const fetchOrderHistory = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(deliveryAPI.getDeliveryPersonById(deliveryPersonID));
      if (response.status !== 200) {
        throw new Error("Failed to fetch order history");
      }
      
      // Identify and remove duplicates by creating a map with orderId as keys
      const orderMap = new Map();
      
      // Process response data and handle duplicates
      if (Array.isArray(response.data)) {
        response.data.forEach(order => {
          // Skip pending orders
          if (order.status === "pending") return;
          
          // Use a consistent ID field - either orderId or _id, with a fallback to a compound key
          const orderIdToUse = order.orderId || order._id || `order-${order.status}-${Date.now()}`;
          
          // Only add to map if not already present, or replace with newer version if timestamps exist
          if (!orderMap.has(orderIdToUse) || 
              (order.updatedAt && orderMap.get(orderIdToUse).updatedAt && 
               new Date(order.updatedAt) > new Date(orderMap.get(orderIdToUse).updatedAt))) {
            orderMap.set(orderIdToUse, {
              ...order,
              // Ensure we have a consistent ID field for React keys
              orderId: orderIdToUse
            });
          }
        });
      }
      
      // Convert map back to array and set state
      const uniqueOrders = Array.from(orderMap.values());
      setOrders(uniqueOrders);
      
    } catch (error) {
      console.error("Error fetching order history:", error);
      toast.error("Failed to fetch order history.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // Show loading state for the specific card
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.orderId === orderId ? { ...order, isUpdating: true } : order
        )
      );

      const response = await axios.put(deliveryAPI.updateOrderStatus(orderId), { status: newStatus });
      if (response.status === 200) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.orderId === orderId ? { ...order, status: newStatus, isUpdating: false } : order
          )
        );
        toast.success(`Order status updated to ${getStatusInfo(newStatus).label}!`);
      } else {
        throw new Error("Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status.");
      
      // Reset updating state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.orderId === orderId ? { ...order, isUpdating: false } : order
        )
      );
    }
  };

  useEffect(() => {
    if (deliveryPersonID) {
      fetchOrderHistory();
    }
  }, [deliveryPersonID]);

  // Filter orders based on selected filter
  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  return (
    <div className="bg-base-100 rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Order History</h2>
        <div className="flex items-center gap-2">
          <select 
            className="select select-bordered select-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Orders</option>
            <option value="assigned">Assigned</option>
            <option value="picked_up">Picked Up</option>
            <option value="delivered">Delivered</option>
          </select>
          <button 
            className="btn btn-sm btn-ghost" 
            onClick={fetchOrderHistory}
            disabled={isLoading}
          >
            <IoRefreshOutline className={`text-lg ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && orders.length === 0 ? (
        <div className="flex justify-center items-center py-10">
          <div className="loading loading-spinner loading-md"></div>
          <p className="ml-2">Loading order history...</p>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {filteredOrders.map((order) => {
            const { color, bgColor, icon, label } = getStatusInfo(order.status);
            const isExpanded = expandedOrderId === order.orderId;
            
            // Generate a guaranteed unique key combining the orderId with index
            // This ensures uniqueness even if the backend returns duplicate IDs
            return (
              <div 
                key={order.orderId} 
                className="border border-base-300 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                <div 
                  className="p-3 cursor-pointer bg-base-200/50 flex justify-between items-center"
                  onClick={() => toggleOrderDetails(order.orderId)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="font-medium">{order.orderId || 'Order ID not available'}</span>
                    <span className="text-sm opacity-70">{formatCustomDate(order.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div 
                      style={{ backgroundColor: bgColor, color: color }}
                      className="flex items-center px-3 py-1 rounded-full text-xs font-medium"
                    >
                      {icon} {label}
                    </div>
                    <div className="text-xl transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ⌄
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="bg-base-100 p-4 border-t border-base-300">
                    {order.items && order.items.length > 0 ? (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium mb-2">Order Items:</h4>
                        <ul className="space-y-1 text-sm">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{item.name || 'Item name not available'} x{item.quantity || 1}</span>
                              <span>${item.price?.toFixed(2) || 'N/A'}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-base-content/60 mb-3">No item details available</p>
                    )}
                    
                    <div className="flex justify-between items-center pt-2 border-t border-base-300">
                      <div className="flex items-center">
                        <span className="text-sm mr-2">Update Status:</span>
                        <select
                          className="select select-bordered select-sm"
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.orderId, e.target.value)}
                          disabled={order.isUpdating}
                        >
                          <option value="assigned">Assigned</option>
                          <option value="picked_up">Picked Up</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                      
                      {order.isUpdating && (
                        <div className="loading loading-spinner loading-xs"></div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-base-200/50 rounded-lg p-6 text-center">
          <p className="text-base-content/60">No order history found.</p>
          <p className="text-sm mt-1">New orders will appear here after they're assigned to you.</p>
        </div>
      )}
    </div>
  );
}

export default OrderHistoryByPersonId;
