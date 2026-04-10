import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Minus, Plus, ChevronRight, Lock, Tag, Trash2, ClipboardList } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './Cart.css';

const DELIVERY_FEE = 49;
const PLATFORM_FEE = 5;

export default function Cart() {
  const navigate = useNavigate();
  const { cart, updateQty, removeFromCart, cartTotal, cartMrp } = useCart();
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponCode, setCouponCode]       = useState('');
  const [couponInput, showCouponInput]    = useState(false);

  const discount    = cartMrp - cartTotal;
  const couponDisc  = couponApplied ? Math.round(cartTotal * 0.1) : 0;
  const deliveryFee = cartTotal > 499 ? 0 : DELIVERY_FEE;
  const grandTotal  = cartTotal - couponDisc + PLATFORM_FEE + deliveryFee;
  const totalSavings = discount + couponDisc + (DELIVERY_FEE - deliveryFee);

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === 'WELCOME20' || couponCode.toUpperCase() === 'QB10') {
      setCouponApplied(true);
      showCouponInput(false);
    }
  };

  return (
    <div className="cart-page">

      {/* ── NAV ─────────────────────────────── */}
      <nav className="cart-nav">
        <div className="cart-nav-brand">
          <span className="q">Quick</span>
          <span className="b">Bite</span>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="cart-back-btn" onClick={() => navigate('/orders')}>
            <ClipboardList size={15} /> My Orders
          </button>
          <button className="cart-back-btn" onClick={() => navigate('/customer')}>
            <ArrowLeft size={15} /> Continue Shopping
          </button>
        </div>
      </nav>

      {/* ── BREADCRUMB ─────────────────────── */}
      <div className="cart-breadcrumb">
        <span className="cbc" onClick={() => navigate('/customer')}>Home</span>
        <ChevronRight size={13} color="#ccc" />
        <span className="cbc-cur">My Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
      </div>

      {/* ── BODY ───────────────────────────── */}
      <div className="cart-body">

        {/* LEFT: Items */}
        <div className="cart-items-panel">
          <p className="cart-panel-title">🛍️ Your Order</p>

          {cart.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">🛒</div>
              <div className="cart-empty-title">Your cart is empty</div>
              <div className="cart-empty-sub">Looks like you haven't added anything yet.</div>
              <button className="cart-empty-btn" onClick={() => navigate('/customer')}>
                <ShoppingBag size={18} /> Browse Menu
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item-card">
                <img
                  src={item.image}
                  alt={item.name}
                  className="cart-item-img"
                  onClick={() => navigate(`/product/${item.id}`)}
                  style={{ cursor: 'pointer' }}
                />
                <div className="cart-item-info">
                  <div className="cart-item-cat">{item.category}</div>
                  <div className="cart-item-name" onClick={() => navigate(`/product/${item.id}`)} style={{ cursor: 'pointer' }}>
                    {item.name}
                  </div>
                  {item.offer && (
                    <div style={{ fontSize: '0.74rem', color: '#e63946', fontWeight: 700, marginTop: '0.2rem' }}>
                      🏷️ {item.offer}
                    </div>
                  )}
                </div>

                <div className="cart-item-right">
                  <div>
                    <span className="cart-item-price">₹{item.price * item.qty}</span>
                    {item.mrp && <span className="cart-item-mrp">₹{item.mrp * item.qty}</span>}
                  </div>
                  <div className="cart-qty-ctrl">
                    <button className="cart-qty-btn" onClick={() => updateQty(item.id, item.qty - 1)}>
                      <Minus size={13} />
                    </button>
                    <div className="cart-qty-val">{item.qty}</div>
                    <button className="cart-qty-btn" onClick={() => updateQty(item.id, item.qty + 1)}>
                      <Plus size={13} />
                    </button>
                  </div>
                  <button className="cart-remove-btn" onClick={() => removeFromCart(item.id)}>
                    <Trash2 size={13} style={{ display:'inline', marginRight:'3px' }} /> Remove
                  </button>
                </div>
              </div>
            ))
          )}

          {cart.length > 0 && (
            <div style={{
              background: '#fff', border: '1px solid #ebebeb', borderRadius: 14,
              padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
              fontSize: '0.85rem', color: '#555',
            }}>
              <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
              <span>Review your items before placing the order. Prices are inclusive of all taxes.</span>
            </div>
          )}
        </div>

        {/* RIGHT: Summary */}
        {cart.length > 0 && (
          <div className="cart-summary">
            <div className="cart-summary-title">Order Summary</div>

            {/* Coupon */}
            <div className="cart-coupon-row" onClick={() => showCouponInput(c => !c)}>
              <Tag size={16} color="#e63946" />
              <span className="cart-coupon-label">
                {couponApplied ? '✅ Coupon QB10 applied!' : 'Apply Coupon or Promo Code'}
              </span>
              <span className="cart-coupon-cta">{couponApplied ? 'Remove' : 'Apply →'}</span>
            </div>

            {couponInput && !couponApplied && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  placeholder="Enter code (try QB10)"
                  style={{ flex: 1, padding: '0.6rem 0.875rem', borderRadius: 8, border: '1.5px solid #e8e8ec', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none' }}
                />
                <button
                  onClick={applyCoupon}
                  style={{ background: '#e63946', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem' }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Rows */}
            <div className="cart-summary-row">
              <span className="cart-summary-label">Item Total (MRP)</span>
              <span className="cart-summary-val">₹{cartMrp}</span>
            </div>
            <div className="cart-summary-row">
              <span className="cart-summary-label">Product Discount</span>
              <span className="cart-summary-green">− ₹{discount}</span>
            </div>
            {couponApplied && (
              <div className="cart-summary-row">
                <span className="cart-summary-label">Coupon Discount (QB10)</span>
                <span className="cart-summary-green">− ₹{couponDisc}</span>
              </div>
            )}
            <div className="cart-summary-row">
              <span className="cart-summary-label">Delivery Fee</span>
              {deliveryFee === 0
                ? <span className="cart-summary-green">FREE 🎉</span>
                : <span className="cart-summary-val">₹{deliveryFee}</span>
              }
            </div>
            {deliveryFee > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
                Add ₹{499 - cartTotal} more for free delivery
              </div>
            )}
            <div className="cart-summary-row">
              <span className="cart-summary-label">Platform Fee</span>
              <span className="cart-summary-val">₹{PLATFORM_FEE}</span>
            </div>

            {/* Total */}
            <div className="cart-total-row">
              <span className="cart-total-label">To Pay</span>
              <span className="cart-total-val">₹{grandTotal}</span>
            </div>

            {/* Savings chip */}
            {totalSavings > 0 && (
              <div className="cart-savings-chip">
                🎉 You are saving ₹{totalSavings} on this order!
              </div>
            )}

            {/* CTA */}
            <button className="cart-checkout-btn" onClick={() => navigate('/checkout')}>
              <ShoppingBag size={20} /> Proceed to Checkout
            </button>

            <p className="cart-safe-text">
              <Lock size={12} /> 100% Secure Payments
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
