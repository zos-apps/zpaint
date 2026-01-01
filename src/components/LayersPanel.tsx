/**
 * LayersPanel - Layer management UI
 */

import React, { useState } from 'react';
import type { Layer, BlendMode, BLEND_MODES } from '../types';

export interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMergeDown: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onSetBlendMode: (id: string, mode: BlendMode) => void;
  onMoveLayer: (id: string, newIndex: number) => void;
}

const BLEND_MODE_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
];

export function LayersPanel({
  layers,
  activeLayerId,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onMergeDown,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onSetOpacity,
  onSetBlendMode,
  onMoveLayer,
}: LayersPanelProps): React.ReactElement {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const activeLayer = layers.find(l => l.id === activeLayerId);

  const startRename = (layer: Layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  // Layers are displayed top-to-bottom (reverse of array order)
  const displayLayers = [...layers].reverse();

  return (
    <div className="flex flex-col h-full bg-gray-800">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10">
        <span className="text-sm font-medium text-gray-300">Layers</span>
      </div>

      {/* Blend mode and opacity for active layer */}
      {activeLayer && (
        <div className="p-2 border-b border-white/10 space-y-2">
          <select
            value={activeLayer.blendMode}
            onChange={(e) => onSetBlendMode(activeLayer.id, e.target.value as BlendMode)}
            className="w-full px-2 py-1 text-xs bg-gray-700 border border-white/10 rounded text-white"
          >
            {BLEND_MODE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-14">Opacity:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(activeLayer.opacity * 100)}
              onChange={(e) => onSetOpacity(activeLayer.id, parseInt(e.target.value) / 100)}
              className="flex-1"
            />
            <span className="text-xs text-gray-300 w-8">
              {Math.round(activeLayer.opacity * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto">
        {displayLayers.map((layer, displayIndex) => {
          const isActive = layer.id === activeLayerId;
          const actualIndex = layers.length - 1 - displayIndex;

          return (
            <div
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer border-b border-white/5 ${
                isActive ? 'bg-blue-600/30' : 'hover:bg-white/5'
              }`}
            >
              {/* Visibility toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                className={`p-1 rounded ${layer.visible ? 'text-white' : 'text-gray-500'}`}
                title={layer.visible ? 'Hide layer' : 'Show layer'}
              >
                <EyeIcon visible={layer.visible} />
              </button>

              {/* Lock toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                className={`p-1 rounded ${layer.locked ? 'text-yellow-400' : 'text-gray-500'}`}
                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
              >
                <LockIcon locked={layer.locked} />
              </button>

              {/* Thumbnail */}
              <div className="w-10 h-8 border border-white/20 bg-gray-900 flex-shrink-0">
                <LayerThumbnail layer={layer} />
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                {editingId === layer.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="w-full px-1 py-0.5 text-xs bg-gray-700 border border-blue-500 rounded text-white"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="block text-xs text-gray-200 truncate"
                    onDoubleClick={() => startRename(layer)}
                  >
                    {layer.name}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 p-2 border-t border-white/10">
        <button
          onClick={onAddLayer}
          className="p-1.5 rounded hover:bg-white/10 text-gray-300"
          title="New Layer"
        >
          <PlusIcon />
        </button>
        <button
          onClick={() => activeLayerId && onDuplicateLayer(activeLayerId)}
          disabled={!activeLayerId}
          className="p-1.5 rounded hover:bg-white/10 text-gray-300 disabled:opacity-30"
          title="Duplicate Layer"
        >
          <CopyIcon />
        </button>
        <button
          onClick={() => activeLayerId && onMergeDown(activeLayerId)}
          disabled={!activeLayerId || layers.findIndex(l => l.id === activeLayerId) === 0}
          className="p-1.5 rounded hover:bg-white/10 text-gray-300 disabled:opacity-30"
          title="Merge Down"
        >
          <MergeIcon />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => activeLayerId && onDeleteLayer(activeLayerId)}
          disabled={!activeLayerId || layers.length <= 1}
          className="p-1.5 rounded hover:bg-white/10 text-gray-300 disabled:opacity-30"
          title="Delete Layer"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

// Layer thumbnail component
function LayerThumbnail({ layer }: { layer: Layer }): React.ReactElement {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(layer.canvas, 0, 0, canvas.width, canvas.height);
  }, [layer.canvas]);

  return <canvas ref={canvasRef} width={40} height={32} className="w-full h-full" />;
}

// Icons
function EyeIcon({ visible }: { visible: boolean }) {
  if (!visible) {
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
        <path d="M1 1l22 22" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LockIcon({ locked }: { locked: boolean }) {
  if (!locked) {
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 019.9-1" />
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

function CopyIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function MergeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6L12 2L16 6M12 2v13M4 12h16M8 18L12 22L16 18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}
