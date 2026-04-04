import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ShareModal from './ShareModal';
import SelectionBar from './SelectionBar.jsx';
import ZipNameModal from './ZipNameModal.jsx';
import FileControls from './FileControls.jsx';
import FileDetailView from './FileDetailView.jsx';
import FileGridView from './FileGridView.jsx';
import FilePreviewModal from './FilePreviewModal.jsx';
import AddToCollectionModal from './AddToCollectionModal.jsx';
import FolderCollectionModal from './FolderCollectionModal.jsx';
import { filterFiles, sortFiles, getAvailableTypes } from '../utils/fileUtils.js';

const DEFAULT_FILTER = { mode: 'media', selectedTypes: [] };
const DEFAULT_SORT   = { by: 'date', direction: 'desc' };
const DEFAULT_VIEW   = { mode: 'preview', size: 'medium' };

function loadPref(key, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key)) }; }
  catch { return fallback; }
}

// Recursively collects all File objects from a FileSystemEntry (directory or file).
async function readAllFilesFromEntry(entry) {
  const files = [];
  async function traverse(e) {
    if (e.isFile) {
      const f = await new Promise((res, rej) => e.file(res, rej));
      files.push(f);
    } else if (e.isDirectory) {
      const reader = e.createReader();
      let batch;
      do {
        batch = await new Promise((res, rej) => reader.readEntries(res, rej));
        for (const child of batch) await traverse(child);
      } while (batch.length > 0);
    }
  }
  await traverse(entry);
  return files;
}

