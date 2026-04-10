import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, ChevronRight, ShoppingBag, Clock } from 'lucide-react';
import { useOrders } from '../context/OrderContext';
import './OrderHistory.css';

const STATUS_COLOR = {
  Placed:     '#e63946',
  Accepted:   '#f97316',
  Processed:  '#a855f7',
  Dispatched: '#3b82f6',
  Delivered:  '#16a34a',
};

const STATUS_EMOJI = {
  Placed:     '🧾',
  Accepted:   '✅',
  Processed:  '🍳',
  Dispatched: '🚴',
  Delivered:  '🏠',
};

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const { orders, loading, fetchMyOrders } = useOrders();

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);

  return (
    <div className="oh-page">

      {/* NAV */}
      <nav className="oh-nav">
        <div className="oh-nav-brand"><span className="q">Quick</span><span className="b">Bite</span></div>
        <button className="oh-back" onClick={() => navigate('/customer')}>
          <ArrowLeft size={15} /> Back to Menu
        </button>
      </nav>

      <div className="oh-body">
        <div className="oh-header">
          <h1 className="oh-title">📜 My Orders</h1>
          <p className="oh-sub">Track and view your order history</p>
        </div>

        {loading ? (
          <div className="oh-loading">
            <div className="oh-spinner" />
            <p>Loading your orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="oh-empty">
            <div className="oh-empty-icon">🛒</div>
            <div className="oh-empty-title">No orders yet!</div>
            <div className="oh-empty-sub">Start ordering delicious food from QuickBite.</div>
            <button className="oh-shop-btn" onClick={() => navigate('/customer')}>
              <ShoppingBag size={16} /> Browse Menu
            </button>
          </div>
        ) : (
          <div className="oh-list">
            {orders.map(order => {
              const col   = STATUS_COLOR[order.status] || '#888';
              const emoji = STATUS_EMOJI[order.status] || '📦';
              const itemCount = (order.items || []).reduce((s, i) => s + (i.qty || 1), 0);

              return (
                <div
                  key={order.id}
                  className="oh-card"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  {/* Status stripe */}
                  <div className="oh-card-stripe" style={{ background: col }} />

                  <div className="oh-card-body">
                    {/* Top row */}
                    <div className="oh-card-top">
                      <div>
                        <div className="oh-card-orderid">#{order.order_id}</div>
                        <div className="oh-card-date">
                          <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                          {fmtDate(order.created_at)}
                        </div>
                      </div>
                      <div className="oh-status-chip" style={{ background: col + '18', color: col, borderColor: col + '40' }}>
                        {emoji} {order.status}
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="oh-items-preview">
                      <div className="oh-items-imgs">
                        {(order.items || []).slice(0, 3).map((item, idx) => (
                          <img key={idx} src={item.image} alt={item.name} className="oh-item-img" />
                        ))}
                        {(order.items || []).length > 3 && (
                          <div className="oh-item-more">+{(order.items || []).length - 3}</div>
                        )}
                      </div>
                      <div className="oh-items-names">
                        {(order.items || []).slice(0, 2).map((item, idx) => (
                          <span key={idx}>{item.name}{idx < Math.min((order.items || []).length, 2) - 1 ? ', ' : ''}</span>
                        ))}
                        {(order.items || []).length > 2 && <span> & {(order.items || []).length - 2} more</span>}
                      </div>
                    </div>

                    {/* Bottom row */}
                    <div className="oh-card-bottom">
                      <div className="oh-card-meta">
                        <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                        <span className="oh-dot-sep">·</span>
                        <span className="oh-card-total">₹{order.total}</span>
                      </div>
                      <div className="oh-track-link">
                        <Package size={13} /> Track Order <ChevronRight size={13} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
