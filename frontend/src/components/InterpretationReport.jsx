import React, { useState } from 'react';
import { API, apiHeaders } from '../App';

export default function InterpretationReport() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');

  const generate = async () => {
    setLoading(true);
    setStatus('');
    try {
      const res = await fetch(`${API}/custom-views/interpretation-report`, { headers: apiHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setStatus('PDF generated successfully.');
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'rgba(30,27,75,0.6)', padding: 20, borderRadius: 16, border: '1px solid rgba(99,102,241,0.3)' }}>
      <h3 style={{ marginBottom: 8, color: '#c4b5fd' }}>Dream Interpretation Report (PDF)</h3>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
        Generates a downloadable PDF with rule-driven symbol interpretations and recent insights.
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff',
            padding: '10px 18px',
            border: 'none',
            borderRadius: 10,
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          {loading ? 'Generating...' : 'Generate Report PDF'}
        </button>
        {pdfUrl && (
          <>
            <a href={pdfUrl} download="dream-interpretation-report.pdf" style={{ color: '#a5b4fc', fontWeight: 600 }}>
              Download PDF
            </a>
            <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ color: '#a5b4fc', fontWeight: 600 }}>
              Open in new tab
            </a>
          </>
        )}
      </div>
      {status && <p style={{ marginTop: 12, color: status.startsWith('Error') ? '#f87171' : '#86efac' }}>{status}</p>}
    </div>
  );
}
