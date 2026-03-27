import { useEffect, useState } from 'react';
import { getExtension } from '../utils/fileUtils.js';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function PreviewContent({ info, fileUrl, textContent }) {
  const { mimetype } = info;

  if (mimetype.startsWith('image/'))
    return <img src={fileUrl} alt={info.originalName} className="fpm-preview-img" />;

  if (mimetype.startsWith('video/'))
    return <video src={fileUrl} controls autoPlay className="fpm-preview-video" />;

  if (mimetype.startsWith('audio/'))
    return (
      <div className="fpm-preview-audio-wrap">
        <div className="fpm-audio-icon">🎵</div>
        <audio src={fileUrl} controls className="fpm-preview-audio" />
      </div>
    );

  if (mimetype === 'application/pdf')
    return <iframe src={`${fileUrl}#navpanes=0`} title={info.originalName} className="fpm-preview-iframe" />;

  if (mimetype.startsWith('text/'))
    return <pre className="fpm-preview-text">{textContent ?? 'Loading…'}</pre>;

  return (
    <div className="fpm-preview-generic">
      <span className="fpm-generic-icon">📄</span>
      <span className="fpm-generic-ext">{getExtension(info).toUpperCase()}</span>
    </div>
  );
}

export default function SharePreview({ token }) {
  const [info, setInfo]               = useState(null);
  const [status, setStatus]           = useState('loading');
  const [errorMsg, setErrorMsg]       = useState('');
  const [textContent, setTextContent] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const fileUrl = `/api/share/${token}`;

  useEffect(() => {
    async function loadInfo() {
      try {
        const res  = await fetch(`/api/share/${token}/info`);
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'This link is invalid, expired, or has been revoked.');
          setStatus('error');
          return;
        }
        setInfo(data);

        if (data.mimetype.startsWith('text/')) {
          const fileRes = await fetch(fileUrl);
          setTextContent(await fileRes.text());
        }

        setStatus('ready');
      } catch {
        setErrorMsg('Something went wrong. Please try again.');
        setStatus('error');
      }
    }
    loadInfo();
  }, [token]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res  = await fetch(fileUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = info.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // download failed silently — user can retry
    } finally {
      setDownloading(false);
    }
  }

  if (status === 'loading') {
    return <div className="app"><p className="message">Loading…</p></div>;
  }

  if (status === 'error') {
    return <div className="app"><p className="message" style={{ color: '#f87171' }}>{errorMsg}</p></div>;
  }

  const uploadedDate = info.createdAt ? new Date(info.createdAt).toLocaleString() : null;
  const takenDate    = info.dateTaken ? new Date(info.dateTaken).toLocaleString() : null;
  const expiresDate  = new Date(info.expiresAt).toLocaleDateString();

  return (
    <div className="share-preview-page">
      <div className="share-preview-wrap">
        <div className="share-preview-brand">Nimbus Home Cloud</div>

        <div className="fpm-container spp-container">

          {/* Preview panel */}
          <div className="fpm-preview">
            <PreviewContent info={info} fileUrl={fileUrl} textContent={textContent} />
          </div>

          {/* Details panel */}
          <div className="fpm-details">
            <h2 className="fpm-details-name" title={info.originalName}>{info.originalName}</h2>

            <div className="fpm-details-grid">
              <span className="fpm-detail-label">Type</span>
              <span className="fpm-detail-value">
                {getExtension(info).toUpperCase()} · <span className="fpm-detail-mime">{info.mimetype}</span>
              </span>

              <span className="fpm-detail-label">Size</span>
              <span className="fpm-detail-value">{formatSize(info.size)}</span>

              {uploadedDate && <>
                <span className="fpm-detail-label">Uploaded</span>
                <span className="fpm-detail-value">{uploadedDate}</span>
              </>}

              {takenDate && <>
                <span className="fpm-detail-label">Date Taken</span>
                <span className="fpm-detail-value">{takenDate}</span>
              </>}

              <span className="fpm-detail-label">Expires</span>
              <span className="fpm-detail-value">{expiresDate}</span>
            </div>

            <div className="fpm-detail-actions">
              <button className="btn-file-action btn-download" onClick={handleDownload} disabled={downloading}>
                {downloading ? 'Downloading…' : 'Download'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
