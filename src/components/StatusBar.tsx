/**
 * StatusBar - Bottom status bar with zoom, cursor position, document info
 */

import React from 'react';
import type { ViewState, DocumentState } from '../types';

export interface StatusBarProps {
  document: DocumentState;
  view: ViewState;
  cursorPosition: { x: number; y: number } | null;
  onZoomChange: (zoom: number) => void;
  onFitToWindow: () => void;
  onActualSize: () => void;
}

const ZOOM_PRESETS = [
  { value: 0.25, label: '25%' },
  { value: 0.5, label: '50%' },
  { value: 1, label: '100%' },
  { value: 2, label: '200%' },
  { value: 4, label: '400%' },
  { value: 8, label: '800%' },
];

export function StatusBar({
  document,
  view,
  cursorPosition,
  onZoomChange,
  onFitToWindow,
  onActualSize,
}: StatusBarProps): React.ReactElement {
  const zoomPercent = Math.round(view.zoom * 100);

  return (
    <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-t border-white/10 text-xs text-gray-400">
      {/* Left: Document info */}
      <div className="flex items-center gap-4">
        <span>
          {document.width} x {document.height} px
        </span>
        <span>{document.dpi} DPI</span>
        {document.dirty && (
          <span className="text-yellow-400" title="Unsaved changes">*</span>
        )}
      </div>

      {/* Center: Cursor position */}
      <div className="flex items-center gap-2">
        {cursorPosition ? (
          <>
            <span>X: {Math.round(cursorPosition.x)}</span>
            <span>Y: {Math.round(cursorPosition.y)}</span>
          </>
        ) : (
          <span>--</span>
        )}
      </div>

      {/* Right: Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onZoomChange(Math.max(0.1, view.zoom / 1.5))}
          className="p-1 hover:bg-white/10 rounded"
          title="Zoom Out"
        >
          <MinusIcon />
        </button>

        <select
          value={zoomPercent}
          onChange={(e) => onZoomChange(parseInt(e.target.value) / 100)}
          className="bg-gray-700 border border-white/10 rounded px-2 py-0.5 text-white"
        >
          {ZOOM_PRESETS.map(({ value, label }) => (
            <option key={value} value={Math.round(value * 100)}>{label}</option>
          ))}
          {!ZOOM_PRESETS.find(p => Math.round(p.value * 100) === zoomPercent) && (
            <option value={zoomPercent}>{zoomPercent}%</option>
          )}
        </select>

        <button
          onClick={() => onZoomChange(Math.min(32, view.zoom * 1.5))}
          className="p-1 hover:bg-white/10 rounded"
          title="Zoom In"
        >
          <PlusIcon />
        </button>

        <div className="w-px h-4 bg-white/20 mx-1" />

        <button
          onClick={onFitToWindow}
          className="px-2 py-0.5 hover:bg-white/10 rounded"
          title="Fit to Window"
        >
          Fit
        </button>

        <button
          onClick={onActualSize}
          className="px-2 py-0.5 hover:bg-white/10 rounded"
          title="Actual Size (100%)"
        >
          1:1
        </button>
      </div>
    </div>
  );
}

function MinusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
