import React, { useEffect, useState } from 'react';
import {
  ShieldCheck, Users, Store, Download, Ban, CheckCircle,
  Clock, LogOut, BarChart3, TrendingUp, ChevronDown, ChevronUp,
  Search, RefreshCw, X, Flame, Package, DollarSign, AlertTriangle,
  Filter, Activity, ChevronRight
} from 'lucide-react';
import { getPendingSellers, approveSeller, getAllUsersAPI, toggleBlockUserAPI, getAllOrdersAPI } from '../utils/api';
import './FoodStore.css';

const TABS = [
  { id: 'Overview',  icon: Activity   },
  { id: 'Sellers',   icon: Store      },
  { id: 'Users',     icon: Users      },
  { id: 'Reports',   icon: BarChart3  },
];

const statusMeta = {
  Delivered:  { bg: '#e6f4ea', color: '#137333' },
  Placed:     { bg: '#e8f0fe', color: '#1a56db' },
  Processed:  { bg: '#fef3c7', color: '#92400e' },
  Dispatched: { bg: '#ede9fe', color: '#5b21b6' },
  Cancelled:  { bg: '#fce8e6', color: '#c5221f' },
};

const roleMeta = {
  super_admin: { bg: '#f3e8ff', color: '#6b21a8', label: 'Super Admin' },
  admin:       { bg: '#fff0f1', color: '#e63946', label: 'Seller'      },
  customer:    { bg: '#e6f4ea', color: '#137333', label: 'Customer'    },
};

