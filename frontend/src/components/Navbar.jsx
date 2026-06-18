import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, Zap, LogOut, User, Sun, Moon, Languages } from 'lucide-react';
import { useSettings } from '../SettingsContext';

const Navbar = () => {
  const { theme, lang, toggleTheme, toggleLang, t } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const name = localStorage.getItem('name');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const navItemStyle = (path) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    color: location.pathname === path ? 'var(--primary)' : 'var(--text-muted)',
    fontWeight: 600,
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    background: location.pathname === path ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
    transition: 'var(--transition-fast)'
  });

  return (
    <nav className="glass-card" style={{ 
      margin: '1rem', 
      padding: '0.75rem 1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: '20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ 
          background: 'var(--primary)', 
          padding: '0.5rem', 
          borderRadius: '10px',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Zap color="white" size={18} fill="white" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem' }}>
          SMART<span style={{ color: 'var(--primary)' }}>METER</span>
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
        {/* Theme/Lang Toggles */}
        <button onClick={toggleTheme} className="btn-icon" style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button onClick={toggleLang} className="btn-icon" style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 700 }}>
          {lang === 'en' ? 'AR' : 'EN'}
        </button>

        <div className="desktop-tabs" style={{ width: '1px', height: '24px', background: 'var(--glass-border)', margin: '0 0.5rem' }}></div>

        <div className="desktop-tabs" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
          <User size={16} />
          {name}
        </div>

        <button onClick={handleLogout} style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: 'none', 
          color: 'var(--danger)', 
          padding: '0.5rem', 
          borderRadius: '8px', 
          cursor: 'pointer'
        }}>
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
