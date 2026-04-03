export default function CollectionDeleteConfirm({ collection, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="fpm-close" onClick={onClose} title="Close">✕</button>
        <div className="modal-header">
          <h2>Delete Collection</h2>
          <p className="modal-filename">{collection.name}</p>
        </div>
        <p style={{ padding: '0 0.25rem 1rem', color: '#a0a8c0', lineHeight: 1.5 }}>
          Are you sure you want to delete <strong style={{ color: '#e0e0e0' }}>{collection.name}</strong>?
          The files inside will not be deleted.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-file-action btn-delete" style={{ flex: 1, padding: '0.6rem' }} onClick={onConfirm}>
            Delete Collection
          </button>
          <button className="btn-modal-close" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
