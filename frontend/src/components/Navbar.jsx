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
        <a
          href="/nightmare-trigger-plan"
          onClick={(e) => { e.preventDefault(); navigate('/nightmare-trigger-plan'); }}
          style={{ color: '#a5b4fc', fontWeight: 600, marginRight: 16, textDecoration: 'none', cursor: 'pointer' }}
        >
          Trigger Plan
        </a>
        <a
          href="/custom-views"
          onClick={(e) => { e.preventDefault(); navigate('/custom-views'); }}
          data-testid="sidebar-dream-views"
          style={{ color: '#a5b4fc', fontWeight: 600, marginRight: 16, textDecoration: 'none', cursor: 'pointer' }}
        >
          Dream Views
        </a>
        <span className="navbar-user">{user.name}</span>
        <button className="navbar-logout" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}
