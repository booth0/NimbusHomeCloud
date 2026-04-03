import { useEffect, useState } from 'react';
import useFileBlob from '../hooks/useFileBlob.js';
import { getExtension, isMedia } from '../utils/fileUtils.js';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function PreviewContent({ file, blobUrl, loading }) {
  const [textContent, setTextContent] = useState(null);
  const { mimetype } = file;

  // For text files, read content from blob URL once available
  useEffect(() => {
    if (!mimetype.startsWith('text/') || !blobUrl) return;
    fetch(blobUrl)
      .then(r => r.text())
      .then(setTextContent)
      .catch(() => setTextContent('(Unable to load text content)'));
  }, [blobUrl, mimetype]);

  if (loading || !blobUrl) {
    return (
      <div className="fpm-preview-placeholder">
        {loading ? 'Loading…' : ''}
      </div>
    );
  }

  if (mimetype.startsWith('image/'))
    return <img src={blobUrl} alt={file.originalName} className="fpm-preview-img" />;

  if (mimetype.startsWith('video/'))
    return <video src={blobUrl} controls autoPlay className="fpm-preview-video" />;

  if (mimetype.startsWith('audio/'))
    return (
      <div className="fpm-preview-audio-wrap">
        <div className="fpm-audio-icon">🎵</div>
        <audio src={blobUrl} controls className="fpm-preview-audio" />
      </div>
    );

  if (mimetype === 'application/pdf')
    return <iframe src={`${blobUrl}#navpanes=0`} title={file.originalName} className="fpm-preview-iframe" />;

  if (mimetype.startsWith('text/'))
    return (
      <pre className="fpm-preview-text">
        {textContent ?? 'Loading…'}
      </pre>
    );

  return (
    <div className="fpm-preview-generic">
      <span className="fpm-generic-icon">📄</span>
      <span className="fpm-generic-ext">{getExtension(file).toUpperCase()}</span>
    </div>
  );
}

export default function FilePreviewModal({ file, onClose, onDownload, onShare, onDelete, onCopy, onAddToCollection, blobBaseUrl }) {
  const token = localStorage.getItem('nimbus_token');
  const { blobUrl, loading } = useFileBlob(file._id, token, blobBaseUrl);
  const [sharedUsers, setSharedUsers] = useState([]);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch shared-with list (owner only)
  useEffect(() => {
    if (!onShare) return;
    fetch(`/api/files/${file._id}/shared-with`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.sharedWith) setSharedUsers(data.sharedWith); })
      .catch(() => {});
  }, [file._id]);

  const uploadedDate  = new Date(file.createdAt).toLocaleString();
  const takenDate     = file.dateTaken ? new Date(file.dateTaken).toLocaleString() : null;
  const takenLabel    = isMedia(file) ? 'Date Taken' : 'Date Modified';

  return (
    <div className="fpm-backdrop" onClick={onClose}>
      <div className="fpm-container" onClick={e => e.stopPropagation()}>

        {/* X button */}
        <button className="fpm-close" onClick={onClose} title="Close">✕</button>

        {/* Preview panel */}
        <div className="fpm-preview">
          <PreviewContent file={file} blobUrl={blobUrl} loading={loading} />
        </div>

        {/* Details panel */}
        <div className="fpm-details">
          <h2 className="fpm-details-name" title={file.originalName}>{file.originalName}</h2>

          <div className="fpm-details-grid">
            <span className="fpm-detail-label">Type</span>
            <span className="fpm-detail-value">
              {getExtension(file).toUpperCase()} · <span className="fpm-detail-mime">{file.mimetype}</span>
            </span>

            <span className="fpm-detail-label">Size</span>
            <span className="fpm-detail-value">{formatSize(file.size)}</span>

            <span className="fpm-detail-label">Uploaded</span>
            <span className="fpm-detail-value">{uploadedDate}</span>

            {takenDate && <>
              <span className="fpm-detail-label">{takenLabel}</span>
              <span className="fpm-detail-value">{takenDate}</span>
            </>}

            {file._sharedBy && <>
              <span className="fpm-detail-label">Shared By</span>
              <span className="fpm-detail-value">{file._sharedBy}</span>
            </>}

            {sharedUsers.length > 0 && <>
              <span className="fpm-detail-label">Shared With</span>
              <div className="fpm-shared-users">
                {sharedUsers.map(u => (
                  <span key={u._id} className="fpm-detail-value">{u.username}</span>
                ))}
              </div>
            </>}
          </div>

          <div className="fpm-detail-actions">
            <button className="btn-file-action btn-download" onClick={() => onDownload(file)}>Download</button>
            {onShare           && <button className="btn-file-action btn-share"  onClick={() => onShare(file)}>Share</button>}
            {onCopy            && <button className="btn-file-action btn-share"  onClick={() => onCopy(file)}>Copy to My Files</button>}
            {onAddToCollection && <button className="btn-file-action btn-share"  onClick={() => onAddToCollection(file)}>+ Collection</button>}
            {onDelete          && <button className="btn-file-action btn-delete" onClick={() => { onDelete(file._id); onClose(); }}>Delete</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
