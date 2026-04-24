import React from 'react';

function formatAIText(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('# ')) {
      elements.push(<h2 key={i} style={{ fontSize: '20px', fontWeight: 700, color: '#c4b5fd', margin: '20px 0 10px' }}>{trimmed.slice(2)}</h2>);
    } else if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={i} style={{ fontSize: '17px', fontWeight: 700, color: '#c4b5fd', margin: '16px 0 8px' }}>{trimmed.slice(3)}</h3>);
    } else if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={i} style={{ fontSize: '15px', fontWeight: 600, color: '#a5b4fc', margin: '14px 0 6px' }}>{trimmed.slice(4)}</h3>);
    } else if (trimmed.match(/^\*\*(.+?)\*\*:?\s*(.*)/)) {
      const match = trimmed.match(/^\*\*(.+?)\*\*:?\s*(.*)/);
      elements.push(
        <div key={i} style={{ margin: '10px 0' }}>
          <strong style={{ color: '#a5b4fc', fontSize: '15px' }}>{match[1]}</strong>
          {match[2] && <span style={{ color: '#cbd5e1' }}>: {formatInlineText(match[2])}</span>}
        </div>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: '8px', margin: '4px 0', paddingLeft: '12px' }}>
          <span style={{ color: '#8b5cf6', flexShrink: 0 }}>&#9679;</span>
          <span style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: '14px' }}>{formatInlineText(trimmed.slice(2))}</span>
        </div>
      );
    } else if (trimmed.match(/^\d+\.\s/)) {
      const num = trimmed.match(/^(\d+)\.\s(.*)/);
      elements.push(
        <div key={i} style={{ display: 'flex', gap: '8px', margin: '4px 0', paddingLeft: '12px' }}>
          <span style={{ color: '#8b5cf6', flexShrink: 0, fontWeight: 600, minWidth: '20px' }}>{num[1]}.</span>
          <span style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: '14px' }}>{formatInlineText(num[2])}</span>
        </div>
      );
    } else if (trimmed === '') {
      elements.push(<div key={i} style={{ height: '8px' }} />);
    } else {
      elements.push(<p key={i} style={{ color: '#cbd5e1', lineHeight: 1.7, fontSize: '14px', margin: '4px 0' }}>{formatInlineText(trimmed)}</p>);
    }
  });

  return elements;
}

function formatInlineText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#a5b4fc' }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function AIOutput({ text, loading }) {
  if (loading) {
    return (
      <div className="ai-output">
        <div className="ai-loading">
          <div className="spinner" />
          <span>AI is analyzing your dream data...</span>
        </div>
      </div>
    );
  }

  if (!text) return null;

  return (
    <div className="ai-output">
      {formatAIText(text)}
    </div>
  );
}
