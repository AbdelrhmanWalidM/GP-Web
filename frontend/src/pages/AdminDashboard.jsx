import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Users, AlertTriangle, TrendingUp, Search, 
  ArrowLeft, Activity, CreditCard, Bell, MessageSquare, Send, Radio
} from 'lucide-react';
import ConsumptionChart from '../components/ConsumptionChart';
import axios from 'axios';
import { useSettings } from '../SettingsContext';
import API_BASE from '../api';

const AdminDashboard = () => {
  const { t, n } = useSettings();
  const [view, setView] = useState('grid'); // 'grid', 'customer', 'anomalies', 'broadcast', 'messages'
  const [customers, setCustomers] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerReadings, setCustomerReadings] = useState([]);
  const [customerBills, setCustomerBills] = useState([]);
  
  // New Broadcast/Message state
  const [broadcast, setBroadcast] = useState({ title: '', message: '', target: 'all' });
  const [allMessages, setAllMessages] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchAnomalies();
    fetchMessages();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/admin/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(res.data);
    } catch (err) { console.error("Error fetching customers", err); }
  };

  const fetchAnomalies = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/admin/anomalies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnomalies(res.data);
    } catch (err) { console.error("Error fetching anomalies", err); }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllMessages(res.data);
    } catch (err) { console.error("Error fetching messages", err); }
  };

  const trackCustomer = async (customer) => {
    try {
      const token = localStorage.getItem('token');
      const [readingsRes, billingRes] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/customer/${customer.meter_id}/readings`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/api/admin/customer/${customer.meter_id}/billing`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setSelectedCustomer(customer);
      setCustomerReadings(readingsRes.data);
      setCustomerBills(billingRes.data);
      setView('customer');
    } catch (err) { console.error("Error fetching customer data", err); }
  };

  const handleBroadcast = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/api/admin/broadcast`, broadcast, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Broadcast sent to all grid nodes!');
      setBroadcast({ title: '', message: '', target: 'all' });
    } catch (err) { alert('Broadcast failed'); }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/api/messages`, { 
        content: replyText, 
        recipient: activeChatUser 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReplyText('');
      fetchMessages();
    } catch (err) { alert('Reply failed'); }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="glow-text" style={{ fontSize: '2.5rem' }}>{t('gridControlCenter')}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('regionalSurveillance')}</p>
        </div>
      </header>

      {/* Side Tabs */}
      {/* Desktop Tab Navigation (Top Bar) */}
      <nav className="desktop-tabs" style={{ gap: '1rem', marginBottom: '2rem' }}>
        {[
          { id: 'grid', label: t('gridControl'), icon: Activity },
          { id: 'anomalies', label: t('securityAlerts'), icon: AlertTriangle },
          { id: 'broadcast', label: t('broadcaster'), icon: Radio },
          { id: 'messages', label: t('communication'), icon: MessageSquare }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: view === tab.id ? 'var(--primary)' : 'var(--panel-bg)',
              color: view === tab.id ? 'white' : 'var(--text-main)',
              border: '1px solid var(--glass-border)', cursor: 'pointer', fontWeight: 600
            }}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </nav>

      {/* Mobile Tab Navigation (Bottom Bar) */}
      <nav className="mobile-tabs">
        {[
          { id: 'grid', label: t('gridControl'), icon: Activity },
          { id: 'anomalies', label: t('securityAlerts'), icon: AlertTriangle },
          { id: 'broadcast', label: t('broadcaster'), icon: Radio },
          { id: 'messages', label: t('communication'), icon: MessageSquare }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`mobile-tab-btn ${view === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        {view === 'grid' && (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid-stack" style={{ 
              display: 'flex', 
              overflowX: 'auto', 
              gap: '1.5rem', 
              paddingBottom: '1rem',
              marginBottom: '1rem',
              scrollbarWidth: 'none' /* Firefox */
            }}>
              <style>{`.grid-stack::-webkit-scrollbar { display: none; }`}</style>
              <div className="glass-card" style={{ minWidth: '250px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <Users color="var(--primary)" size={24} />
                  <h3 style={{ color: 'var(--text-muted)' }}>{t('activeConsumers')}</h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: 800 }}>{n(customers.length)}</p>
              </div>
              <div className="glass-card" style={{ minWidth: '250px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <BarChart3 color="var(--secondary)" size={24} />
                  <h3 style={{ color: 'var(--text-muted)' }}>{t('gridLoad')}</h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: 800 }}>{n(45.2)} <span style={{ fontSize: '1rem', fontWeight: 400 }}>MW</span></p>
              </div>
              <div className="glass-card" 
                   onClick={() => setView('anomalies')}
                   style={{ minWidth: '250px', flex: 1, border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--danger)' }}></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <AlertTriangle color="var(--danger)" size={24} />
                  <h3 style={{ color: 'var(--text-muted)' }}>Security Alerts</h3>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>{anomalies.length}</p>
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={20} color="var(--primary)" />
                  Residential Nodes
                </h3>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                  <input 
                    type="text" 
                    placeholder="Filter by ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--text-main)', width: '250px' }} 
                  />
                </div>
              </div>
              <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
                      <th style={{ padding: '1rem' }}>NAME</th>
                      <th style={{ padding: '1rem' }}>METER ID</th>
                      <th style={{ padding: '1rem' }}>STATUS</th>
                      <th style={{ padding: '1rem' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.filter(c => 
                      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      c.meter_id.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((c) => (
                      <tr key={c._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '1rem' }}>{c.name}</td>
                        <td style={{ padding: '1rem' }}><code style={{ color: 'var(--primary)' }}>{c.meter_id}</code></td>
                        <td style={{ padding: '1rem' }}><span style={{ color: 'var(--secondary)' }}>● Active</span></td>
                        <td style={{ padding: '1rem' }}>
                          <button onClick={() => trackCustomer(c)} className="btn-primary" style={{ padding: '0.4rem 1rem' }}>Track</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'customer' && (
          <motion.div key="customer" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <button onClick={() => setView('grid')} style={{ background: 'var(--panel-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '10px' }}><ArrowLeft size={20} /></button>
              <h2 className="glow-text">{selectedCustomer?.name}</h2>
            </div>
            
            <div className="grid-stack" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              <div className="glass-card"><ConsumptionChart data={customerReadings} /></div>
              <div className="glass-card">
                <h3>Contact Info</h3>
                <p style={{ marginTop: '1rem' }}><b>Phone:</b> {selectedCustomer?.phone}</p>
                <p><b>Address:</b> {selectedCustomer?.address}</p>
              </div>
            </div>

            <div className="glass-card" style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Billing Log (EGP)</h3>
              <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '1rem' }}>Month</th>
                    <th style={{ padding: '1rem' }}>Total</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerBills.map(b => (
                    <tr key={b._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '1rem' }}>{b.month}</td>
                      <td style={{ padding: '1rem' }}>{b.amount_due} EGP</td>
                      <td style={{ padding: '1rem', color: b.status === 'paid' ? 'var(--secondary)' : 'var(--danger)' }}>{b.status.toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
        )}

        {view === 'anomalies' && (
          <motion.div key="anomalies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="glass-card">
              <h2 style={{ marginBottom: '2rem', color: 'var(--danger)' }}>Grid Security Incident Log</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '1rem' }}>Date</th>
                    <th style={{ padding: '1rem' }}>Meter ID</th>
                    <th style={{ padding: '1rem' }}>Incident</th>
                    <th style={{ padding: '1rem' }}>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '1rem' }}>{new Date(a.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '1rem' }}><code>{a.meter_id}</code></td>
                      <td style={{ padding: '1rem' }}>{a.type}</td>
                      <td style={{ padding: '1rem', color: 'var(--danger)', fontWeight: 700 }}>{a.severity.toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {view === 'broadcast' && (
          <motion.div key="broadcast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="glass-card" style={{ maxWidth: '600px', margin: 'auto' }}>
              <h2 style={{ marginBottom: '2rem' }}>Grid Broadcaster</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <input type="text" placeholder="Target Meter (e.g. all)" value={broadcast.target} onChange={e => setBroadcast({...broadcast, target: e.target.value})} className="input-field" style={{ width: '100%', background: 'var(--panel-bg)', color: 'var(--text-main)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }} />
                <input type="text" placeholder="Title" value={broadcast.title} onChange={e => setBroadcast({...broadcast, title: e.target.value})} className="input-field" style={{ width: '100%', background: 'var(--panel-bg)', color: 'var(--text-main)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }} />
                <textarea placeholder="Message" value={broadcast.message} onChange={e => setBroadcast({...broadcast, message: e.target.value})} className="input-field" style={{ width: '100%', background: 'var(--panel-bg)', color: 'var(--text-main)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)', minHeight: '120px' }} />
                <button onClick={handleBroadcast} className="btn-primary" style={{ padding: '1rem' }}>Send Broadcast</button>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'messages' && (
          <motion.div key="messages" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '70vh', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
            <div className="glass-card" style={{ overflowY: 'auto' }}>
              <h3>Citizen Queries</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {[...new Set(allMessages.map(m => m.sender === 'admin@gov.ae' ? m.recipient : m.sender))].map(user => (
                  <button key={user} onClick={() => setActiveChatUser(user)} style={{ padding: '1rem', textAlign: 'left', borderRadius: '10px', background: activeChatUser === user ? 'var(--primary)' : 'rgba(255,255,255,0.03)', color: activeChatUser === user ? 'var(--bg-color)' : 'white', border: 'none', cursor: 'pointer' }}>
                    <b>{user}</b>
                  </button>
                ))}
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                {activeChatUser ? allMessages.filter(m => m.sender === activeChatUser || m.recipient === activeChatUser).map((m, i) => (
                  <div key={i} style={{ 
                    maxWidth: '70%', 
                    alignSelf: m.sender === 'admin@gov.ae' ? 'flex-end' : 'flex-start', 
                    background: m.sender === 'admin@gov.ae' ? 'var(--primary)' : 'var(--panel-bg)', 
                    color: m.sender === 'admin@gov.ae' ? 'white' : 'var(--text-main)', 
                    padding: '1rem', borderRadius: '12px', margin: '0.5rem 0',
                    border: '1px solid var(--glass-border)'
                  }}>
                    <p>{m.content}</p>
                  </div>
                )) : <p style={{ textAlign: 'center', marginTop: '20%', color: 'var(--text-muted)' }}>Select a chat</p>}
              </div>
              {activeChatUser && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type a reply..." style={{ flex: 1, background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '12px' }} />
                  <button onClick={handleSendReply} className="btn-primary" style={{ padding: '1rem 2rem' }}><Send size={20} /></button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
