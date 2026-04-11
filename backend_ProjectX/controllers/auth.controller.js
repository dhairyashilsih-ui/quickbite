const bcrypt         = require('bcrypt');
const jwt            = require('jsonwebtoken');
const crypto         = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { sendOtpEmail } = require('../services/emailService');
const { supabase } = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'projectx_secret';
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '813555895-17jm1hg9u64m3j0i9pelmim34l4lpdb4.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ── helpers ──────────────────────────────────────────────────────────────────
const generateOtp  = () => crypto.randomInt(100000, 999999).toString();
const issueToken   = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1d' });

// ── Supabase Logging Helpers ─────────────────────────────────────────────────
const logLoginActivity = async (userId, deviceBrand, location) => {
  await supabase.from('login_activities').insert({ user_id: userId, device_brand: deviceBrand, location });
};

const updateDeviceBehavior = async (userId, deviceId) => {
  const { data: doc } = await supabase.from('device_behaviors').select('*').eq('user_id', userId).eq('device_id', deviceId).maybeSingle();
  if (doc) {
    await supabase.from('device_behaviors').update({ usage_count: doc.usage_count + 1, last_used: new Date() }).eq('id', doc.id);
  } else {
    await supabase.from('device_behaviors').insert({ user_id: userId, device_id: deviceId, usage_count: 1, last_used: new Date() });
  }
};

