import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import API_BASE from '../api';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { billId, amount, month } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '', name: '' });

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/api/user/bill/${billId}/pay`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      alert('Payment Failed. Please check your card details.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <CheckCircle size={64} color="var(--secondary)" style={{ margin: 'auto', marginBottom: '1.5rem' }} />
          <h1 className="glow-text">Payment Successful!</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Redirecting to dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card" style={{ width: '100%', maxWidth: '500px' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '2rem' }}>
          <ArrowLeft size={20} /> Back to Dashboard
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 className="glow-text">Secure Checkout</h2>
          <p style={{ color: 'var(--text-muted)' }}>Settling Bill for {month}</p>
          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount Due</p>
            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{amount} <span style={{ fontSize: '1rem' }}>EGP</span></p>
          </div>
        </div>

        <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Cardholder Name</label>
            <input 
              required
              type="text" 
              placeholder="John Doe"
              className="input-field" 
              style={{ width: '100%', background: 'var(--panel-bg)', color: 'var(--text-main)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }} 
              value={cardData.name}
              onChange={e => setCardData({...cardData, name: e.target.value})}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Card Number</label>
            <div style={{ position: 'relative' }}>
              <CreditCard size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                required
                type="text" 
                placeholder="xxxx xxxx xxxx xxxx"
                className="input-field" 
                style={{ width: '100%', background: 'var(--panel-bg)', color: 'var(--text-main)', padding: '1rem 1rem 1rem 3rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }} 
                value={cardData.number}
                onChange={e => setCardData({...cardData, number: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Expiry Date</label>
              <input 
                required
                type="text" 
                placeholder="MM / YY"
                className="input-field" 
                style={{ width: '100%', background: 'var(--panel-bg)', color: 'var(--text-main)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }} 
                value={cardData.expiry}
                onChange={e => setCardData({...cardData, expiry: e.target.value})}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>CVC</label>
              <input 
                required
                type="password" 
                placeholder="***"
                className="input-field" 
                style={{ width: '100%', background: 'var(--panel-bg)', color: 'var(--text-main)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }} 
                value={cardData.cvc}
                onChange={e => setCardData({...cardData, cvc: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '1.25rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            {loading ? 'Processing...' : (
              <>
                <Lock size={18} />
                Pay Securely
              </>
            )}
          </button>
          
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Your payment is protected by enterprise-grade encryption.
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default PaymentPage;
