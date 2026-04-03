import { useState, useEffect } from 'react';
import CollectionGridView from './CollectionGridView.jsx';
import CollectionDetailView from './CollectionDetailView.jsx';
import CollectionView from './CollectionView.jsx';
import CreateCollectionModal from './CreateCollectionModal.jsx';

const DEFAULT_VIEW = { mode: 'preview' };

function loadPref(key, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key)) }; }
  catch { return fallback; }
}

// Minimal inline SVG icons matching FileControls
function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1"/>
      <rect x="9" y="1" width="6" height="6" rx="1"/>
      <rect x="1" y="9" width="6" height="6" rx="1"/>
      <rect x="9" y="9" width="6" height="6" rx="1"/>
    </svg>
  );
}

function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2"    width="14" height="2.5" rx="1"/>
      <rect x="1" y="6.75" width="14" height="2.5" rx="1"/>
      <rect x="1" y="11.5" width="14" height="2.5" rx="1"/>
    </svg>
  );
}

export default function CollectionsPage({ user }) {
  const [collections, setCollections]       = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [openedCollection, setOpenedCollection] = useState(null); // { collection, role }
  const [createOpen, setCreateOpen]         = useState(false);
  const [view, setView]                     = useState(() => loadPref('nimbus_col_list_view', DEFAULT_VIEW));

  const token = () => localStorage.getItem('nimbus_token');

  async function loadCollections() {
    try {
      const res = await fetch('/api/collections', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (res.ok) setCollections(data.collections);
      else setError(data.error || 'Failed to load collections');
    } catch {
      setError('Failed to load collections');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCollections(); }, []);

  async function handleOpen(collection) {
    try {
      const res = await fetch(`/api/collections/${collection._id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (res.ok) setOpenedCollection({ collection: data.collection, role: data.role });
      else setError(data.error || 'Failed to open collection');
    } catch {
      setError('Failed to open collection');
    }
  }

  async function handleDownload(collection) {
    try {
      const res = await fetch(`/api/collections/${collection._id}/zip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ archiveName: collection.name }),
      });
      if (!res.ok) return setError('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${collection.name}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Download failed'); }
  }

  async function handleCreate(name) {
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to create collection');
      setCollections(prev => [{
        ...data.collection,
        fileIds: [],
        fileCount: 0,
        owner: { _id: user._id, username: user.username },
      }, ...prev]);
      setCreateOpen(false);
    } catch { setError('Failed to create collection'); }
  }

  function handleCollectionUpdated(updated) {
    setOpenedCollection(prev => ({ ...prev, collection: updated }));
    setCollections(prev => prev.map(c =>
      c._id === updated._id
        ? { ...c, fileIds: (updated.files ?? []).map(f => f._id), fileCount: (updated.files ?? []).length }
        : c
    ));
  }

  function setViewMode(mode) {
    const next = { mode };
    setView(next);
    localStorage.setItem('nimbus_col_list_view', JSON.stringify(next));
  }

  if (openedCollection) {
    return (
      <CollectionView
        collection={openedCollection.collection}
        role={openedCollection.role}
        onBack={() => setOpenedCollection(null)}
        onShare={null}   // Phase 4
        onDelete={null}  // Phase 4
        onCollectionUpdated={handleCollectionUpdated}
      />
    );
  }

  return (
    <div className="file-manager">
      <div className="col-page-header">
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          + Create Collection
        </button>
      </div>

      {error && <p className="file-error">{error}</p>}

      {loading ? (
        <p className="file-empty">Loading collections…</p>
      ) : collections.length === 0 ? (
        <p className="file-empty">No collections yet. Create one to get started!</p>
      ) : (
        <>
          <div className="file-controls-sticky">
            <div className="file-controls">
              <div className="file-controls-section file-controls-section--right">
                <div className="file-view-toggle">
                  <button
                    className={`file-view-btn${view.mode === 'detail' ? ' file-view-btn--active' : ''}`}
                    onClick={() => setViewMode('detail')}
                    title="List view"
                  ><IconList /></button>
                  <button
                    className={`file-view-btn${view.mode === 'preview' ? ' file-view-btn--active' : ''}`}
                    onClick={() => setViewMode('preview')}
                    title="Grid view"
                  ><IconGrid /></button>
                </div>
              </div>
            </div>
          </div>

          {view.mode === 'detail' ? (
            <CollectionDetailView
              collections={collections}
              user={user}
              onOpen={handleOpen}
              onDownload={handleDownload}
              onShare={null}   // Phase 4
              onDelete={null}  // Phase 4
            />
          ) : (
            <CollectionGridView
              collections={collections}
              user={user}
              onOpen={handleOpen}
              onDownload={handleDownload}
              onShare={null}   // Phase 4
              onDelete={null}  // Phase 4
            />
          )}
        </>
      )}

      {createOpen && (
        <CreateCollectionModal
          onConfirm={handleCreate}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}
