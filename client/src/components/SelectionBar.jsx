export default function SelectionBar({ selectedCount, onDownloadZip, onShare, onDelete, onCopyToMyFiles, onClear }) {
  return (
    <div className="selection-bar">
      <span className="selection-bar__count">{selectedCount} selected</span>
      <div className="selection-bar__actions">
        {onDownloadZip && (
          <button className="selection-bar__btn" onClick={onDownloadZip} title="Download as ZIP">
            ⬇ ZIP
          </button>
        )}
        {onShare && (
          <button className="selection-bar__btn" onClick={onShare} title="Share files">
            🔗 Share
          </button>
        )}
        {onCopyToMyFiles && (
          <button className="selection-bar__btn" onClick={onCopyToMyFiles} title="Copy to My Files">
            📋 Copy to My Files
          </button>
        )}
        {onDelete && (
          <button className="selection-bar__btn selection-bar__btn--danger" onClick={onDelete} title="Delete selected">
            🗑 Delete
          </button>
        )}
        <button className="selection-bar__btn selection-bar__btn--clear" onClick={onClear} title="Clear selection">
          ✕ Clear
        </button>
      </div>
    </div>
  );
}
