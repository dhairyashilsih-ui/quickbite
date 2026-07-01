const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const { createRazorpayOrder, verifyPayment } = require('../controllers/razorpay.controller');

// Auth middleware (reuse same pattern as order routes)
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const dec = jwt.verify(token, process.env.JWT_SECRET || 'projectx_secret');
    req.user = dec;
    next();
  } catch (e) {
    res.status(403).json({ success: false, message: `Invalid token: ${e.message}` });
  }
};

// POST /api/payments/create-order → Create Razorpay order (requires login)
router.post('/create-order', requireAuth, createRazorpayOrder);

// POST /api/payments/verify → Verify payment signature (requires login)
router.post('/verify', requireAuth, verifyPayment);

module.exports = router;