export default function FileManager({ user }) {
  const [files, setFiles]           = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null); // null | { current, total }
  const [error, setError]           = useState('');
  const [sharingFile, setSharingFile] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [folderUploadPending, setFolderUploadPending] = useState(null); // { files, folderName }

  const [selectMode,   setSelectMode]   = useState(false);
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [zipModalOpen, setZipModalOpen] = useState(false);
  const [sharingFiles, setSharingFiles] = useState(null);
  const [addToCollectionFile, setAddToCollectionFile] = useState(null);

  const [filter, setFilter] = useState(() => loadPref('nimbus_filter', DEFAULT_FILTER));
  const [sort, setSort]     = useState(() => loadPref('nimbus_sort',   DEFAULT_SORT));
  const [view, setView]     = useState(() => loadPref('nimbus_view',   DEFAULT_VIEW));

  const folderInputRef = useRef(null);

  function handleFilterChange(next) { setFilter(next); localStorage.setItem('nimbus_filter', JSON.stringify(next)); }
  function handleSortChange(next)   { setSort(next);   localStorage.setItem('nimbus_sort',   JSON.stringify(next)); }
  function handleViewChange(next)   { setView(next);   localStorage.setItem('nimbus_view',   JSON.stringify(next)); }

  const availableTypes = getAvailableTypes(files);
  const displayedFiles = sortFiles(filterFiles(files, filter), sort);
  const token = () => localStorage.getItem('nimbus_token');

  // Set webkitdirectory on the folder input (not a standard React prop)
  useEffect(() => {
    if (folderInputRef.current) folderInputRef.current.webkitdirectory = true;
  }, []);

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

  // Live reload: refetch when any client uploads or deletes a file
  useEffect(() => {
    const socket = io();
    let debounceTimer;
    socket.on('files:changed', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(loadFiles, 300);
    });
    return () => {
      clearTimeout(debounceTimer);
      socket.disconnect();
    };
  }, []);

  // Uploads a single browser File object; returns the server file document.
  async function uploadSingle(file) {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('lastModified', file.lastModified);
    const res = await fetch('/api/files/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.files[0];
  }

  // Uploads an array of File objects sequentially with progress tracking.
  // Returns the array of successfully uploaded file documents.
  async function uploadFileList(fileArray) {
    setError('');
    setUploadProgress({ current: 1, total: fileArray.length });
    const uploaded = [];
    for (let i = 0; i < fileArray.length; i++) {
      setUploadProgress({ current: i + 1, total: fileArray.length });
      try {
        const result = await uploadSingle(fileArray[i]);
        uploaded.push(result);
      } catch (err) {
        setError(`Failed to upload "${fileArray[i].name}": ${err.message}`);
        break;
      }
    }
    setUploadProgress(null);
    if (uploaded.length > 0) setFiles(prev => [...uploaded, ...prev]);
    return uploaded;
  }

  // ── Upload handlers ──────────────────────────────

  async function handleInputUpload(e) {
    const fileArray = Array.from(e.target.files);
    e.target.value = '';
    if (fileArray.length === 0) return;
    await uploadFileList(fileArray);
  }

  async function handleFolderInputChange(e) {
    const fileArray = Array.from(e.target.files);
    e.target.value = '';
    if (fileArray.length === 0) return;
    // Derive folder name from the first file's path (webkitRelativePath = "FolderName/...")
    const folderName = fileArray[0].webkitRelativePath?.split('/')?.[0] || 'Folder';
    setFolderUploadPending({ files: fileArray, folderName });
  }

  async function handleFolderDecision(createCollection, collectionName) {
    const { files: fileArray } = folderUploadPending;
    setFolderUploadPending(null);
    const uploaded = await uploadFileList(fileArray);
    if (createCollection && uploaded.length > 0) {
      try {
        const colRes = await fetch('/api/collections', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: collectionName }),
        });
        const colData = await colRes.json();
        if (!colRes.ok) return setError(colData.error || 'Files uploaded but failed to create collection');
        const addRes = await fetch(`/api/collections/${colData.collection._id}/files`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds: uploaded.map(f => f._id) }),
        });
        if (!addRes.ok) setError('Files uploaded but failed to add to collection');
      } catch {
        setError('Files uploaded but failed to create collection');
      }
    }
  }

  // ── Drag-and-drop handlers ───────────────────────

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  }

  async function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);

    // Capture entries synchronously before the DataTransfer object is recycled
    const items = Array.from(e.dataTransfer.items);
    const entries = items.map(item => item.webkitGetAsEntry?.()).filter(Boolean);
    const hasDir = entries.some(entry => entry.isDirectory);

    if (hasDir) {
      const allFiles = [];
      let folderName = '';
      for (const entry of entries) {
        if (entry.isDirectory) {
          if (!folderName) folderName = entry.name;
          const dirFiles = await readAllFilesFromEntry(entry);
          allFiles.push(...dirFiles);
        } else {
          const file = await new Promise((res, rej) => entry.file(res, rej));
          allFiles.push(file);
        }
      }
      if (allFiles.length > 0) {
        setFolderUploadPending({ files: allFiles, folderName: folderName || 'Folder' });
      }
      return;
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    await uploadFileList(droppedFiles);
  }

  // ── File action handlers ─────────────────────────

  async function handleDownload(file) {
    try {
      const res = await fetch(`/api/files/${file._id}/download`, {
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

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return setError('Delete failed');
      setFiles(prev => prev.filter(f => f._id !== id));
    } catch { setError('Delete failed'); }
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
      a.href = url; a.download = `${archiveName}.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('ZIP download failed'); }
  }

  const isUploading = uploadProgress !== null;
  const uploadLabel = isUploading
    ? (uploadProgress.total > 1 ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}…` : 'Uploading…')
    : 'Upload Files';

  return (
    <>
      <div className="file-manager">

        {/* Upload zone */}
        <div
          className={`file-upload-zone${isDragging ? ' file-upload-zone--dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label className="btn-upload">
            {uploadLabel}
            <input type="file" multiple onChange={handleInputUpload} disabled={isUploading} hidden />
          </label>
          <label className="btn-upload btn-upload--folder">
            Upload Folder
            <input ref={folderInputRef} type="file" multiple onChange={handleFolderInputChange} disabled={isUploading} hidden />
          </label>
          <span className="file-upload-hint">
            {isDragging ? 'Drop to upload' : 'or drag & drop files or folders'}
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
            onAddToCollection={setAddToCollectionFile}
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
            onAddToCollection={setAddToCollectionFile}
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
          onAddToCollection={f => { setSelectedFile(null); setAddToCollectionFile(f); }}
        />
      )}

      {addToCollectionFile && (
        <AddToCollectionModal
          file={addToCollectionFile}
          onClose={() => setAddToCollectionFile(null)}
        />
      )}

      {folderUploadPending && (
        <FolderCollectionModal
          folderName={folderUploadPending.folderName}
          fileCount={folderUploadPending.files.length}
          onCreateCollection={name => handleFolderDecision(true, name)}
          onJustUpload={() => handleFolderDecision(false)}
          onClose={() => setFolderUploadPending(null)}
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
