import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          <div className="navbar-logo">
            <Activity size={24} color="var(--primary)" />
          </div>
          <span className="navbar-title">AI Task Platform</span>
        </Link>
        
        <div className="navbar-actions">
          {user?.email && <span className="navbar-user">{user.email}</span>}
          <button onClick={handleLogout} className="btn btn-secondary navbar-logout">
            <LogOut size={16} style={{ marginRight: '0.5rem' }} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
