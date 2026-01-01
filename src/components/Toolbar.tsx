/**
 * Toolbar - Tool selection and common actions
 */

import React from 'react';
import type { ToolType } from '../types';

export interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface ToolButton {
  tool: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

const TOOLS: ToolButton[] = [
  { tool: 'brush', icon: <BrushIcon />, label: 'Brush', shortcut: 'B' },
  { tool: 'eraser', icon: <EraserIcon />, label: 'Eraser', shortcut: 'E' },
  { tool: 'rectangle-select', icon: <SelectIcon />, label: 'Selection', shortcut: 'M' },
  { tool: 'lasso-select', icon: <LassoIcon />, label: 'Lasso', shortcut: 'L' },
  { tool: 'magic-wand', icon: <WandIcon />, label: 'Magic Wand', shortcut: 'W' },
  { tool: 'quick-select', icon: <QuickSelectIcon />, label: 'Quick Selection', shortcut: 'Q' },
  { tool: 'fill', icon: <FillIcon />, label: 'Fill', shortcut: 'G' },
  { tool: 'eyedropper', icon: <EyedropperIcon />, label: 'Eyedropper', shortcut: 'I' },
  { tool: 'clone-stamp', icon: <CloneIcon />, label: 'Clone Stamp', shortcut: 'S' },
  { tool: 'move', icon: <MoveIcon />, label: 'Move', shortcut: 'V' },
  { tool: 'zoom', icon: <ZoomIcon />, label: 'Zoom', shortcut: 'Z' },
  { tool: 'hand', icon: <HandIcon />, label: 'Hand', shortcut: 'H' },
];

export function Toolbar({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps): React.ReactElement {
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 border-b border-white/10">
      {/* Undo/Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30"
        title="Undo (Ctrl+Z)"
      >
        <UndoIcon />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30"
        title="Redo (Ctrl+Shift+Z)"
      >
        <RedoIcon />
      </button>

      <div className="w-px h-6 bg-white/20 mx-1" />

      {/* Tool buttons */}
      {TOOLS.map(({ tool, icon, label, shortcut }) => (
        <button
          key={tool}
          onClick={() => onToolChange(tool)}
          className={`p-1.5 rounded ${
            activeTool === tool
              ? 'bg-blue-600 text-white'
              : 'hover:bg-white/10 text-gray-300'
          }`}
          title={`${label} (${shortcut})`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

// Icons
function BrushIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 00-2.82 0L8 7l9 9 1.59-1.59a2 2 0 000-2.82L17 10l4.37-4.37a2.12 2.12 0 10-3-3z" />
      <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-10" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 20H7L3 16a1 1 0 010-1.41l9.59-9.59a2 2 0 012.82 0l5.17 5.17a2 2 0 010 2.82L12 21" />
    </svg>
  );
}

function SelectIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" strokeDasharray="4 2" />
    </svg>
  );
}

function LassoIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0" strokeDasharray="3 2" />
      <circle cx="18" cy="18" r="3" fill="currentColor" />
    </svg>
  );
}

function WandIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5" />
      <path d="M3 21l9-9" />
    </svg>
  );
}

function FillIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 11l-8-8L2.2 11.8a2.79 2.79 0 004 4L11 11" />
      <path d="M5.2 19.8a2.79 2.79 0 004 0l8-8" />
      <path d="M18 22s4-3 4-6c0-2-2-4-4-4s-4 2-4 4c0 3 4 6 4 6z" />
    </svg>
  );
}

function EyedropperIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 22l1-1h3l9-9" />
      <path d="M11 12l4 4-9 9-4-4 9-9z" />
      <path d="M14 8l6-6a2 2 0 013 3l-6 6" />
    </svg>
  );
}

function CloneIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
    </svg>
  );
}

function HandIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 11V6a2 2 0 00-4 0v5M14 10V4a2 2 0 00-4 0v6M10 10.5V5a2 2 0 00-4 0v9" />
      <path d="M18 11a2 2 0 014 0v6a8 8 0 01-16 0v-4" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" />
    </svg>
  );
}
