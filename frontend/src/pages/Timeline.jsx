import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';
import AIOutput from '../components/AIOutput';

export default function Timeline() {
  const navigate = useNavigate();
  const [dreams, setDreams] = useState([]);
  const [selected, setSelected] = useState(null);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/dreams`, { headers: apiHeaders() }).then(r => r.json()).then(setDreams).catch(() => {});
  }, []);

  const analyzeDream = async (dream) => {
    setAiLoading(true); setAiResult('');
    try {
      const res = await fetch(`${API}/ai/analyze-dream`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ dreamContent: dream.content, title: dream.title }) });
      const data = await res.json();
      setAiResult(data.analysis);
    } catch { setAiResult('Error analyzing.'); }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dream Timeline</h1>
        <span className="back-btn" onClick={() => navigate('/')}>Back</span>
      </div>

      <div className="timeline">
        {dreams.map(d => (
          <div key={d.id} className="timeline-item" onClick={() => { setSelected(d); setAiResult(''); }}>
            <div className="timeline-date">{d.dream_date?.split('T')[0]} | {d.mood} | Quality: {d.sleep_quality}/10</div>
            <div className="timeline-title">{d.title}</div>
            <div className="timeline-excerpt">{d.content?.substring(0, 150)}...</div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {d.category && <span className="tag" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>{d.category}</span>}
              {d.is_lucid && <span className="tag" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>Lucid</span>}
              {(d.tags || []).map((t, i) => <span key={i} className="tag" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setAiResult(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <h2>{selected.title}</h2>
            {[{ label: 'Date', value: selected.dream_date?.split('T')[0] }, { label: 'Content', value: selected.content }, { label: 'Mood', value: selected.mood }, { label: 'Quality', value: `${selected.sleep_quality}/10` }, { label: 'Category', value: selected.category }, { label: 'Lucid', value: selected.is_lucid ? 'Yes' : 'No' }].map((f, i) => (
              <div key={i} className="detail-row"><span className="detail-label">{f.label}</span><span className="detail-value">{f.value}</span></div>
            ))}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button className="btn btn-ai" onClick={() => analyzeDream(selected)}>Analyze with AI</button>
              <button className="btn btn-secondary" onClick={() => { setSelected(null); setAiResult(''); }}>Close</button>
            </div>
            <AIOutput text={aiResult} loading={aiLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
