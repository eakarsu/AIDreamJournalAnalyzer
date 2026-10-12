import React from 'react';

/**
 * Multiple one-click "fill every field" presets for AI prompt forms.
 *
 * Each preset populates every field (required and optional) for the given form so
 * a reviewer can run a complete example and then edit before generating. Modelled
 * on AICompetitiveAnalysisTool FullFieldPresets.js.
 */
export function fillEveryField(values, variant = 0, choices = {}) {
  const names = ['Calm night', 'Anxious night', 'Adventurous night'];
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (['id', 'created_at', 'updated_at', 'user_id'].includes(key)) return [key, value];
    if (choices[key] && choices[key].length) return [key, choices[key][variant % choices[key].length]];
    if (Array.isArray(value)) return [key, [`${names[variant]} example`, 'Review before generating']];
    if (value && typeof value === 'object') return [key, { ...value }];
    if (typeof value === 'boolean') return [key, variant !== 1];
    if (/days|count|number/.test(key)) return [key, [30, 14, 90][variant]];
    if (typeof value === 'number') return [key, [7, 3, 30][variant]];
    return [key, `${names[variant]} example: recall a vivid dream, note the emotions and symbols, and describe the waking context in detail.`];
  }));
}

export default function FullFieldPresets({ presets, onSelect, value = {}, onChange, choices = {}, disabled = false }) {
  const labels = presets ? presets.map((preset) => preset.label) : ['Dream example', 'Nightmare example', 'Lucid example'];
  const choose = (index) => {
    if (presets) {
      const values = presets[index].values;
      if (onSelect) onSelect(values);
      else onChange?.({ ...value, ...values });
      return;
    }
    onChange?.(fillEveryField(value, index, choices));
  };
  return (
    <div className="ai-preset-bar" style={styles.bar}>
      <div>
        <strong style={styles.title}>Fill every field</strong>
        <p style={styles.hint}>Each example fills required and optional fields. Review and edit before generating.</p>
      </div>
      <div style={styles.actions}>
        {labels.map((label, index) => (
          <button type="button" key={label} className="btn btn-secondary" disabled={disabled} style={styles.btn} onClick={() => choose(index)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  bar: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', marginBottom: 16, borderRadius: 10, border: '1px solid rgba(139,92,246,0.35)', background: 'rgba(139,92,246,0.08)' },
  title: { color: '#e2e8f0', fontSize: 13 },
  hint: { color: '#94a3b8', fontSize: 12, margin: '4px 0 0' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btn: { width: 'auto', padding: '8px 12px', fontSize: 12 },
};
