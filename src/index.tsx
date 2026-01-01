/**
 * zPaint - Professional Raster Graphics Application
 *
 * A Photoshop-inspired raster graphics editor built on the z-os4 platform.
 *
 * Features:
 * - Multi-layer compositing with blend modes
 * - Brush, eraser, fill, and clone stamp tools
 * - Selection tools (rectangle, lasso, magic wand)
 * - Color picker with foreground/background colors
 * - Undo/redo history
 * - Layer masks
 * - Zoom and pan navigation
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type {
  ToolType,
  RGBA,
  Layer,
  BlendMode,
  ViewState,
  DocumentState,
  ToolState,
  HistoryEntry,
  LayerSnapshot,
  BrushSettings,
  EraserSettings,
  FillSettings,
  CloneStampSettings,
} from './types';
import { generateId } from './types';
import { RasterEngine } from './engine/RasterEngine';
import {
  BrushTool,
  EraserTool,
  RectangleSelectTool,
  LassoTool,
  MagicWandTool,
  FillTool,
  CloneStampTool,
  EyedropperTool,
} from './tools';
import type { BaseTool, ToolContext } from './tools/BaseTool';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { LayersPanel } from './components/LayersPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { StatusBar } from './components/StatusBar';

// ============================================================================
// Default State
// ============================================================================

const DEFAULT_DOCUMENT: DocumentState = {
  width: 1920,
  height: 1080,
  dpi: 72,
  backgroundColor: { r: 255, g: 255, b: 255, a: 1 },
  name: 'Untitled',
  dirty: false,
};

const DEFAULT_VIEW: ViewState = {
  zoom: 1,
  panX: 50,
  panY: 50,
  rotation: 0,
  showGrid: false,
  showGuides: false,
  showRulers: false,
  snapToGrid: false,
  gridSize: 16,
};

const DEFAULT_BRUSH: BrushSettings = {
  size: 20,
  hardness: 80,
  opacity: 100,
  flow: 100,
  spacing: 25,
  smoothing: 0,
};

const DEFAULT_ERASER: EraserSettings = {
  size: 20,
  hardness: 80,
  opacity: 100,
  flow: 100,
};

const DEFAULT_FILL: FillSettings = {
  tolerance: 32,
  contiguous: true,
  antiAlias: true,
  allLayers: false,
};

const DEFAULT_CLONE_STAMP: CloneStampSettings = {
  size: 20,
  hardness: 80,
  opacity: 100,
  flow: 100,
  aligned: true,
  allLayers: false,
};

const DEFAULT_FOREGROUND: RGBA = { r: 0, g: 0, b: 0, a: 1 };
const DEFAULT_BACKGROUND: RGBA = { r: 255, g: 255, b: 255, a: 1 };

// ============================================================================
// Main App Component
// ============================================================================

export interface ZPaintAppProps {
  className?: string;
}

export function ZPaintApp({ className = '' }: ZPaintAppProps): React.ReactElement {
  // Engine reference
  const engineRef = useRef<RasterEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Core state
  const [engine, setEngine] = useState<RasterEngine | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  // Document state
  const [document, setDocument] = useState<DocumentState>(DEFAULT_DOCUMENT);

  // View state
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);

  // Tool state
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [foregroundColor, setForegroundColor] = useState<RGBA>(DEFAULT_FOREGROUND);
  const [backgroundColor, setBackgroundColor] = useState<RGBA>(DEFAULT_BACKGROUND);
  const [brushSettings, setBrushSettings] = useState<BrushSettings>(DEFAULT_BRUSH);
  const [eraserSettings, setEraserSettings] = useState<EraserSettings>(DEFAULT_ERASER);
  const [fillSettings, setFillSettings] = useState<FillSettings>(DEFAULT_FILL);
  const [cloneStampSettings, setCloneStampSettings] = useState<CloneStampSettings>(DEFAULT_CLONE_STAMP);

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // UI state
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [showLayers, setShowLayers] = useState(true);
  const [showProperties, setShowProperties] = useState(true);

  // ============================================================================
  // Engine Initialization
  // ============================================================================

  useEffect(() => {
    const newEngine = new RasterEngine(document.width, document.height);
    engineRef.current = newEngine;
    setEngine(newEngine);

    // Create initial layer
    const initialLayer = newEngine.createLayer('Background');
    newEngine.fillLayer(initialLayer.id, document.backgroundColor);
    setLayers(newEngine.getLayers());
    setActiveLayerId(initialLayer.id);

    // Subscribe to engine updates
    const unsub = newEngine.subscribe(() => {
      setLayers(newEngine.getLayers());
      setDocument(prev => ({ ...prev, dirty: true }));
    });

    return () => {
      unsub();
      newEngine.destroy();
    };
  }, []);

  // ============================================================================
  // Tool State for Tool Context
  // ============================================================================

  const toolState: ToolState = useMemo(() => ({
    activeTool,
    brush: brushSettings,
    eraser: eraserSettings,
    selection: { mode: 'new', feather: 0, antiAlias: true },
    magicWand: { mode: 'new', feather: 0, antiAlias: true, tolerance: 32, contiguous: true },
    fill: fillSettings,
    gradient: { type: 'linear', colors: [foregroundColor, backgroundColor], stops: [0, 1], opacity: 100, blendMode: 'normal' },
    cloneStamp: cloneStampSettings,
    foregroundColor,
    backgroundColor,
  }), [activeTool, brushSettings, eraserSettings, fillSettings, cloneStampSettings, foregroundColor, backgroundColor]);

  // ============================================================================
  // History Management
  // ============================================================================

  const pushHistory = useCallback((name: string) => {
    if (!engineRef.current) return;

    const snapshot = engineRef.current.createSnapshot();
    const entry: HistoryEntry = {
      id: generateId(),
      name,
      timestamp: Date.now(),
      snapshot: {
        layers: snapshot,
        activeLayerId,
      },
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(entry);
      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [activeLayerId, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex < 0 || !engineRef.current) return;

    const entry = history[historyIndex];
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1];
      engineRef.current.restoreSnapshot(prevEntry.snapshot.layers);
      setActiveLayerId(prevEntry.snapshot.activeLayerId);
    } else {
      // Restore to initial state
      engineRef.current.restoreSnapshot([]);
    }

    setHistoryIndex(prev => prev - 1);
    setLayers(engineRef.current.getLayers());
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1 || !engineRef.current) return;

    const entry = history[historyIndex + 1];
    engineRef.current.restoreSnapshot(entry.snapshot.layers);
    setActiveLayerId(entry.snapshot.activeLayerId);
    setHistoryIndex(prev => prev + 1);
    setLayers(engineRef.current.getLayers());
  }, [history, historyIndex]);

  // ============================================================================
  // Tool Context
  // ============================================================================

  const toolContext: ToolContext = useMemo(() => ({
    engine: engineRef.current!,
    toolState,
    markDirty: () => {
      setDocument(prev => ({ ...prev, dirty: true }));
    },
    pushHistory,
  }), [toolState, pushHistory]);

  // ============================================================================
  // Active Tool Instance
  // ============================================================================

  const activetoolInstance = useMemo(() => {
    if (!engine) return null;

    const ctx = { ...toolContext, engine };

    switch (activeTool) {
      case 'brush':
        return new BrushTool(ctx);
      case 'eraser':
        return new EraserTool(ctx);
      case 'rectangle-select':
        return new RectangleSelectTool(ctx);
      case 'lasso-select':
        return new LassoTool(ctx);
      case 'magic-wand':
        return new MagicWandTool(ctx);
      case 'fill':
        return new FillTool(ctx);
      case 'clone-stamp':
        return new CloneStampTool(ctx);
      case 'eyedropper':
        return new EyedropperTool(ctx, (color) => {
          setForegroundColor(color);
        });
      default:
        return null;
    }
  }, [engine, activeTool, toolContext]);

  // ============================================================================
  // Layer Operations
  // ============================================================================

  const syncLayers = useCallback(() => {
    if (!engineRef.current) return;
    setLayers(engineRef.current.getLayers());
  }, []);

  const handleAddLayer = useCallback(() => {
    if (!engineRef.current) return;
    pushHistory('Add Layer');
    const layer = engineRef.current.createLayer(`Layer ${layers.length + 1}`);
    setActiveLayerId(layer.id);
    syncLayers();
  }, [layers.length, pushHistory, syncLayers]);

  const handleDeleteLayer = useCallback((id: string) => {
    if (!engineRef.current || layers.length <= 1) return;
    pushHistory('Delete Layer');
    engineRef.current.deleteLayer(id);
    syncLayers();
    if (activeLayerId === id) {
      setActiveLayerId(engineRef.current.getActiveLayerId());
    }
  }, [layers.length, activeLayerId, pushHistory, syncLayers]);

  const handleDuplicateLayer = useCallback((id: string) => {
    if (!engineRef.current) return;
    pushHistory('Duplicate Layer');
    const layer = engineRef.current.duplicateLayer(id);
    if (layer) {
      setActiveLayerId(layer.id);
    }
    syncLayers();
  }, [pushHistory, syncLayers]);

  const handleMergeDown = useCallback((id: string) => {
    if (!engineRef.current) return;
    pushHistory('Merge Down');
    const merged = engineRef.current.mergeLayerDown(id);
    if (merged) {
      setActiveLayerId(merged.id);
    }
    syncLayers();
  }, [pushHistory, syncLayers]);

  const handleSelectLayer = useCallback((id: string) => {
    if (!engineRef.current) return;
    engineRef.current.setActiveLayer(id);
    setActiveLayerId(id);
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    if (!engineRef.current) return;
    const layer = engineRef.current.getLayer(id);
    if (layer) {
      engineRef.current.setLayerVisibility(id, !layer.visible);
      syncLayers();
    }
  }, [syncLayers]);

  const handleToggleLock = useCallback((id: string) => {
    if (!engineRef.current) return;
    const layer = engineRef.current.getLayer(id);
    if (layer) {
      engineRef.current.setLayerLocked(id, !layer.locked);
      syncLayers();
    }
  }, [syncLayers]);

  const handleRenameLayer = useCallback((id: string, name: string) => {
    if (!engineRef.current) return;
    engineRef.current.setLayerName(id, name);
    syncLayers();
  }, [syncLayers]);

  const handleSetLayerOpacity = useCallback((id: string, opacity: number) => {
    if (!engineRef.current) return;
    engineRef.current.setLayerOpacity(id, opacity);
    syncLayers();
  }, [syncLayers]);

  const handleSetLayerBlendMode = useCallback((id: string, mode: BlendMode) => {
    if (!engineRef.current) return;
    engineRef.current.setLayerBlendMode(id, mode);
    syncLayers();
  }, [syncLayers]);

  const handleMoveLayer = useCallback((id: string, newIndex: number) => {
    if (!engineRef.current) return;
    engineRef.current.moveLayer(id, newIndex);
    syncLayers();
  }, [syncLayers]);

  // ============================================================================
  // Color Operations
  // ============================================================================

  const handleSwapColors = useCallback(() => {
    setForegroundColor(backgroundColor);
    setBackgroundColor(foregroundColor);
  }, [foregroundColor, backgroundColor]);

  const handleResetColors = useCallback(() => {
    setForegroundColor(DEFAULT_FOREGROUND);
    setBackgroundColor(DEFAULT_BACKGROUND);
  }, []);

  // ============================================================================
  // View Operations
  // ============================================================================

  const handleViewChange = useCallback((changes: Partial<ViewState>) => {
    setView(prev => ({ ...prev, ...changes }));
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setView(prev => ({ ...prev, zoom }));
  }, []);

  const handleFitToWindow = useCallback(() => {
    const container = containerRef.current;
    if (!container || !engineRef.current) return;

    const rect = container.getBoundingClientRect();
    const { width, height } = engineRef.current.getSize();
    const padding = 50;

    const scaleX = (rect.width - padding * 2) / width;
    const scaleY = (rect.height - padding * 2) / height;
    const zoom = Math.min(scaleX, scaleY, 1);

    const panX = (rect.width - width * zoom) / 2;
    const panY = (rect.height - height * zoom) / 2;

    setView(prev => ({ ...prev, zoom, panX, panY }));
  }, []);

  const handleActualSize = useCallback(() => {
    const container = containerRef.current;
    if (!container || !engineRef.current) return;

    const rect = container.getBoundingClientRect();
    const { width, height } = engineRef.current.getSize();

    const panX = (rect.width - width) / 2;
    const panY = (rect.height - height) / 2;

    setView(prev => ({ ...prev, zoom: 1, panX, panY }));
  }, []);

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();

      // Tool shortcuts
      if (key === 'b') setActiveTool('brush');
      if (key === 'e') setActiveTool('eraser');
      if (key === 'm') setActiveTool('rectangle-select');
      if (key === 'l') setActiveTool('lasso-select');
      if (key === 'w') setActiveTool('magic-wand');
      if (key === 'g') setActiveTool('fill');
      if (key === 'i') setActiveTool('eyedropper');
      if (key === 's' && !e.ctrlKey && !e.metaKey) setActiveTool('clone-stamp');
      if (key === 'v') setActiveTool('move');
      if (key === 'z' && !e.ctrlKey && !e.metaKey) setActiveTool('zoom');
      if (key === 'h') setActiveTool('hand');

      // Color shortcuts
      if (key === 'x') handleSwapColors();
      if (key === 'd') handleResetColors();

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      // View shortcuts
      if (key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleActualSize();
      }

      if (key === '1' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleFitToWindow();
      }

      // Panel toggles
      if (key === 'f7') setShowLayers(v => !v);
      if (key === 'f8') setShowProperties(v => !v);

      // Brush size
      if (key === '[') {
        setBrushSettings(prev => ({ ...prev, size: Math.max(1, prev.size - 5) }));
        setEraserSettings(prev => ({ ...prev, size: Math.max(1, prev.size - 5) }));
      }
      if (key === ']') {
        setBrushSettings(prev => ({ ...prev, size: Math.min(500, prev.size + 5) }));
        setEraserSettings(prev => ({ ...prev, size: Math.min(500, prev.size + 5) }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwapColors, handleResetColors, undo, redo, handleActualSize, handleFitToWindow]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div ref={containerRef} className={`flex flex-col h-full bg-gray-900 text-white ${className}`}>
      {/* Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex >= 0}
        canRedo={historyIndex < history.length - 1}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Properties Panel (left) */}
        {showProperties && (
          <div className="w-56 border-r border-white/10 flex-shrink-0">
            <PropertiesPanel
              activeTool={activeTool}
              foregroundColor={foregroundColor}
              backgroundColor={backgroundColor}
              brushSettings={brushSettings}
              eraserSettings={eraserSettings}
              fillSettings={fillSettings}
              cloneStampSettings={cloneStampSettings}
              onForegroundColorChange={setForegroundColor}
              onBackgroundColorChange={setBackgroundColor}
              onBrushSettingsChange={(s) => setBrushSettings(prev => ({ ...prev, ...s }))}
              onEraserSettingsChange={(s) => setEraserSettings(prev => ({ ...prev, ...s }))}
              onFillSettingsChange={(s) => setFillSettings(prev => ({ ...prev, ...s }))}
              onCloneStampSettingsChange={(s) => setCloneStampSettings(prev => ({ ...prev, ...s }))}
              onSwapColors={handleSwapColors}
              onResetColors={handleResetColors}
            />
          </div>
        )}

        {/* Canvas */}
        <Canvas
          engine={engine}
          view={view}
          tool={activetoolInstance}
          onViewChange={handleViewChange}
          className="flex-1"
        />

        {/* Layers Panel (right) */}
        {showLayers && (
          <div className="w-56 border-l border-white/10 flex-shrink-0">
            <LayersPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onSelectLayer={handleSelectLayer}
              onAddLayer={handleAddLayer}
              onDeleteLayer={handleDeleteLayer}
              onDuplicateLayer={handleDuplicateLayer}
              onMergeDown={handleMergeDown}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onRename={handleRenameLayer}
              onSetOpacity={handleSetLayerOpacity}
              onSetBlendMode={handleSetLayerBlendMode}
              onMoveLayer={handleMoveLayer}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        document={document}
        view={view}
        cursorPosition={cursorPosition}
        onZoomChange={handleZoomChange}
        onFitToWindow={handleFitToWindow}
        onActualSize={handleActualSize}
      />
    </div>
  );
}

// ============================================================================
// App Icon
// ============================================================================

export function ZPaintIcon(): React.ReactElement {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="zpaint-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#zpaint-grad)" />
      {/* Paintbrush */}
      <g stroke="white" strokeWidth="2" fill="none" opacity="0.9">
        {/* Brush handle */}
        <path d="M42 48L52 38L48 34L38 44" fill="white" fillOpacity="0.3" />
        {/* Brush ferrule */}
        <path d="M38 44L34 40L24 50L28 54L38 44" fill="white" fillOpacity="0.5" />
        {/* Brush tip */}
        <path d="M34 40L12 18C10 16 10 13 12 11C14 9 17 9 19 11L41 33" />
        {/* Color spots */}
        <circle cx="16" cy="14" r="3" fill="#ef4444" stroke="none" />
        <circle cx="22" cy="20" r="2" fill="#22c55e" stroke="none" />
        <circle cx="28" cy="26" r="2" fill="#3b82f6" stroke="none" />
      </g>
    </svg>
  );
}

// ============================================================================
// Default export for zOS app loader
// ============================================================================

export default ZPaintApp;
