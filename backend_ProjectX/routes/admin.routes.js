const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// A simple auth middleware checking for super_admin token
const requireSuperAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const dec = jwt.verify(token, process.env.JWT_SECRET || 'projectx_secret');
    if (dec.role !== 'super_admin') throw new Error('Not admin');
    next();
  } catch(e) {
    res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
};

const { getPendingSellers, approveSeller, getAllUsers, toggleBlockUser } = require('../controllers/admin.controller');

router.get('/pending-sellers', requireSuperAdmin, getPendingSellers);
router.post('/approve-seller/:id', requireSuperAdmin, approveSeller);
router.get('/users', requireSuperAdmin, getAllUsers);
router.post('/toggle-block/:id', requireSuperAdmin, toggleBlockUser);

module.exports = router;
