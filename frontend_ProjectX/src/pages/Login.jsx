import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import {
  Mail, Lock, Eye, EyeOff, Shield, Smartphone,
  AlertCircle, CheckCircle, AlertTriangle, KeyRound,
  ArrowLeft, Flame, UserPlus, ShieldCheck
} from 'lucide-react';
import { getDeviceId, getDeviceBrand } from '../utils/deviceInfo';
import { loginUser, verifyOtp, googleLoginAPI } from '../utils/api';
import './Login.css';

const GoogleIcon = () => (
  <svg width="17" height="17" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.5 30.2 0 24 0 14.8 0 7 5.4 3.2 13.3l7.8 6.1C12.9 13.3 18 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
    <path fill="#FBBC05" d="M11 28.4c-.6-1.7-.9-3.5-.9-5.4s.3-3.7.9-5.4L3.2 11.5C1.2 15.1 0 19.4 0 24s1.2 8.9 3.2 12.5l7.8-6.1z"/>
    <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.7 2.2-7.7 2.2-6 0-11.1-3.9-12.9-9.3l-7.8 6.1C7 42.6 14.8 48 24 48z"/>
  </svg>
);

const STEP_LOGIN = 'LOGIN';
const STEP_OTP   = 'OTP';
const STEP_DONE  = 'DONE';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp]           = useState('');
  const [showPass, setShowPass] = useState(false);
  const [step, setStep]         = useState(STEP_LOGIN);
  const [userId, setUserId]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [alert, setAlert]       = useState(null);
  const [errors, setErrors]     = useState({});

  const navigate    = useNavigate();
  const deviceId    = getDeviceId();
  const deviceBrand = getDeviceBrand();

  useEffect(() => {
    const token = localStorage.getItem('projectx_token');
    const role  = localStorage.getItem('projectx_role');
    if (token && role) routeByRole(role);
  }, []);

  const showAlert  = (type, msg) => setAlert({ type, msg });
  const clearAlert = () => setAlert(null);

  const routeByRole = (role) => {
    if (role === 'super_admin') navigate('/super-admin', { replace: true });
    else if (role === 'admin')  navigate('/admin',       { replace: true });
    else                        navigate('/customer',    { replace: true });
  };

  const validateLogin = () => {
    const e = {};
    if (!email.trim())                   e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email  = 'Enter a valid email';
    if (!password)                        e.password = 'Password is required';
    else if (password.length < 6)         e.password = 'Minimum 6 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const validateOtp = () => {
    const e = {};
    if (!otp.trim())       e.otp = 'OTP is required';
    else if (otp.length !== 6) e.otp = 'OTP must be 6 digits';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleLogin = async (ev) => {
    ev.preventDefault(); clearAlert();
    if (!validateLogin()) return;
    setLoading(true);
    try {
      const res = await loginUser({ email, password, deviceId, deviceBrand });
      if (res.data.success && res.data.token) {
        localStorage.setItem('projectx_token', res.data.token);
        localStorage.setItem('projectx_role', res.data.role);
        showAlert('success', 'Login successful — redirecting…');
        setStep(STEP_DONE);
        setTimeout(() => routeByRole(res.data.role), 900);
      } else if (res.data.message === 'REQUIRE_OTP') {
        setUserId(res.data.userId);
        showAlert('warning', `New device detected. A 6-digit OTP has been sent to ${email}.`);
        setStep(STEP_OTP);
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (ev) => {
    ev.preventDefault(); clearAlert();
    if (!validateOtp()) return;
    setLoading(true);
    try {
      const res = await verifyOtp({ userId, deviceId, otp });
      if (res.data.success) {
        localStorage.setItem('projectx_token', res.data.token);
        localStorage.setItem('projectx_role', res.data.role);
        showAlert('success', 'Device verified — logging in…');
        setStep(STEP_DONE);
        setTimeout(() => routeByRole(res.data.role), 800);
      }
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'OTP verification failed.');
    } finally { setLoading(false); }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true); clearAlert();
      try {
        const res = await googleLoginAPI({ credential: tokenResponse.access_token, deviceId, deviceBrand });
        if (res.data.success && res.data.token) {
          localStorage.setItem('projectx_token', res.data.token);
          localStorage.setItem('projectx_role', res.data.role);
          showAlert('success', 'Google sign-in successful!');
          setStep(STEP_DONE);
          setTimeout(() => routeByRole(res.data.role), 800);
        } else if (res.data.message === 'REQUIRE_OTP') {
          setUserId(res.data.userId);
          showAlert('warning', 'New device detected. OTP sent to your email.');
          setStep(STEP_OTP);
        }
      } catch (err) {
        showAlert('error', err.response?.data?.message || 'Google sign-in failed.');
      } finally { setLoading(false); }
    },
    onError: () => showAlert('error', 'Google sign-in popup failed. Please try again.'),
  });

  const headings = {
    [STEP_LOGIN]: { title: 'Welcome back',     sub: 'Sign in to continue to your account'           },
    [STEP_OTP]:   { title: 'Verify device',    sub: `Code sent to ${email}`                        },
    [STEP_DONE]:  { title: 'You\'re in!',      sub: 'Redirecting you now…'                          },
  };

  return (
    <div className="auth-page">

      {/* ── Left Panel ────────────────────────── */}
      <div className="auth-panel">
        <img src="/auth-banner.png" alt="QuickBite" />
        <div className="auth-panel-overlay">
          <div className="auth-panel-brand">
            <div className="auth-panel-logo">
              <Flame size={20} color="#e63946" strokeWidth={2.5} />
            </div>
            <div className="auth-panel-brand-name">Quick<span>Bite</span></div>
          </div>

          <div className="auth-panel-body">
            <h2 className="auth-panel-heading">{"Delicious food,\ndelivered fast."}</h2>
            <p className="auth-panel-sub">
              Browse hundreds of menu items from local restaurants, track your orders live, and enjoy seamless, secure checkout.
            </p>
          </div>

          <div className="auth-panel-pills">
            <span className="auth-panel-pill">Real-time Tracking</span>
            <span className="auth-panel-pill">Secure Payments</span>
            <span className="auth-panel-pill">500+ Items</span>
          </div>
        </div>
      </div>

      {/* ── Right Form ────────────────────────── */}
      <div className="auth-form-side">
        <div className="auth-form-box">

          {/* Brand */}
          <div className="auth-brand-row">
            <div className="auth-brand-dot"><Flame size={16} color="#fff" strokeWidth={2.5} /></div>
            <span className="auth-brand-label">QuickBite</span>
          </div>

          {/* Heading */}
          <h1 className="auth-heading">{headings[step].title}</h1>
          <p className="auth-sub">{headings[step].sub}</p>

          {/* Device chip */}
          <div className="auth-device-chip"><Smartphone size={10} /> {deviceBrand}</div>

          {/* Alert */}
          {alert && (
            <div className={`auth-alert ${alert.type}`}>
              {alert.type === 'success' && <CheckCircle size={14} />}
              {alert.type === 'error'   && <AlertCircle size={14} />}
              {alert.type === 'warning' && <AlertTriangle size={14} />}
              <span>{alert.msg}</span>
            </div>
          )}

          {/* ══ STEP: LOGIN ══ */}
          {step === STEP_LOGIN && (
            <>
              <button className="btn-google-auth" onClick={() => googleLogin()} disabled={loading}>
                <GoogleIcon /> Continue with Google
              </button>

              <div className="auth-divider">or sign in with email</div>

              <form onSubmit={handleLogin} noValidate>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="email">Email address</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><Mail size={14} /></span>
                    <input id="email" type="email" className={`auth-input${errors.email ? ' has-error' : ''}`}
                      placeholder="you@example.com" value={email} autoComplete="email"
                      onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })); }} />
                  </div>
                  {errors.email && <div className="auth-error-msg"><AlertCircle size={11} />{errors.email}</div>}
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="password">Password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><Lock size={14} /></span>
                    <input id="password" type={showPass ? 'text' : 'password'}
                      className={`auth-input${errors.password ? ' has-error' : ''}`}
                      placeholder="••••••••" value={password} autoComplete="current-password"
                      onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }} />
                    <button type="button" className="auth-input-toggle" onClick={() => setShowPass(p => !p)}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && <div className="auth-error-msg"><AlertCircle size={11} />{errors.password}</div>}
                </div>

                <div style={{ marginTop: '1.25rem' }}>
                  <button type="submit" className="btn-auth-primary" disabled={loading}>
                    {loading ? <><div className="auth-spinner" /> Signing in…</> : 'Sign In'}
                  </button>
                  <button type="button" className="btn-auth-secondary" onClick={() => navigate('/register')} disabled={loading}>
                    <UserPlus size={14} /> Create an account
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ══ STEP: OTP ══ */}
          {step === STEP_OTP && (
            <form onSubmit={handleVerifyOtp} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="otp">One-time password</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon"><KeyRound size={14} /></span>
                  <input id="otp" type="text" inputMode="numeric" maxLength={6} autoFocus
                    className={`auth-input auth-otp-input${errors.otp ? ' has-error' : ''}`}
                    placeholder="000000" value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setErrors(p => ({ ...p, otp: undefined })); }} />
                </div>
                {errors.otp && <div className="auth-error-msg"><AlertCircle size={11} />{errors.otp}</div>}
              </div>
              <div style={{ marginTop: '1.25rem' }}>
                <button type="submit" className="btn-auth-primary" disabled={loading}>
                  {loading ? <><div className="auth-spinner" /> Verifying…</> : <><ShieldCheck size={14} /> Verify &amp; Sign In</>}
                </button>
                <button type="button" className="btn-auth-secondary"
                  onClick={() => { setStep(STEP_LOGIN); setOtp(''); clearAlert(); setErrors({}); }}>
                  <ArrowLeft size={13} /> Back to Login
                </button>
              </div>
            </form>
          )}

          {/* ══ STEP: DONE ══ */}
          {step === STEP_DONE && (
            <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
              <div className="auth-success-circle">
                <CheckCircle size={32} color="#16a34a" strokeWidth={1.5} />
              </div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>You have been authenticated.</p>
            </div>
          )}

          {/* Footer */}
          <div className="auth-footer">
            <Shield size={11} /> Secured by QuickBite &nbsp;·&nbsp; 256-bit SSL
          </div>
        </div>
      </div>
    </div>
  );
}
