import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#ec4899', '#f43f5e', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6'];

export default function Statistics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [sleepTrends, setSleepTrends] = useState([]);
  const [moodTrends, setMoodTrends] = useState([]);

  useEffect(() => {
    fetch(`${API}/stats/overview`, { headers: apiHeaders() }).then(r => r.json()).then(setStats).catch(() => {});
    fetch(`${API}/stats/sleep-trends`, { headers: apiHeaders() }).then(r => r.json()).then(d => setSleepTrends(d.reverse())).catch(() => {});
    fetch(`${API}/stats/mood-trends`, { headers: apiHeaders() }).then(r => r.json()).then(d => setMoodTrends(d.reverse())).catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Dream Statistics</h1>
        <span className="back-btn" onClick={() => navigate('/')}>Back</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-value">{stats.totalDreams || 0}</div><div className="stat-label">Total Dreams</div></div>
        <div className="stat-card"><div className="stat-value">{stats.totalLucidDreams || 0}</div><div className="stat-label">Lucid Dreams</div></div>
        <div className="stat-card"><div className="stat-value">{stats.avgSleepHours || 0}h</div><div className="stat-label">Avg Sleep</div></div>
        <div className="stat-card"><div className="stat-value">{stats.avgSleepQuality || 0}</div><div className="stat-label">Avg Quality</div></div>
        <div className="stat-card"><div className="stat-value">{stats.totalRecurringDreams || 0}</div><div className="stat-label">Recurring</div></div>
        <div className="stat-card"><div className="stat-value">{stats.activeGoals || 0}</div><div className="stat-label">Active Goals</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="chart-container">
          <h3>Sleep Quality Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={sleepTrends.map(s => ({ date: s.sleep_date?.split('T')[0]?.slice(5), quality: s.quality_rating, hours: parseFloat(s.hours_slept) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#e2e8f0' }} />
              <Legend />
              <Line type="monotone" dataKey="quality" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} name="Quality" />
              <Line type="monotone" dataKey="hours" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4' }} name="Hours" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Mood Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={(stats.moodDistribution || []).map(m => ({ name: m.mood, value: parseInt(m.count) }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: '#94a3b8' }}>
                {(stats.moodDistribution || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Category Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={(stats.categoryDistribution || []).map(c => ({ name: c.category, count: parseInt(c.count) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#e2e8f0' }} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Mood Intensity Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={moodTrends.map(m => ({ date: m.entry_date?.split('T')[0]?.slice(5), intensity: m.intensity, mood: m.mood }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#e2e8f0' }} formatter={(v, n, p) => [v, `${p.payload.mood} (Intensity)`]} />
              <Line type="monotone" dataKey="intensity" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
