/**
 * Utility functions for handling API errors
 */

/**
 * Extract meaningful error message from axios error
 * @param {Error} error - The error object from axios
 * @returns {string} A user-friendly error message
 */
export const getErrorMessage = (error) => {
  if (error.response) {
    // The request was made and the server responded with a non-2xx status
    const serverMessage = error.response.data?.message || 
                          error.response.data?.error ||
                          `Error: ${error.response.status}`;
    return serverMessage;
  } else if (error.request) {
    // The request was made but no response was received
    return "No response from server. Please check your connection and try again.";
  } else {
    // Something happened in setting up the request
    return error.message || "An unexpected error occurred";
  }
};

/**
 * Function to handle API responses with error logging
 * @param {Function} apiCall - Async function that makes the API call
 * @param {Function} onSuccess - Callback to execute on success
 * @param {Function} onError - Callback to execute on error
 * @param {boolean} silent - Whether to suppress error messages
 */
export const handleApiResponse = async (apiCall, onSuccess, onError, silent = false) => {
  try {
    const response = await apiCall();
    if (onSuccess) onSuccess(response.data);
    return response.data;
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    if (!silent) console.error('API Error:', errorMsg, error);
    if (onError) onError(errorMsg, error);
    throw error;
  }
};

export default {
  getErrorMessage,
  handleApiResponse
};
