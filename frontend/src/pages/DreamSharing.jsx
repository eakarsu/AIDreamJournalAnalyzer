import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, apiHeaders } from '../App';
import AIOutput from '../components/AIOutput';

export default function DreamSharing() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('export'); // export | community | mine
  const [dreams, setDreams] = useState([]);
  const [selectedDreams, setSelectedDreams] = useState([]);
  const [exportFormat, setExportFormat] = useState('text');
  const [exported, setExported] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Community feed state
  const [feed, setFeed] = useState([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotalPages, setFeedTotalPages] = useState(1);
  const [trending, setTrending] = useState({ tags: [], moods: [], categories: [] });
  const [openComments, setOpenComments] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  // Mine
  const [mine, setMine] = useState([]);
  const [minePage, setMinePage] = useState(1);
  const [mineTotalPages, setMineTotalPages] = useState(1);
  const [shareDialog, setShareDialog] = useState(null);
  const [shareAnonymous, setShareAnonymous] = useState(true);
  const [shareVisibility, setShareVisibility] = useState('public');

  useEffect(() => {
    fetch(`${API}/dreams?limit=100`, { headers: apiHeaders() })
      .then(r => r.json())
      .then(data => setDreams(Array.isArray(data) ? data : (data.data || [])))
      .catch(() => {});
  }, []);

  const loadFeed = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`${API}/sharing/feed?page=${page}&limit=10`, { headers: apiHeaders() });
      const json = await res.json();
      setFeed(json.data || []);
      setFeedPage(json.pagination?.page || 1);
      setFeedTotalPages(json.pagination?.totalPages || 1);
    } catch {}
  }, []);

  const loadTrending = useCallback(async () => {
    try {
      const res = await fetch(`${API}/sharing/trending`, { headers: apiHeaders() });
      const json = await res.json();
      setTrending(json);
    } catch {}
  }, []);

  const loadMine = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`${API}/sharing/mine?page=${page}&limit=10`, { headers: apiHeaders() });
      const json = await res.json();
      setMine(json.data || []);
      setMinePage(json.pagination?.page || 1);
      setMineTotalPages(json.pagination?.totalPages || 1);
    } catch {}
  }, []);

  useEffect(() => {
    if (tab === 'community') { loadFeed(1); loadTrending(); }
    if (tab === 'mine') { loadMine(1); }
  }, [tab, loadFeed, loadTrending, loadMine]);

  const toggleDream = (id) => {
    setSelectedDreams(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const exportDreams = () => {
    const selected = dreams.filter(d => selectedDreams.includes(d.id));
    if (selected.length === 0) return;

    if (exportFormat === 'text') {
      const text = selected.map(d =>
        `${'='.repeat(50)}\n${d.title}\nDate: ${d.dream_date?.split('T')[0]} | Mood: ${d.mood} | Quality: ${d.sleep_quality}/10\nCategory: ${d.category} | Lucid: ${d.is_lucid ? 'Yes' : 'No'}\nTags: ${(d.tags || []).join(', ')}\n${'─'.repeat(50)}\n${d.content}\n`
      ).join('\n');
      setExported(text);
    } else {
      const jsonData = selected.map(d => ({
        title: d.title, date: d.dream_date?.split('T')[0], mood: d.mood,
        sleep_quality: d.sleep_quality, category: d.category, is_lucid: d.is_lucid,
        tags: d.tags, content: d.content
      }));
      setExported(JSON.stringify(jsonData, null, 2));
    }
  };

  const downloadExport = () => {
    const blob = new Blob([exported], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dream-journal-export.${exportFormat === 'text' ? 'txt' : 'json'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSummary = async () => {
    setAiLoading(true); setAiResult('');
    try {
      const res = await fetch(`${API}/ai/journal-summary`, { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ period: 'month' }) });
      const data = await res.json();
      setAiResult(data.analysis);
    } catch { setAiResult('Error generating summary.'); }
    setAiLoading(false);
  };

  const submitShare = async () => {
    if (!shareDialog) return;
    try {
      await fetch(`${API}/sharing`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ dream_id: shareDialog.id, anonymous: shareAnonymous, visibility: shareVisibility })
      });
      setShareDialog(null);
      setTab('mine');
    } catch {}
  };

  const toggleLike = async (id) => {
    try {
      await fetch(`${API}/sharing/${id}/like`, { method: 'POST', headers: apiHeaders() });
      loadFeed(feedPage);
    } catch {}
  };

  const openCommentsFor = async (id) => {
    setOpenComments(id);
    try {
      const res = await fetch(`${API}/sharing/${id}/comments`, { headers: apiHeaders() });
      setComments(await res.json());
    } catch { setComments([]); }
  };

  const submitComment = async () => {
    if (!commentText.trim() || !openComments) return;
    try {
      await fetch(`${API}/sharing/${openComments}/comments`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ content: commentText, anonymous: true })
      });
      setCommentText('');
      openCommentsFor(openComments);
      loadFeed(feedPage);
    } catch {}
  };

  const unshare = async (id) => {
    try {
      await fetch(`${API}/sharing/${id}`, { method: 'DELETE', headers: apiHeaders() });
      loadMine(minePage);
    } catch {}
  };

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-secondary'}`}
      style={{ width: 'auto' }}
    >{label}</button>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Dream Sharing & Community</h1>
        <span className="back-btn" onClick={() => navigate('/')}>Back</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {tabBtn('export', 'Export')}
        {tabBtn('community', 'Community Feed')}
        {tabBtn('mine', 'My Shares')}
      </div>

      {tab === 'export' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="chart-container">
            <h3>Select Dreams to Export or Share</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDreams(dreams.map(d => d.id))}>Select All</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDreams([])}>Clear</button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {dreams.map(d => (
                <div key={d.id} style={{
                  padding: '12px 16px', marginBottom: '8px', borderRadius: '8px',
                  background: selectedDreams.includes(d.id) ? 'rgba(99,102,241,0.15)' : 'rgba(15,12,41,0.4)',
                  border: `1px solid ${selectedDreams.includes(d.id) ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.1)'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div onClick={() => toggleDream(d.id)} style={{ cursor: 'pointer', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600 }}>{d.title}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{d.dream_date?.split('T')[0]}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{d.mood} | {d.category}</div>
                  </div>
                  <button className="btn btn-ai btn-sm" style={{ width: 'auto', marginLeft: 8 }} onClick={(e) => { e.stopPropagation(); setShareDialog(d); }}>Share</button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="chart-container">
              <h3>Export Options</h3>
              <div className="form-group">
                <label>Format</label>
                <select value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
                  <option value="text">Plain Text</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-primary" style={{ width: 'auto' }} onClick={exportDreams} disabled={selectedDreams.length === 0}>
                  Export ({selectedDreams.length} dreams)
                </button>
                <button className="btn btn-ai" onClick={getSummary}>AI Summary</button>
              </div>
            </div>

            {exported && (
              <div className="chart-container" style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3>Export Preview</h3>
                  <button className="btn btn-success btn-sm" onClick={downloadExport}>Download</button>
                </div>
                <pre style={{ background: 'rgba(15,12,41,0.6)', padding: '16px', borderRadius: '8px', fontSize: '12px', maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
                  {exported}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'community' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <div className="chart-container">
            <h3>Community Feed</h3>
            {feed.length === 0 && <p style={{ color: '#94a3b8' }}>No shared dreams yet. Be the first to share!</p>}
            {feed.map(d => (
              <div key={d.id} style={{
                padding: '16px', marginBottom: '12px', borderRadius: '8px',
                background: 'rgba(15,12,41,0.4)', border: '1px solid rgba(99,102,241,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{d.title}</span>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{d.author_name || 'Anonymous'}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{d.mood} | {d.category}</div>
                <p style={{ marginTop: '8px', color: '#cbd5e1', fontSize: '14px' }}>{d.content}</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleLike(d.id)}>
                    {d.liked_by_me ? '♥' : '♡'} {d.like_count}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openCommentsFor(d.id)}>
                    💬 {d.comment_count}
                  </button>
                </div>
                {openComments === d.id && (
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(15,12,41,0.6)', borderRadius: '8px' }}>
                    {comments.map(c => (
                      <div key={c.id} style={{ marginBottom: '8px', fontSize: '13px' }}>
                        <strong style={{ color: '#a78bfa' }}>{c.author_name || 'Anonymous'}:</strong> {c.content}
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add an interpretation..." style={{ flex: 1 }} />
                      <button className="btn btn-primary btn-sm" onClick={submitComment}>Send</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {feedTotalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                <button className="btn btn-secondary btn-sm" disabled={feedPage <= 1} onClick={() => loadFeed(feedPage - 1)}>Prev</button>
                <span>Page {feedPage} / {feedTotalPages}</span>
                <button className="btn btn-secondary btn-sm" disabled={feedPage >= feedTotalPages} onClick={() => loadFeed(feedPage + 1)}>Next</button>
              </div>
            )}
          </div>
          <div>
            <div className="chart-container">
              <h3>Trending Tags</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {trending.tags?.map((t, i) => (
                  <span key={i} style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(139,92,246,0.2)', fontSize: '12px' }}>
                    #{t.tag} ({t.count})
                  </span>
                ))}
              </div>
            </div>
            <div className="chart-container" style={{ marginTop: '16px' }}>
              <h3>Trending Moods</h3>
              {trending.moods?.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>{m.mood}</span><span style={{ color: '#94a3b8' }}>{m.count}</span>
                </div>
              ))}
            </div>
            <div className="chart-container" style={{ marginTop: '16px' }}>
              <h3>Trending Categories</h3>
              {trending.categories?.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span>{c.category}</span><span style={{ color: '#94a3b8' }}>{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'mine' && (
        <div className="chart-container">
          <h3>My Shared Dreams</h3>
          {mine.length === 0 && <p style={{ color: '#94a3b8' }}>You haven't shared any dreams yet.</p>}
          {mine.map(d => (
            <div key={d.id} style={{
              padding: '12px 16px', marginBottom: '8px', borderRadius: '8px',
              background: 'rgba(15,12,41,0.4)', border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{d.title}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {d.visibility} | {d.anonymous ? 'Anonymous' : 'With name'} | ♥ {d.like_count} | 💬 {d.comment_count}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => unshare(d.id)}>Unshare</button>
            </div>
          ))}
          {mineTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              <button className="btn btn-secondary btn-sm" disabled={minePage <= 1} onClick={() => loadMine(minePage - 1)}>Prev</button>
              <span>Page {minePage} / {mineTotalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={minePage >= mineTotalPages} onClick={() => loadMine(minePage + 1)}>Next</button>
            </div>
          )}
        </div>
      )}

      {shareDialog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="chart-container" style={{ maxWidth: 480, width: '90%' }}>
            <h3>Share "{shareDialog.title}"</h3>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={shareAnonymous} onChange={e => setShareAnonymous(e.target.checked)} /> Share anonymously
              </label>
            </div>
            <div className="form-group">
              <label>Visibility</label>
              <select value={shareVisibility} onChange={e => setShareVisibility(e.target.value)}>
                <option value="public">Public (community feed)</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private (just me)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={submitShare}>Share</button>
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setShareDialog(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <AIOutput text={aiResult} loading={aiLoading} />
    </div>
  );
}
