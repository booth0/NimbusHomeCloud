import { useState, useEffect } from 'react';
import FileControls from './FileControls.jsx';
import FileDetailView from './FileDetailView.jsx';
import FileGridView from './FileGridView.jsx';
import FilePreviewModal from './FilePreviewModal.jsx';
import SelectionBar from './SelectionBar.jsx';
import CollectionGridView from './CollectionGridView.jsx';
import CollectionDetailView from './CollectionDetailView.jsx';
import CollectionView from './CollectionView.jsx';
import { filterFiles, sortFiles, getAvailableTypes } from '../utils/fileUtils.js';

const BLOB_BASE = '/api/shared-with-me';

const DEFAULT_FILTER  = { mode: 'media', selectedTypes: [] };
const DEFAULT_SORT    = { by: 'date', direction: 'desc' };
const DEFAULT_VIEW    = { mode: 'preview', size: 'medium' };
const DEFAULT_COLVIEW = { mode: 'preview' };

function loadPref(key, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key)) }; }
  catch { return fallback; }
}

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

export default function SharedWithMe() {
  // ── Shared files state ───────────────────────────
  const [shared, setShared]         = useState([]);
  const [error, setError]           = useState('');
  const [copying, setCopying]       = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [selectMode,  setSelectMode]  = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [filter, setFilter] = useState(() => loadPref('nimbus_filter_shared', DEFAULT_FILTER));
  const [sort,   setSort]   = useState(() => loadPref('nimbus_sort_shared',   DEFAULT_SORT));
  const [view,   setView]   = useState(() => loadPref('nimbus_view_shared',   DEFAULT_VIEW));

  function handleFilterChange(next) { setFilter(next); localStorage.setItem('nimbus_filter_shared', JSON.stringify(next)); }
  function handleSortChange(next)   { setSort(next);   localStorage.setItem('nimbus_sort_shared',   JSON.stringify(next)); }
  function handleViewChange(next)   { setView(next);   localStorage.setItem('nimbus_view_shared',   JSON.stringify(next)); }

  // ── Shared collections state ─────────────────────
  const [sharedCollections, setSharedCollections] = useState([]);
  const [openedCollection,  setOpenedCollection]  = useState(null); // { collection, role }
  const [colView, setColView] = useState(() => loadPref('nimbus_col_view_shared', DEFAULT_COLVIEW));

  function handleColViewMode(mode) {
    const next = { mode };
    setColView(next);
    localStorage.setItem('nimbus_col_view_shared', JSON.stringify(next));
  }

  const token = () => localStorage.getItem('nimbus_token');

  useEffect(() => {
    loadShared();
    loadSharedCollections();
  }, []);

  async function loadShared() {
    try {
      const res = await fetch('/api/shared-with-me', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (res.ok) setShared(data.shared);
      else setError(data.error || 'Failed to load shared files');
    } catch {
      setError('Failed to load shared files');
    }
  }

  async function loadSharedCollections() {
    try {
      const res = await fetch('/api/shared-with-me/collections', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (res.ok) setSharedCollections(data.collections);
    } catch { /* non-fatal */ }
  }

  async function handleOpenCollection(collection) {
    try {
      const res = await fetch(`/api/collections/${collection._id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (res.ok) setOpenedCollection({ collection: data.collection, role: data.role });
      else setError(data.error || 'Failed to open collection');
    } catch { setError('Failed to open collection'); }
  }

  async function handleDownloadCollection(collection) {
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

  function handleCollectionUpdated(updated) {
    setOpenedCollection(prev => ({ ...prev, collection: updated }));
    setSharedCollections(prev => prev.map(c =>
      c._id === updated._id
        ? { ...c, fileIds: (updated.files ?? []).map(f => f._id), fileCount: (updated.files ?? []).length }
        : c
    ));
  }

  // ── Shared files helpers ─────────────────────────

  async function handleDownload(file) {
    try {
      const res = await fetch(`/api/shared-with-me/${file._id}/download`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return setError('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.originalName; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('Download failed'); }
  }

  function handleToggleSelectMode(on) {
    setSelectMode(on);
    if (!on) setSelectedIds(new Set());
  }

  function handleToggleSelect(fileId) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(fileId) ? next.delete(fileId) : next.add(fileId);
      return next;
    });
  }

  function handleClearSelection() { setSelectedIds(new Set()); }

  async function handleBulkCopy() {
    const ids = [...selectedIds];
    for (const id of ids) await handleCopy({ _id: id });
    setSelectedIds(new Set());
  }

  async function handleCopy(file) {
    setCopying(file._id); setError('');
    try {
      const res = await fetch(`/api/shared-with-me/${file._id}/copy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Copy failed');
      }
    } catch { setError('Copy failed'); }
    finally { setCopying(null); }
  }

  // ── Derived data ─────────────────────────────────
  const files          = shared.map(e => ({ ...e.file, _sharedBy: e.sharedBy.username }));
  const availableTypes = getAvailableTypes(files);
  const displayedFiles = sortFiles(filterFiles(files, filter), sort);
  const hasCollections = sharedCollections.length > 0;
  // Pass a sentinel user so isOwner is always false (shared collections are never owned by viewer)
  const noOwner        = { _id: '' };

  return (
    <div className="file-manager">
      {openedCollection ? (
        <CollectionView
          collection={openedCollection.collection}
          role={openedCollection.role}
          onBack={() => setOpenedCollection(null)}
          onShare={null}
          onDelete={null}
          onCollectionUpdated={handleCollectionUpdated}
        />
      ) : (
        <>
          {error && <p className="file-error">{error}</p>}

          {/* ── Shared Collections section ── */}
          {hasCollections && (
            <>
              <div className="swm-section-heading">Shared Collections</div>
              <div className="swm-col-controls">
                <div className="file-view-toggle">
                  <button
                    className={`file-view-btn${colView.mode === 'detail' ? ' file-view-btn--active' : ''}`}
                    onClick={() => handleColViewMode('detail')}
                    title="List view"
                  ><IconList /></button>
                  <button
                    className={`file-view-btn${colView.mode === 'preview' ? ' file-view-btn--active' : ''}`}
                    onClick={() => handleColViewMode('preview')}
                    title="Grid view"
                  ><IconGrid /></button>
                </div>
              </div>
              {colView.mode === 'detail' ? (
                <CollectionDetailView
                  collections={sharedCollections}
                  user={noOwner}
                  onOpen={handleOpenCollection}
                  onDownload={handleDownloadCollection}
                  onShare={null}
                  onDelete={null}
                />
              ) : (
                <CollectionGridView
                  collections={sharedCollections}
                  user={noOwner}
                  onOpen={handleOpenCollection}
                  onDownload={handleDownloadCollection}
                  onShare={null}
                  onDelete={null}
                />
              )}
            </>
          )}

          {/* ── Shared Files section ── */}
          {hasCollections && (
            <div className="swm-section-heading">Shared Files</div>
          )}

          {files.length > 0 && (
            <div className="file-controls-sticky">
              <FileControls
                filter={filter}
                sort={sort}
                view={view}
                availableTypes={availableTypes}
                onFilterChange={handleFilterChange}
                onSortChange={handleSortChange}
                onViewChange={handleViewChange}
                selectMode={selectMode}
                onSelectMode={handleToggleSelectMode}
              />
            </div>
          )}

          {files.length === 0 && !hasCollections ? (
            <p className="file-empty">No files have been shared with you yet.</p>
          ) : files.length === 0 ? (
            <p className="file-empty">No files have been shared with you.</p>
          ) : view.mode === 'detail' ? (
            <FileDetailView
              files={displayedFiles}
              onDownload={handleDownload}
              onCopy={f => copying === f._id ? null : handleCopy(f)}
              onFileClick={setSelectedFile}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          ) : (
            <FileGridView
              files={displayedFiles}
              filter={filter}
              viewSize={view.size}
              blobBaseUrl={BLOB_BASE}
              onDownload={handleDownload}
              onCopy={f => copying === f._id ? null : handleCopy(f)}
              onFileClick={setSelectedFile}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          )}
        </>
      )}

      {selectedFile && (
        <FilePreviewModal
          file={selectedFile}
          blobBaseUrl={BLOB_BASE}
          onClose={() => setSelectedFile(null)}
          onDownload={handleDownload}
          onCopy={f => { handleCopy(f); setSelectedFile(null); }}
        />
      )}

      {selectMode && selectedIds.size > 0 && (
        <SelectionBar
          selectedCount={selectedIds.size}
          onCopyToMyFiles={handleBulkCopy}
          onClear={handleClearSelection}
        />
      )}
    </div>
  );
}
