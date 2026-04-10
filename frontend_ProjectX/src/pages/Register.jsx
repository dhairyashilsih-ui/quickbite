import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, User, Briefcase, AlertCircle, Flame,
  ArrowRight, ShieldAlert, CheckCircle, ArrowLeft,
  CreditCard, MapPin, Building2
} from 'lucide-react';
import { registerUser } from '../utils/api';
import { getDeviceId, getDeviceBrand } from '../utils/deviceInfo';
import './Login.css';

export default function Register() {
  const [role, setRole]     = useState('customer');
  const [form, setForm]     = useState({
    name: '', email: '', password: '',
    businessName: '', gstin: '', pan: '', fssai: '',
    bankDetails: '', addressProof: '', upiId: ''
  });
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('projectx_token');
    const r     = localStorage.getItem('projectx_role');
    if (token && r) {
      if (r === 'super_admin') navigate('/super-admin');
      else if (r === 'admin')  navigate('/admin');
      else                     navigate('/customer');
    }
  }, []);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault(); setError(null);
    if (!form.name || !form.email || !form.password)
      return setError('Name, email, and password are required.');
    if (role === 'admin') {
      if (!form.businessName) return setError('Business Name is required.');
      if (!form.gstin)        return setError('GSTIN is mandatory for sellers.');
      if (!form.pan)          return setError('PAN is mandatory for sellers.');
      if (!form.fssai)        return setError('FSSAI License number is mandatory.');
      if (!form.bankDetails)  return setError('Bank Account Details are required for payouts.');
      if (!form.upiId)        return setError('UPI ID is required for payouts.');
      if (!form.addressProof) return setError('Address Proof is required.');
    }
    setLoading(true);
    try {
      const res = await registerUser({ ...form, role, deviceId: getDeviceId(), deviceBrand: getDeviceBrand() });
      setSuccess(res.data.message);
      if (role === 'customer' && res.data.token) {
        localStorage.setItem('projectx_token', res.data.token);
        localStorage.setItem('projectx_role', res.data.role);
        setTimeout(() => navigate('/customer'), 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  /* ── helpers ── */
  const Field = ({ label, icon: Icon, id, type = 'text', placeholder, value, onChange, mono }) => (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        <span className="auth-input-icon"><Icon size={15} /></span>
        <input id={id} type={type} className={`auth-input${mono ? ' auth-otp-input' : ''}`}
          placeholder={placeholder} value={value} onChange={onChange} />
      </div>
    </div>
  );

  const TextareaField = ({ label, id, placeholder, value, onChange }) => (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>{label}</label>
      <textarea id={id} rows={2} className="auth-input"
        style={{ height: 'auto', paddingTop: '0.65rem', paddingBottom: '0.65rem', resize: 'vertical', paddingLeft: '1rem' }}
        placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  );

  return (
    <div className="auth-page">

      {/* ── Left Panel ─────────────────────── */}
      <div className="auth-panel">
        <img src="/auth-banner.png" alt="QuickBite" />
        <div className="auth-panel-overlay">
          <div className="auth-panel-brand">
            <div className="auth-panel-logo"><Flame size={22} color="#e63946" strokeWidth={2.5} /></div>
            <div className="auth-panel-brand-name">Quick<span>Bite</span></div>
          </div>
          <h2 className="auth-panel-heading">
            {role === 'admin' ? 'Grow your\nbusiness online.' : 'Join thousands\nof happy diners.'}
          </h2>
          <p className="auth-panel-sub">
            {role === 'admin'
              ? 'Register as a seller to list your menu, accept orders, and get paid directly via UPI — all from one dashboard.'
              : 'Create your free account to order from top local restaurants, track deliveries live, and save your favorites.'}
          </p>
          <div className="auth-panel-pills">
            {role === 'admin' ? (
              <><span className="auth-panel-pill">UPI Payouts</span><span className="auth-panel-pill">Live Orders</span><span className="auth-panel-pill">Analytics</span></>
            ) : (
              <><span className="auth-panel-pill">Live Tracking</span><span className="auth-panel-pill">Secure Payments</span><span className="auth-panel-pill">Free Delivery</span></>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Form ─────────────────────── */}
      <div className="auth-form-side">
        <div className="auth-form-box">

          {/* Brand */}
          <div className="auth-brand-row">
            <div className="auth-brand-dot"><Flame size={18} color="#fff" strokeWidth={2.5} /></div>
            <span className="auth-brand-label">QuickBite</span>
          </div>

          <h1 className="auth-heading">Create account</h1>
          <p className="auth-sub">Join as a customer or register your restaurant</p>

          {/* Role Toggle */}
          <div className="auth-role-toggle">
            <button type="button" className={`auth-role-btn ${role === 'customer' ? 'active' : ''}`} onClick={() => setRole('customer')}>
              <User size={15} /> Customer
            </button>
            <button type="button" className={`auth-role-btn ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>
              <Building2 size={15} /> Seller / Restaurant
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="auth-alert error">
              <AlertCircle size={15} /><span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div className="auth-success-circle">
                <CheckCircle size={34} color="#16a34a" strokeWidth={1.5} />
              </div>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '8px', color: '#111' }}>
                {role === 'admin' ? 'Application Submitted!' : 'Account Created!'}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{success}</p>
              {role === 'admin' && (
                <button className="btn-auth-secondary" onClick={() => navigate('/')} style={{ marginTop: 0 }}>
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister}>
              {/* ── Basic Fields ── */}
              <Field label="Full Name" icon={User} id="name" placeholder="John Doe" value={form.name} onChange={set('name')} />
              <Field label="Email Address" icon={Mail} id="email" type="email" placeholder="john@example.com" value={form.email} onChange={set('email')} />
              <Field label="Password" icon={Lock} id="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} />

              {/* ── Seller-Only Fields ── */}
              {role === 'admin' && (
                <>
                  <div className="auth-section-title">Legal &amp; Business Details</div>
                  <Field label="Business / Restaurant Name" icon={Building2} id="businessName" placeholder="Spice Garden Restaurant" value={form.businessName} onChange={set('businessName')} />
                  <Field label="GSTIN Number" icon={Briefcase} id="gstin" placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))} />
                  <Field label="PAN Card" icon={CreditCard} id="pan" placeholder="ABCDE1234F" value={form.pan} onChange={e => setForm(f => ({ ...f, pan: e.target.value.toUpperCase() }))} />
                  <Field label="FSSAI License Number" icon={ShieldAlert} id="fssai" placeholder="14-digit FSSAI number" value={form.fssai} onChange={set('fssai')} />

                  <div className="auth-section-title">Payout Details</div>
                  <Field label="UPI ID (for payouts)" icon={CreditCard} id="upiId" placeholder="yourname@upi or 98765@paytm" value={form.upiId} onChange={set('upiId')} />
                  <TextareaField label="Bank Account Details" id="bankDetails" placeholder="Bank Name, Account No, IFSC Code" value={form.bankDetails} onChange={set('bankDetails')} />

                  <div className="auth-section-title">Address</div>
                  <TextareaField label="Restaurant / Warehouse Address Proof" id="addressProof" placeholder="Full address + proof type (Utility Bill, Rent Agreement…)" value={form.addressProof} onChange={set('addressProof')} />
                </>
              )}

              <div style={{ marginTop: '1.5rem' }}>
                <button type="submit" className="btn-auth-primary" disabled={loading}>
                  {loading
                    ? <><div className="auth-spinner" /> Processing…</>
                    : <>{role === 'admin' ? 'Submit Application' : 'Create Account'} <ArrowRight size={15} /></>}
                </button>
              </div>

              <div className="auth-divider" style={{ margin: '1.25rem 0' }}>already have an account?</div>

              <button type="button" className="btn-auth-secondary" style={{ marginTop: 0 }} onClick={() => navigate('/')}>
                Sign in instead
              </button>
            </form>
          )}

          <div className="auth-footer">
            <ShieldAlert size={12} /> Secured by QuickBite &nbsp;·&nbsp; 256-bit SSL
          </div>
        </div>
      </div>
    </div>
  );
}
