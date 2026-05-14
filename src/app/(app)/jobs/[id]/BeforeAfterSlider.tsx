"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { GitCompareArrows } from "lucide-react";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  phase: "before" | "during" | "after" | null;
}

export function BeforeAfterSlider({ photos }: { photos: Photo[] }) {
  const [pos, setPos] = useState(50);
  const before = photos.filter((p) => p.phase === "before");
  const after  = photos.filter((p) => p.phase === "after");
  const [beforeIdx, setBeforeIdx] = useState(0);
  const [afterIdx, setAfterIdx]   = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (before.length === 0 || after.length === 0) {
    return null; // need both phases to compare
  }

  const beforePhoto = before[beforeIdx] ?? before[0];
  const afterPhoto  = after[afterIdx]  ?? after[0];

  function onMove(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, pct)));
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-brand-600" /> Before / After
        </h2>
        <div className="text-[10px] text-ink-500 font-mono">
          drag the divider
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full aspect-video rounded-xl overflow-hidden ring-1 ring-ink-200/70 select-none cursor-ew-resize"
        onMouseMove={(e) => e.buttons === 1 && onMove(e.clientX)}
        onMouseDown={(e) => onMove(e.clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}>
        <img src={afterPhoto.url}  alt="After"  className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <img src={beforePhoto.url} alt="Before" className="w-screen max-w-none h-full object-cover" style={{ width: `${100 / (pos / 100)}%` }} />
        </div>
        <div className="absolute top-0 bottom-0 w-px bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.4)]"
             style={{ left: `${pos}%` }}>
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white ring-2 ring-brand-500 flex items-center justify-center shadow-lg">
            <GitCompareArrows className="h-4 w-4 text-brand-600" />
          </div>
        </div>
        <div className="absolute top-2 left-2 bg-ink-900/70 text-white text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded">
          Before
        </div>
        <div className="absolute top-2 right-2 bg-ink-900/70 text-white text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded">
          After
        </div>
      </div>

      {(before.length > 1 || after.length > 1) && (
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          {before.length > 1 && (
            <div>
              <div className="text-ink-500 mb-1">Before:</div>
              <div className="flex gap-1 overflow-x-auto">
                {before.map((p, i) => (
                  <button key={p.id}
                    onClick={() => setBeforeIdx(i)}
                    className={`w-12 h-12 rounded shrink-0 overflow-hidden ring-2 transition ${
                      i === beforeIdx ? "ring-brand-500" : "ring-ink-200"
                    }`}>
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {after.length > 1 && (
            <div>
              <div className="text-ink-500 mb-1">After:</div>
              <div className="flex gap-1 overflow-x-auto">
                {after.map((p, i) => (
                  <button key={p.id}
                    onClick={() => setAfterIdx(i)}
                    className={`w-12 h-12 rounded shrink-0 overflow-hidden ring-2 transition ${
                      i === afterIdx ? "ring-brand-500" : "ring-ink-200"
                    }`}>
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
