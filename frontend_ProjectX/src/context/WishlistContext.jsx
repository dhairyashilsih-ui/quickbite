import React, { createContext, useContext, useState } from 'react';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState([]);

  const toggleWishlist = (product) => {
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      return exists ? prev.filter(p => p.id !== product.id) : [...prev, product];
    });
  };

  const isWishlisted = (id) => wishlist.some(p => p.id === id);
  const wishCount    = wishlist.length;

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isWishlisted, wishCount }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
