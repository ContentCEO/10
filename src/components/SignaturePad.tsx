"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Eraser, Pen } from "lucide-react";

/*
 * Plan 1 / Section E / Idea #2 — Signature pad.
 *
 * Lightweight canvas-based signature capture. No external dependency.
 * Supports mouse + touch + stylus via pointer events.
 *
 *   const ref = useRef<SignaturePadHandle>(null);
 *   <SignaturePad ref={ref} />
 *   const dataUrl = ref.current?.toDataURL();
 */

export interface SignaturePadHandle {
  clear(): void;
  isEmpty(): boolean;
  toDataURL(): string;
}

export const SignaturePad = forwardRef<SignaturePadHandle, { height?: number }>(
  function SignaturePad({ height = 180 }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const drawingRef = useRef(false);
    const lastRef = useRef<{ x: number; y: number } | null>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    // Resize the canvas to match its CSS box, accounting for device pixel ratio.
    const fitCanvas = useCallback(() => {
      const c = canvasRef.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = c.getBoundingClientRect();
      c.width  = Math.floor(rect.width  * dpr);
      c.height = Math.floor(rect.height * dpr);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "#0f172a";
      ctxRef.current = ctx;
    }, []);

    useEffect(() => {
      fitCanvas();
      const handler = () => fitCanvas();
      window.addEventListener("resize", handler);
      return () => window.removeEventListener("resize", handler);
    }, [fitCanvas]);

    function pos(e: React.PointerEvent<HTMLCanvasElement>) {
      const rect = e.currentTarget.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function down(e: React.PointerEvent<HTMLCanvasElement>) {
      e.currentTarget.setPointerCapture(e.pointerId);
      drawingRef.current = true;
      lastRef.current = pos(e);
    }
    function move(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawingRef.current || !ctxRef.current || !lastRef.current) return;
      const p = pos(e);
      const ctx = ctxRef.current;
      ctx.beginPath();
      ctx.moveTo(lastRef.current.x, lastRef.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastRef.current = p;
      if (isEmpty) setIsEmpty(false);
    }
    function up() { drawingRef.current = false; lastRef.current = null; }

    useImperativeHandle(ref, () => ({
      clear() {
        const c = canvasRef.current; const ctx = ctxRef.current;
        if (!c || !ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        setIsEmpty(true);
      },
      isEmpty() { return isEmpty; },
      toDataURL() { return canvasRef.current?.toDataURL("image/png") ?? ""; },
    }), [isEmpty]);

    return (
      <div className="space-y-2">
        <div className="relative rounded-xl ring-1 ring-ink-200 bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onPointerLeave={up}
            style={{ width: "100%", height, touchAction: "none", cursor: "crosshair" }}
          />
          {isEmpty && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-ink-300 text-sm gap-2">
              <Pen className="h-4 w-4" /> Sign here
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const c = canvasRef.current; const ctx = ctxRef.current;
            if (!c || !ctx) return;
            ctx.clearRect(0, 0, c.width, c.height);
            setIsEmpty(true);
          }}
          className="text-xs text-ink-500 hover:text-ink-800 inline-flex items-center gap-1"
        >
          <Eraser className="h-3 w-3" /> Clear
        </button>
      </div>
    );
  }
);
