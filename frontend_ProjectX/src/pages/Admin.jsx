import React, { useState, useEffect } from 'react';
import {
  Store, LayoutDashboard, ShoppingCart, Users, Package,
  Settings, LogOut, Search, Bell, TrendingUp, DollarSign,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, Filter,
  Plus, ChevronRight, Star, Clock, Truck, BarChart2,
  Tag, RefreshCcw, CheckCircle, AlertCircle, Eye,
  Menu, X, Flame, Upload, Edit3, Trash2, Download
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Admin.css';
import { useProducts } from '../context/ProductsContext';
import { getAllOrdersAPI, updateOrderStatusAPI } from '../utils/api';
import Chatbot from '../components/Chatbot';

// (Removed mock stats/orders)

// (Removed quickactions)

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard'  },
  { icon: ShoppingCart,    label: 'Orders'     },
  { icon: Package,         label: 'Products'   },
  { icon: Users,           label: 'Customers'  },
  { icon: BarChart2,       label: 'Analytics'  },
  { icon: Settings,        label: 'Settings'   },
];

// ─── COMPONENT ────────────────────────────────────────────────
export default function Admin() {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();

  const [activeNav, setActiveNav] = useState('Dashboard');
  const [sideOpen, setSideOpen]   = useState(false);
  const [search,   setSearch]     = useState('');

  // ── PANEL STATE ──
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // ── ORDERS STATE ──
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('All Orders');
  const [viewingOrder, setViewingOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  // ── REPORTS STATE ──
  const [reportStart, setReportStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
  });
  const [reportEnd, setReportEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState([]);
  const [reportStats, setReportStats] = useState({ revenue: 0, orders: 0, successRate: 100 });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await getAllOrdersAPI();
      if (res.data.success) {
        setOrders(res.data.orders);
      }
    } catch (e) {
      console.error('Failed to fetch admin orders', e);
    }
  };

  useEffect(() => {
    if (orders.length > 0 && activeNav === 'Analytics' && reportData.length === 0) {
      generateReport();
    }
  }, [orders, activeNav]);

  const generateReport = () => {
    const start = new Date(reportStart);
    start.setHours(0,0,0,0);
    const end = new Date(reportEnd);
    end.setHours(23,59,59,999);

    const filtered = orders.filter(o => {
      const dt = new Date(o.created_at);
      return dt >= start && dt <= end;
    });

    const successful = filtered.filter(o => o.status !== 'Cancelled');
    const totalRev = successful.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const rate = filtered.length ? Math.round((successful.length / filtered.length) * 100) : 0;

    setReportData(filtered);
    setReportStats({ revenue: totalRev, orders: filtered.length, successRate: rate });

    const groups = {};
    filtered.forEach(o => {
      if(o.status === 'Cancelled') return;
      const d = new Date(o.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
      groups[d] = (groups[d] || 0) + Number(o.total || 0);
    });
    const cData = Object.keys(groups).map(k => ({ date: k, revenue: groups[k] }));
    setChartData(cData);
  };

  const downloadCSV = () => {
    if(!reportData.length) return alert('No records to download!');
    const headers = ['Order ID', 'Customer', 'Amount', 'Payment Method', 'Status', 'Date'];
    const rows = reportData.map(o => [
      o.order_id,
      getCustomerName(o.address).replace(/,/g, ' '),
      o.total,
      o.payment_method || '-',
      o.status,
      new Date(o.created_at).toLocaleString().replace(/,/g, ' ')
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `QuickBite_Revenue_${reportStart}_to_${reportEnd}.csv`;
    link.click();
  };

  const initialForm = {
    name: '', description: '', category: 'Burgers',
    image: '', dietary: 'Veg',
    price: '', discount: 0,
    stock: 50, time: '20–30 min',
    tags: ''
  };

  const [formData, setFormData] = useState(initialForm);

  const handleLogout = () => {
    localStorage.removeItem('projectx_token');
    localStorage.removeItem('projectx_role');
    window.location.href = '/';
  };

  const openPanel = (product = null) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || 'Burgers',
        image: product.image || '',
        dietary: product.dietary || 'Veg',
        price: product.originalPrice || product.price || '',
        discount: product.discount || 0,
        stock: product.stock !== undefined ? product.stock : 50,
        time: product.time || '20–30 min',
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : (product.tags || '')
      });
    } else {
      setEditingId(null);
      setFormData(initialForm);
    }
    setIsPanelOpen(true);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this product? It will be marked as inactive.")) {
      deleteProduct(id);
    }
  };

  const calculateSalePrice = (price, discount) => {
    if (!price) return 0;
    const val = Number(price) - (Number(price) * (Number(discount) / 100));
    return Math.round(val);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const finalPrice = calculateSalePrice(formData.price, formData.discount);
    
    let tagArray = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (!tagArray.includes(formData.dietary)) tagArray.push(formData.dietary);

    const payload = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      cuisine: 'Global', // default
      image: formData.image,
      dietary: formData.dietary,
      price: finalPrice,
      originalPrice: Number(formData.price),
      mrp: Number(formData.price),
      discount: Number(formData.discount),
      stock: Number(formData.stock),
      time: formData.time,
      tags: tagArray,
      status: 'Active'
    };

    try {
      if (editingId) {
        await updateProduct({ ...payload, id: editingId });
      } else {
        await addProduct(payload);
      }
      setIsPanelOpen(false);
    } catch (err) {
      alert("Failed to save product. Please try again.");
    }
  };

  const statusMeta = {
    Delivered:  { cls: 'st-delivered',  icon: CheckCircle  },
    Processed:  { cls: 'st-processing', icon: RefreshCcw   },
    Accepted:   { cls: 'st-warning',    icon: CheckCircle  },
    Placed:     { cls: 'st-pending',    icon: Clock        },
    Dispatched: { cls: 'st-info',       icon: Truck        },
    Cancelled:  { cls: 'st-cancelled',  icon: AlertCircle  },
  };

  // Filter products for the table (we can keep all in Admin to see Inactive ones)
  const displayProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  // Filter orders
  const displayOrders = orders.filter(o => {
    if (orderFilter !== 'All Orders' && o.status !== orderFilter) return false;
    if (search && !o.order_id.toLowerCase().includes(search.toLowerCase()) && !o.address.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleUpdateOrderStatus = async () => {
    if (!viewingOrder || !newStatus) return;
    try {
      await updateOrderStatusAPI(viewingOrder.id, newStatus);
      fetchOrders();
      setViewingOrder(null);
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const getCustomerName = (address) => {
    if (!address) return 'Unknown';
    return address.split(',')[0];
  };

  // ── DYNAMIC METRICS FOR DASHBOARD ──
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todaysOrders = orders.filter(o => new Date(o.created_at) >= todayStart);
  
  const todayRevenue = todaysOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + Number(o.total || 0), 0);
  
  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 10).slice(0, 4);
  const trendingProducts = [...products].sort((a,b) => (b.reviews||0) - (a.reviews||0)).slice(0, 4);

  const pipelineStats = {
    placed: orders.filter(o => o.status === 'Placed').length,
    processed: orders.filter(o => o.status === 'Processed').length,
    dispatched: orders.filter(o => o.status === 'Dispatched').length,
    delivered: orders.filter(o => o.status === 'Delivered').length,
  };

  const custMap = {};
  todaysOrders.forEach(o => {
    if(o.status === 'Cancelled') return;
    const n = getCustomerName(o.address);
    if(n) { custMap[n] = (custMap[n] || 0) + Number(o.total || 0); }
  });
  let topCustomer = { name: 'No sales yet', amount: 0 };
  Object.entries(custMap).forEach(([name, amt]) => {
     if(amt > topCustomer.amount) topCustomer = { name, amount: amt };
  });

  return (
    <div className="ad-root">

      {/* ══════════ SIDEBAR ══════════ */}
      <aside className={`ad-sidebar ${sideOpen ? 'open' : ''}`}>
        <div className="ad-sidebar-brand">
          <Flame size={22} color="#e63946" strokeWidth={2.5} />
          <span className="brand-q">Quick</span><span className="brand-b">Bite</span>
          <span className="brand-role-tag">Seller</span>
        </div>

        <nav className="ad-nav">
          {NAV.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className={`ad-nav-item ${activeNav === label ? 'active' : ''}`}
              onClick={() => { setActiveNav(label); setSideOpen(false); }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {activeNav === label && <ChevronRight size={14} className="nav-arrow" />}
            </button>
          ))}
        </nav>

        <div className="ad-sidebar-basket">
          <img src="/basket ui.png" alt="QuickBite" className="ad-basket-img" />
        </div>

        <button className="ad-logout-btn" onClick={handleLogout}>
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* Sidebar overlay on mobile */}
      {sideOpen && <div className="ad-overlay" onClick={() => setSideOpen(false)} />}

      {/* ══════════ MAIN ══════════ */}
      <div className="ad-main">

        {/* TOP NAV BAR */}
        <header className="ad-topbar">
          <button className="ad-menu-toggle" onClick={() => setSideOpen(!sideOpen)}>
            {sideOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="ad-topbar-search">
            <Search size={16} className="tbsearch-icon" />
            <input
              type="text"
              placeholder="Search orders, products, customers…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="ad-topbar-right">
            <button className="ad-icon-btn" title="Notifications">
              <Bell size={20} />
              <span className="notif-dot" />
            </button>
            <div className="ad-avatar-wrap">
              <div className="ad-avatar">S</div>
              <div className="ad-avatar-info">
                <span className="av-name">Seller Admin</span>
                <span className="av-role">Store Owner</span>
              </div>
            </div>
          </div>
        </header>

        {/* ══════════ HERO BANNER ══════════ */}
        {activeNav !== 'Analytics' && (
          <section className="ad-hero">
            <div className="ad-hero-left">
              <p className="hero-eyebrow">🔥 Welcome back, Admin</p>
              <h1 className="hero-title">
                Manage Your<br />
                <span className="hero-accent">QuickBite Store</span>
              </h1>
              <p className="hero-sub">
                Monitor orders, manage inventory, and grow your<br />
                restaurant business — all from one place.
              </p>
              <div className="hero-btns">
                <button className="hbtn hbtn-primary" onClick={() => openPanel()}>
                  <Plus size={17} /> Add Product
                </button>
                <button className="hbtn hbtn-outline" onClick={() => setActiveNav('Orders')}>
                  <Eye size={17} /> View Orders
                </button>
              </div>
            </div>
            <div className="ad-hero-img-wrap">
              <img src="/delevary boy.png" alt="Delivery" className="ad-hero-img" />
            </div>
          </section>
        )}

        {/* ══════════ PAGE BODY ══════════ */}
        <div className="ad-body">

          {activeNav === 'Analytics' ? (
            <div className="ad-reports-wrap">
              <div className="ad-sec-header" style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem'}}>
                <div>
                  <h2 className="ad-sec-title">Payments & Revenue</h2>
                  <p style={{color:'#666', fontSize:'0.85rem', margin:'4px 0 0'}}>Analyze financial reports and exports.</p>
                </div>
                <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                    <input type="date" value={reportStart} onChange={e => setReportStart(e.target.value)} style={{padding:'0.4rem', border:'1px solid #ccc', borderRadius:'6px'}}/>
                    <span>to</span>
                    <input type="date" value={reportEnd} onChange={e => setReportEnd(e.target.value)} style={{padding:'0.4rem', border:'1px solid #ccc', borderRadius:'6px'}}/>
                    <button onClick={generateReport} style={{ background:'#1a1a2e', color:'#fff', padding:'0.55rem 1rem', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:'bold' }}>Generate</button>
                  </div>
                  <button onClick={downloadCSV} style={{ display:'flex', gap:'0.5rem', alignItems:'center', background:'#e63946', color:'#fff', padding:'0.55rem 1rem', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:'bold' }}>
                    <Download size={16}/> Download Report (CSV)
                  </button>
                </div>
              </div>

              {/* REPORT CARDS */}
              <div className="ad-stats-grid" style={{marginBottom:'2rem'}}>
                <div className="ad-stat-card s-green">
                  <div className="asc-top">
                    <div>
                      <div className="asc-val">₹{reportStats.revenue.toLocaleString()}</div>
                      <div className="asc-lbl">Total Revenue</div>
                    </div>
                    <div className="asc-icon ic-green"><DollarSign size={22} /></div>
                  </div>
                </div>
                <div className="ad-stat-card s-blue">
                  <div className="asc-top">
                    <div>
                      <div className="asc-val">{reportStats.orders}</div>
                      <div className="asc-lbl">Orders Processed</div>
                    </div>
                    <div className="asc-icon ic-blue"><ShoppingCart size={22} /></div>
                  </div>
                </div>
                <div className="ad-stat-card s-orange">
                  <div className="asc-top">
                    <div>
                      <div className="asc-val">{reportStats.successRate}%</div>
                      <div className="asc-lbl">Payment Success Rate</div>
                    </div>
                    <div className="asc-icon ic-orange"><CheckCircle size={22} /></div>
                  </div>
                </div>
              </div>

              {/* CHART & DETAILS GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', marginBottom:'2rem' }}>
                <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
                  <h3 style={{marginTop:0, marginBottom:'1rem', fontSize:'1rem', color:'#333'}}>Revenue Trend</h3>
                  {chartData.length > 0 ? (
                    <div style={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#e63946" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#e63946" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:'#888', fontSize:12}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill:'#888', fontSize:12}} tickFormatter={val => `₹${val}`} />
                          <Tooltip contentStyle={{ borderRadius:'8px', border:'none', boxShadow:'0 4px 15px rgba(0,0,0,0.1)' }} />
                          <Area type="monotone" dataKey="revenue" stroke="#e63946" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div style={{ height: 250, display:'flex', alignItems:'center', justifyContent:'center', color:'#999' }}>No data for selected period.</div>}
                </div>
              </div>

              {/* REPORT TABLE */}
              <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
                <div style={{ padding: '1.25rem', borderBottom:'1px solid #f0f0f0', background:'#fafafa' }}>
                  <h3 style={{marginTop:0, marginBottom:0, fontSize:'1rem', color:'#333'}}>Detailed Payment Ledger</h3>
                </div>
                <div className="ad-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.length === 0 ? (
                        <tr><td colSpan="5" style={{textAlign:'center', padding:'2rem'}}>No transactions found for this period.</td></tr>
                      ) : reportData.map(o => (
                        <tr key={o.id}>
                          <td style={{color:'#666'}}>{new Date(o.created_at).toLocaleDateString()}</td>
                          <td className="td-id">#{o.order_id}</td>
                          <td>{getCustomerName(o.address)}</td>
                          <td className="td-total">₹{o.total}</td>
                          <td><span className={`ad-badge ${statusMeta[o.status]?.cls || 'st-pending'}`}>{o.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ── DYNAMIC METRICS SECTIONS ── */}
            
              {/* 🅰️ & 🅲 TOP KPI ROW */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <div style={{color: '#888', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display:'flex', alignItems:'center', gap:'6px'}}><DollarSign size={16}/> Today's Collection</div>
                  <div style={{fontSize: '2rem', fontWeight: 800, color: '#e63946'}}>₹{todayRevenue.toLocaleString()}</div>
                </div>
                
                <div className="glass-card" style={{ padding: '1.5rem', background: '#fff', borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                   <div style={{color: '#888', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', display:'flex', alignItems:'center', gap:'6px'}}><Star size={16}/> Top Customer of the Day</div>
                   <div style={{fontSize: '1.25rem', fontWeight: 700, color: '#1a1a2e'}}>{topCustomer.name}</div>
                   <div style={{fontSize: '0.9rem', color: '#16a34a', fontWeight: 600}}>₹{topCustomer.amount.toLocaleString()} total spent</div>
                </div>
              </div>

              {/* 🅱️ ORDER PIPELINE */}
              <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f0f0f0', marginBottom: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                 <h3 style={{marginTop:0, marginBottom: '1.25rem', fontSize: '1.05rem', color:'#111827', display:'flex', alignItems:'center', gap:'8px'}}><ShoppingCart size={18}/> Global Order Pipeline</h3>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                   <div style={{padding:'1rem', background:'#f8fafc', borderRadius:'10px', textAlign:'center', border:'1px solid #e2e8f0'}}>
                     <div style={{fontSize:'1.8rem', fontWeight:800, color:'#3b82f6'}}>{pipelineStats.placed}</div>
                     <div style={{fontSize:'0.85rem', color:'#64748b', fontWeight:700, textTransform:'uppercase'}}>Placed</div>
                   </div>
                   <div style={{padding:'1rem', background:'#fffbeb', borderRadius:'10px', textAlign:'center', border:'1px solid #fde68a'}}>
                     <div style={{fontSize:'1.8rem', fontWeight:800, color:'#d97706'}}>{pipelineStats.processed}</div>
                     <div style={{fontSize:'0.85rem', color:'#64748b', fontWeight:700, textTransform:'uppercase'}}>Processed</div>
                   </div>
                   <div style={{padding:'1rem', background:'#eef2ff', borderRadius:'10px', textAlign:'center', border:'1px solid #c7d2fe'}}>
                     <div style={{fontSize:'1.8rem', fontWeight:800, color:'#4f46e5'}}>{pipelineStats.dispatched}</div>
                     <div style={{fontSize:'0.85rem', color:'#64748b', fontWeight:700, textTransform:'uppercase'}}>Dispatched</div>
                   </div>
                   <div style={{padding:'1rem', background:'#f0fdf4', borderRadius:'10px', textAlign:'center', border:'1px solid #bbf7d0'}}>
                     <div style={{fontSize:'1.8rem', fontWeight:800, color:'#16a34a'}}>{pipelineStats.delivered}</div>
                     <div style={{fontSize:'0.85rem', color:'#64748b', fontWeight:700, textTransform:'uppercase'}}>Delivered</div>
                   </div>
                 </div>
              </div>
              
              {/* 🅰️ TRENDING & ALERTS ROW */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                   <h3 style={{marginTop:0, marginBottom: '1.25rem', fontSize: '1.05rem', color:'#111827', display:'flex', alignItems:'center', gap:'8px'}}><TrendingUp size={18} color="#e63946"/> Trending Products 🔥</h3>
                   <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
                      {trendingProducts.map(p => (
                         <div key={p.id} style={{display:'flex', alignItems:'center', gap:'12px', paddingBottom:'0.5rem', borderBottom:'1px solid #f1f5f9'}}>
                            <img src={p.image} alt={p.name} style={{width:'48px', height:'48px', borderRadius:'8px', objectFit:'cover'}}/>
                            <div style={{flex:1}}>
                                <div style={{fontWeight:700, fontSize:'0.95rem', color:'#1e293b'}}>{p.name}</div>
                                <div style={{fontSize:'0.8rem', color:'#ef4444', fontWeight:600}}>⭐ {p.rating} &bull; {p.reviews} Ratings</div>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f0f0f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                   <h3 style={{marginTop:0, marginBottom: '1.25rem', fontSize: '1.05rem', color:'#111827', display:'flex', alignItems:'center', gap:'8px'}}><AlertCircle size={18} color="#d97706"/> Low Stock Alerts ⚠️</h3>
                   <div style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
                      {lowStockProducts.length === 0 ? <div style={{padding:'2rem', textAlign:'center', color:'#888', background:'#f8fafc', borderRadius:'8px'}}>All products sufficiently stocked 🎉</div> : lowStockProducts.map(p => (
                         <div key={p.id} style={{display:'flex', alignItems:'center', gap:'10px', background:'#fefce8', padding:'10px 14px', borderRadius:'8px', border:'1px solid #fef08a'}}>
                            <div style={{flex:1, fontWeight:600, fontSize:'0.9rem', color:'#854d0e'}}>{p.name}</div>
                            <div style={{fontSize:'0.9rem', fontWeight:800, color:'#ea580c'}}>{p.stock} left</div>
                         </div>
                      ))}
                   </div>
                </div>
              </div>

          {/* ──── TWO COLUMNS ──── */}
          <div className="ad-two-col">

            {/* RECENT ORDERS */}
            <section className="ad-section ad-orders-section">
              <div className="ad-sec-header" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '1rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                  <h2 className="ad-sec-title">Order Management</h2>
                </div>
                
                {/* Tabs */}
                <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                  {['All Orders', 'Placed', 'Processed', 'Dispatched', 'Delivered'].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setOrderFilter(tab)}
                      style={{
                        padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #e0e0e0',
                        background: orderFilter === tab ? '#1a1a2e' : '#fff',
                        color: orderFilter === tab ? '#fff' : '#444',
                        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer Name</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayOrders.length === 0 ? (
                      <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem', color: '#888'}}>No orders found.</td></tr>
                    ) : (
                      displayOrders.map(o => {
                        const { cls, icon: SIcon } = statusMeta[o.status] || { cls: 'st-pending', icon: Clock };
                        return (
                          <tr key={o.id}>
                            <td className="td-id">#{o.order_id}</td>
                            <td>
                              <div className="td-cust">
                                <div className="td-avatar">{getCustomerName(o.address).charAt(0)}</div>
                                <span>{getCustomerName(o.address)}</span>
                              </div>
                            </td>
                            <td className="td-total">₹{o.total}</td>
                            <td>
                              <span className={`ad-badge ${cls}`}>
                                {SIcon && <SIcon size={12} />} {o.status}
                              </span>
                            </td>
                            <td>
                              <button 
                                onClick={() => { setViewingOrder(o); setNewStatus(o.status); }}
                                style={{
                                  background: '#e63946', color: '#fff', border: 'none', 
                                  padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold'
                                }}
                              >
                                View / Update
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* PRODUCT INVENTORY (DYNAMIC) */}
            <section className="ad-section ad-products-section">
              <div className="ad-sec-header">
                <h2 className="ad-sec-title">My Products ({products.length})</h2>
                <button className="ad-sec-action ad-sec-add" onClick={() => openPanel()}>
                  <Plus size={15}/> Add New
                </button>
              </div>
              <div className="ad-prod-list">
                {displayProducts.map(p => {
                  const isLowStock = p.stock > 0 && p.stock <= 10;
                  const isOut = p.stock === 0;
                  const isInactive = p.status === 'Inactive';

                  return (
                    <div key={p.id} className={`ad-prod-row ${isInactive ? 'inactive-row' : ''}`}>
                      <div className="apr-img-box">
                        <img src={p.image} alt="" className="apr-sm-img"/>
                      </div>
                      <div className="apr-info">
                        <div className="apr-name">{p.name} {isInactive && <span className="lbl-inactive">(Inactive)</span>}</div>
                        <div className="apr-meta">
                          <span className="apr-cat">{p.category}</span>
                          <span className="apr-price">
                            {p.discount > 0 ? (
                                <>
                                  <span style={{textDecoration:'line-through', color:'#94a3b8', fontSize:'0.7rem', marginRight:'4px'}}>₹{p.originalPrice}</span>
                                  ₹{p.price}
                                </>
                            ) : `₹${p.price}`}
                          </span>
                        </div>
                      </div>
                      <div className="apr-right">
                        <span className={`apr-stock ${isOut ? 'out' : isLowStock ? 'low' : ''}`}>
                          {isOut ? 'Out of Stock ❌' : isLowStock ? `${p.stock} left ⚠️` : `${p.stock} left`}
                        </span>
                        <div className="apr-actions">
                          <button className="apr-btn" title="Edit" onClick={() => openPanel(p)}><Edit3 size={14}/></button>
                          <button className="apr-btn del" title="Delete" onClick={() => handleDelete(p.id)}><Trash2 size={14}/></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════ SLIDE-OVER PANEL (ADD/EDIT) ══════════ */}
      {isPanelOpen && (
        <div className="ad-panel-overlay" onClick={handlePanelClose}>
          <div className="ad-panel" onClick={e => e.stopPropagation()}>
            <div className="ad-panel-header">
              <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="ad-panel-close" onClick={handlePanelClose}><X size={20}/></button>
            </div>
            
            <form className="ad-panel-form" onSubmit={handleFormSubmit}>
              
              <div className="form-group">
                <label>Dish Name</label>
                <input required type="text" placeholder="e.g. Classic Margherita" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea required rows="3" maxLength="500" placeholder="Describe the dish beautifully..."
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                <span className="char-count">{formData.description.length}/500</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option>Burgers</option>
                    <option>Pizza</option>
                    <option>Indian</option>
                    <option>Chinese</option>
                    <option>Sushi</option>
                    <option>Desserts</option>
                    <option>Drinks</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Dietary Tag</label>
                  <select value={formData.dietary} onChange={e => setFormData({...formData, dietary: e.target.value})}>
                    <option>Veg</option>
                    <option>Non-Veg</option>
                    <option>Egg</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Image URL (Recommended 1280x720px)</label>
                <input required type="url" placeholder="https://..." 
                  value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} />
                {formData.image && (
                   <div className="form-img-preview">
                     <img src={formData.image} alt="Preview" onError={(e) => e.target.style.display='none'} />
                   </div>
                )}
              </div>

              <div className="form-section-title">Pricing & Stock Management</div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Base Price (₹)</label>
                  <input required type="number" min="0" 
                    value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Discount (%)</label>
                  <input type="number" min="0" max="100" 
                    value={formData.discount} onChange={e => setFormData({...formData, discount: e.target.value})} />
                </div>
              </div>

              <div className="price-preview">
                Final Sale Price: <b>₹{calculateSalePrice(formData.price, formData.discount)}</b>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Stock Available</label>
                  <input required type="number" min="0" 
                    value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                  <small className="form-help">Alerts when &le; 10</small>
                </div>
                <div className="form-group">
                  <label>Prep Time</label>
                  <input type="text" placeholder="e.g. 20-30 min"
                    value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}/>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="ad-btn-cancel" onClick={handlePanelClose}>Cancel</button>
                <button type="submit" className="ad-btn-save">{editingId ? 'Save Changes' : 'Publish Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ SLIDE-OVER PANEL (ORDER DETAILS) ══════════ */}
      {viewingOrder && (
        <div className="ad-panel-overlay" onClick={() => setViewingOrder(null)}>
          <div className="ad-panel" onClick={e => e.stopPropagation()}>
            <div className="ad-panel-header">
              <h2>Order Details</h2>
              <button className="ad-panel-close" onClick={() => setViewingOrder(null)}><X size={20}/></button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 'bold', fontSize: '1.1rem' }}>ID: #{viewingOrder.order_id}</p>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.85rem', color: '#555' }}><b>Customer Info:</b> {viewingOrder.address}</p>
                <p style={{ margin: '0', fontSize: '0.85rem', color: '#555' }}><b>Payment:</b> {viewingOrder.payment_method?.toUpperCase()} | <b>Total:</b> ₹{viewingOrder.total}</p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Products</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(viewingOrder.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img src={item.image} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} alt=""/>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name} <span style={{ color: '#888' }}>x{item.qty}</span></span>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>₹{item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.95rem' }}>Update Order Status</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <select 
                    value={newStatus} 
                    onChange={(e) => setNewStatus(e.target.value)}
                    style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                  >
                    <option value="Placed">Placed</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Processed">Processed (Ready/Packed)</option>
                    <option value="Dispatched">Dispatched (Out for Delivery)</option>
                    <option value="Delivered">Delivered</option>
                  </select>

                  <button 
                    onClick={handleUpdateOrderStatus}
                    style={{ background: '#16a34a', color: '#fff', padding: '0.75rem', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}
                  >
                    <CheckCircle size={16}/> Save Status Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ AI CHATBOT ════════════ */}
      <Chatbot role="admin" />
    </div>
  );
}
