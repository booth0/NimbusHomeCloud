import { useState, useEffect } from 'react';
import ShareModal from './ShareModal';
import SelectionBar from './SelectionBar.jsx';
import ZipNameModal from './ZipNameModal.jsx';
import FileControls from './FileControls.jsx';
import FileDetailView from './FileDetailView.jsx';
import FileGridView from './FileGridView.jsx';
import FilePreviewModal from './FilePreviewModal.jsx';
import { filterFiles, sortFiles, getAvailableTypes } from '../utils/fileUtils.js';

const DEFAULT_FILTER = { mode: 'media', selectedTypes: [] };
const DEFAULT_SORT   = { by: 'date', direction: 'desc' };
const DEFAULT_VIEW   = { mode: 'preview', size: 'medium' };

function loadPref(key, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key)) }; }
  catch { return fallback; }
}

export default function FileManager({ user }) {
  const [files, setFiles]           = useState([]);
  const [uploading, setUploading]   = useState(false);
  const [error, setError]           = useState('');
  const [sharingFile, setSharingFile] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [selectMode,   setSelectMode]   = useState(false);
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [zipModalOpen, setZipModalOpen] = useState(false);
  const [sharingFiles, setSharingFiles] = useState(null);

  const [filter, setFilter] = useState(() => loadPref('nimbus_filter', DEFAULT_FILTER));
  const [sort, setSort]     = useState(() => loadPref('nimbus_sort',   DEFAULT_SORT));
  const [view, setView]     = useState(() => loadPref('nimbus_view',   DEFAULT_VIEW));

  function handleFilterChange(next) { setFilter(next); localStorage.setItem('nimbus_filter', JSON.stringify(next)); }
  function handleSortChange(next)   { setSort(next);   localStorage.setItem('nimbus_sort',   JSON.stringify(next)); }
  function handleViewChange(next)   { setView(next);   localStorage.setItem('nimbus_view',   JSON.stringify(next)); }

  const availableTypes = getAvailableTypes(files);
  const displayedFiles = sortFiles(filterFiles(files, filter), sort);

  const token = () => localStorage.getItem('nimbus_token');

  async function loadFiles() {
    try {
      const res = await fetch('/api/files', {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (res.ok) setFiles(data.files);
    } catch {
      setError('Failed to load files');
    }
  }

  useEffect(() => { loadFiles(); }, []);

  // Core upload logic — accepts a browser File object
  async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lastModified', file.lastModified);
    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.file;
  }

  async function handleInputUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadFile(file);
      setFiles(prev => [uploaded, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  // Drag-and-drop handlers
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    // Only clear if leaving the drop zone itself (not a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }

  async function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    setUploading(true);
    setError('');
    const uploaded = [];
    for (const file of droppedFiles) {
      try {
        const result = await uploadFile(file);
        uploaded.push(result);
      } catch (err) {
        setError(`Failed to upload "${file.name}": ${err.message}`);
        break;
      }
    }
    if (uploaded.length > 0) setFiles(prev => [...uploaded, ...prev]);
    setUploading(false);
  }

  async function handleDownload(file) {
    try {
      const res = await fetch(`/api/files/${file._id}/download`, {
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

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return setError('Delete failed');
      setFiles(prev => prev.filter(f => f._id !== id));
    } catch {
      setError('Delete failed');
    }
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

  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    for (const id of ids) await handleDelete(id);
    setSelectedIds(new Set());
  }

  async function handleBulkDownloadZip(archiveName) {
    setZipModalOpen(false);
    try {
      const res = await fetch('/api/files/zip', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: [...selectedIds], archiveName }),
      });
      if (!res.ok) return setError('ZIP download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${archiveName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('ZIP download failed');
    }
  }

  return (
    <>
      <div className="file-manager">

        {/* Upload zone with drag-and-drop */}
        <div
          className={`file-upload-zone${isDragging ? ' file-upload-zone--dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label className="btn-upload">
            {uploading ? 'Uploading…' : 'Upload File'}
            <input type="file" onChange={handleInputUpload} disabled={uploading} hidden />
          </label>
          <span className="file-upload-hint">
            {isDragging ? 'Drop to upload' : 'or drag & drop files here'}
          </span>
        </div>

        {error && <p className="file-error">{error}</p>}

        {/* Controls bar */}
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

        {/* File list */}
        {files.length === 0 ? (
          <p className="file-empty">No files yet. Upload something!</p>
        ) : view.mode === 'detail' ? (
          <FileDetailView
            files={displayedFiles}
            onDownload={handleDownload}
            onShare={setSharingFile}
            onDelete={handleDelete}
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
            onDownload={handleDownload}
            onShare={setSharingFile}
            onDelete={handleDelete}
            onFileClick={setSelectedFile}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        )}
      </div>

      {sharingFile && (
        <ShareModal file={sharingFile} onClose={() => setSharingFile(null)} />
      )}

      {sharingFiles && (
        <ShareModal files={sharingFiles} onClose={() => setSharingFiles(null)} />
      )}

      {selectedFile && (
        <FilePreviewModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDownload={handleDownload}
          onShare={f => { setSelectedFile(null); setSharingFile(f); }}
          onDelete={handleDelete}
        />
      )}

      {selectMode && selectedIds.size > 0 && (
        <SelectionBar
          selectedCount={selectedIds.size}
          onDownloadZip={() => setZipModalOpen(true)}
          onShare={() => setSharingFiles(displayedFiles.filter(f => selectedIds.has(f._id)))}
          onDelete={handleBulkDelete}
          onClear={handleClearSelection}
        />
      )}

      {zipModalOpen && (
        <ZipNameModal
          defaultName="nimbus-files"
          onConfirm={handleBulkDownloadZip}
          onClose={() => setZipModalOpen(false)}
        />
      )}
    </>
  );
}
