const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Auth middleware extracting Seller ID
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const dec = jwt.verify(token, process.env.JWT_SECRET || 'projectx_secret');
    req.user = dec; // { id, email, role }
    next();
  } catch(e) {
    res.status(403).json({ success: false, message: 'Invalid token.' });
  }
};

const { getProducts, addProduct, updateProduct, getRecommendations } = require('../controllers/product.controller');

// Public route to get products (for customer dashboard + admin dashboard)
router.get('/', getProducts);
router.post('/recommendations', getRecommendations);

// Protected routes (Admin/Seller only)
// Note: In strict env we'd check req.user.role === 'admin'
router.post('/', requireAuth, addProduct);
router.put('/:id', requireAuth, updateProduct);

module.exports = router;
