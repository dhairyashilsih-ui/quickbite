import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const OrderContext = createContext();
export const useOrders = () => useContext(OrderContext);

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('projectx_token')}` }
});

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const placeOrder = useCallback(async (payload) => {
    const res = await axios.post(`${API_BASE}/orders`, payload, getAuthHeaders());
    if (res.data.success) {
      setOrders(prev => [res.data.order, ...prev]);
      return res.data.order;
    }
    throw new Error(res.data.message);
  }, []);

  const fetchMyOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/orders/my`, getAuthHeaders());
      if (res.data.success) setOrders(res.data.orders);
    } catch (err) {
      console.error('fetchMyOrders Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <OrderContext.Provider value={{ orders, loading, placeOrder, fetchMyOrders }}>
      {children}
    </OrderContext.Provider>
  );
}
