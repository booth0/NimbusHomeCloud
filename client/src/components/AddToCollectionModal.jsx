import { useState, useEffect } from 'react';

export default function AddToCollectionModal({ file, onClose }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [creating, setCreating]       = useState(false);
  const [newName, setNewName]         = useState('');
  const [addingToId, setAddingToId]   = useState(null);
  const [addedIds, setAddedIds]       = useState(new Set());

  const token = () => localStorage.getItem('nimbus_token');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/collections', {
          headers: { Authorization: `Bearer ${token()}` },
        });
        const data = await res.json();
        if (!res.ok) return setError(data.error || 'Failed to load collections');
        setCollections(data.collections);
        setAddedIds(new Set(
          data.collections
            .filter(c => c.fileIds.includes(file._id))
            .map(c => c._id)
        ));
      } catch {
        setError('Failed to load collections');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAdd(collectionId) {
    setAddingToId(collectionId);
    setError('');
    try {
      const res = await fetch(`/api/collections/${collectionId}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: [file._id] }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to add to collection');
      setAddedIds(prev => new Set([...prev, collectionId]));
    } catch {
      setError('Failed to add to collection');
    } finally {
      setAddingToId(null);
    }
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setError('');
    try {
      const createRes = await fetch('/api/collections', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) return setError(createData.error || 'Failed to create collection');

      const newCol = createData.collection;

      const addRes = await fetch(`/api/collections/${newCol._id}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: [file._id] }),
      });
      const addData = await addRes.json();
      if (!addRes.ok) return setError(addData.error || 'Failed to add file to new collection');

      setCollections(prev => [{ ...newCol, fileIds: [file._id], fileCount: 1 }, ...prev]);
      setAddedIds(prev => new Set([...prev, newCol._id]));
      setCreating(false);
      setNewName('');
    } catch {
      setError('Failed to create collection');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="fpm-close" onClick={onClose} title="Close">✕</button>
        <div className="modal-header">
          <h2>Add to Collection</h2>
          <p className="modal-filename">{file.originalName}</p>
        </div>

        {loading ? (
          <p className="file-empty">Loading…</p>
        ) : (
          <>
            {collections.length === 0 && !creating && (
              <p className="file-empty">No collections yet. Create one below.</p>
            )}
            {collections.length > 0 && (
              <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                <ul className="share-list">
                  {collections.map(c => (
                    <li key={c._id} className="share-list-item">
                      <span className="share-user-name">{c.name}</span>
                      {addedIds.has(c._id) ? (
                        <span className="share-user-badge">Added</span>
                      ) : (
                        <button
                          className="btn-copy"
                          onClick={() => handleAdd(c._id)}
                          disabled={addingToId === c._id}
                        >
                          {addingToId === c._id ? '…' : 'Add'}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {error && <p className="file-error">{error}</p>}

        {creating ? (
          <div className="share-link-row">
            <input
              className="share-link-input"
              type="text"
              placeholder="Collection name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
              autoFocus
            />
            <button className="btn-copy" onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </button>
            <button className="btn-modal-close" onClick={() => { setCreating(false); setNewName(''); }}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Create Collection
          </button>
        )}
      </div>
    </div>
  );
}
