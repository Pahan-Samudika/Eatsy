const DELIVERY_API_URL = import.meta.env.VITE_DELIVERY_API_URL;

export const deliveryAPI = {
    DeliveryAPIhealth: `${DELIVERY_API_URL}/health`,
    getDeliveryPersonById: (id) => `${DELIVERY_API_URL}/delivery/deliveryPerson/${id}`, // Get delivery person by ID
    updateOrderStatus: (id) => `${DELIVERY_API_URL}/delivery/${id}/status`, // Update order status
    assignDeliveryPerson: () => `${DELIVERY_API_URL}/delivery/assign`, // Assign delivery person to order
    assignDeliveryPersonFallback: () => `${DELIVERY_API_URL}/order/assign`,
    getApiBaseUrl: () => DELIVERY_API_URL,
    testEndpoint: () => `${DELIVERY_API_URL}/health`,
    // Add the missing function to get delivery by order ID
    getDeliveryByOrderId: (orderId) => `${DELIVERY_API_URL}/delivery/${orderId}/status`,
    // Debug helper function to verify API endpoints
    debugEndpoints: () => ({
        base: DELIVERY_API_URL,
        delivery: `${DELIVERY_API_URL}/delivery`,
        byOrderId: `${DELIVERY_API_URL}/delivery/[orderId]/status`
    })
};

export default deliveryAPI;
