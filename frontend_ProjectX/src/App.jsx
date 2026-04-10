import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CartProvider }     from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ProductsProvider } from './context/ProductsContext';
import { OrderProvider }    from './context/OrderContext';
import Login        from './pages/Login';
import Register     from './pages/Register';
import MagicLogin   from './pages/MagicLogin';
import SuperAdmin   from './pages/SuperAdmin';
import Admin        from './pages/Admin';
import Customer     from './pages/Customer';
import ProductDetail from './pages/ProductDetail';
import Cart         from './pages/Cart';
import Checkout     from './pages/Checkout';
import OrderHistory  from './pages/OrderHistory';
import OrderTracking from './pages/OrderTracking';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '813555895-17jm1hg9u64m3j0i9pelmim34l4lpdb4.apps.googleusercontent.com';

function ProtectedRoute({ children, role }) {
  const token    = localStorage.getItem('projectx_token');
  const userRole = localStorage.getItem('projectx_role');
  if (!token) return <Navigate to="/" />;
  if (role && role !== userRole) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ProductsProvider>
        <CartProvider>
          <WishlistProvider>
            <OrderProvider>
              <Router>
                <Routes>
                  <Route path="/"            element={<Login />} />
                  <Route path="/register"    element={<Register />} />
                  <Route path="/magic-login" element={<MagicLogin />} />
                  <Route path="/super-admin" element={<ProtectedRoute role="super_admin"><SuperAdmin /></ProtectedRoute>} />
                  <Route path="/admin"       element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
                  <Route path="/customer"    element={<ProtectedRoute role="customer"><Customer /></ProtectedRoute>} />
                  <Route path="/product/:id" element={<ProtectedRoute role="customer"><ProductDetail /></ProtectedRoute>} />
                  <Route path="/cart"        element={<ProtectedRoute role="customer"><Cart /></ProtectedRoute>} />
                  <Route path="/checkout"    element={<ProtectedRoute role="customer"><Checkout /></ProtectedRoute>} />
                  <Route path="/orders"      element={<ProtectedRoute role="customer"><OrderHistory /></ProtectedRoute>} />
                  <Route path="/orders/:id"  element={<ProtectedRoute role="customer"><OrderTracking /></ProtectedRoute>} />
                  <Route path="*"            element={<Navigate to="/" />} />
                </Routes>
              </Router>
            </OrderProvider>
          </WishlistProvider>
        </CartProvider>
      </ProductsProvider>
    </GoogleOAuthProvider>
  );
}
