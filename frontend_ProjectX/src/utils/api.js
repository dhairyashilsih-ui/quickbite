import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
});

export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const verifyOtp = (data) => API.post('/auth/verify-otp', data);
export const googleLoginAPI = (data) => API.post('/auth/google', data);
export const magicLoginAPI = (data) => API.post('/auth/magic-login', data);

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('projectx_token')}` }
});

export const getPendingSellers = () => API.get('/admin/pending-sellers', getAuthHeaders());
export const approveSeller = (id) => API.post(`/admin/approve-seller/${id}`, {}, getAuthHeaders());
export const getAllUsersAPI = () => API.get('/admin/users', getAuthHeaders());
export const toggleBlockUserAPI = (id) => API.post(`/admin/toggle-block/${id}`, {}, getAuthHeaders());

// Products API
export const getProductsBackend = () => API.get('/products');
export const getRecommendationsAPI = (data) => API.post('/products/recommendations', data);
export const addProductBackend = (data) => API.post('/products', data, getAuthHeaders());
export const updateProductBackend = (id, data) => API.put(`/products/${id}`, data, getAuthHeaders());

// Orders API
export const getAllOrdersAPI = () => API.get('/orders/all', getAuthHeaders());
export const updateOrderStatusAPI = (id, status) => API.put(`/orders/${id}/status`, { status }, getAuthHeaders());

// Razorpay Payments API
export const createRazorpayOrderAPI = (amount) =>
  API.post('/payments/create-order', { amount }, getAuthHeaders());

export const verifyRazorpayPaymentAPI = (data) =>
  API.post('/payments/verify', data, getAuthHeaders());
