import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';
import AIOutput from '../components/AIOutput';

export default function AIAnalysis() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analyze');
  const [dreams, setDreams] = useState([]);
  const [selectedDream, setSelectedDream] = useState('');
  const [dreamText, setDreamText] = useState('');
  const [dreamTitle, setDreamTitle] = useState('');
  const [symbolInput, setSymbolInput] = useState('');
  const [symbolContext, setSymbolContext] = useState('');
  const [period, setPeriod] = useState('week');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);

  useEffect(() => {
    fetch(`${API}/dreams`, { headers: apiHeaders() }).then(r => r.json()).then(setDreams).catch(() => {});
    fetch(`${API}/ai/history`, { headers: apiHeaders() }).then(r => r.json()).then(setHistory).catch(() => {});
  }, []);

  const selectDream = (id) => {
    const d = dreams.find(d => d.id === parseInt(id));
    if (d) { setSelectedDream(id); setDreamText(d.content); setDreamTitle(d.title); }
  };

  const analyzeDream = async () => {
    setAiLoading(true); setAiResult('');
    try {
      const res = await fetch(`${API}/ai/analyze-dream`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ dreamContent: dreamText, title: dreamTitle }) });
      const data = await res.json();
      setAiResult(data.analysis);
      fetch(`${API}/ai/history`, { headers: apiHeaders() }).then(r => r.json()).then(setHistory);
    } catch { setAiResult('Error analyzing dream.'); }
    setAiLoading(false);
  };

  const detectPatterns = async () => {
    setAiLoading(true); setAiResult('');
    try {
      const res = await fetch(`${API}/ai/detect-patterns`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({}) });
      const data = await res.json();
      setAiResult(data.analysis);
    } catch { setAiResult('Error detecting patterns.'); }
    setAiLoading(false);
  };

  const interpretSymbol = async () => {
    setAiLoading(true); setAiResult('');
    try {
      const res = await fetch(`${API}/ai/interpret-symbol`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ symbol: symbolInput, context: symbolContext }) });
      const data = await res.json();
      setAiResult(data.analysis);
    } catch { setAiResult('Error interpreting symbol.'); }
    setAiLoading(false);
  };

  const journalSummary = async () => {
    setAiLoading(true); setAiResult('');
    try {
      const res = await fetch(`${API}/ai/journal-summary`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ period }) });
      const data = await res.json();
      setAiResult(data.analysis);
    } catch { setAiResult('Error generating summary.'); }
    setAiLoading(false);
  };

  const tabs = [
    { key: 'analyze', label: 'Dream Analysis' },
    { key: 'patterns', label: 'Pattern Detection' },
    { key: 'symbols', label: 'Symbol Interpretation' },
    { key: 'summary', label: 'Journal Summary' },
    { key: 'history', label: 'Analysis History' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>AI Dream Analysis</h1>
        <span className="back-btn" onClick={() => navigate('/')}>Back</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: 'auto' }} onClick={() => { setActiveTab(t.key); setAiResult(''); }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'analyze' && (
        <div className="chart-container">
          <h3>Analyze a Dream</h3>
          <div className="form-group">
            <label>Select from your dreams</label>
            <select value={selectedDream} onChange={e => selectDream(e.target.value)}>
              <option value="">Choose a dream...</option>
              {dreams.map(d => <option key={d.id} value={d.id}>{d.dream_date?.split('T')[0]} - {d.title}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Or enter dream title</label>
            <input value={dreamTitle} onChange={e => setDreamTitle(e.target.value)} placeholder="Dream title" />
          </div>
          <div className="form-group">
            <label>Dream content</label>
            <textarea value={dreamText} onChange={e => setDreamText(e.target.value)} placeholder="Describe your dream..." style={{ minHeight: '120px' }} />
          </div>
          <button className="btn btn-ai" onClick={analyzeDream} disabled={!dreamText || aiLoading}>Analyze Dream</button>
        </div>
      )}

      {activeTab === 'patterns' && (
        <div className="chart-container">
          <h3>Detect Patterns Across Your Dreams</h3>
          <p style={{ color: '#94a3b8', marginBottom: '16px' }}>AI will analyze your recent dreams to find recurring themes, symbols, and emotional patterns.</p>
          <button className="btn btn-ai" onClick={detectPatterns} disabled={aiLoading}>Detect Patterns</button>
        </div>
      )}

      {activeTab === 'symbols' && (
        <div className="chart-container">
          <h3>Interpret a Dream Symbol</h3>
          <div className="form-group">
            <label>Symbol</label>
            <input value={symbolInput} onChange={e => setSymbolInput(e.target.value)} placeholder="e.g., Water, Snake, Flying" />
          </div>
          <div className="form-group">
            <label>Context (optional)</label>
            <textarea value={symbolContext} onChange={e => setSymbolContext(e.target.value)} placeholder="Describe the context in which this symbol appeared..." />
          </div>
          <button className="btn btn-ai" onClick={interpretSymbol} disabled={!symbolInput || aiLoading}>Interpret Symbol</button>
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="chart-container">
          <h3>Dream Journal Summary</h3>
          <div className="form-group">
            <label>Period</label>
            <select value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="quarter">Past Quarter</option>
            </select>
          </div>
          <button className="btn btn-ai" onClick={journalSummary} disabled={aiLoading}>Generate Summary</button>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Type</th><th>Preview</th></tr></thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} onClick={() => setSelectedHistory(h)}>
                  <td>{new Date(h.created_at).toLocaleDateString()}</td>
                  <td><span className="tag" style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }}>{h.analysis_type}</span></td>
                  <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.result?.substring(0, 100)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedHistory && (
        <div className="modal-overlay" onClick={() => setSelectedHistory(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <h2>Analysis Result</h2>
            <div className="detail-row"><span className="detail-label">Type</span><span className="detail-value">{selectedHistory.analysis_type}</span></div>
            <div className="detail-row"><span className="detail-label">Date</span><span className="detail-value">{new Date(selectedHistory.created_at).toLocaleString()}</span></div>
            <AIOutput text={selectedHistory.result} />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSelectedHistory(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <AIOutput text={aiResult} loading={aiLoading} />
    </div>
  );
}
