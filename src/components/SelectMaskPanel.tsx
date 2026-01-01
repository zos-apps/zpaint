/**
 * SelectMaskPanel - Select and Mask workspace
 *
 * Provides the Photoshop-style Select and Mask interface for:
 * - Refine Edge settings
 * - View mode selection (overlay, black, white, etc.)
 * - Output options
 * - Global refinement sliders
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Selection } from '../types';
import { SelectionEngine, type RefineEdgeOptions } from '../engine/SelectionEngine';
import { MaskEngine, type MaskViewMode } from '../engine/MaskEngine';

export interface SelectMaskPanelProps {
  selection: Selection | null;
  imageData: ImageData | null;
  width: number;
  height: number;
  onSelectionChange: (selection: Selection) => void;
  onApply: (selection: Selection, output: RefineEdgeOptions['output']) => void;
  onCancel: () => void;
}

const VIEW_MODES: { value: MaskViewMode; label: string; shortcut: string }[] = [
  { value: 'mask-overlay', label: 'Overlay', shortcut: 'V' },
  { value: 'on-black', label: 'On Black', shortcut: 'A' },
  { value: 'on-white', label: 'On White', shortcut: 'T' },
  { value: 'mask-only', label: 'Black & White', shortcut: 'K' },
  { value: 'normal', label: 'On Layers', shortcut: 'Y' },
];

const OUTPUT_OPTIONS: { value: RefineEdgeOptions['output']; label: string }[] = [
  { value: 'selection', label: 'Selection' },
  { value: 'layer-mask', label: 'Layer Mask' },
  { value: 'new-layer', label: 'New Layer' },
  { value: 'new-layer-with-mask', label: 'New Layer with Layer Mask' },
];

export function SelectMaskPanel({
  selection,
  imageData,
  width,
  height,
  onSelectionChange,
  onApply,
  onCancel,
}: SelectMaskPanelProps): React.ReactElement {
  const selectionEngineRef = useRef<SelectionEngine | null>(null);

  const [viewMode, setViewMode] = useState<MaskViewMode>('mask-overlay');
  const [showEdge, setShowEdge] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  // Edge Detection
  const [radius, setRadius] = useState(0);
  const [smartRadius, setSmartRadius] = useState(false);

  // Global Refinements
  const [smooth, setSmooth] = useState(0);
  const [feather, setFeather] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [shift, setShift] = useState(0);

  // Output Settings
  const [decontaminate, setDecontaminate] = useState(false);
  const [decontaminateAmount, setDecontaminateAmount] = useState(50);
  const [outputTo, setOutputTo] = useState<RefineEdgeOptions['output']>('selection');

  // Initialize selection engine
  useEffect(() => {
    selectionEngineRef.current = new SelectionEngine(width, height);
  }, [width, height]);

  // Apply refinements when settings change
  const applyRefinements = useCallback(() => {
    if (!selection || !imageData || !selectionEngineRef.current) return;

    const refined = selectionEngineRef.current.refineEdge(selection, imageData, {
      radius: smartRadius ? radius * 2 : radius,
      smooth,
      feather,
      contrast,
      shift,
      decontaminate,
      decontaminateAmount,
      output: outputTo,
    });

    onSelectionChange(refined);
  }, [selection, imageData, radius, smartRadius, smooth, feather, contrast, shift, decontaminate, decontaminateAmount, outputTo, onSelectionChange]);

  // Debounce refinement application
  useEffect(() => {
    const timeout = setTimeout(applyRefinements, 100);
    return () => clearTimeout(timeout);
  }, [radius, smooth, feather, contrast, shift]);

  const handleApply = () => {
    if (selection) {
      onApply(selection, outputTo);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">Select and Mask</span>
        <div className="flex gap-1">
          <button
            onClick={onCancel}
            className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-500"
          >
            OK
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* View Mode */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-400">View Mode</span>
          <div className="grid grid-cols-2 gap-1">
            {VIEW_MODES.map(({ value, label, shortcut }) => (
              <button
                key={value}
                onClick={() => setViewMode(value)}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {label} ({shortcut})
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showEdge}
              onChange={(e) => setShowEdge(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-xs text-gray-300">Show Edge (J)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOriginal}
              onChange={(e) => setShowOriginal(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-xs text-gray-300">Show Original (P)</span>
          </label>
        </div>

        {/* Edge Detection */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-400">Edge Detection</span>
          <SliderRow
            label="Radius"
            value={radius}
            min={0}
            max={250}
            suffix="px"
            onChange={setRadius}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={smartRadius}
              onChange={(e) => setSmartRadius(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-xs text-gray-300">Smart Radius</span>
          </label>
        </div>

        {/* Global Refinements */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-400">Global Refinements</span>
          <SliderRow
            label="Smooth"
            value={smooth}
            min={0}
            max={100}
            onChange={setSmooth}
          />
          <SliderRow
            label="Feather"
            value={feather}
            min={0}
            max={250}
            suffix="px"
            onChange={setFeather}
          />
          <SliderRow
            label="Contrast"
            value={contrast}
            min={0}
            max={100}
            suffix="%"
            onChange={setContrast}
          />
          <SliderRow
            label="Shift Edge"
            value={shift}
            min={-100}
            max={100}
            suffix="%"
            onChange={setShift}
          />
        </div>

        {/* Output Settings */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-400">Output Settings</span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={decontaminate}
              onChange={(e) => setDecontaminate(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-xs text-gray-300">Decontaminate Colors</span>
          </label>
          {decontaminate && (
            <SliderRow
              label="Amount"
              value={decontaminateAmount}
              min={0}
              max={100}
              suffix="%"
              onChange={setDecontaminateAmount}
            />
          )}
          <div className="space-y-1">
            <span className="text-xs text-gray-400">Output To:</span>
            <select
              value={outputTo}
              onChange={(e) => setOutputTo(e.target.value as RefineEdgeOptions['output'])}
              className="w-full px-2 py-1 text-xs bg-gray-700 border border-white/10 rounded text-white"
            >
              {OUTPUT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tool Selection */}
      <div className="p-2 border-t border-white/10">
        <span className="text-xs text-gray-400 mb-2 block">Tools:</span>
        <div className="flex gap-1">
          <ToolButton icon={<QuickSelectIcon />} label="Quick Selection" shortcut="W" />
          <ToolButton icon={<RefineEdgeIcon />} label="Refine Edge Brush" shortcut="R" />
          <ToolButton icon={<BrushIcon />} label="Brush" shortcut="B" />
          <ToolButton icon={<HandIcon />} label="Hand" shortcut="H" />
          <ToolButton icon={<ZoomIcon />} label="Zoom" shortcut="Z" />
        </div>
      </div>
    </div>
  );
}

// Slider row component
interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}

function SliderRow({ label, value, min, max, suffix = '', onChange }: SliderRowProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-16">{label}:</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1"
      />
      <span className="text-xs text-gray-300 w-12 text-right">
        {value}{suffix}
      </span>
    </div>
  );
}

// Tool button component
interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  active?: boolean;
  onClick?: () => void;
}

function ToolButton({ icon, label, shortcut, active, onClick }: ToolButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded ${
        active ? 'bg-blue-600' : 'hover:bg-white/10'
      }`}
      title={`${label} (${shortcut})`}
    >
      {icon}
    </button>
  );
}

// Icons
function QuickSelectIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" strokeDasharray="2 1" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function RefineEdgeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" strokeDasharray="3 2" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    </svg>
  );
}

function BrushIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 00-2.82 0L8 7l9 9 1.59-1.59a2 2 0 000-2.82L17 10l4.37-4.37a2.12 2.12 0 10-3-3z" />
      <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-10" />
    </svg>
  );
}

function HandIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 11V6a2 2 0 00-4 0v5M14 10V4a2 2 0 00-4 0v6M10 10.5V5a2 2 0 00-4 0v9" />
      <path d="M18 11a2 2 0 014 0v6a8 8 0 01-16 0v-4" />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
    </svg>
  );
}

export default SelectMaskPanel;
