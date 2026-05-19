import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DreamEntries from './pages/DreamEntries';
import Symbols from './pages/Symbols';
import MoodTracker from './pages/MoodTracker';
import SleepQuality from './pages/SleepQuality';
import LucidDreams from './pages/LucidDreams';
import RecurringDreams from './pages/RecurringDreams';
import Categories from './pages/Categories';
import Tags from './pages/Tags';
import Goals from './pages/Goals';
import Insights from './pages/Insights';
import AIAnalysis from './pages/AIAnalysis';
import Statistics from './pages/Statistics';
import Timeline from './pages/Timeline';
import DreamSharing from './pages/DreamSharing';
import Navbar from './components/Navbar';

import Batch03Features from './pages/Batch03Features';
import CustomViewsPage from './pages/CustomViewsPage';

const API = '/api';

export function apiHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export { API };

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return null;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div>
      <Navbar user={user} onLogout={handleLogout} />
      <div className="main-content">
        <Routes>
          <Route path="/batch03" element={<Batch03Features />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/dreams" element={<DreamEntries />} />
          <Route path="/symbols" element={<Symbols />} />
          <Route path="/moods" element={<MoodTracker />} />
          <Route path="/sleep-quality" element={<SleepQuality />} />
          <Route path="/lucid-dreams" element={<LucidDreams />} />
          <Route path="/recurring-dreams" element={<RecurringDreams />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/ai-analysis" element={<AIAnalysis />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/dream-sharing" element={<DreamSharing />} />
          <Route path="/custom-views" element={<CustomViewsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
