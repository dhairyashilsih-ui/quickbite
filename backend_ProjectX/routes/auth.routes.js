const express = require('express');
const { register, login, verifyOtp, googleAuth, magicLogin } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/google', googleAuth);
router.post('/magic-login', magicLogin);

module.exports = router;
