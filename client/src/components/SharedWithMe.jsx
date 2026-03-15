import { useState, useEffect } from 'react';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export default function SharedWithMe() {
  const [shared, setShared]   = useState([]);
  const [error, setError]     = useState('');
  const [copying, setCopying] = useState(null); // fileId currently being copied

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

  async function handleDownload(entry) {
    try {
      const res = await fetch(`/api/shared-with-me/${entry.file._id}/download`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return setError('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = entry.file.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed');
    }
  }

  async function handleCopy(entry) {
    setCopying(entry.file._id);
    setError('');
    try {
      const res = await fetch(`/api/shared-with-me/${entry.file._id}/copy`, {
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
      {shared.length === 0 ? (
        <p className="file-empty">No files have been shared with you yet.</p>
      ) : (
        <table className="file-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Shared By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shared.map(entry => (
              <tr key={entry._id}>
                <td className="file-name">{entry.file.originalName}</td>
                <td className="file-size">{formatSize(entry.file.size)}</td>
                <td className="file-date">{entry.sharedBy.username}</td>
                <td className="file-date">{new Date(entry.createdAt).toLocaleDateString()}</td>
                <td className="file-actions">
                  <button
                    onClick={() => handleDownload(entry)}
                    className="btn-file-action btn-download"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleCopy(entry)}
                    className="btn-file-action btn-share"
                    disabled={copying === entry.file._id}
                  >
                    {copying === entry.file._id ? 'Copying…' : 'Copy to My Files'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
