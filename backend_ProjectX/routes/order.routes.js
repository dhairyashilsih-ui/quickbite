const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createOrder, getMyOrders, getAllOrders, updateOrderStatus } = require('../controllers/order.controller');

// Auth middleware
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const dec = jwt.verify(token, process.env.JWT_SECRET || 'projectx_secret');
    req.user = dec;
    next();
  } catch (e) {
    res.status(403).json({ success: false, message: 'Invalid token.' });
  }
};

// Customer routes
router.post('/', requireAuth, createOrder);
router.get('/my', requireAuth, getMyOrders);

// Admin routes
router.get('/all', requireAuth, getAllOrders);
router.put('/:id/status', requireAuth, updateOrderStatus);

module.exports = router;
