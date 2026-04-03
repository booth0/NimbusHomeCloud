import { useState } from 'react';
import FileControls from './FileControls.jsx';
import FileGridView from './FileGridView.jsx';
import FileDetailView from './FileDetailView.jsx';
import FilePreviewModal from './FilePreviewModal.jsx';
import AddToCollectionModal from './AddToCollectionModal.jsx';
import { filterFiles, sortFiles, getAvailableTypes } from '../utils/fileUtils.js';

const DEFAULT_FILTER = { mode: 'all', selectedTypes: [] };
const DEFAULT_SORT   = { by: 'date', direction: 'desc' };
const DEFAULT_VIEW   = { mode: 'preview', size: 'medium' };

function loadPref(key, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key)) }; }
  catch { return fallback; }
}

export default function CollectionView({ collection: initialCollection, role, onBack, onShare, onDelete, onCollectionUpdated }) {
  const [collection, setCollection] = useState(initialCollection);
  const [selectedFile, setSelectedFile] = useState(null);
  const [addFilesOpen, setAddFilesOpen] = useState(false);
  const [error, setError]               = useState('');
  const [downloading, setDownloading]   = useState(false);

  const [filter, setFilter] = useState(() => loadPref('nimbus_col_view_filter', DEFAULT_FILTER));
  const [sort,   setSort]   = useState(() => loadPref('nimbus_col_view_sort',   DEFAULT_SORT));
  const [view,   setView]   = useState(() => loadPref('nimbus_col_view_mode',   DEFAULT_VIEW));

  function handleFilterChange(next) { setFilter(next); localStorage.setItem('nimbus_col_view_filter', JSON.stringify(next)); }
  function handleSortChange(next)   { setSort(next);   localStorage.setItem('nimbus_col_view_sort',   JSON.stringify(next)); }
  function handleViewChange(next)   { setView(next);   localStorage.setItem('nimbus_col_view_mode',   JSON.stringify(next)); }

  const token = () => localStorage.getItem('nimbus_token');
  const blobBaseUrl = `/api/collections/${collection._id}/files`;
  const canEdit = role === 'owner' || role === 'editor';

  const availableTypes = getAvailableTypes(collection.files ?? []);
  const displayedFiles = sortFiles(filterFiles(collection.files ?? [], filter), sort);

  async function handleFileDownload(file) {
    try {
      const res = await fetch(`/api/collections/${collection._id}/files/${file._id}/download`, {
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

  async function handleCollectionDownload() {
    setDownloading(true); setError('');
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
    finally { setDownloading(false); }
  }

  async function handleRemoveFile(fileId) {
    try {
      const res = await fetch(`/api/collections/${collection._id}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return setError('Failed to remove file');
      const updated = { ...collection, files: collection.files.filter(f => f._id !== fileId) };
      setCollection(updated);
      onCollectionUpdated(updated);
      if (selectedFile?._id === fileId) setSelectedFile(null);
    } catch { setError('Failed to remove file'); }
  }

  async function handleFilesAdded() {
    try {
      const res = await fetch(`/api/collections/${collection._id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (res.ok) { setCollection(data.collection); onCollectionUpdated(data.collection); }
    } catch { /* non-fatal */ }
    setAddFilesOpen(false);
  }

  return (
    <div>
      {/* Sticky header + controls */}
      <div className="col-view-sticky">
        <div className="col-view-header">
          <button className="col-back-btn" onClick={onBack} title="Back to Collections">←</button>
          <div className="col-view-meta">
            <h2 className="col-view-title">{collection.name}</h2>
            <span className="col-view-owner">by {collection.owner.username}</span>
          </div>
          <div className="col-view-actions">
            {canEdit && (
              <button className="btn-file-action btn-share" onClick={() => setAddFilesOpen(true)}>
                + Add Files
              </button>
            )}
            <button
              className="btn-file-action btn-download"
              onClick={handleCollectionDownload}
              disabled={downloading || collection.files.length === 0}
            >
              {downloading ? '…' : 'Download'}
            </button>
            {role === 'owner' && onShare  && <button className="btn-file-action btn-share"  onClick={() => onShare(collection)}>Share</button>}
            {role === 'owner' && onDelete && <button className="btn-file-action btn-delete" onClick={() => onDelete(collection)}>Delete</button>}
          </div>
        </div>
        <div className="col-controls-bar">
          <FileControls
            filter={filter}
            sort={sort}
            view={view}
            availableTypes={availableTypes}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onViewChange={handleViewChange}
          />
        </div>
      </div>

      {error && <p className="file-error" style={{ padding: '0.5rem 2rem' }}>{error}</p>}

      {collection.files.length === 0 ? (
        <p className="file-empty">This collection is empty. Add files using the button above.</p>
      ) : view.mode === 'detail' ? (
        <FileDetailView
          files={displayedFiles}
          onDownload={handleFileDownload}
          onDelete={canEdit ? handleRemoveFile : undefined}
          deleteLabel="Remove"
          onFileClick={setSelectedFile}
        />
      ) : (
        <FileGridView
          files={displayedFiles}
          filter={filter}
          viewSize={view.size}
          blobBaseUrl={blobBaseUrl}
          onDownload={handleFileDownload}
          onDelete={canEdit ? handleRemoveFile : undefined}
          deleteLabel="Remove"
          onFileClick={setSelectedFile}
        />
      )}

      {selectedFile && (
        <FilePreviewModal
          file={selectedFile}
          blobBaseUrl={blobBaseUrl}
          onClose={() => setSelectedFile(null)}
          onDownload={handleFileDownload}
          onDelete={canEdit ? handleRemoveFile : undefined}
          deleteLabel="Remove"
        />
      )}

      {addFilesOpen && (
        <AddToCollectionModal
          mode="pickFiles"
          collection={collection}
          onClose={() => setAddFilesOpen(false)}
          onAdded={handleFilesAdded}
        />
      )}
    </div>
  );
}
