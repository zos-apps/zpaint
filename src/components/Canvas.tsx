/**
 * Canvas - Main drawing canvas with viewport controls
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { RasterEngine } from '../engine/RasterEngine';
import type { ViewState } from '../types';
import type { BaseTool, PointerEvent as ToolPointerEvent } from '../tools/BaseTool';

export interface CanvasProps {
  engine: RasterEngine | null;
  view: ViewState;
  tool: BaseTool | null;
  onViewChange: (view: Partial<ViewState>) => void;
  className?: string;
}

export function Canvas({
  engine,
  view,
  tool,
  onViewChange,
  className = '',
}: CanvasProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastPan = useRef({ x: 0, y: 0 });

  // Render composite to display canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !engine) return;

    const { zoom, panX, panY } = view;
    const { width, height } = engine.getSize();

    // Clear with checkerboard pattern (transparency indicator)
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw checkerboard for transparency
    const checkerSize = 8;
    ctx.fillStyle = '#252540';
    for (let y = 0; y < canvas.height; y += checkerSize * 2) {
      for (let x = 0; x < canvas.width; x += checkerSize * 2) {
        ctx.fillRect(x + panX % (checkerSize * 2), y + panY % (checkerSize * 2), checkerSize, checkerSize);
        ctx.fillRect(x + checkerSize + panX % (checkerSize * 2), y + checkerSize + panY % (checkerSize * 2), checkerSize, checkerSize);
      }
    }

    // Draw composite
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);
    ctx.imageSmoothingEnabled = zoom < 1;
    ctx.drawImage(engine.getCompositeCanvas(), 0, 0);
    ctx.restore();

    // Draw canvas border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panX - 0.5, panY - 0.5, width * zoom + 1, height * zoom + 1);
  }, [engine, view]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      render();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => observer.disconnect();
  }, [render]);

  // Re-render on engine changes
  useEffect(() => {
    if (!engine) return;
    const unsub = engine.subscribe(render);
    render();
    return unsub;
  }, [engine, render]);

  // Re-render on view changes
  useEffect(() => {
    render();
  }, [view, render]);

  // Convert screen coords to canvas coords
  const screenToCanvas = useCallback((screenX: number, screenY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (screenX - rect.left - view.panX) / view.zoom;
    const y = (screenY - rect.top - view.panY) / view.zoom;
    return { x, y };
  }, [view]);

  // Create tool event from mouse event
  const createToolEvent = useCallback((e: React.PointerEvent): ToolPointerEvent => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    return {
      x,
      y,
      pressure: e.pressure || 0.5,
      buttons: e.buttons,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
    };
  }, [screenToCanvas]);

  // Pointer handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);

    // Space+click or middle mouse = pan
    if (e.buttons === 4 || (e.buttons === 1 && e.altKey)) {
      setIsPanning(true);
      lastPan.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (tool) {
      tool.onPointerDown(createToolEvent(e));
      render();
    }
  }, [tool, createToolEvent, render]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      lastPan.current = { x: e.clientX, y: e.clientY };
      onViewChange({ panX: view.panX + dx, panY: view.panY + dy });
      return;
    }

    if (tool) {
      tool.onPointerMove(createToolEvent(e));
      render();
    }
  }, [tool, isPanning, view, onViewChange, createToolEvent, render]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (tool) {
      tool.onPointerUp(createToolEvent(e));
      render();
    }
  }, [tool, isPanning, createToolEvent, render]);

  // Wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(32, view.zoom * zoomFactor));

    // Zoom centered on mouse position
    const scale = newZoom / view.zoom;
    const newPanX = mouseX - (mouseX - view.panX) * scale;
    const newPanY = mouseY - (mouseY - view.panY) * scale;

    onViewChange({ zoom: newZoom, panX: newPanX, panY: newPanY });
  }, [view, onViewChange]);

  const cursor = isPanning ? 'grabbing' : tool?.getCursor() ?? 'crosshair';

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      />
    </div>
  );
}
