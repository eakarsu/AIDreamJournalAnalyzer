import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <span className="navbar-brand" onClick={() => navigate('/')}>
        AI Dream Journal
      </span>
      <div className="navbar-right">
        <span className="navbar-user">{user.name}</span>
        <button className="navbar-logout" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}
