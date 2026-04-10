import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle, Truck, Home, Clock, ShoppingBag } from 'lucide-react';
import { useOrders } from '../context/OrderContext';
import './OrderTracking.css';

const STATUS_FLOW = ['Placed', 'Accepted', 'Processed', 'Dispatched', 'Delivered'];

const STATUS_META = {
  Placed:     { icon: <Package size={20} />,       color: '#e63946', label: 'Order Placed',      desc: 'Your order has been received!' },
  Accepted:   { icon: <CheckCircle size={20} />,   color: '#f97316', label: 'Order Accepted',    desc: 'Restaurant accepted your order.' },
  Processed:  { icon: <Clock size={20} />,          color: '#a855f7', label: 'Being Prepared',   desc: 'Chef is cooking your food 🍳' },
  Dispatched: { icon: <Truck size={20} />,          color: '#3b82f6', label: 'Out for Delivery',  desc: 'Your rider is on the way!' },
  Delivered:  { icon: <Home size={20} />,           color: '#16a34a', label: 'Delivered',         desc: 'Enjoy your meal! 😋' },
};

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, fetchMyOrders } = useOrders();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);

  useEffect(() => {
    const found = orders.find(o => String(o.id) === String(id));
    if (found) setOrder(found);
  }, [orders, id]);

  if (!order) {
    return (
      <div className="ot-page">
        <nav className="ot-nav">
          <div className="ot-nav-brand"><span className="q">Quick</span><span className="b">Bite</span></div>
          <button className="ot-back" onClick={() => navigate('/orders')}><ArrowLeft size={15} /> My Orders</button>
        </nav>
        <div className="ot-loading">Loading order…</div>
      </div>
    );
  }

  const currentIdx  = STATUS_FLOW.indexOf(order.status);
  const isDelivered = order.status === 'Delivered';
  const meta        = STATUS_META[order.status];

  return (
    <div className="ot-page">

      {/* NAV */}
      <nav className="ot-nav">
        <div className="ot-nav-brand"><span className="q">Quick</span><span className="b">Bite</span></div>
        <button className="ot-back" onClick={() => navigate('/orders')}><ArrowLeft size={15} /> My Orders</button>
      </nav>

      <div className="ot-body">

        {/* ─── Current Status Hero ─── */}
        <div className={`ot-hero ${isDelivered ? 'delivered' : ''}`}>
          <div className="ot-hero-icon" style={{ background: meta.color + '22', color: meta.color }}>
            {meta.icon}
          </div>
          <div className="ot-hero-info">
            <div className="ot-hero-label" style={{ color: meta.color }}>{meta.label}</div>
            <div className="ot-hero-desc">{meta.desc}</div>
            <div className="ot-order-id">Order # {order.order_id}</div>
          </div>
          {!isDelivered && <div className="ot-pulse" style={{ background: meta.color }} />}
        </div>

        {/* ─── Timeline ─── */}
        <div className="ot-card">
          <p className="ot-card-title">📍 Live Tracking</p>
          <div className="ot-timeline">
            {STATUS_FLOW.map((status, idx) => {
              const done    = idx <= currentIdx;
              const current = idx === currentIdx;
              const sm      = STATUS_META[status];
              const ts      = order.status_timestamps?.[status];

              return (
                <div key={status} className={`ot-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                  {/* Left: line + dot */}
                  <div className="ot-step-left">
                    <div className="ot-dot" style={done ? { background: sm.color, borderColor: sm.color } : {}}>
                      {done && <CheckCircle size={12} color="#fff" />}
                      {current && !done && <div className="ot-dot-anim" style={{ background: sm.color }} />}
                    </div>
                    {idx < STATUS_FLOW.length - 1 && (
                      <div className={`ot-line ${idx < currentIdx ? 'done' : ''}`}
                           style={idx < currentIdx ? { background: STATUS_META[STATUS_FLOW[idx + 1]].color } : {}} />
                    )}
                  </div>

                  {/* Right: content */}
                  <div className="ot-step-right">
                    <div className="ot-step-header">
                      <span className="ot-step-label" style={done ? { color: '#1a1a2e' } : { color: '#aaa' }}>
                        {sm.label}
                      </span>
                      {ts && <span className="ot-step-time">{fmtTime(ts)}</span>}
                    </div>
                    <div className="ot-step-desc" style={done ? {} : { color: '#ccc' }}>{sm.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Order Items ─── */}
        <div className="ot-card">
          <p className="ot-card-title">🛍️ Your Items</p>
          <div className="ot-items">
            {(order.items || []).map((item, idx) => (
              <div key={idx} className="ot-item">
                <img src={item.image} alt={item.name} className="ot-item-img" />
                <div className="ot-item-info">
                  <div className="ot-item-name">{item.name}</div>
                  <div className="ot-item-qty">× {item.qty}</div>
                </div>
                <div className="ot-item-price">₹{item.price * item.qty}</div>
              </div>
            ))}
          </div>

          <div className="ot-total-row">
            <span>Total Paid</span>
            <span className="ot-total-val">₹{order.total}</span>
          </div>
        </div>

        {/* ─── Delivery Info ─── */}
        <div className="ot-card">
          <p className="ot-card-title">📦 Delivery Details</p>
          <div className="ot-detail-row"><span>Deliver To</span><span>{order.address}</span></div>
          <div className="ot-detail-row"><span>Payment</span><span>{order.payment_method?.toUpperCase()}</span></div>
          <div className="ot-detail-row"><span>Order Status</span>
            <span className="ot-status-chip" style={{ background: meta.color + '22', color: meta.color }}>
              {order.status}
            </span>
          </div>
        </div>

        <button className="ot-shop-btn" onClick={() => navigate('/customer')}>
          <ShoppingBag size={16} /> Continue Shopping
        </button>
      </div>
    </div>
  );
}
