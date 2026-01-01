/**
 * PropertiesPanel - Tool settings, colors, and brush options
 */

import React, { useCallback } from 'react';
import type { ToolType, RGBA, BrushSettings, EraserSettings, FillSettings, CloneStampSettings } from '../types';
import { rgbaToHex, hexToRgba } from '../types';

export interface PropertiesPanelProps {
  activeTool: ToolType;
  foregroundColor: RGBA;
  backgroundColor: RGBA;
  brushSettings: BrushSettings;
  eraserSettings: EraserSettings;
  fillSettings: FillSettings;
  cloneStampSettings: CloneStampSettings;
  onForegroundColorChange: (color: RGBA) => void;
  onBackgroundColorChange: (color: RGBA) => void;
  onBrushSettingsChange: (settings: Partial<BrushSettings>) => void;
  onEraserSettingsChange: (settings: Partial<EraserSettings>) => void;
  onFillSettingsChange: (settings: Partial<FillSettings>) => void;
  onCloneStampSettingsChange: (settings: Partial<CloneStampSettings>) => void;
  onSwapColors: () => void;
  onResetColors: () => void;
}

export function PropertiesPanel({
  activeTool,
  foregroundColor,
  backgroundColor,
  brushSettings,
  eraserSettings,
  fillSettings,
  cloneStampSettings,
  onForegroundColorChange,
  onBackgroundColorChange,
  onBrushSettingsChange,
  onEraserSettingsChange,
  onFillSettingsChange,
  onCloneStampSettingsChange,
  onSwapColors,
  onResetColors,
}: PropertiesPanelProps): React.ReactElement {
  return (
    <div className="flex flex-col h-full bg-gray-800 overflow-y-auto">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10">
        <span className="text-sm font-medium text-gray-300">Properties</span>
      </div>

      {/* Color section */}
      <div className="p-3 border-b border-white/10">
        <ColorPicker
          foreground={foregroundColor}
          background={backgroundColor}
          onForegroundChange={onForegroundColorChange}
          onBackgroundChange={onBackgroundColorChange}
          onSwap={onSwapColors}
          onReset={onResetColors}
        />
      </div>

      {/* Tool-specific settings */}
      <div className="p-3 space-y-4">
        {(activeTool === 'brush') && (
          <BrushSettingsPanel
            settings={brushSettings}
            onChange={onBrushSettingsChange}
          />
        )}

        {(activeTool === 'eraser') && (
          <EraserSettingsPanel
            settings={eraserSettings}
            onChange={onEraserSettingsChange}
          />
        )}

        {(activeTool === 'fill') && (
          <FillSettingsPanel
            settings={fillSettings}
            onChange={onFillSettingsChange}
          />
        )}

        {(activeTool === 'clone-stamp') && (
          <CloneStampSettingsPanel
            settings={cloneStampSettings}
            onChange={onCloneStampSettingsChange}
          />
        )}
      </div>
    </div>
  );
}

// Color picker component
interface ColorPickerProps {
  foreground: RGBA;
  background: RGBA;
  onForegroundChange: (color: RGBA) => void;
  onBackgroundChange: (color: RGBA) => void;
  onSwap: () => void;
  onReset: () => void;
}