/* ── reusable micro-components ─────────────────────────── */
const Pill = ({ bg, color, children }) => (
  <span style={{ background: bg, color, padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.3px', whiteSpace: 'nowrap', display: 'inline-block' }}>
    {children}
  </span>
);

const SectionTitle = ({ icon: Icon, children, count }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
    <Icon size={17} color="#e63946" strokeWidth={2.2} />
    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111' }}>{children}</span>
    {count !== undefined && <span style={{ fontSize: '0.8125rem', color: '#888', fontWeight: 500 }}>({count})</span>}
  </div>
);

const Card = ({ children, style }) => (
  <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', ...style }}>
    {children}
  </div>
);

const TableHead = ({ cols }) => (
  <thead>
    <tr style={{ background: '#fafafa', borderBottom: '1px solid #ebebeb' }}>
      {cols.map(h => (
        <th key={h} style={{ padding: '11px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
      ))}
    </tr>
  </thead>
);

const TableRow = ({ children, highlight }) => (
  <tr style={{ borderBottom: '1px solid #f4f4f5', background: highlight ? '#fdf9f9' : 'transparent', transition: 'background 0.12s' }}>
    {children}
  </tr>
);

const TD = ({ children, mono, muted, bold }) => (
  <td style={{ padding: '13px 16px', fontSize: mono ? '0.8125rem' : '0.875rem', fontFamily: mono ? 'monospace' : 'inherit', color: muted ? '#9ca3af' : bold ? '#111' : '#374151', fontWeight: bold ? 700 : 400 }}>
    {children}
  </td>
);

/* ── main component ─────────────────────────────────────── */
export default function SuperAdmin() {
  const [activeTab, setActiveTab]    = useState('Overview');
  const [pendingSellers, setPending] = useState([]);
  const [allUsers, setAllUsers]      = useState([]);
  const [allOrders, setAllOrders]    = useState([]);
  const [loading, setLoading]        = useState(true);
  const [expandedId, setExpandedId]  = useState(null);
  const [userSearch, setUserSearch]  = useState('');
  const [refreshing, setRefreshing]  = useState(false);
  const [reportStart, setReportStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
  });
  const [reportEnd, setReportEnd] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, uRes, oRes] = await Promise.all([getPendingSellers(), getAllUsersAPI(), getAllOrdersAPI()]);
      if (sRes.data.sellers) setPending(sRes.data.sellers);
      if (uRes.data.success) setAllUsers(uRes.data.users);
      if (oRes.data.success) setAllOrders(oRes.data.orders);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const refresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };

  const handleApprove = async (id) => {
    try {
      const resp = await approveSeller(id);
      loadAll();
      alert(resp.data.magicLink ? resp.data.message + '\n\n' + resp.data.magicLink : 'Seller approved — magic link sent to their email.');
    } catch { alert('Failed to approve seller.'); }
  };

  const handleToggleBlock = async (id) => {
    if (!window.confirm("Change this user's access status?")) return;
    try {
      const res = await toggleBlockUserAPI(id);
      if (res.data.success) setAllUsers(prev => prev.map(u => u.id === id ? { ...u, status: res.data.status } : u));
    } catch { alert('Failed to update user status.'); }
  };

  const downloadCSV = () => {
    const start = new Date(reportStart); start.setHours(0, 0, 0, 0);
    const end   = new Date(reportEnd);   end.setHours(23, 59, 59, 999);
    const rows  = allOrders.filter(o => { const dt = new Date(o.created_at); return dt >= start && dt <= end; });
    if (!rows.length) return alert('No records for this date range.');
    const headers = ['Order ID', 'Customer', 'Amount', 'Payment', 'Status', 'Date'];
    const csv = 'data:text/csv;charset=utf-8,' + [
      headers.join(','),
      ...rows.map(o => [o.order_id, (o.address?.split(',')[0] || '').replace(/,/g, ' '), o.total, o.payment_method || '-', o.status, new Date(o.created_at).toLocaleString().replace(/,/g, ' ')].join(','))
    ].join('\n');
    const a = document.createElement('a'); a.href = encodeURI(csv);
    a.download = `QuickBite_Report_${reportStart}_to_${reportEnd}.csv`; a.click();
  };

  /* ── derived stats ──────────────────────────────────── */
  const totalRevenue  = allOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + Number(o.total || 0), 0);
  const sellers       = allUsers.filter(u => u.role === 'admin');
  const customers     = allUsers.filter(u => u.role === 'customer');
  const blockedCount  = allUsers.filter(u => u.status === 'blocked').length;
  const filteredUsers = allUsers.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  /* ─── RENDER ──────────────────────────────────────────── */
  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* ══ NAVBAR ══════════════════════════════════════════ */}
      <nav className="qb-nav">
        {/* Brand */}
        <div className="qb-nav-brand">
          <Flame size={21} color="#e63946" strokeWidth={2.5} />
          <span className="brand-quick">Quick</span>
          <span className="brand-bite">Bite</span>
          <span style={{ fontSize: '0.675rem', fontWeight: 700, background: '#fff0f1', color: '#e63946', padding: '2px 8px', borderRadius: '6px', marginLeft: '6px', letterSpacing: '0.8px', textTransform: 'uppercase', border: '1px solid #fecaca' }}>
            Super Admin
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'center' }}>
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.48rem 1.1rem',
                border: activeTab === id ? '1.5px solid #e63946' : '1.5px solid #ebebeb',
                borderRadius: '99px',
                background: activeTab === id ? '#e63946' : '#fff',
                color: activeTab === id ? '#fff' : '#555',
                fontFamily: 'inherit', fontSize: '0.83rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: activeTab === id ? '0 4px 14px rgba(230,57,70,0.28)' : 'none',
              }}
            >
              <Icon size={14} strokeWidth={2.2} /> {id}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="qb-nav-actions">
          <button className="qb-logout-btn" onClick={refresh}>
            <RefreshCw size={13} strokeWidth={2.2} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button className="qb-logout-btn" onClick={() => { localStorage.removeItem('projectx_token'); localStorage.removeItem('projectx_role'); window.location.href = '/'; }}>
            <LogOut size={13} strokeWidth={2.2} /> Sign Out
          </button>
        </div>
      </nav>

      {/* ══ BODY ════════════════════════════════════════════ */}
      <main className="qb-body" style={{ paddingTop: '2rem' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '8rem 2rem', color: '#9ca3af' }}>
            <RefreshCw size={28} strokeWidth={1.5} color="#e63946" style={{ animation: 'spin 0.9s linear infinite', display: 'block', margin: '0 auto 14px' }} />
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Loading platform data…</div>
          </div>
        ) : (

          <div style={{ animation: 'fadeUp 0.25s ease both' }}>

            {/* ══════════ OVERVIEW ══════════════════════════ */}
            {activeTab === 'Overview' && (
              <>
                {/* KPI Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                  {[
                    { icon: DollarSign, val: `₹${totalRevenue.toLocaleString()}`, label: 'Total Revenue',   sub: 'All-time across platform', accent: '#e63946' },
                    { icon: Package,    val: allOrders.length,                     label: 'Total Orders',   sub: 'Placed on the platform',   accent: '#7c3aed' },
                    { icon: Store,      val: sellers.length,                        label: 'Active Sellers', sub: `${pendingSellers.length} pending approval`, accent: '#d97706' },
                    { icon: Users,      val: customers.length,                      label: 'Customers',     sub: `${blockedCount} account${blockedCount !== 1 ? 's' : ''} blocked`, accent: '#059669' },
                  ].map(({ icon: Icon, val, label, sub, accent }) => (
                    <div key={label} style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '16px', padding: '1.4rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderTop: `3px solid ${accent}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: accent + '14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} color={accent} strokeWidth={2} />
                      </div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111', letterSpacing: '-1px', lineHeight: 1.1 }}>{val}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#222' }}>{label}</div>
                      <div style={{ fontSize: '0.775rem', color: '#9ca3af', fontWeight: 500 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Pending Alert Banner */}
                {pendingSellers.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '2rem' }}>
                    <AlertTriangle size={18} color="#d97706" strokeWidth={2} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.875rem' }}>{pendingSellers.length} seller application{pendingSellers.length > 1 ? 's' : ''} pending review</span>
                      <span style={{ color: '#b45309', fontSize: '0.8125rem', marginLeft: '6px' }}>— action required</span>
                    </div>
                    <button onClick={() => setActiveTab('Sellers')} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: '1.5px solid #d97706', color: '#92400e', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8125rem', fontWeight: 700 }}>
                      Review <ChevronRight size={13} />
                    </button>
                  </div>
                )}

                {/* Recent Orders */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <SectionTitle icon={Activity}>Recent Orders</SectionTitle>
                  <button className="qb-logout-btn" onClick={() => setActiveTab('Reports')} style={{ fontSize: '0.8rem' }}>
                    <Download size={12} /> View Reports
                  </button>
                </div>
                <Card>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <TableHead cols={['Order ID', 'Customer', 'Amount', 'Status', 'Date']} />
                    <tbody>
                      {allOrders.slice(0, 8).map((o, i) => {
                        const sc = statusMeta[o.status] || { bg: '#f3f4f6', color: '#374151' };
                        return (
                          <TableRow key={o.id} highlight={i % 2 !== 0}>
                            <TD mono bold><span style={{ color: '#e63946' }}>#{o.order_id}</span></TD>
                            <TD bold>{o.address?.split(',')[0] || '—'}</TD>
                            <TD bold>₹{o.total}</TD>
                            <TD><Pill bg={sc.bg} color={sc.color}>{o.status}</Pill></TD>
                            <TD muted>{new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</TD>
                          </TableRow>
                        );
                      })}
                    </tbody>
                  </table>
                  {allOrders.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>No orders on the platform yet.</div>}
                </Card>
              </>
            )}

            {/* ══════════ SELLERS ═══════════════════════════ */}
            {activeTab === 'Sellers' && (
              <>
                {/* Pending Approvals */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <Clock size={17} color="#d97706" strokeWidth={2} />
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111' }}>Pending Approvals</span>
                  {pendingSellers.length > 0 && <Pill bg="#fef3c7" color="#92400e">{pendingSellers.length} pending</Pill>}
                </div>

                {pendingSellers.length === 0 ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
                    <CheckCircle size={32} color="#16a34a" strokeWidth={1.5} style={{ marginBottom: '10px' }} />
                    <div style={{ fontWeight: 700, color: '#15803d', fontSize: '0.9375rem' }}>All applications have been reviewed</div>
                    <div style={{ color: '#6ee7b7', fontSize: '0.8125rem', marginTop: '4px' }}>No pending sellers at this time</div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '2rem' }}>
                    {pendingSellers.map(seller => {
                      const p = seller.SellerProfile || {};
                      const open = expandedId === seller.id;
                      return (
                        <div key={seller.id} style={{ border: '1px solid #ebebeb', borderRadius: '14px', marginBottom: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                          <div
                            onClick={() => setExpandedId(open ? null : seller.id)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', cursor: 'pointer', background: open ? '#fafafa' : '#fff', transition: 'background 0.15s' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ background: '#fff0f1', borderRadius: '10px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Store size={19} color="#e63946" strokeWidth={1.8} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111' }}>{p.business_name || 'Unnamed Business'}</div>
                                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>{seller.name} · {seller.email}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Pill bg="#fef3c7" color="#92400e">Awaiting Review</Pill>
                              {open ? <ChevronUp size={15} color="#9ca3af" /> : <ChevronDown size={15} color="#9ca3af" />}
                            </div>
                          </div>

                          {open && (
                            <div style={{ padding: '20px 24px', borderTop: '1px solid #ebebeb', background: '#fafafa' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '18px 28px', marginBottom: '20px' }}>
                                {[['GSTIN', p.gstin], ['PAN Card', p.pan], ['FSSAI License', p.fssai], ['UPI ID', p.upi_id], ['Bank Details', p.bank_details], ['Address Proof', p.address_proof]].map(([lbl, val]) => (
                                  <div key={lbl}>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.9px', marginBottom: '5px' }}>{lbl}</div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: val ? '#111' : '#f87171' }}>{val || 'Not provided'}</div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                  onClick={() => handleApprove(seller.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#16a34a', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 700 }}
                                >
                                  <CheckCircle size={15} strokeWidth={2.5} /> Approve Seller
                                </button>
                                <button onClick={() => setExpandedId(null)} className="qb-logout-btn">
                                  <X size={13} /> Close
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Active Sellers Table */}
                <SectionTitle icon={Store} count={sellers.length}>Active Sellers</SectionTitle>
                <Card>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <TableHead cols={['Name', 'Email', 'Status', 'Action']} />
                    <tbody>
                      {sellers.map((u, i) => {
                        const blocked = u.status === 'blocked';
                        return (
                          <TableRow key={u.id} highlight={i % 2 !== 0}>
                            <TD bold>{u.name}</TD>
                            <TD muted>{u.email}</TD>
                            <TD><Pill bg={blocked ? '#fce8e6' : '#e6f4ea'} color={blocked ? '#c5221f' : '#137333'}>{u.status}</Pill></TD>
                            <TD>
                              <button
                                onClick={() => handleToggleBlock(u.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: blocked ? '#e6f4ea' : '#fce8e6', color: blocked ? '#137333' : '#c5221f', border: 'none', padding: '6px 13px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700 }}
                              >
                                {blocked ? <><CheckCircle size={13} /> Unblock</> : <><Ban size={13} /> Block</>}
                              </button>
                            </TD>
                          </TableRow>
                        );
                      })}
                    </tbody>
                  </table>
                  {sellers.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>No sellers registered yet.</div>}
                </Card>
              </>
            )}

            {/* ══════════ USERS ═════════════════════════════ */}
            {activeTab === 'Users' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <SectionTitle icon={Users} count={allUsers.length}>All Users</SectionTitle>
                  <div style={{ position: 'relative', width: '240px' }}>
                    <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search by name or email"
                      style={{ width: '100%', padding: '0.55rem 1rem 0.55rem 2.3rem', border: '1.5px solid #ebebeb', borderRadius: '99px', fontFamily: 'inherit', fontSize: '0.8375rem', outline: 'none', color: '#111', background: '#fafafa' }}
                    />
                  </div>
                </div>

                <Card>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <TableHead cols={['User', 'Email', 'Role', 'Status', 'Joined', 'Action']} />
                    <tbody>
                      {filteredUsers.map((u, i) => {
                        const blocked  = u.status === 'blocked';
                        const rm = roleMeta[u.role] || { bg: '#f3f4f6', color: '#374151', label: u.role };
                        return (
                          <TableRow key={u.id} highlight={blocked}>
                            <TD>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff0f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 800, color: '#e63946', flexShrink: 0 }}>
                                  {u.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111' }}>{u.name}</span>
                              </div>
                            </TD>
                            <TD muted>{u.email}</TD>
                            <TD><Pill bg={rm.bg} color={rm.color}>{rm.label}</Pill></TD>
                            <TD><Pill bg={blocked ? '#fce8e6' : '#e6f4ea'} color={blocked ? '#c5221f' : '#137333'}>{u.status}</Pill></TD>
                            <TD muted>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</TD>
                            <TD>
                              {u.role !== 'super_admin' && (
                                <button
                                  onClick={() => handleToggleBlock(u.id)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '5px', background: blocked ? '#e6f4ea' : '#fce8e6', color: blocked ? '#137333' : '#c5221f', border: 'none', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 700 }}
                                >
                                  {blocked ? <><CheckCircle size={12} /> Unblock</> : <><Ban size={12} /> Block</>}
                                </button>
                              )}
                            </TD>
                          </TableRow>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>No users match your search.</div>}
                </Card>
              </>
            )}

            {/* ══════════ REPORTS ═══════════════════════════ */}
            {activeTab === 'Reports' && (
              <>
                {/* KPI Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                  {[
                    { label: 'Gross Revenue',  val: `₹${totalRevenue.toLocaleString()}`, accent: '#e63946' },
                    { label: 'Total Orders',   val: allOrders.length,                    accent: '#7c3aed' },
                    { label: 'Delivered',      val: allOrders.filter(o => o.status === 'Delivered').length, accent: '#059669' },
                    {
                      label: 'Success Rate',
                      val: allOrders.length
                        ? Math.round((allOrders.filter(o => o.status !== 'Cancelled').length / allOrders.length) * 100) + '%'
                        : '—',
                      accent: '#d97706'
                    },
                  ].map(c => (
                    <div key={c.label} style={{ background: '#fff', border: '1px solid #ebebeb', borderTop: `3px solid ${c.accent}`, borderRadius: '14px', padding: '1.25rem 1.4rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#111', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{c.val}</div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 600, marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Export Panel */}
                <div style={{ background: '#fafafa', border: '1px solid #ebebeb', borderRadius: '14px', padding: '1.4rem 1.5rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Filter size={15} color="#e63946" strokeWidth={2} />
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111' }}>Export Date Range</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    {[['From', reportStart, setReportStart], ['To', reportEnd, setReportEnd]].map(([lbl, val, set]) => (
                      <div key={lbl}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>{lbl}</div>
                        <input type="date" value={val} onChange={e => set(e.target.value)}
                          style={{ padding: '0.55rem 0.9rem', border: '1.5px solid #ebebeb', borderRadius: '10px', fontFamily: 'inherit', fontSize: '0.875rem', outline: 'none', background: '#fff', color: '#111' }} />
                      </div>
                    ))}
                    <button
                      onClick={downloadCSV}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e63946', color: '#fff', border: 'none', padding: '0.58rem 1.25rem', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 700, boxShadow: '0 4px 14px rgba(230,57,70,0.28)' }}
                    >
                      <Download size={15} /> Download CSV
                    </button>
                  </div>
                </div>

                {/* Full Transaction Table */}
                <SectionTitle icon={BarChart3} count={allOrders.length}>All Transactions</SectionTitle>
                <Card>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <TableHead cols={['Date', 'Order ID', 'Customer', 'Amount', 'Method', 'Status']} />
                    <tbody>
                      {allOrders.map((o, i) => {
                        const sc = statusMeta[o.status] || { bg: '#f3f4f6', color: '#374151' };
                        return (
                          <TableRow key={o.id} highlight={i % 2 !== 0}>
                            <TD muted>{new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</TD>
                            <TD mono><span style={{ color: '#e63946', fontWeight: 700 }}>#{o.order_id}</span></TD>
                            <TD bold>{o.address?.split(',')[0] || '—'}</TD>
                            <TD bold>₹{o.total}</TD>
                            <TD><span style={{ textTransform: 'capitalize', fontSize: '0.8125rem', color: '#555' }}>{o.payment_method || '—'}</span></TD>
                            <TD><Pill bg={sc.bg} color={sc.color}>{o.status}</Pill></TD>
                          </TableRow>
                        );
                      })}
                    </tbody>
                  </table>
                  {allOrders.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>No transactions found.</div>}
                </Card>
              </>
            )}

          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        table tbody tr:hover td { background: rgba(0,0,0,0.014); transition: background 0.1s; }
      `}</style>
    </div>
  );
}
