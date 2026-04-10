import React, { createContext, useContext, useState, useEffect } from 'react';
import { getProductsBackend, addProductBackend, updateProductBackend } from '../utils/api';

const ProductsContext = createContext();

export const useProducts = () => {
    return useContext(ProductsContext);
};

export const ProductsProvider = ({ children }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial Fetch
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await getProductsBackend();
            if (res.data.success) {
                setProducts(res.data.products);
            }
        } catch (error) {
            console.error('Failed to fetch products from backend', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const addProduct = async (newProduct) => {
        try {
            const res = await addProductBackend(newProduct);
            if (res.data.success) {
                setProducts(prev => [res.data.product, ...prev]);
                return res.data.product;
            }
        } catch (error) {
            console.error('Add Product API Error:', error);
            throw error;
        }
    };

    const updateProduct = async (updatedProduct) => {
        try {
            const res = await updateProductBackend(updatedProduct.id, updatedProduct);
            if (res.data.success) {
                setProducts(prev => prev.map(p => p.id === updatedProduct.id ? res.data.product : p));
                return res.data.product;
            }
        } catch (error) {
            console.error('Update Product API Error:', error);
            throw error;
        }
    };

    const deleteProduct = async (id) => {
        try {
            // Soft delete
            const product = products.find(p => p.id === id);
            if (!product) return;
            const payload = { ...product, status: 'Inactive' };
            const res = await updateProductBackend(id, payload);
            if (res.data.success) {
                setProducts(prev => prev.map(p => p.id === id ? res.data.product : p));
            }
        } catch (error) {
            console.error('Delete Product API Error:', error);
            throw error;
        }
    };

    return (
        <ProductsContext.Provider value={{
            products,
            loading,
            addProduct,
            updateProduct,
            deleteProduct,
            refreshProducts: fetchProducts
        }}>
            {children}
        </ProductsContext.Provider>
    );
};
