import { useState } from 'react';

export default function CreateCollectionModal({ onConfirm, onClose, defaultName = '' }) {
  const [name, setName] = useState(defaultName);

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="fpm-close" onClick={onClose} title="Close">✕</button>
        <div className="modal-header">
          <h2>Create Collection</h2>
        </div>
        <input
          className="share-link-input"
          type="text"
          placeholder="Collection name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={!name.trim()}>
            Create
          </button>
          <button className="btn-modal-close" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
