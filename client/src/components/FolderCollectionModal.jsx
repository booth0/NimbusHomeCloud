import { useState } from 'react';

export default function FolderCollectionModal({ folderName, fileCount, onCreateCollection, onJustUpload, onClose }) {
  const [name, setName] = useState(folderName);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="fpm-close" onClick={onClose} title="Close">✕</button>
        <div className="modal-header">
          <h2>Folder Upload</h2>
          <p className="modal-filename">{fileCount} file{fileCount !== 1 ? 's' : ''} found</p>
        </div>
        <p style={{ padding: '0 0.25rem 0.75rem', color: '#a0a8c0', lineHeight: 1.5 }}>
          Would you like to create a collection for these files?
        </p>
        <input
          className="share-link-input"
          style={{ marginBottom: '0.75rem' }}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Collection name"
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onCreateCollection(name.trim()); }}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={() => onCreateCollection(name.trim())}
            disabled={!name.trim()}
          >
            Create Collection
          </button>
          <button className="btn-modal-close" style={{ flex: 1 }} onClick={onJustUpload}>
            Just Upload
          </button>
        </div>
      </div>
    </div>
  );
}
