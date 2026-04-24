import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';

const cards = [
  { title: 'Dream Entries', desc: 'Record and browse your dream journal entries', icon: '📖', path: '/dreams', accent: 'linear-gradient(135deg, #6366f1, #8b5cf6)', countKey: 'totalDreams' },
  { title: 'AI Dream Analysis', desc: 'Get AI-powered analysis of your dreams', icon: '🧠', path: '/ai-analysis', accent: 'linear-gradient(135deg, #8b5cf6, #ec4899)', countKey: null },
  { title: 'Dream Symbols', desc: 'Explore dream symbol dictionary and meanings', icon: '🔮', path: '/symbols', accent: 'linear-gradient(135deg, #a855f7, #7c3aed)', countKey: null },
  { title: 'Mood Tracker', desc: 'Track your emotional state and dream connections', icon: '🎭', path: '/moods', accent: 'linear-gradient(135deg, #ec4899, #f43f5e)', countKey: null },
  { title: 'Sleep Quality', desc: 'Monitor and improve your sleep patterns', icon: '😴', path: '/sleep-quality', accent: 'linear-gradient(135deg, #06b6d4, #3b82f6)', countKey: null },
  { title: 'Lucid Dreams', desc: 'Track and enhance your lucid dreaming practice', icon: '✨', path: '/lucid-dreams', accent: 'linear-gradient(135deg, #f59e0b, #f97316)', countKey: 'totalLucidDreams' },
  { title: 'Recurring Dreams', desc: 'Identify and understand recurring dream patterns', icon: '🔄', path: '/recurring-dreams', accent: 'linear-gradient(135deg, #14b8a6, #22c55e)', countKey: 'totalRecurringDreams' },
  { title: 'Categories', desc: 'Organize dreams by type and theme', icon: '📂', path: '/categories', accent: 'linear-gradient(135deg, #f472b6, #c084fc)', countKey: null },
  { title: 'Tags', desc: 'Tag and label your dreams for easy search', icon: '🏷️', path: '/tags', accent: 'linear-gradient(135deg, #10b981, #06b6d4)', countKey: null },
  { title: 'Sleep Goals', desc: 'Set and track your sleep improvement goals', icon: '🎯', path: '/goals', accent: 'linear-gradient(135deg, #eab308, #f59e0b)', countKey: 'activeGoals' },
  { title: 'Dream Insights', desc: 'Discover patterns and insights from your dreams', icon: '💡', path: '/insights', accent: 'linear-gradient(135deg, #3b82f6, #6366f1)', countKey: null },
  { title: 'Statistics', desc: 'View detailed analytics and dream statistics', icon: '📊', path: '/statistics', accent: 'linear-gradient(135deg, #8b5cf6, #6366f1)', countKey: null },
  { title: 'Dream Timeline', desc: 'Browse your dreams in chronological order', icon: '📅', path: '/timeline', accent: 'linear-gradient(135deg, #7c3aed, #a855f7)', countKey: null },
  { title: 'Dream Sharing', desc: 'Export and share your dream experiences', icon: '🌐', path: '/dream-sharing', accent: 'linear-gradient(135deg, #0ea5e9, #3b82f6)', countKey: null },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetch(`${API}/stats/overview`, { headers: apiHeaders() })
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Dream Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalDreams || 0}</div>
          <div className="stat-label">Total Dreams</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalLucidDreams || 0}</div>
          <div className="stat-label">Lucid Dreams</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgSleepHours || 0}</div>
          <div className="stat-label">Avg Sleep Hours</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgSleepQuality || 0}</div>
          <div className="stat-label">Avg Sleep Quality</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.activeGoals || 0}</div>
          <div className="stat-label">Active Goals</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {cards.map((card, i) => (
          <div
            key={i}
            className="dashboard-card"
            style={{ '--card-accent': card.accent }}
            onClick={() => navigate(card.path)}
          >
            <div className="card-icon">{card.icon}</div>
            {card.countKey && stats[card.countKey] !== undefined && (
              <div className="card-count">{stats[card.countKey]} items</div>
            )}
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
