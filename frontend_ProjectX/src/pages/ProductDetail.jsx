import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star, Clock, ShoppingCart, Heart, ChevronRight,
  ArrowLeft, Minus, Plus, Tag
} from 'lucide-react';
import { useProducts } from '../context/ProductsContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import './ProductDetail.css';

const OFFERS = [
  { icon: '⚡', color: 'blue',   text: 'Get ₹50 cashback on orders above ₹300 via UPI' },
  { icon: '🏷️', color: 'green',  text: 'Apply WELCOME20 for 20% off on your first order' },
  { icon: '💳', color: 'purple', text: 'Get ₹25 off on payments via net banking' },
  { icon: '🎁', color: 'blue',   text: 'Refer a friend and earn ₹100 QuickBite credits' },
];

export default function ProductDetail() {
  const { id }    = useParams();
  const navigate   = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { products } = useProducts();
  // Safe comparison matching both UUID strings and numeric endpoints
  const product    = products.find(p => String(p.id) === String(id));

  const [activeImg, setActiveImg] = useState(0);
  const [qty,       setQty]       = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);

  const handleAddToCart = () => {
    addToCart(product, qty);
    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
      navigate('/cart');
    }, 800);
  };

  if (!product) return (
    <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😕</div>
      <h2>Product not found</h2>
      <button onClick={() => navigate('/customer')} style={{ marginTop: '1rem', background: '#e63946', color: '#fff', border: 'none', padding: '0.75rem 1.75rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>
        ← Back to Menu
      </button>
    </div>
  );

  const discount     = Math.round(((product.mrp - product.price) / product.mrp) * 100);
  const savings      = product.mrp - product.price;
  const gallery      = product.gallery?.length ? product.gallery : [product.image];



  return (
    <div className="pd-page">

      {/* ── NAV BAR (mini) ────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #ebebeb',
        padding: '0 clamp(1.25rem,5vw,3.5rem)',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, fontSize: '1.35rem', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#e63946' }}>Quick</span>
          <span>Bite</span>
        </div>
        <button
          onClick={() => navigate('/customer')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: '1.5px solid #ebebeb', borderRadius: '99px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#555', fontFamily: 'inherit' }}
        >
          <ArrowLeft size={16}/> Back to Menu
        </button>
      </nav>

      {/* ── BREADCRUMB ───────────────────────────────── */}
      <div className="pd-breadcrumb">
        <span className="pd-crumb" onClick={() => navigate('/customer')}>Home</span>
        <ChevronRight size={13} className="pd-crumb-sep" />
        <span className="pd-crumb" onClick={() => navigate('/customer')}>{product.category}</span>
        <ChevronRight size={13} className="pd-crumb-sep" />
        <span className="pd-crumb-current">{product.name}</span>
      </div>

      {/* ── MAIN BODY ───────────────────────────────── */}
      <div className="pd-body">

        {/* ── LEFT: IMAGE GALLERY ─────────────────── */}
        <div className="pd-gallery">
          <div className="pd-main-img-wrap">
            <img
              src={gallery[activeImg] || product.image}
              alt={product.name}
              className="pd-main-img"
            />
          </div>
          {gallery.length > 1 && (
            <div className="pd-thumbs">
              {gallery.map((img, i) => (
                <div
                  key={i}
                  className={`pd-thumb ${activeImg === i ? 'active' : ''}`}
                  onClick={() => setActiveImg(i)}
                >
                  <img src={img} alt={`view-${i}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: PRODUCT INFO ─────────────────── */}
        <div className="pd-info">

          {/* Brand */}
          <div className="pd-brand" onClick={() => navigate('/customer')}>
            QuickBite <ChevronRight size={14} />
          </div>

          {/* Title */}
          <h1 className="pd-title">{product.name}</h1>

          {/* Meta */}
          <div className="pd-meta-row">
            <span className="pd-meta-text">Serves 1 • Fresh & Hot</span>
            <span className="pd-rating-pill">
              <Star size={12} fill="#16a34a" stroke="none" /> {product.rating} ({product.reviews.toLocaleString()})
            </span>
            <span className="pd-time-pill">
              <Clock size={12} /> {product.time}
            </span>
          </div>

          <div className="pd-divider" />

          {/* Price */}
          <div className="pd-price-block">
            <div className="pd-price-main">₹{product.price * qty}</div>
            <div className="pd-price-sub" style={{ marginTop: '0.5rem' }}>
              <span className="pd-mrp">MRP ₹{product.mrp * qty}</span>
              <span className="pd-savings">₹{savings * qty} OFF ({discount}%)</span>
              <span className="pd-tax">incl. all taxes</span>
            </div>
          </div>

          <div className="pd-divider" />

          {/* Tags */}
          <div className="pd-tags">
            {product.tags?.map(tag => (
              <span key={tag} className="pd-tag">{tag}</span>
            ))}
          </div>

          {/* Description */}
          <div className="pd-desc-title">About this dish</div>
          <p className="pd-desc-text">{product.description}</p>

          <div className="pd-divider" />

          {/* Offers */}
          <div className="pd-offers-title">🏷️ Coupons & Offers</div>
          <div className="pd-offers-list">
            {OFFERS.map((o, i) => (
              <div key={i} className="pd-offer-row">
                <div className={`pd-offer-icon ${o.color}`}>{o.icon}</div>
                <div className="pd-offer-text">{o.text}</div>
                <ChevronRight size={16} className="pd-offer-chevron" />
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'left', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            <button style={{ background: 'none', border: 'none', color: '#e63946', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              View all coupons →
            </button>
          </div>

          <div className="pd-divider" />

          {/* Quantity */}
          <div className="pd-qty-section">
            <span className="pd-qty-label">Quantity</span>
            <div className="pd-qty-control">
              <button className="pd-qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>
                <Minus size={16} />
              </button>
              <div className="pd-qty-val">{qty}</div>
              <button className="pd-qty-btn" onClick={() => setQty(q => q + 1)}>
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* CTA */}
          <div className="pd-cta-row">
            <button
              className="pd-add-btn"
              onClick={handleAddToCart}
              style={addedToCart ? { background: '#16a34a', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' } : {}}
            >
              {addedToCart ? (
                <><span>✓</span> Added to Cart!</>
              ) : (
                <><ShoppingCart size={20} /> Add to Cart — ₹{product.price * qty}</>
              )}
            </button>
            <button
              className={`pd-wish-btn ${isWishlisted(product.id) ? 'liked' : ''}`}
              onClick={() => toggleWishlist(product)}
              title={isWishlisted(product.id) ? 'Remove from Wishlist' : 'Save to Wishlist'}
            >
              <Heart
                size={20}
                color={isWishlisted(product.id) ? '#e63946' : '#888'}
                fill={isWishlisted(product.id) ? '#e63946' : 'none'}
                strokeWidth={2}
              />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
