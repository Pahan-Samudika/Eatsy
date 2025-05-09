import React from 'react';
import { IoLocationOutline, IoStorefrontOutline, IoCarOutline } from 'react-icons/io5';

/**
 * A fallback component for when the Mapbox map cannot be loaded
 * This provides a static visual representation of the delivery information
 */
const FallbackMap = ({ 
  restaurantName = 'Restaurant',
  customerName = 'You',
  deliveryName = 'Delivery Person',
  estimatedTime = null
}) => {
  return (
    <div className="bg-base-200 rounded-lg p-6 h-[500px] w-full flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h3 className="font-bold text-lg">Delivery Information</h3>
        <p className="text-base-content/70 text-sm">
          Map view is currently unavailable, but delivery is still on its way!
        </p>
        {estimatedTime && (
          <p className="text-lg font-semibold mt-2">
            Estimated Delivery: {estimatedTime} minutes
          </p>
        )}
      </div>
      
      <div className="relative max-w-md w-full py-8">
        {/* Connecting line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-primary transform -translate-x-1/2 z-0"></div>
        
        {/* Restaurant */}
        <div className="flex items-center mb-20 relative z-10">
          <div className="bg-orange-100 p-4 rounded-full mr-4">
            <IoStorefrontOutline className="text-orange-600 text-2xl" />
          </div>
          <div className="bg-base-100 p-4 rounded-lg shadow-md flex-1">
            <h4 className="font-semibold">{restaurantName}</h4>
            <p className="text-sm text-base-content/70">Preparing your order</p>
          </div>
        </div>
        
        {/* Delivery Person */}
        <div className="flex items-center mb-20 relative z-10">
          <div className="bg-blue-100 p-4 rounded-full mr-4">
            <IoCarOutline className="text-blue-600 text-2xl" />
          </div>
          <div className="bg-base-100 p-4 rounded-lg shadow-md flex-1">
            <h4 className="font-semibold">{deliveryName}</h4>
            <p className="text-sm text-base-content/70">On the way to your location</p>
          </div>
        </div>
        
        {/* Customer */}
        <div className="flex items-center relative z-10">
          <div className="bg-green-100 p-4 rounded-full mr-4">
            <IoLocationOutline className="text-green-600 text-2xl" />
          </div>
          <div className="bg-base-100 p-4 rounded-lg shadow-md flex-1">
            <h4 className="font-semibold">{customerName}</h4>
            <p className="text-sm text-base-content/70">Delivery destination</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FallbackMap;
