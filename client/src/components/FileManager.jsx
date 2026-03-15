import { useState, useEffect } from 'react';
import ShareModal from './ShareModal';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export default function FileManager({ user }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [sharingFile, setSharingFile] = useState(null);

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

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Upload failed');
      setFiles(prev => [data.file, ...prev]);
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
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

  return (
    <>
    <div className="file-manager">
      <div className="file-manager-toolbar">
        <label className="btn-upload">
          {uploading ? 'Uploading…' : 'Upload File'}
          <input type="file" onChange={handleUpload} disabled={uploading} hidden />
        </label>
      </div>
      {error && <p className="file-error">{error}</p>}
      {files.length === 0 ? (
        <p className="file-empty">No files yet. Upload something!</p>
      ) : (
        <table className="file-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map(f => (
              <tr key={f._id}>
                <td className="file-name">{f.originalName}</td>
                <td className="file-size">{formatSize(f.size)}</td>
                <td className="file-date">{new Date(f.createdAt).toLocaleDateString()}</td>
                <td className="file-actions">
                  <button onClick={() => handleDownload(f)} className="btn-file-action btn-download">Download</button>
                  <button onClick={() => setSharingFile(f)} className="btn-file-action btn-share">Share</button>
                  <button onClick={() => handleDelete(f._id)} className="btn-file-action btn-delete">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
    {sharingFile && <ShareModal file={sharingFile} onClose={() => setSharingFile(null)} />}
    </>
  );
}
