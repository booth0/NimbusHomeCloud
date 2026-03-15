import { useEffect, useState } from 'react';

export default function ShareDownload({ token }) {
  const [status, setStatus] = useState('downloading'); // 'downloading' | 'done' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function download() {
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrorMsg(data.error || 'This link is invalid, expired, or has been revoked.');
          setStatus('error');
          return;
        }

        const disposition = res.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="(.+?)"/);
        const filename = match ? match[1] : 'download';

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setStatus('done');
      } catch {
        setErrorMsg('Something went wrong. Please try again.');
        setStatus('error');
      }
    }

    download();
  }, [token]);

  return (
    <div className="app">
      {status === 'downloading' && <p className="message">Downloading your file…</p>}
      {status === 'done'        && <p className="message">Download started!</p>}
      {status === 'error'       && <p className="message" style={{ color: '#f87171' }}>{errorMsg}</p>}
    </div>
  );
}
