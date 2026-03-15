import { useEffect, useState } from 'react';

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export default function SharePreview({ token }) {
  const [info, setInfo]           = useState(null);
  const [status, setStatus]       = useState('loading'); // 'loading' | 'ready' | 'error'
  const [errorMsg, setErrorMsg]   = useState('');
  const [textContent, setTextContent] = useState('');
  const [downloading, setDownloading] = useState(false);

  const fileUrl = `/api/share/${token}`;

  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await fetch(`/api/share/${token}/info`);
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
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = info.originalName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // download failed silently — user can retry
    } finally {
      setDownloading(false);
    }
  }

  function renderPreview() {
    const { mimetype } = info;
    if (mimetype.startsWith('image/'))
      return <img src={fileUrl} alt={info.originalName} className="share-preview-media" />;
    if (mimetype.startsWith('video/'))
      return <video src={fileUrl} controls className="share-preview-media" />;
    if (mimetype.startsWith('audio/'))
      return <audio src={fileUrl} controls className="share-preview-audio" />;
    if (mimetype === 'application/pdf')
      return <iframe src={fileUrl} title={info.originalName} className="share-preview-media" />;
    if (mimetype.startsWith('text/'))
      return <pre className="share-preview-text">{textContent}</pre>;
    return <div className="share-preview-generic">📄</div>;
  }

  if (status === 'loading') {
    return <div className="app"><p className="message">Loading…</p></div>;
  }

  if (status === 'error') {
    return <div className="app"><p className="message" style={{ color: '#f87171' }}>{errorMsg}</p></div>;
  }

  return (
    <div className="share-preview-page">
      <div className="share-preview-card">
        <h1 className="share-preview-title">Nimbus Home Cloud</h1>
        <div className="share-preview-content">
          {renderPreview()}
        </div>
        <div className="share-preview-info">
          <span className="share-preview-name">{info.originalName}</span>
          <span className="share-preview-meta">
            {formatSize(info.size)} · Expires {new Date(info.expiresAt).toLocaleDateString()}
          </span>
        </div>
        <button
          className="btn-primary"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Downloading…' : 'Download'}
        </button>
      </div>
    </div>
  );
}