function ColorPicker({
  foreground,
  background,
  onForegroundChange,
  onBackgroundChange,
  onSwap,
  onReset,
}: ColorPickerProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <span className="text-xs text-gray-400">Colors</span>
      <div className="relative h-20 w-20">
        {/* Background color (behind) */}
        <input
          type="color"
          value={rgbaToHex(background)}
          onChange={(e) => onBackgroundChange(hexToRgba(e.target.value, background.a))}
          className="absolute bottom-0 right-0 w-12 h-12 cursor-pointer border-2 border-white/20 rounded"
          title="Background Color"
        />
        {/* Foreground color (front) */}
        <input
          type="color"
          value={rgbaToHex(foreground)}
          onChange={(e) => onForegroundChange(hexToRgba(e.target.value, foreground.a))}
          className="absolute top-0 left-0 w-12 h-12 cursor-pointer border-2 border-white/20 rounded"
          title="Foreground Color"
        />
        {/* Swap button */}
        <button
          onClick={onSwap}
          className="absolute bottom-1 left-1 p-1 text-gray-400 hover:text-white"
          title="Swap Colors (X)"
        >
          <SwapIcon />
        </button>
        {/* Reset button */}
        <button
          onClick={onReset}
          className="absolute top-1 right-1 p-1 text-gray-400 hover:text-white"
          title="Reset Colors (D)"
        >
          <ResetIcon />
        </button>
      </div>
      {/* Opacity sliders */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-6">FG:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(foreground.a * 100)}
            onChange={(e) => onForegroundChange({ ...foreground, a: parseInt(e.target.value) / 100 })}
            className="flex-1"
          />
          <span className="text-xs text-gray-300 w-8">{Math.round(foreground.a * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-6">BG:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(background.a * 100)}
            onChange={(e) => onBackgroundChange({ ...background, a: parseInt(e.target.value) / 100 })}
            className="flex-1"
          />
          <span className="text-xs text-gray-300 w-8">{Math.round(background.a * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

// Brush settings panel
interface BrushSettingsPanelProps {
  settings: BrushSettings;
  onChange: (settings: Partial<BrushSettings>) => void;
}

function BrushSettingsPanel({ settings, onChange }: BrushSettingsPanelProps): React.ReactElement {
  return (
    <div className="space-y-3">
      <span className="text-xs font-medium text-gray-300">Brush</span>
      <SliderRow
        label="Size"
        value={settings.size}
        min={1}
        max={500}
        onChange={(v) => onChange({ size: v })}
      />
      <SliderRow
        label="Hardness"
        value={settings.hardness}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => onChange({ hardness: v })}
      />
      <SliderRow
        label="Opacity"
        value={settings.opacity}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => onChange({ opacity: v })}
      />
      <SliderRow
        label="Flow"
        value={settings.flow}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => onChange({ flow: v })}
      />
      <SliderRow
        label="Spacing"
        value={settings.spacing}
        min={1}
        max={200}
        suffix="%"
        onChange={(v) => onChange({ spacing: v })}
      />
      <SliderRow
        label="Smoothing"
        value={settings.smoothing}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => onChange({ smoothing: v })}
      />
    </div>
  );
}

// Eraser settings panel
interface EraserSettingsPanelProps {
  settings: EraserSettings;
  onChange: (settings: Partial<EraserSettings>) => void;
}

function EraserSettingsPanel({ settings, onChange }: EraserSettingsPanelProps): React.ReactElement {
  return (
    <div className="space-y-3">
      <span className="text-xs font-medium text-gray-300">Eraser</span>
      <SliderRow
        label="Size"
        value={settings.size}
        min={1}
        max={500}
        onChange={(v) => onChange({ size: v })}
      />
      <SliderRow
        label="Hardness"
        value={settings.hardness}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => onChange({ hardness: v })}
      />
      <SliderRow
        label="Opacity"
        value={settings.opacity}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => onChange({ opacity: v })}
      />
      <SliderRow
        label="Flow"
        value={settings.flow}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => onChange({ flow: v })}
      />
    </div>
  );
}

// Fill settings panel
interface FillSettingsPanelProps {
  settings: FillSettings;
  onChange: (settings: Partial<FillSettings>) => void;
}

function FillSettingsPanel({ settings, onChange }: FillSettingsPanelProps): React.ReactElement {
  return (
    <div className="space-y-3">
      <span className="text-xs font-medium text-gray-300">Fill</span>
      <SliderRow
        label="Tolerance"
        value={settings.tolerance}
        min={0}
        max={255}
        onChange={(v) => onChange({ tolerance: v })}
      />
      <CheckboxRow
        label="Contiguous"
        checked={settings.contiguous}
        onChange={(v) => onChange({ contiguous: v })}
      />
      <CheckboxRow
        label="Anti-alias"
        checked={settings.antiAlias}
        onChange={(v) => onChange({ antiAlias: v })}
      />
      <CheckboxRow
        label="All Layers"
        checked={settings.allLayers}
        onChange={(v) => onChange({ allLayers: v })}
      />
    </div>
  );
}

// Clone stamp settings panel
interface CloneStampSettingsPanelProps {
  settings: CloneStampSettings;
  onChange: (settings: Partial<CloneStampSettings>) => void;
}

function CloneStampSettingsPanel({ settings, onChange }: CloneStampSettingsPanelProps): React.ReactElement {
  return (
    <div className="space-y-3">
      <span className="text-xs font-medium text-gray-300">Clone Stamp</span>
      <SliderRow
        label="Size"
        value={settings.size}
        min={1}
        max={500}
        onChange={(v) => onChange({ size: v })}
      />
      <SliderRow
        label="Hardness"
        value={settings.hardness}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => onChange({ hardness: v })}
      />
      <SliderRow
        label="Opacity"
        value={settings.opacity}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => onChange({ opacity: v })}
      />
      <SliderRow
        label="Flow"
        value={settings.flow}
        min={0}
        max={100}
        suffix="%"
        onChange={(v) => onChange({ flow: v })}
      />
      <CheckboxRow
        label="Aligned"
        checked={settings.aligned}
        onChange={(v) => onChange({ aligned: v })}
      />
      <CheckboxRow
        label="All Layers"
        checked={settings.allLayers}
        onChange={(v) => onChange({ allLayers: v })}
      />
    </div>
  );
}

// Helper components
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

interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function CheckboxRow({ label, checked, onChange }: CheckboxRowProps): React.ReactElement {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-white/20 bg-gray-700"
      />
      <span className="text-xs text-gray-300">{label}</span>
    </label>
  );
}

// Icons
function SwapIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 4L20 20" />
    </svg>
  );
}
