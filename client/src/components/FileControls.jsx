import { useState, useRef, useEffect } from 'react';

const FILTER_TABS = [
  { label: 'Photos & Videos', shortLabel: 'Media', mode: 'media' },
  { label: 'Other Files',     shortLabel: 'Other', mode: 'non-media' },
  { label: 'All Files',       shortLabel: 'All',   mode: 'all' },
];

const SORT_OPTIONS = [
  { value: 'date-desc',     label: 'Date Taken — Newest First' },
  { value: 'date-asc',      label: 'Date Taken — Oldest First' },
  { value: 'uploaded-desc', label: 'Upload Date — Newest First' },
  { value: 'uploaded-asc',  label: 'Upload Date — Oldest First' },
  { value: 'name-asc',      label: 'Name — A → Z' },
  { value: 'name-desc',     label: 'Name — Z → A' },
];

// Simple grid / list SVG icons
function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1"/>
      <rect x="9" y="1" width="6" height="6" rx="1"/>
      <rect x="1" y="9" width="6" height="6" rx="1"/>
      <rect x="9" y="9" width="6" height="6" rx="1"/>
    </svg>
  );
}

function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2"  width="14" height="2.5" rx="1"/>
      <rect x="1" y="6.75" width="14" height="2.5" rx="1"/>
      <rect x="1" y="11.5" width="14" height="2.5" rx="1"/>
    </svg>
  );
}

export default function FileControls({ filter, sort, view, availableTypes, onFilterChange, onSortChange, onViewChange, selectMode, onSelectMode }) {
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!typeDropdownOpen) return;
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setTypeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [typeDropdownOpen]);

  function toggleType(ext) {
    const selected = filter.selectedTypes.includes(ext)
      ? filter.selectedTypes.filter(t => t !== ext)
      : [...filter.selectedTypes, ext];
    onFilterChange({ ...filter, selectedTypes: selected });
  }

  function handleFilterTab(mode) {
    // Clear selected types when leaving 'all' — they only apply there
    onFilterChange({ mode, selectedTypes: mode === 'all' ? filter.selectedTypes : [] });
    if (mode !== 'all') setTypeDropdownOpen(false);
  }

  return (
    <div className="file-controls">
      {/* Filter tabs */}
      <div className="file-controls-section">
        <div className="file-filter-tabs">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.mode}
              className={`file-filter-tab${filter.mode === tab.mode ? ' file-filter-tab--active' : ''}`}
              onClick={() => handleFilterTab(tab.mode)}
            >
              <span className="label-full">{tab.label}</span>
              <span className="label-short">{tab.shortLabel}</span>
            </button>
          ))}
        </div>

        {filter.mode === 'all' && (
          <div className="file-type-dropdown-wrap" ref={dropdownRef}>
            <button
              className="file-type-dropdown-trigger"
              onClick={() => setTypeDropdownOpen(o => !o)}
            >
              {filter.selectedTypes.length === 0
                ? 'All types'
                : filter.selectedTypes.map(t => t.toUpperCase()).join(', ')}
              <span className="file-type-caret">{typeDropdownOpen ? '▲' : '▼'}</span>
            </button>
            {typeDropdownOpen && (
              <div className="file-type-dropdown">
                {availableTypes.length === 0 && (
                  <span className="file-type-empty">No file types yet</span>
                )}
                {availableTypes.map(ext => (
                  <label key={ext} className="file-type-option">
                    <input
                      type="checkbox"
                      checked={filter.selectedTypes.includes(ext)}
                      onChange={() => toggleType(ext)}
                    />
                    <span>.{ext.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Select button — pinned to right of the filter row */}
        {onSelectMode && (
          <button
            className={`file-filter-tab file-filter-tab--right${selectMode ? ' file-filter-tab--active' : ''}`}
            onClick={() => onSelectMode(!selectMode)}
          >
            {selectMode ? 'Cancel Select' : 'Select'}
          </button>
        )}
      </div>

      {/* Row 2: sort + view controls */}
      <div className="file-controls-section file-controls-section--right">
        <select
          className="file-sort-select"
          value={`${sort.by}-${sort.direction}`}
          onChange={e => {
            const [by, direction] = e.target.value.split('-');
            onSortChange({ by, direction });
          }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* View mode */}
        <div className="file-view-toggle">
          <button
            className={`file-view-btn${view.mode === 'detail' ? ' file-view-btn--active' : ''}`}
            onClick={() => onViewChange({ ...view, mode: 'detail' })}
            title="List view"
          >
            <IconList />
          </button>
          <button
            className={`file-view-btn${view.mode === 'preview' ? ' file-view-btn--active' : ''}`}
            onClick={() => onViewChange({ ...view, mode: 'preview' })}
            title="Grid view"
          >
            <IconGrid />
          </button>
        </div>

        {view.mode === 'preview' && (
          <div className="file-size-toggle">
            {['small', 'medium', 'large'].map((s, i) => (
              <button
                key={s}
                className={`file-size-btn${view.size === s ? ' file-size-btn--active' : ''}`}
                onClick={() => onViewChange({ ...view, size: s })}
                title={s}
              >
                {['S', 'M', 'L'][i]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
