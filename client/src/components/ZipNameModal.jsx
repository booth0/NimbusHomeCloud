import { useState } from 'react';

export default function ZipNameModal({ defaultName, onConfirm, onClose }) {
  const [name, setName] = useState(defaultName || 'archive');

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm(name.trim() || 'archive');
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card zip-name-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Download as ZIP</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Archive name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary">Download ZIP</button>
        </form>
        <button className="btn-modal-close" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
