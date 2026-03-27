import FilePreviewItem from './FilePreviewItem.jsx';
import { isMedia } from '../utils/fileUtils.js';

const SIZE_PX = { small: 120, medium: 200, large: 300 };

export default function FileGridView({ files, filter, viewSize, blobBaseUrl, onDownload, onShare, onDelete, onCopy, onFileClick }) {
  if (files.length === 0) {
    return <p className="file-empty">No files match the current filter.</p>;
  }

  const isGalleryMode =
    filter.mode === 'media' ||
    (filter.mode === 'byType' && files.length > 0 && files.every(isMedia));

  const cellSize = SIZE_PX[viewSize] ?? 200;
  const gap      = isGalleryMode ? 2 : 12;

  return (
    <div
      className="file-grid"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${cellSize}px, 1fr))`,
        gap: `${gap}px`,
      }}
    >
      {files.map(f => (
        <FilePreviewItem
          key={f._id}
          file={f}
          isGalleryMode={isGalleryMode}
          blobBaseUrl={blobBaseUrl}
          onDownload={onDownload}
          onShare={onShare}
          onDelete={onDelete}
          onCopy={onCopy}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}
