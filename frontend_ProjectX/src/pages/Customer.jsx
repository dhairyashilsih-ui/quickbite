import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, LogOut, Search, MapPin,
  Star, Clock, Plus, ChevronDown, Flame, Heart, X, Trash2, Store, ClipboardList
} from 'lucide-react';
import { useProducts } from '../context/ProductsContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getRecommendationsAPI } from '../utils/api';
import Chatbot from '../components/Chatbot';
import './FoodStore.css';


const CATS = [
  { name: 'All',      emoji: '🍽️' },
  { name: 'Burgers',  emoji: '🍔' },
  { name: 'Pizza',    emoji: '🍕' },
  { name: 'Indian',   emoji: '🍛' },
  { name: 'Chinese',  emoji: '🥢' },
  { name: 'Sushi',    emoji: '🍣' },
  { name: 'Desserts', emoji: '🍰' },
  { name: 'Drinks',   emoji: '🥤' },
];

const STATS = [
  { val: '500+', lbl: 'Menu Items' },
  { val: '30 min', lbl: 'Avg. Delivery' },
  { val: '50k+', lbl: 'Happy Customers' },
  { val: '4.9 ★', lbl: 'App Rating' },
];

export default function Customer() {
  const [activeCat, setActiveCat] = useState('All');
  const [search,    setSearch]    = useState('');
  const [showWish,  setShowWish]  = useState(false);
  const navigate   = useNavigate();
  const { addToCart, cartCount, cartTotal, cart } = useCart();
  const { wishlist, toggleWishlist, isWishlisted, wishCount } = useWishlist();
  const { products } = useProducts();
  const [recommendations, setRecommendations] = useState([]);

  const filtered = products.filter(p => {
    if (p.status === 'Inactive') return false;
    const okCat    = activeCat === 'All' || p.category === activeCat;
    const okSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                     (p.cuisine && p.cuisine.toLowerCase().includes(search.toLowerCase()));
    return okCat && okSearch;
  });

  const fetchRecommendations = async () => {
    try {
      const viewed = JSON.parse(localStorage.getItem('qb_viewed') || '[]');
      const purchased = JSON.parse(localStorage.getItem('qb_purchased') || '[]');
      const cartIds = cart.map(i => i.id);
      
      const res = await getRecommendationsAPI({ viewed, cart: cartIds, purchased });
      if (res.data.success) {
        setRecommendations(res.data.recommendations);
      }
    } catch (e) {
      console.error('Recommendations failed', e);
    }
  };

  React.useEffect(() => {
    if (products.length > 0) {
      fetchRecommendations();
    }
  }, [products, cart]);

  const handleProductClick = (id) => {
    let viewed = JSON.parse(localStorage.getItem('qb_viewed') || '[]');
    if (!viewed.includes(id)) {
      viewed.push(id);
      localStorage.setItem('qb_viewed', JSON.stringify(viewed.slice(-20))); // Keep last 20
    }
    navigate(`/product/${id}`);
  };

  return (
    <div>
      {/* ════════════ NAVBAR ════════════ */}
      <nav className="qb-nav">
        <div className="qb-nav-brand">
          <Flame size={22} color="#e63946" strokeWidth={2.5} />
          <span className="brand-quick">Quick</span>
          <span className="brand-bite">Bite</span>
        </div>

        <div className="qb-nav-location">
          <MapPin size={14} color="#e63946" />
          Pune, Maharashtra
          <ChevronDown size={13} />
        </div>

        <div className="qb-search-wrap">
          <Search size={16} className="qb-search-icon" />
          <input
            className="qb-search-input"
            placeholder="Search dishes, cuisines…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="qb-nav-spacer" />

        <div className="qb-nav-actions">
          {/* Wishlist Dropdown */}
          <div className="qb-wishlist-wrap">
            <button className="qb-logout-btn" onClick={() => setShowWish(!showWish)} style={{ position: 'relative', border: 'none', padding: '0.4rem' }}>
              <Heart size={20} color={wishCount > 0 ? '#e63946' : '#555'} fill={wishCount > 0 ? '#e63946' : 'none'} />
              {wishCount > 0 && <span className="qb-cart-count" style={{ position: 'absolute', top: -5, right: -5, background: '#e63946', color: '#fff' }}>{wishCount}</span>}
            </button>
            {showWish && (
              <div className="qb-wishlist-popup">
                <div className="qb-wish-header">
                  <span>My Wishlist ({wishCount})</span>
                  <X size={18} cursor="pointer" onClick={() => setShowWish(false)} />
                </div>
                <div className="qb-wish-list">
                  {wishCount === 0 ? (
                    <div className="qb-wish-empty">No items saved yet.</div>
                  ) : (
                    wishlist.map(item => (
                      <div key={item.id} className="qb-wish-item" onClick={() => navigate(`/product/${item.id}`)}>
                        <img src={item.image} alt={item.name} className="qb-wish-item-img" />
                        <div className="qb-wish-item-info">
                          <div className="qb-wish-item-name">{item.name}</div>
                          <div className="qb-wish-item-price">₹{item.price}</div>
                        </div>
                        <Trash2 size={16} className="qb-wish-item-remove" onClick={(e) => { e.stopPropagation(); toggleWishlist(item); }} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {cartCount > 0 && (
            <button className="qb-cart-chip" onClick={() => navigate('/cart')}>
              <ShoppingCart size={16} strokeWidth={2.5} />
              {cartCount} item{cartCount > 1 ? 's' : ''}
              <div className="qb-cart-count">₹{cartTotal}</div>
            </button>
          )}
          <button className="qb-logout-btn" onClick={() => navigate('/orders')} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ClipboardList size={15} /> My Orders
          </button>
          <button className="qb-logout-btn" onClick={() => { localStorage.removeItem('projectx_token'); localStorage.removeItem('projectx_role'); window.location.href = '/'; }}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </nav>

      {/* ════════════ HERO ════════════ */}
      <section className="qb-hero">
        {/* Decorative SVG curves */}
        <svg className="qb-hero-svg" viewBox="0 0 1200 440" preserveAspectRatio="none" fill="none">
          <path d="M-80 320 Q250 80 550 260 T1150 160" stroke="#fbd0d3" strokeWidth="2.5"/>
          <path d="M0 390 Q320 160 640 310 T1280 160" stroke="#fbd0d3" strokeWidth="1.5" opacity="0.55"/>
          <path d="M820 -30 Q980 160 820 300 T920 440" stroke="#fbd0d3" strokeWidth="2" opacity="0.45"/>
        </svg>

        {/* Floating food */}
        <div className="qb-float qb-float-burger">
          <img src="/berger.png" alt="Burger" style={{ width: '100%', filter: 'drop-shadow(0 14px 32px rgba(0,0,0,0.16))' }} />
        </div>
        <div className="qb-float qb-float-modak">
          <img src="/modak.png" alt="Modak" style={{ width: '100%', filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.13))' }} />
        </div>
        <div className="qb-float qb-float-pizza">
          <img src="/pizza.png"  alt="Pizza"  style={{ width: '100%', filter: 'drop-shadow(0 14px 32px rgba(0,0,0,0.16))' }} />
        </div>

        {/* Tiny decorations */}
        <div className="qb-deco qb-deco-leaf">🌿</div>
        <div className="qb-deco qb-deco-tom1">🍅</div>
        <div className="qb-deco qb-deco-tom2">🍅</div>

        {/* Center headline — exactly like reference */}
        <div className="qb-hero-center">
          <h1 className="qb-hero-title">Better food for<br />more people</h1>
          <p className="qb-hero-sub">
            For over a decade, we've enabled our customers to discover new tastes,
            delivered right to their doorstep
          </p>
        </div>
      </section>

      {/* ════════════ STATS STRIP ════════════ */}
      <div className="qb-stats">
        {STATS.map(s => (
          <div key={s.lbl} className="qb-stat">
            <div className="qb-stat-val">{s.val}</div>
            <div className="qb-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ════════════ MAIN CONTENT ════════════ */}
      <main className="qb-body">

        <p className="qb-sec-label">What are you craving? 🤤</p>

        {/* Category Pills */}
        <div className="qb-cats">
          {CATS.map(cat => (
            <button
              key={cat.name}
              className={`qb-cat ${activeCat === cat.name ? 'active' : ''}`}
              onClick={() => setActiveCat(cat.name)}
            >
              <span className="qb-cat-emoji">{cat.emoji}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Result count */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem', marginTop: '1rem' }}>
          <span className="qb-sec-label">{activeCat === 'All' ? 'All Dishes' : activeCat} Menu</span>
          <span className="qb-sec-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* RECOMENDATIONS ROW */}
        {activeCat === 'All' && !search && recommendations.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <p className="qb-sec-label" style={{ color: '#e63946', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={18} /> Recommended For You
            </p>
            <div className="qb-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {recommendations.slice(0, 4).map(product => (
                <div key={product.id} className="qb-card" style={{ border: '1px solid #fbd0d3', boxShadow: '0 8px 30px rgba(230,57,70,0.08)' }}>
                  <div className="qb-card-img-wrap" onClick={() => handleProductClick(product.id)} style={{ cursor: 'pointer' }}>
                    <img src={product.image} alt={product.name} className="qb-card-img" loading="lazy" />
                    {product.offer && <span className="qb-offer-tag">{product.offer}</span>}
                    <button
                      className={`qb-wish-btn ${isWishlisted(product.id) ? 'liked' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                    >
                      <Heart size={16} strokeWidth={2} color={isWishlisted(product.id) ? '#e63946' : '#888'} fill={isWishlisted(product.id) ? '#e63946' : 'none'} />
                    </button>
                    <span className="qb-time-tag"><Clock size={11} /> {product.time}</span>
                  </div>
                  <div className="qb-card-body">
                    <div className="qb-card-cuisine" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Store size={12} /> {product.storeName}</div>
                    <div className="qb-card-name" onClick={() => handleProductClick(product.id)} style={{ cursor: 'pointer' }}>{product.name}</div>
                    <div className="qb-card-rating">
                      <span className="qb-rating-pill"><Star size={11} fill="#16a34a" stroke="none" /> {product.rating}</span>
                      <span className="qb-reviews">({product.reviews?.toLocaleString() || 0} reviews)</span>
                    </div>
                    <div className="qb-card-footer">
                      <div className="qb-price" onClick={() => handleProductClick(product.id)} style={{ cursor: 'pointer' }}>₹{product.price} <small>/serving</small></div>
                      <button className="qb-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(product); }}><Plus size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <hr style={{ border: 'none', borderTop: '1px dashed #e2e8f0', margin: '2rem 0 1rem' }} />
          </div>
        )}

        {/* ALL DISHES Grid */}
        <div className="qb-grid">
          {filtered.length === 0 ? (
            <div className="qb-empty">
              <div className="qb-empty-icon">🍽️</div>
              <div className="qb-empty-title">No dishes found</div>
              <div className="qb-empty-sub">Try a different category or search term.</div>
            </div>
          ) : filtered.map(product => (
            <div key={product.id} className="qb-card">
              {/* Image */}
              <div className="qb-card-img-wrap">
                <img src={product.image} alt={product.name} className="qb-card-img" loading="lazy" />

                {product.offer && <span className="qb-offer-tag">{product.offer}</span>}

                {/* ❤ Wishlist */}
                <button
                  className={`qb-wish-btn ${isWishlisted(product.id) ? 'liked' : ''}`}
                  onClick={(e) => { e.stopPropagation(); toggleWishlist(product); }}
                  title={isWishlisted(product.id) ? 'Remove from Wishlist' : 'Save to Wishlist'}
                >
                  <Heart
                    size={16}
                    strokeWidth={2}
                    color={isWishlisted(product.id) ? '#e63946' : '#888'}
                    fill={isWishlisted(product.id) ? '#e63946' : 'none'}
                  />
                </button>

                <span className="qb-time-tag">
                  <Clock size={11} /> {product.time}
                </span>
              </div>

              {/* Body */}
              <div className="qb-card-body">
                <div className="qb-card-cuisine" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Store size={12} /> {product.storeName || 'QuickBite Store'}
                </div>
                <div
                  className="qb-card-name"
                  onClick={() => handleProductClick(product.id)}
                  style={{ cursor: 'pointer' }}
                  title="View details"
                >{product.name}</div>
                <div className="qb-card-rating">
                  <span className="qb-rating-pill">
                    <Star size={11} fill="#16a34a" stroke="none" /> {product.rating}
                  </span>
                  <span className="qb-reviews">({product.reviews?.toLocaleString() || 0} ratings)</span>
                </div>
                <div className="qb-card-footer">
                  <div className="qb-price" onClick={() => handleProductClick(product.id)} style={{ cursor: 'pointer' }}>₹{product.price} <small>/serving</small></div>
                  <button className="qb-add-btn" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>
                    <Plus size={15} strokeWidth={2.5} /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ════════════ CART BAR ════════════ */}
      {cartCount > 0 && (
        <div className="qb-cart-bar">
          <ShoppingCart size={20} />
          <div>
            <div className="qb-cart-bar-label">{cartCount} item{cartCount > 1 ? 's' : ''} in cart</div>
          </div>
          <div className="qb-cart-bar-sep" />
          <div className="qb-cart-bar-price">₹{cartTotal}</div>
          <div className="qb-cart-bar-fill" />
          <button className="qb-view-cart-btn" onClick={() => navigate('/cart')}>View Cart →</button>
        </div>
      )}

      {/* ════════════ AI CHATBOT ════════════ */}
      <Chatbot role="customer" />
    </div>
  );
}
