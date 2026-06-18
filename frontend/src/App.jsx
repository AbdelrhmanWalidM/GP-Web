import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import PaymentPage from './pages/PaymentPage';
import { SettingsProvider } from './SettingsContext';

const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) return <Navigate to="/login" />;
  if (role && userRole !== role) return <Navigate to="/" />;
  
  return children;
};

function App() {
  const isAuth = !!localStorage.getItem('token');

  return (
    <SettingsProvider>
      <Router>
      <div className="app-container">
        {isAuth && <Navbar />}
        <main style={{ padding: isAuth ? '2rem' : '0' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/payment" element={
              <ProtectedRoute role="resident">
                <PaymentPage />
              </ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute role="resident">
                <UserDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </Router>
    </SettingsProvider>
  );
}

export default App;
