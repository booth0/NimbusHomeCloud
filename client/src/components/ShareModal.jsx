import { useState, useEffect } from 'react';

const EXPIRY_OPTIONS = [
  { label: '1 Hour',   value: '1h' },
  { label: '24 Hours', value: '24h' },
  { label: '7 Days',   value: '7d' },
  { label: '30 Days',  value: '30d' },
];

export default function ShareModal({ file, onClose }) {
  const [expiresIn, setExpiresIn]       = useState('24h');
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied]             = useState(false);
  const [activeShares, setActiveShares] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const token = () => localStorage.getItem('nimbus_token');

  useEffect(() => {
    loadShares();
  }, []);

  async function loadShares() {
    try {
      const res = await fetch(`/api/files/${file._id}/shares`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (res.ok) setActiveShares(data.shares);
    } catch {
      // non-fatal — list just stays empty
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setGeneratedLink(null);
    try {
      const res = await fetch(`/api/files/${file._id}/share`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to generate link');
      setGeneratedLink(data.shareUrl);
      await loadShares();
    } catch {
      setError('Failed to generate link');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }

  async function handleRevoke(linkId) {
    try {
      const res = await fetch(`/api/files/${file._id}/shares/${linkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return setError('Failed to revoke link');
      setActiveShares(prev => prev.filter(s => s._id !== linkId));
      if (generatedLink) setGeneratedLink(null);
    } catch {
      setError('Failed to revoke link');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share File</h2>
          <p className="modal-filename">{file.originalName}</p>
        </div>

        <div className="modal-section">
          <label className="modal-label">Link expires in</label>
          <div className="expiry-picker">
            {EXPIRY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`expiry-btn${expiresIn === opt.value ? ' expiry-btn--active' : ''}`}
                onClick={() => setExpiresIn(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate Link'}
        </button>

        {error && <p className="file-error" style={{ marginTop: '0.75rem' }}>{error}</p>}

        {generatedLink && (
          <div className="modal-section">
            <label className="modal-label">Share link</label>
            <div className="share-link-row">
              <input className="share-link-input" readOnly value={generatedLink} />
              <button className="btn-copy" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {activeShares.length > 0 && (
          <div className="modal-section">
            <label className="modal-label">Active links</label>
            <ul className="share-list">
              {activeShares.map(s => (
                <li key={s._id} className="share-list-item">
                  <span>Expires {new Date(s.expiresAt).toLocaleDateString()}</span>
                  <button className="btn-revoke" onClick={() => handleRevoke(s._id)}>Revoke</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button className="btn-modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
