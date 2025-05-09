import React, { useEffect } from 'react';
import { IoClose, IoEyeOutline, IoInformationCircleOutline } from 'react-icons/io5';
import { formatCustomDate } from '../../utils/format-utils/DateUtil';

/**
 * Component for displaying nearby orders in the delivery map
 */
const NearbyOrdersPanel = ({ 
  orders = [], 
  isVisible = true, 
  isLoading = false,
  onToggleVisibility, 
  onOrderClick, 
  onMyOrdersClick 
}) => {
  
  // Debug log when component renders
  useEffect(() => {
    console.log("NearbyOrdersPanel rendering with:", { 
      orderCount: orders.length, 
      isVisible, 
      isLoading 
    });
  }, [orders, isVisible, isLoading]);
  
  if (!isVisible) {
    // Collapsed state
    return (
      <div 
        onClick={onToggleVisibility}
        className="fixed bottom-4 left-4 z-[990] p-2 bg-base-100 rounded-full shadow-lg 
                  cursor-pointer hover:bg-base-200 transition-all duration-200 
                  flex items-center gap-2"
      >
        <div className="flex items-center justify-center bg-primary text-primary-content w-6 h-6 rounded-full text-xs font-bold">
          {orders.length}
        </div>
        <span className="text-sm font-medium pr-1">Nearby Orders</span>
        <IoEyeOutline />
      </div>
    );
  }
  
  // Expanded panel
  return (
    <div className="fixed bottom-4 left-4 right-4 md:absolute md:transform md:-translate-x-1/2 z-[990] 
                   bg-base-100 rounded-lg shadow-xl border border-base-300 
                   transition-all duration-300 max-h-[40vh] md:max-h-[50vh] overflow-hidden
                   w-auto md:w-[90%] lg:w-[70%] xl:w-[50%] max-w-lg mx-auto lg:bottom-75 lg:left-[85%]">
      {/* Header with title and close button */}
      <div className="sticky top-0 z-10 flex justify-between items-center p-3 bg-base-100 border-b border-base-200">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm">Nearby Orders</h3>
          <span className="badge badge-sm badge-primary">{orders.length}</span>
        </div> 
        <button 
          onClick={onToggleVisibility}
          className="btn btn-xs btn-ghost btn-circle"
          title="Hide nearby orders"
        >
          <IoClose />
        </button>
      </div>
      
      {/* Mobile tab navigation */}
      <div className="md:hidden flex gap-2 px-3 py-2 border-b border-base-200">
        <button 
          className="btn btn-xs btn-ghost flex-1 rounded-full" 
          onClick={() => document.getElementById('nearbyOrdersList').scrollTo({top: 0, behavior: 'smooth'})}
        >
          Nearby ({orders.length})
        </button>
        <div className="divider divider-horizontal my-0 mx-1"></div>
        <button 
          className="btn btn-xs btn-ghost flex-1 rounded-full"
          onClick={onMyOrdersClick}
        >
          My Orders
        </button>
      </div>
      
      {/* Orders list */}
      <div id="nearbyOrdersList" className="overflow-y-auto p-3 space-y-2" style={{maxHeight: 'calc(40vh - 60px)'}}>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="loading loading-spinner loading-md"></div>
            <p className="ml-2 text-sm text-base-content/70">Loading orders...</p>
          </div>
        ) : orders.length > 0 ? (
          orders.map((order) => (
            <OrderCard 
              key={`order-nearby-${order.orderId}`} 
              order={order} 
              onClick={() => onOrderClick(order)} 
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-base-content/60">
            <p className="mb-1">No orders found nearby</p>
            <p className="text-xs">Orders will appear here when they become available</p>
            <div className="flex items-center text-xs mt-4 bg-info/10 p-3 rounded-lg">
              <IoInformationCircleOutline className="mr-2 text-info" size={16} />
              <span>Make sure location services are enabled and your status is set to "Available"</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Card component for individual order
 */
const OrderCard = ({ order, onClick }) => {
  // Add error handling for order rendering
  if (!order || !order.orderId) {
    console.error("Invalid order data:", order);
    return null;
  }
  
  return (
    <div 
      className="card card-compact bg-base-200 hover:bg-base-300 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="card-body p-3">
        <div className="flex justify-between items-center mb-1">
          <h4 className="font-semibold">Order #{order.orderRefNo?.slice(-5) || order.orderId?.slice(-5) || "New"}</h4>
          <div className="badge badge-primary badge-sm">{(order.items?.length || 0) + " items"}</div>
        </div>
        
        <div className="flex items-center text-xs text-base-content/70 mb-2">
          <span className="font-medium text-accent">{order.distance || "N/A"} km</span>
          <span className="mx-1">•</span>
          <span>{formatCustomDate(order.createdAt, { time: true }) || "Unknown time"}</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-2 text-sm">
          <div className="flex items-center gap-1">
            <span className="opacity-70">From:</span>
            <span className="font-medium truncate">{order.restaurantName || "Restaurant"}</span>
          </div>
          {order.deliveryAddress && (
            <div className="truncate">
              <span className="opacity-70">To:</span>
              <span className="ml-1">{order.deliveryAddress}</span>
            </div>
          )}
        </div>
        
        <button 
          className="btn btn-xs btn-primary w-full"
          onClick={(e) => {
            e.stopPropagation();
            onClick(order);
          }}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default NearbyOrdersPanel;
