import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Activity, AlertTriangle, Leaf, CreditCard, Bell, 
  Cpu, User, MessageSquare, ShieldCheck, Send, Lock, Phone, MapPin
} from 'lucide-react';
import ConsumptionChart from '../components/ConsumptionChart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../SettingsContext';

import API_BASE from '../api';

const UserDashboard = () => {
  const { t, n } = useSettings();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'forecast', 'profile', 'messages', 'security'
  const [passwordError, setPasswordError] = useState('');
  const [stats, setStats] = useState({
    current_load: 0,
    daily_usage: 0,
    active_appliances: [],
    anomaly_detected: false,
    forecast_next_hour: 0,
    sustainability_score: 85
  });
  const [readings, setReadings] = useState([]);
  const [bills, setBills] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userAnomalies, setUserAnomalies] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', address: '', meter_id: '' });
  const [passwords, setPasswords] = useState({ new_password: '', confirm: '' });

  // Custom states for AI forecasting and budgeting
  const [forecastData, setForecastData] = useState([]);
  const [budgetThreshold, setBudgetThreshold] = useState(() => {
    return parseFloat(localStorage.getItem('budget_threshold') || '500');
  });

  const applianceTips = {
    "Air Conditioner": "Set thermostat to 24°C. Clean filters regularly to reduce energy use by up to 15%.",
    "Refrigerator": "Ensure door seals tightly. Keep temperature at 3-5°C and freezer at -18°C.",
    "Water Heater": "Lower heater temperature to 50°C. Turn it off when not in use.",
    "Oven": "Avoid opening the door while cooking. Use a toaster oven or microwave for smaller meals.",
    "Washing Machine": "Wash with full loads and use cold water to save up to 90% of laundry energy.",
    "Router": "Unplug or shut down your router if you're going away for a few days.",
    "Smart TV": "Enable energy-saving mode and decrease screen backlight brightness.",
    "Computer": "Configure sleep mode to activate after 10 minutes of inactivity.",
    "Space Heater": "Only heat the room you are currently using. Turn it off before sleeping.",
    "Electric Kettle": "Only boil the exact amount of water you need to save time and power."
  };

  const calculateProjectedBill = (kwh) => {
    let amount = 0;
    let remaining = kwh;
    
    const tiers = [
      { max: 50, rate: 0.68 },
      { max: 50, rate: 0.78 },
      { max: 100, rate: 0.95 },
      { max: 150, rate: 1.55 },
      { max: 300, rate: 1.95 },
      { max: 350, rate: 2.10 },
      { max: Infinity, rate: 2.58 }
    ];
    
    for (const tier of tiers) {
      if (remaining > tier.max) {
        amount += tier.max * tier.rate;
        remaining -= tier.max;
      } else {
        amount += remaining * tier.rate;
        remaining = 0;
        break;
      }
    }
    return parseFloat(amount.toFixed(2));
  };

  const getTierName = (kwh) => {
    if (kwh <= 50) return "Tier 1 (0-50 kWh)";
    if (kwh <= 100) return "Tier 2 (51-100 kWh)";
    if (kwh <= 200) return "Tier 3 (101-200 kWh)";
    if (kwh <= 350) return "Tier 4 (201-350 kWh)";
    if (kwh <= 650) return "Tier 5 (351-650 kWh)";
    if (kwh <= 1000) return "Tier 6 (651-1000 kWh)";
    return "Tier 7 (over 1000 kWh)";
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [readingsRes, billsRes, notifRes, anomRes, msgRes, profileRes, liveBillRes, forecastRes] = await Promise.all([
        axios.get(`${API_BASE}/api/user/readings`, { headers }),
        axios.get(`${API_BASE}/api/user/billing`, { headers }),
        axios.get(`${API_BASE}/api/notifications`, { headers }),
        axios.get(`${API_BASE}/api/user/anomalies`, { headers }),
        axios.get(`${API_BASE}/api/messages`, { headers }),
        axios.get(`${API_BASE}/api/user/profile`, { headers }),
        axios.get(`${API_BASE}/api/user/bill/current`, { headers }),
        axios.get(`${API_BASE}/api/user/forecast`, { headers }).catch(e => ({ data: { forecast: [] } }))
      ]);

      setReadings(readingsRes.data);
      setBills([liveBillRes.data, ...billsRes.data.filter(b => b.month !== liveBillRes.data.month)]);
      setNotifications(notifRes.data);
      setUserAnomalies(anomRes.data);
      setMessages(msgRes.data);
      setProfile(profileRes.data);
      
      const fData = (forecastRes.data && forecastRes.data.forecast) ? forecastRes.data.forecast : [];
      setForecastData(fData);
      
      if (readingsRes.data.length > 0) {
        const latest = readingsRes.data[0];
        const nextHourForecast = fData.length > 0 ? fData[0] : 0;
        setStats(prev => ({
          ...prev,
          current_load: latest.load,
          active_appliances: latest.active_appliances || [],
          anomaly_detected: anomRes.data.length > 0,
          forecast_next_hour: nextHourForecast
        }));
      }
    } catch (err) {
      console.error("Error fetching dashboard data", err);
    }
  };

  const handlePay = (bill) => {
    navigate('/payment', { state: { billId: bill._id, amount: bill.amount_due, month: bill.month } });
  };

  const handleUpdateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/api/user/profile`, profile, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Profile Updated');
    } catch (err) { alert('Update Failed'); }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/api/messages`, { content: newMessage }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewMessage('');
      fetchDashboardData();
    } catch (err) { alert('Message Failed'); }
  };

  // Budget calculations
  const currentKwh = bills[0]?.total_kwh || 0;
  const forecastedKwh = forecastData.reduce((a, b) => a + b, 0);
  const projectedKwh = currentKwh + (forecastedKwh * 2.5); // Estimate for remaining month
  const projectedBill = calculateProjectedBill(projectedKwh);

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="glow-text" style={{ fontSize: '2.5rem' }}>{t('ahlan')}, {profile.name}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('meterId')}: {profile.meter_id}</p>
        </div>
      </header>

      {/* Desktop Tab Navigation */}
      <nav className="desktop-tabs" style={{ gap: '0.5rem', marginBottom: '2rem', background: 'var(--panel-bg)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
        {[
          { id: 'overview', icon: Activity, label: t('overview') },
          { id: 'forecast', icon: Cpu, label: 'Demand Forecast' },
          { id: 'profile', icon: User, label: t('profile') },
          { id: 'messages', icon: MessageSquare, label: t('support') },
          { id: 'security', icon: ShieldCheck, label: t('security') }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-main)',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: '0.3s'
            }}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </nav>

      {/* Mobile Tab Navigation */}
      <nav className="mobile-tabs">
        {[
          { id: 'overview', icon: Activity, label: t('overview') },
          { id: 'forecast', icon: Cpu, label: 'Forecast' },
          { id: 'profile', icon: User, label: t('profile') },
          { id: 'messages', icon: MessageSquare, label: t('support') },
          { id: 'security', icon: ShieldCheck, label: t('security') }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`mobile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="glass-card" style={{ marginBottom: '2rem', border: '1px solid var(--primary)', background: 'rgba(56, 189, 248, 0.05)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <Bell size={20} color="var(--primary)" />
                  <p style={{ flex: 1, fontSize: '0.9rem' }}><b>{notifications[0].title}:</b> {notifications[0].message}</p>
                </div>
              </div>
            )}

            <div className="grid-stack" style={{ 
              display: 'flex', 
              overflowX: 'auto', 
              gap: '1.5rem', 
              paddingBottom: '1rem',
              marginBottom: '1.5rem',
              scrollbarWidth: 'none'
            }}>
              <style>{`.grid-stack::-webkit-scrollbar { display: none; }`}</style>
              
              <div className="glass-card card-glow-primary" style={{ minWidth: '280px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <Activity color="var(--primary)" size={24} />
                  <h3 style={{ color: 'var(--text-muted)' }}>{t('realTimeLoad')}</h3>
                </div>
                <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>{n(stats.current_load)} <span style={{ fontSize: '1rem', fontWeight: 400 }}>{t('kw')}</span></p>
              </div>

              <div className="glass-card card-glow-primary" onClick={() => setActiveTab('forecast')} style={{ minWidth: '280px', flex: 1, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <Cpu color="var(--primary)" size={24} />
                  <h3 style={{ color: 'var(--text-muted)' }}>Forecast (Next Hour)</h3>
                </div>
                <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>{n(parseFloat(stats.forecast_next_hour).toFixed(3))} <span style={{ fontSize: '1rem', fontWeight: 400 }}>{t('kw')}</span></p>
              </div>

              <div className="glass-card card-glow-accent" style={{ minWidth: '280px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <CreditCard color="var(--accent)" size={24} />
                  <h3 style={{ color: 'var(--text-muted)' }}>{t('latestBill')}</h3>
                </div>
                <p style={{ fontSize: '2.5rem', fontWeight: 800 }}>{n(bills[0]?.amount_due || '0.00')} <span style={{ fontSize: '1rem', fontWeight: 400 }}>{t('egp')}</span></p>
                <button onClick={() => handlePay(bills[0])} disabled={bills[0]?.status === 'paid'} className="btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>
                  {bills[0]?.status === 'paid' ? t('paid') : t('payNow')}
                </button>
              </div>

              <div className="glass-card card-glow-secondary" style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '280px', flex: 1 }}>
                <Leaf color="var(--secondary)" size={32} />
                <div>
                  <h3 style={{ color: 'var(--text-muted)' }}>Eco Score</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--secondary)' }}>{stats.sustainability_score}/100</p>
                </div>
              </div>
            </div>

            {/* Budget & Projection Section */}
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Budgeting & Electricity Tariffs (2026)</h3>
              <div className="grid-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Monthly Budget Limit (EGP)</label>
                  <input 
                    type="number" 
                    value={budgetThreshold} 
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      setBudgetThreshold(val);
                      localStorage.setItem('budget_threshold', val);
                    }} 
                    style={{ width: '100%', background: 'var(--panel-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
                <div>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Current Active Tier</h4>
                  <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {getTierName(bills[0]?.total_kwh || 0)}
                  </p>
                </div>
                <div>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Projected Monthly Bill</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: projectedBill > budgetThreshold ? 'var(--danger)' : 'var(--secondary)' }}>
                    {n(projectedBill)} EGP
                  </p>
                </div>
              </div>
              
              {projectedBill > budgetThreshold && (
                <div className="budget-warning-banner" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <AlertTriangle color="var(--danger)" />
                  <div>
                    <h5 style={{ color: 'var(--text-main)', fontWeight: 700 }}>Budget Threshold Exceeded!</h5>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Based on your AI forecast, your expected bill of {n(projectedBill)} EGP will exceed your {n(budgetThreshold)} EGP budget limit. Consider implementing saving tips below.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid-stack" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="glass-card">
                <h3 style={{ marginBottom: '1.5rem' }}>{t('consumptionHistory')}</h3>
                <ConsumptionChart data={readings} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <Cpu color="var(--primary)" size={24} />
                    <h3>{t('liveNilm')}</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {stats.active_appliances.map((app, i) => (
                      <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{app}</span>
                        <span style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: 800 }}>ACTIVE</span>
                      </div>
                    ))}
                    {stats.active_appliances.length === 0 && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No appliances active.</p>
                    )}
                  </div>
                </div>

                {/* DYNAMIC ECO TIPS */}
                <div className="glass-card">
                  <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Leaf color="var(--secondary)" size={20} />
                    Dynamic Saving Recommendations
                  </h3>
                  
                  {stats.active_appliances.length > 0 ? (
                    <div className="eco-tips-container">
                      {stats.active_appliances.map((app, idx) => {
                        const tip = applianceTips[app] || "Ensure to turn off this device when not in use to optimize efficiency.";
                        return (
                          <div key={idx} className="eco-tip-card">
                            <span className="eco-tip-title">{app} Tips</span>
                            <span className="eco-tip-desc">{tip}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No high-load appliances are active. Tips will dynamically load here when appliances are turned on.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* BILL HISTORY TABLE */}
            <div className="glass-card">
              <h3 style={{ marginBottom: '1.5rem' }}>{t('billingHistory')}</h3>
              <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '1rem' }}>{t('month')}</th>
                      <th style={{ padding: '1rem' }}>{t('usage')} (kW)</th>
                      <th style={{ padding: '1rem' }}>{t('total')} (EGP)</th>
                      <th style={{ padding: '1rem' }}>{t('status')}</th>
                      <th style={{ padding: '1rem' }}>{t('action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((b) => (
                      <tr key={b._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '1rem' }}>{b.month}</td>
                        <td style={{ padding: '1rem' }}>{n(b.total_kwh)}</td>
                        <td style={{ padding: '1rem', fontWeight: 700 }}>{n(b.amount_due)}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.8rem',
                            background: b.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: b.status === 'paid' ? 'var(--secondary)' : 'var(--danger)'
                          }}>{b.status.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {b.status === 'unpaid' && <button onClick={() => handlePay(b)} className="btn-primary" style={{ fontSize: '0.75rem' }}>Pay Now</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* DEMAND FORECASTING CHART TAB */}
        {activeTab === 'forecast' && (
          <motion.div key="forecast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ marginBottom: '1rem' }}>7-Day Demand Forecast (AI Prediction)</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                This chart shows your forecasted electricity usage for the next 168 hours, generated by our Deep Learning model.
              </p>
              
              <div style={{ width: '100%', height: '350px' }}>
                <ResponsiveContainer>
                  <AreaChart data={forecastData.map((val, idx) => ({ hour: `Hr +${idx+1}`, usage: parseFloat(val.toFixed(3)) }))}>
                    <defs>
                      <linearGradient id="forecastGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hour" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip 
                      contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                      labelStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="usage" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#forecastGlow)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="grid-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div className="glass-card">
                <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Peak Forecasted Load</h4>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>
                  {forecastData.length > 0 ? n(Math.max(...forecastData).toFixed(3)) : '0.000'} <span style={{ fontSize: '1rem', fontWeight: 400 }}>kW</span>
                </p>
              </div>
              <div className="glass-card">
                <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Average Forecasted Load</h4>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {forecastData.length > 0 ? n((forecastData.reduce((a,b)=>a+b, 0)/forecastData.length).toFixed(3)) : '0.000'} <span style={{ fontSize: '1rem', fontWeight: 400 }}>kW</span>
                </p>
              </div>
              <div className="glass-card">
                <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Forecasted Energy</h4>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  {forecastData.length > 0 ? n(forecastData.reduce((a,b)=>a+b, 0).toFixed(2)) : '0.00'} <span style={{ fontSize: '1rem', fontWeight: 400 }}>kWh</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="glass-card">
                <h3 style={{ marginBottom: '2rem' }}>Personal Information</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Full Name</label>
                    <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="input-field" style={{ width: '100%', background: 'var(--panel-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Phone Number</label>
                    <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="input-field" style={{ width: '100%', background: 'var(--panel-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Physical Address</label>
                    <textarea value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="input-field" style={{ width: '100%', background: 'var(--panel-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px', minHeight: '80px' }} />
                  </div>
                  <button onClick={handleUpdateProfile} className="btn-primary" style={{ padding: '1rem' }}>Update Profile</button>
                </div>
              </div>

              <div className="glass-card">
                <h3 style={{ marginBottom: '2rem' }}>Security Settings</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>New Password</label>
                    <input type="password" value={passwords.new_password} onChange={e => {
                      setPasswords({...passwords, new_password: e.target.value});
                      setPasswordError('');
                    }} style={{ width: '100%', background: 'var(--panel-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px' }} />
                    <p style={{ 
                      fontSize: '0.7rem', 
                      color: passwordError === 'Success' ? 'var(--secondary)' : (passwordError ? 'var(--danger)' : 'var(--text-muted)'), 
                      marginTop: '0.4rem' 
                    }}>
                      {passwordError === 'Success' ? 'Password updated successfully!' : t('passRequirement')}
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Confirm Password</label>
                    <input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} style={{ width: '100%', background: 'var(--panel-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px' }} />
                  </div>
                  <button onClick={async () => {
                    const { new_password, confirm } = passwords;
                    setPasswordError('');

                    if (new_password !== confirm) {
                      setPasswordError('Passwords mismatch');
                      return;
                    }
                    
                    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
                    if (!passwordRegex.test(new_password)) {
                      setPasswordError('Invalid Complexity');
                      return;
                    }

                    try {
                      const token = localStorage.getItem('token');
                      await axios.post(`${API_BASE}/api/user/password`, { new_password }, { 
                        headers: { Authorization: `Bearer ${token}` } 
                      });
                      setPasswords({ new_password: '', confirm: '' });
                      setPasswordError('Success');
                    } catch (err) {
                      setPasswordError('Failed to update password');
                    }
                  }} className="btn-primary" style={{ padding: '1rem' }}>Change Password</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'messages' && (
          <motion.div key="messages" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <div className="glass-card" style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ 
                  maxWidth: '70%', 
                  alignSelf: m.sender === profile.email ? 'flex-end' : 'flex-start',
                  background: m.sender === profile.email ? 'var(--primary)' : 'var(--panel-bg)',
                  color: m.sender === profile.email ? 'white' : 'var(--text-main)',
                  padding: '1rem', borderRadius: '12px', position: 'relative',
                  border: m.sender === profile.email ? 'none' : '1px solid var(--glass-border)'
                }}>
                  <p>{m.content}</p>
                  <span style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '0.5rem', display: 'block' }}>{new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
              {messages.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No messages yet. Send feedback to the government admin below.</p>}
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type your message or feedback..." style={{ flex: 1, background: 'var(--panel-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '1rem', borderRadius: '12px', outline: 'none' }} />
              <button onClick={handleSendMessage} className="btn-primary" style={{ padding: '1rem 2rem', borderRadius: '12px' }}><Send size={20} /></button>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div key="security" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="glass-card">
              <h3 style={{ marginBottom: '2rem' }}>Anomaly & Incident Logs</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '1rem' }}>Timestamp</th>
                      <th style={{ padding: '1rem' }}>Incident Type</th>
                      <th style={{ padding: '1rem' }}>Severity</th>
                      <th style={{ padding: '1rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userAnomalies.map((a, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '1rem' }}>{new Date(a.timestamp).toLocaleString()}</td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{a.type}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '10px', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>{a.severity}</span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className={`badge badge-${a.status || 'pending'}`}>
                            {a.status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {userAnomalies.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No security incidents detected on your node.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserDashboard;
