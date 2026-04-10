import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  const addToCart = (product, qty = 1) => {
    setCart(prev => {
      const hit = prev.find(i => i.id === product.id);
      return hit
        ? prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i)
        : [...prev, { ...product, qty }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const updateQty = (id, qty) => {
    if (qty < 1) return removeFromCart(id);
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartMrp   = cart.reduce((s, i) => s + (i.mrp || i.price) * i.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, cartCount, cartTotal, cartMrp }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
