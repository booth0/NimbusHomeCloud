import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import useFileBlob from '../hooks/useFileBlob.js';
import { isImage, isVideo } from '../utils/fileUtils.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const isPdf = file => file.mimetype === 'application/pdf';

function FileIcon({ mimetype }) {
  if (mimetype.startsWith('audio/'))    return <span className="fpi-icon">🎵</span>;
  if (mimetype === 'application/pdf')
    return <span className="fpi-icon"><span className="fpi-badge fpi-badge--pdf">PDF</span></span>;
  if (mimetype.startsWith('text/'))
    return <span className="fpi-icon"><span className="fpi-badge">TXT</span></span>;
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword')
    return <span className="fpi-icon"><span className="fpi-badge fpi-badge--doc">DOC</span></span>;
  if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mimetype === 'application/vnd.ms-powerpoint')
    return <span className="fpi-icon"><span className="fpi-badge fpi-badge--ppt">PPT</span></span>;
  if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimetype === 'application/vnd.ms-excel')
    return <span className="fpi-icon"><span className="fpi-badge fpi-badge--xls">XLS</span></span>;
  return <span className="fpi-icon">📄</span>;
}

// Draws a frame from a video blob URL onto a canvas and returns a JPEG data URL.
function captureVideoThumbnail(blobUrl) {
  return new Promise(resolve => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';
    video.playsInline = true;

    video.addEventListener('loadedmetadata', () => { video.currentTime = 0.001; });
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width  = video.videoWidth  || 320;
      canvas.height = video.videoHeight || 240;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
      video.src = '';
    });
    video.addEventListener('error', () => resolve(null));
    video.src = blobUrl;
  });
}

// Renders the first page of a PDF blob URL to a canvas and returns a JPEG data URL.
async function capturePdfThumbnail(blobUrl) {
  try {
    const pdf  = await pdfjsLib.getDocument(blobUrl).promise;
    const page = await pdf.getPage(1);

    // Scale page to a fixed width for the thumbnail
    const viewport       = page.getViewport({ scale: 1 });
    const scale          = 400 / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    const canvas  = document.createElement('canvas');
    canvas.width  = scaledViewport.width;
    canvas.height = scaledViewport.height;

    await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaledViewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}

export default function FilePreviewItem({ file, isGalleryMode, blobBaseUrl, onDownload, onShare, onDelete, onCopy, onFileClick }) {
  const [isVisible, setIsVisible]   = useState(false);
  const [videoThumb, setVideoThumb] = useState(null);
  const [pdfThumb, setPdfThumb]     = useState(null);
  const cellRef = useRef(null);

  const token = localStorage.getItem('nimbus_token');
  const needsBlob = isImage(file) || isVideo(file) || isPdf(file);
  const { blobUrl, loading } = useFileBlob(isVisible && needsBlob ? file._id : null, token, blobBaseUrl);

  // Lazy-load: only fetch once cell enters viewport
  useEffect(() => {
    const el = cellRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Generate still thumbnail once the video blob URL is ready
  useEffect(() => {
    if (!isVideo(file) || !blobUrl) return;
    captureVideoThumbnail(blobUrl).then(url => { if (url) setVideoThumb(url); });
  }, [blobUrl]);

  // Generate first-page thumbnail once the PDF blob URL is ready
  useEffect(() => {
    if (!isPdf(file) || !blobUrl) return;
    capturePdfThumbnail(blobUrl).then(url => { if (url) setPdfThumb(url); });
  }, [blobUrl]);

  return (
    <div
      ref={cellRef}
      className={`fpi-cell${isGalleryMode ? ' fpi-cell--gallery' : ' fpi-cell--mixed'}`}
    >
      <div className="fpi-square" onClick={() => onFileClick(file)}>

        {/* Preview content */}
        {!isVisible || (needsBlob && loading) ? (
          <div className="fpi-placeholder" />
        ) : isImage(file) && blobUrl ? (
          <img src={blobUrl} alt={file.originalName} className="fpi-media" />
        ) : isVideo(file) ? (
          videoThumb
            ? <img src={videoThumb} alt={file.originalName} className="fpi-media" />
            : <div className="fpi-placeholder" />
        ) : isPdf(file) ? (
          pdfThumb
            ? <img src={pdfThumb} alt={file.originalName} className="fpi-media fpi-media--pdf" />
            : <div className="fpi-placeholder" />
        ) : (
          <FileIcon mimetype={file.mimetype} />
        )}

        {/* Play badge for videos */}
        {isVideo(file) && videoThumb && (
          <div className="fpi-play-badge">▶</div>
        )}

        {/* PDF badge */}
        {isPdf(file) && pdfThumb && (
          <div className="fpi-pdf-badge">PDF</div>
        )}

        {/* Hover overlay — click propagates to square to open modal */}
        <div className="fpi-overlay">
          <span className="fpi-overlay-name">{file.originalName}</span>
          {file._sharedBy && <span className="fpi-overlay-sharedby">Shared By: {file._sharedBy}</span>}
          <div className="fpi-overlay-actions">
            <button
              className="fpi-action-btn"
              title="Download"
              onClick={e => { e.stopPropagation(); onDownload(file); }}
            >⬇</button>
            {onShare && <button
              className="fpi-action-btn"
              title="Share"
              onClick={e => { e.stopPropagation(); onShare(file); }}
            >🔗</button>}
            {onCopy && <button
              className="fpi-action-btn"
              title="Copy to My Files"
              onClick={e => { e.stopPropagation(); onCopy(file); }}
            >📋</button>}
            {onDelete && <button
              className="fpi-action-btn fpi-action-btn--delete"
              title="Delete"
              onClick={e => { e.stopPropagation(); onDelete(file._id); }}
            >🗑</button>}
          </div>
        </div>
      </div>

      {!isGalleryMode && (
        <div className="fpi-name" title={file.originalName}>{file.originalName}</div>
      )}
    </div>
  );
}
