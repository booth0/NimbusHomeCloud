import { useState, useEffect } from 'react';
import FileControls from './FileControls.jsx';
import FileDetailView from './FileDetailView.jsx';
import FileGridView from './FileGridView.jsx';
import FilePreviewModal from './FilePreviewModal.jsx';
import { filterFiles, sortFiles, getAvailableTypes } from '../utils/fileUtils.js';

const BLOB_BASE = '/api/shared-with-me';

const DEFAULT_FILTER = { mode: 'media', selectedTypes: [] };
const DEFAULT_SORT   = { by: 'date', direction: 'desc' };
const DEFAULT_VIEW   = { mode: 'preview', size: 'medium' };

function loadPref(key, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key)) }; }
  catch { return fallback; }
}

export default function SharedWithMe() {
  const [shared, setShared]         = useState([]);
  const [error, setError]           = useState('');
  const [copying, setCopying]       = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [filter, setFilter] = useState(() => loadPref('nimbus_filter_shared', DEFAULT_FILTER));
  const [sort, setSort]     = useState(() => loadPref('nimbus_sort_shared',   DEFAULT_SORT));
  const [view, setView]     = useState(() => loadPref('nimbus_view_shared',   DEFAULT_VIEW));

  function handleFilterChange(next) { setFilter(next); localStorage.setItem('nimbus_filter_shared', JSON.stringify(next)); }
  function handleSortChange(next)   { setSort(next);   localStorage.setItem('nimbus_sort_shared',   JSON.stringify(next)); }
  function handleViewChange(next)   { setView(next);   localStorage.setItem('nimbus_view_shared',   JSON.stringify(next)); }

  const token = () => localStorage.getItem('nimbus_token');

  useEffect(() => { loadShared(); }, []);

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

  // Flatten entries to file objects, carrying sharedBy for display
  const files = shared.map(e => ({ ...e.file, _sharedBy: e.sharedBy.username }));
  const availableTypes = getAvailableTypes(files);
  const displayedFiles = sortFiles(filterFiles(files, filter), sort);

  async function handleDownload(file) {
    try {
      const res = await fetch(`/api/shared-with-me/${file._id}/download`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return setError('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed');
    }
  }

  async function handleCopy(file) {
    setCopying(file._id);
    setError('');
    try {
      const res = await fetch(`/api/shared-with-me/${file._id}/copy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Copy failed');
      }
    } catch {
      setError('Copy failed');
    } finally {
      setCopying(null);
    }
  }

  return (
    <div className="file-manager">
      {error && <p className="file-error">{error}</p>}

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
          />
        </div>
      )}

      {files.length === 0 ? (
        <p className="file-empty">No files have been shared with you yet.</p>
      ) : view.mode === 'detail' ? (
        <FileDetailView
          files={displayedFiles}
          onDownload={handleDownload}
          onCopy={f => copying === f._id ? null : handleCopy(f)}
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
        />
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
    </div>
  );
}
