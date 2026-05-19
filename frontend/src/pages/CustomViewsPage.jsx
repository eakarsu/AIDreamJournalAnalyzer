import React from 'react';
import DreamFrequencyChart from '../components/DreamFrequencyChart';
import EmotionHeatmap from '../components/EmotionHeatmap';
import InterpretationReport from '../components/InterpretationReport';
import TagSymbolRulesEditor from '../components/TagSymbolRulesEditor';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page">
      <div className="page-header">
        <h1>Dream Views</h1>
        <p style={{ color: '#94a3b8', marginTop: 6 }}>
          Custom visualizations and analytic tools for your dream journal.
        </p>
      </div>
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr', marginTop: 20 }}>
        <DreamFrequencyChart />
        <EmotionHeatmap />
      </div>
      <div style={{ display: 'grid', gap: 20, marginTop: 20 }}>
        <InterpretationReport />
        <TagSymbolRulesEditor />
      </div>
    </div>
  );
}
