import React from 'react';

export default function DetailModal({ title, fields, onClose, onEdit, onDelete }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        {fields.map((f, i) => (
          <div key={i} className="detail-row">
            <span className="detail-label">{f.label}</span>
            <span className="detail-value">{f.value}</span>
          </div>
        ))}
        <div className="modal-actions">
          {onEdit && <button className="btn btn-secondary" onClick={onEdit}>Edit</button>}
          {onDelete && <button className="btn btn-danger" onClick={onDelete}>Delete</button>}
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
