import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, CreditCard, Smartphone, Wallet,
  CheckCircle, Lock, ChevronRight, ShoppingBag
} from 'lucide-react';

import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import './Checkout.css';

const PAYMENT_METHODS = [
  { id: 'razorpay', label: 'Pay Online (Razorpay)', icon: <CreditCard size={20} />, desc: 'UPI • Cards • NetBanking' },
  { id: 'cod',      label: 'Cash on Delivery',      icon: <Wallet     size={20} />, desc: 'Pay when you receive' },
];

const DELIVERY_FEE = 49;
const PLATFORM_FEE = 5;

export default function Checkout() {
  const navigate   = useNavigate();
  const { cart, cartTotal, cartMrp, clearCart } = useCart();
  const { placeOrder } = useOrders();

  /* form state */
  const [step,           setStep]     = useState(1); // 1 = address, 2 = payment, 3 = success
  const [address,        setAddress]  = useState('');
  const [landmark,       setLandmark] = useState('');
  const [pincode,        setPincode]  = useState('');
  const [name,           setName]     = useState('');
  const [phone,          setPhone]    = useState('');
  const [payMethod,      setPayMethod]= useState('razorpay');
  const [placing,        setPlacing]  = useState(false);
  const [error,          setError]    = useState('');
  const [placedOrder,    setPlaced]   = useState(null);
  const [payAnim,        setPayAnim]  = useState(false);   // payment "processing" animation

  const discount    = cartMrp - cartTotal;
  const deliveryFee = cartTotal > 499 ? 0 : DELIVERY_FEE;
  const grandTotal  = cartTotal + PLATFORM_FEE + deliveryFee;

  /* step 1 validation */
  const handleAddressNext = () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !pincode.trim()) {
      setError('Please fill all required fields.');
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setError('Enter a valid 10-digit phone number.');
      return;
    }
    if (!/^\d{6}$/.test(pincode.trim())) {
      setError('Enter a valid 6-digit PIN code.');
      return;
    }
    setError('');
    setStep(2);
  };

  /* step 2: place order & payment handler */
  const handlePayNow = async () => {
    setPlacing(true);
    setError('');

    try {
      const addressFull = `${name}, ${phone} | ${address}${landmark ? ', ' + landmark : ''}, PIN ${pincode}`;
      const payload = {
        items: cart.map(i => ({ id: i.id, name: i.name, image: i.image, price: i.price, qty: i.qty })),
        address: addressFull,
        paymentMethod: payMethod,
        subtotal:    cartTotal,
        deliveryFee: deliveryFee,
        platformFee: PLATFORM_FEE,
        discount:    discount,
        total:       grandTotal,
      };

      if (payMethod === 'razorpay') {
        // Place the order BEFORE leaving the page so it's recorded
        const order = await placeOrder(payload);

        let purchased = JSON.parse(localStorage.getItem('qb_purchased') || '[]');
        const newIds = cart.map(i => i.id);
        purchased = [...new Set([...purchased, ...newIds])].slice(-50);
        localStorage.setItem('qb_purchased', JSON.stringify(purchased));

        clearCart();
        
        // Browser security (3rd party cookies) prevents Razorpay.me from working inside an iframe.
        // We open it directly in the same window, bypassing the error lock completely.
        window.location.href = `https://razorpay.me/@dhairyashildeepakshinde?amount=${grandTotal}&phone=${phone}`;
        return;
      }

      // COD Flow
      setPayAnim(true);
      await new Promise(r => setTimeout(r, 2000));
      setPayAnim(false);

      const order = await placeOrder(payload);

      let purchased = JSON.parse(localStorage.getItem('qb_purchased') || '[]');
      const newIds = cart.map(i => i.id);
      purchased = [...new Set([...purchased, ...newIds])].slice(-50);
      localStorage.setItem('qb_purchased', JSON.stringify(purchased));

      clearCart();
      setPlaced(order);
      setStep(3);
    } catch (err) {
      setError('Order failed. Please try again.');
      setPlacing(false);
    }
  };


  /* ─────────────── RENDER ─────────────────── */
  return (
    <div className="co-page">

      {/* NAV */}
      <nav className="co-nav">
        <div className="co-nav-brand">
          <span className="q">Quick</span><span className="b">Bite</span>
        </div>
        {step < 3 && (
          <button className="co-back" onClick={() => step === 1 ? navigate('/cart') : setStep(1)}>
            <ArrowLeft size={15} /> {step === 1 ? 'Back to Cart' : 'Back to Address'}
          </button>
        )}
      </nav>

      {step < 3 && (
        <>
          {/* BREADCRUMB STEPS */}
          <div className="co-steps">
            {['Confirm Cart', 'Address', 'Payment'].map((s, i) => (
              <React.Fragment key={s}>
                <div className={`co-step ${step > i ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
                  <div className="co-step-circle">{step > i + 1 ? <CheckCircle size={14} /> : i + 1}</div>
                  <span className="co-step-label">{s}</span>
                </div>
                {i < 2 && <div className={`co-step-line ${step > i + 1 ? 'done' : ''}`} />}
              </React.Fragment>
            ))}
          </div>
        </>
      )}

      <div className="co-body">

        {/* ─── STEP 1: Cart Confirmation (shown always on left) ─── */}
        {step < 3 && (
          <div className="co-left">

            {/* CART ITEMS */}
            <div className="co-card">
              <p className="co-card-title">🛍️ Order Summary ({cart.length} items)</p>
              <div className="co-item-list">
                {cart.map(item => (
                  <div key={item.id} className="co-item">
                    <img src={item.image} alt={item.name} className="co-item-img" />
                    <div className="co-item-info">
                      <div className="co-item-name">{item.name}</div>
                      <div className="co-item-qty">× {item.qty}</div>
                    </div>
                    <div className="co-item-price">₹{item.price * item.qty}</div>
                  </div>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="co-price-rows">
                <div className="co-price-row"><span>Item Total</span><span>₹{cartTotal}</span></div>
                {discount > 0 && <div className="co-price-row green"><span>Discount</span><span>− ₹{discount}</span></div>}
                <div className="co-price-row"><span>Delivery Fee</span><span>{deliveryFee === 0 ? 'FREE 🎉' : `₹${deliveryFee}`}</span></div>
                <div className="co-price-row"><span>Platform Fee</span><span>₹{PLATFORM_FEE}</span></div>
                <div className="co-price-row total"><span>Total to Pay</span><span>₹{grandTotal}</span></div>
              </div>
            </div>

            {/* ─── STEP 1: Address Input ─── */}
            {step === 1 && (
              <div className="co-card">
                <p className="co-card-title"><MapPin size={16} /> Delivery Address</p>
                {error && <div className="co-error">{error}</div>}

                <div className="co-form-grid">
                  <div className="co-field">
                    <label>Full Name *</label>
                    <input placeholder="e.g. Rahul Sharma" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="co-field">
                    <label>Phone Number *</label>
                    <input placeholder="10-digit mobile" maxLength={10} value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                  <div className="co-field full">
                    <label>House / Flat / Street Address *</label>
                    <input placeholder="e.g. Flat 302, Green Park Apartments, MG Road" value={address} onChange={e => setAddress(e.target.value)} />
                  </div>
                  <div className="co-field">
                    <label>Landmark (optional)</label>
                    <input placeholder="e.g. Near City Mall" value={landmark} onChange={e => setLandmark(e.target.value)} />
                  </div>
                  <div className="co-field">
                    <label>PIN Code *</label>
                    <input placeholder="6-digit PIN" maxLength={6} value={pincode} onChange={e => setPincode(e.target.value)} />
                  </div>
                </div>

                <button className="co-primary-btn" onClick={handleAddressNext}>
                  Choose Payment Method <ChevronRight size={17} />
                </button>
              </div>
            )}

            {/* ─── STEP 2: Payment ─── */}
            {step === 2 && (
              <div className="co-card">
                <p className="co-card-title"><CreditCard size={16} /> Select Payment Method</p>
                {error && <div className="co-error">{error}</div>}

                <div className="co-pay-methods">
                  {PAYMENT_METHODS.map(m => (
                    <label key={m.id} className={`co-pay-method ${payMethod === m.id ? 'selected' : ''}`}>
                      <input type="radio" name="pay" value={m.id} checked={payMethod === m.id} onChange={() => setPayMethod(m.id)} />
                      <div className="co-pay-icon">{m.icon}</div>
                      <div className="co-pay-info">
                        <div className="co-pay-label">{m.label}</div>
                        <div className="co-pay-desc">{m.desc}</div>
                      </div>
                      {payMethod === m.id && <CheckCircle size={18} className="co-pay-check" />}
                    </label>
                  ))}
                </div>

                <button className="co-primary-btn co-pay-btn" onClick={handlePayNow} disabled={placing || payAnim}>
                  {placing || payAnim ? '⏳ Processing…' : 
                   payMethod === 'razorpay' ? `💳 Pay ₹${grandTotal} (Online Component)` : 
                   `📦 Place Order (Cash on Delivery)`}
                </button>

                <p className="co-safe-txt"><Lock size={12} /> 100% Secure Payments · 256-bit SSL Encrypted</p>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: SUCCESS ─── */}
        {step === 3 && placedOrder && (
          <div className="co-success-wrap">
            <div className="co-success-card">
              <div className="co-success-icon">✅</div>
              <h1 className="co-success-title">Order Placed Successfully! 🎉</h1>
              <p className="co-success-sub">Your food is being prepared and will reach you soon.</p>

              <div className="co-order-info">
                <div className="co-order-info-row">
                  <span>Order ID</span>
                  <span className="co-order-id"># {placedOrder.order_id}</span>
                </div>
                <div className="co-order-info-row">
                  <span>Payment</span>
                  <span>✅ {PAYMENT_METHODS.find(m => m.id === placedOrder.payment_method)?.label || placedOrder.payment_method}</span>
                </div>
                <div className="co-order-info-row">
                  <span>Total Paid</span>
                  <span className="co-order-total">₹{placedOrder.total}</span>
                </div>
                <div className="co-order-info-row">
                  <span>Deliver To</span>
                  <span style={{ textAlign: 'right', maxWidth: '60%' }}>{placedOrder.address}</span>
                </div>
              </div>

              <div className="co-success-actions">
                <button className="co-primary-btn" onClick={() => navigate(`/orders/${placedOrder.id}`)}>
                  Track My Order 🚚
                </button>
                <button className="co-outline-btn" onClick={() => navigate('/customer')}>
                  <ShoppingBag size={16} /> Continue Shopping
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