const logSecurityEvent = async (userId, event, risk) => {
  await supabase.from('security_events').insert({ user_id: userId, event, risk });
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { 
      name, email, password, role, businessName, 
      gstin, pan, fssai, bankDetails, addressProof, upiId,
      deviceBrand = 'Unknown', deviceId = 'unknown' 
    } = req.body;
    
    // Check existing
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = role === 'admin' ? 'admin' : 'customer';
    const assignedStatus = role === 'admin' ? 'pending' : 'active';
    
    // Insert User
    const { data: user, error } = await supabase.from('users').insert({
      name, email, password: hashedPassword, role: assignedRole, status: assignedStatus
    }).select().single();

    if (error) throw error;

    if (assignedRole === 'admin') {
      const { error: profileErr } = await supabase.from('seller_profiles').insert({ 
        user_id: user.id, 
        business_name: businessName,
        gstin, 
        pan, 
        fssai, 
        bank_details: bankDetails, 
        address_proof: addressProof,
        upi_id: upiId
      });
      if (profileErr) {
        console.error('Seller Profile Insert Error:', profileErr);
        throw profileErr;
      }
      await logLoginActivity(user.id, deviceBrand, 'Pune');
      return res.status(200).json({ success: true, message: 'Seller registration pending approval.' });
    } else {
      // Auto-trust this device so next login doesn't require OTP
      if (deviceId && deviceId !== 'unknown') {
        await supabase.from('trusted_devices').insert({ user_id: user.id, device_id: deviceId });
      }
      await logLoginActivity(user.id, deviceBrand, 'Pune');
      await logSecurityEvent(user.id, 'user_registered', 'low');
      const token = issueToken(user);
      return res.status(200).json({ success: true, message: 'Customer registered successfully.', token, role: user.role });
    }
  } catch (err) {
    console.error('Register Error:', err.message || err);
    res.status(500).json({ success: false, message: 'Registration failed: ' + (err?.message || err?.details || JSON.stringify(err) || 'Server Error') });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password, deviceId, deviceBrand = 'Unknown-Device' } = req.body;

    // 1️⃣ Find user
    const { data: user, error: userErr } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (userErr) throw userErr;
    console.log('[LOGIN] email received:', email, '| user found:', !!user);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (user.status === 'pending') return res.status(401).json({ success: false, message: 'Account pending Super Admin approval.' });

    // 2️⃣ Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('[LOGIN] password match:', isMatch);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // 3️⃣ Check trusted_devices
    const { data: trusted } = await supabase.from('trusted_devices').select('*').eq('user_id', user.id).eq('device_id', deviceId).maybeSingle();

    // 4️⃣ Supabase Logging
    await logLoginActivity(user.id, deviceBrand, 'Pune');
    await updateDeviceBehavior(user.id, deviceId);

    if (!trusted) {
      await supabase.from('trusted_devices').insert({ user_id: user.id, device_id: deviceId });
      await logSecurityEvent(user.id, 'new_device_login_bypassed_otp', 'low');
    } else {
      await logSecurityEvent(user.id, 'trusted_device_login', 'low');
    }

    const token = issueToken(user);
    return res.status(200).json({ success: true, message: 'Login success (OTP Bypassed)', token, role: user.role });

  } catch (error) {
    console.error('Login Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
const verifyOtp = async (req, res) => {
  try {
    const { userId, deviceId, otp } = req.body;

    const { data: otpRecord } = await supabase.from('otps').select('*').eq('user_id', userId).maybeSingle();
    if (!otpRecord) return res.status(400).json({ success: false, message: 'OTP expired or not found. Please login again.' });

    // Verify OTP (Time check)
    const diffMins = (new Date() - new Date(otpRecord.created_at)) / 60000;
    if (diffMins > 5) {
      await supabase.from('otps').delete().eq('id', otpRecord.id);
      return res.status(400).json({ success: false, message: 'OTP expired. Please try again.' });
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp_hash);
    if (!isValid) return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });

    // Trust device
    await supabase.from('trusted_devices').insert({ user_id: userId, device_id: deviceId });
    await supabase.from('otps').delete().eq('id', otpRecord.id);
    await logSecurityEvent(userId, 'device_trusted', 'low');

    const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    const token = issueToken(user);

    return res.status(200).json({ success: true, message: 'Device trusted and logged in', token, role: user.role });

  } catch (error) {
    console.error('OTP Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── POST /api/auth/google ─────────────────────────────────────────────────────
const googleAuth = async (req, res) => {
  try {
    const { credential, deviceId, deviceBrand = 'Unknown-Device' } = req.body;

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${credential}` }
    });
    const payload = await userInfoResponse.json();
    if (!payload.email) return res.status(400).json({ success: false, message: 'Google Auth failed' });
    const { email, name } = payload;

    // Find user
    let { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    
    if (!user) {
      const roleName = email === 'dhairyashilshinde6715@gmail.com' ? 'super_admin' : 'customer';
      const randomPass = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPass, 10);
      const { data: newUser, error } = await supabase.from('users').insert({
        name, email, password: hashedPassword, role: roleName, status: 'active'
      }).select().single();
      if (error) throw error;
      user = newUser;
    } else if (user.status === 'pending') {
      return res.status(401).json({ success: false, message: 'Account pending Super Admin approval.' });
    }

    const { data: trusted } = await supabase.from('trusted_devices').select('*').eq('user_id', user.id).eq('device_id', deviceId).maybeSingle();

    await logLoginActivity(user.id, deviceBrand, 'Pune');
    await updateDeviceBehavior(user.id, deviceId);

    if (!trusted) {
      await supabase.from('trusted_devices').insert({ user_id: user.id, device_id: deviceId });
      await logSecurityEvent(user.id, 'new_device_google_login_bypassed_otp', 'low');
    } else {
      await logSecurityEvent(user.id, 'trusted_device_login', 'low');
    }

    const token = issueToken(user);
    return res.status(200).json({ success: true, message: 'Google Login success (OTP Bypassed)', token, role: user.role });

  } catch (error) {
    console.error('Google Auth Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Google Auth failed' });
  }
};

// ── POST /api/auth/magic-login ────────────────────────────────────────────────
const magicLogin = async (req, res) => {
  try {
    const { token, deviceId, deviceBrand = 'Unknown' } = req.body;
    
    const { data: magicLink } = await supabase.from('magic_links').select('*').eq('token', token).maybeSingle();
    if (!magicLink || new Date(magicLink.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Link expired or invalid.' });
    }

    const { data: user } = await supabase.from('users').select('*').eq('id', magicLink.user_id).maybeSingle();
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });

    const { data: trusted } = await supabase.from('trusted_devices').select('*').eq('user_id', user.id).eq('device_id', deviceId).maybeSingle();
    if (!trusted) {
       await supabase.from('trusted_devices').insert({ user_id: user.id, device_id: deviceId });
    }

    await logLoginActivity(user.id, deviceBrand, 'Pune');
    await updateDeviceBehavior(user.id, deviceId);
    await logSecurityEvent(user.id, 'magic_link_login', 'low');

    await supabase.from('magic_links').delete().eq('id', magicLink.id);

    const authToken = issueToken(user);
    return res.status(200).json({ success: true, message: 'Magic login success', token: authToken, role: user.role });

  } catch (error) {
    console.error('Magic Login Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Magic login failed.' });
  }
};

module.exports = { register, login, verifyOtp, googleAuth, magicLogin };
