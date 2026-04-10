const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// ── CORS: allow Vercel frontend in production, any origin in dev ──
const ALLOWED_ORIGINS = [
  'http://localhost:5173',   // Vite dev
  'http://localhost:4173',   // Vite preview
  process.env.FRONTEND_URL,  // e.g. https://quickbite.vercel.app
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow Postman / curl / same-origin (no origin header)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/orders',   require('./routes/order.routes'));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (Connected to Supabase REST API)`));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
  }
};

startServer();
