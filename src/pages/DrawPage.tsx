// src/pages/DrawPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useContent, type BlockData } from "../content/useContent";
import "../components/DraggableGrid.css"; // pill + outline styles
import "./DrawPage.css";                  // fullscreen draw layout

// ---------------- CONFIG ----------------
const SPAWN_THROTTLE = 200;   // ms between spawns
const BURST_COUNT = 1;       // how many per spawn event
const JITTER_RANGE = 500;     // pixel spread
const LIFETIME_MS = 10000;    // ms before pills fade/cleanup

const ALLOWED = new Set([
  "pad",
  "no-border",
  "outline",
  "size-small",
  "size-medium",
  "size-large",
]);

const normalizeURL = (u?: string) => {
  if (!u) return undefined;
  if (u.startsWith("//")) return `https:${u}`;
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (u.startsWith("www.")) return `https://${u}`;
  return u;
};

// ---------------- TYPES ----------------
type Spawn = {
  id: string;
  block: BlockData;
  x: number;
  y: number;
  createdAt: number;
};

// ---------------- COMPONENT ----------------
export default function DrawPage() {
  const { loading, title, blocks } = useContent();
  const [spawns, setSpawns] = useState<Spawn[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastSpawnRef = useRef(0);
  const nextIndexRef = useRef(0);

  const usable = useMemo(
    () =>
      blocks.filter(
        (b) =>
          b.section === "one" ||
          b.section === "two" ||
          b.section === "loose"
      ),
    [blocks]
  );

  useEffect(() => {
    const t = setInterval(() => {
      const now = performance.now();
      setSpawns((list) => list.filter((s) => now - s.createdAt < LIFETIME_MS));
    }, 400);
    return () => clearInterval(t);
  }, []);

  const spawnAt = useCallback(
    (x: number, y: number) => {
      if (!usable.length) return;

      const now = performance.now();
      if (now - lastSpawnRef.current < SPAWN_THROTTLE) return;
      lastSpawnRef.current = now;

      const newSpawns: Spawn[] = [];
      for (let i = 0; i < BURST_COUNT; i++) {
        const idx = (nextIndexRef.current++ + i) % usable.length;
        const block = usable[idx];
        const jitter = () => (Math.random() - 0.5) * JITTER_RANGE;
        const id = `${idx}-${now.toFixed(2)}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;

        newSpawns.push({
          id,
          block,
          x: x + jitter(),
          y: y + jitter(),
          createdAt: now,
        });
      }
      setSpawns((list) => [...list, ...newSpawns]);
    },
    [usable]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const host = canvasRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      spawnAt(e.clientX - rect.left, e.clientY - rect.top);
    },
    [spawnAt]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      const host = canvasRef.current;
      if (!t || !host) return;
      const rect = host.getBoundingClientRect();
      spawnAt(t.clientX - rect.left, t.clientY - rect.top);
    },
    [spawnAt]
  );

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return <div className="app-loading">Loading…</div>;

  return (
    <div className="draw-page">
      {/* Fullscreen canvas layer */}
      <div
        ref={canvasRef}
        className="draw-canvas"
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
        role="application"
        aria-label="Draw with blocks"
      >
        {spawns.map((s) => {
          const href =
            s.block.section === "two" ? normalizeURL(s.block.url) : undefined;
          const isHttp = href ? /^https?:/i.test(href) : false;
          const id = s.id;
          const isExpanded = expandedItems.has(id);
          const hasExpanded =
            Boolean(s.block.expandedText || s.block.expandedImage);

          const cmsClasses = (s.block.classes || [])
            .filter((c) => ALLOWED.has(c))
            .join(" ");
          const isLoose = s.block.section === "loose";

          const style: React.CSSProperties = {
            transform: `translate(${s.x}px, ${s.y}px)`,
            backgroundColor: s.block.bgColor,
            position: "absolute",
            left: 0,
            top: 0,
          };

          const content = (
            <>
              {s.block.imageUrl && !isLoose && (
                <img
                  src={s.block.imageUrl}
                  alt={s.block.imageAlt || s.block.text}
                  className="draggable-grid__icon"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {s.block.text}

              {hasExpanded && (
                <div
                  className={`detail-pill ${isExpanded ? "visible" : ""}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {s.block.expandedImage && (
                    <img
                      src={s.block.expandedImage}
                      alt=""
                      className="detail-pill__img"
                    />
                  )}
                  {s.block.expandedText && (
                    <p className="detail-pill__text">
                      {s.block.expandedText}
                    </p>
                  )}
                </div>
              )}
            </>
          );

          const className = `draggable-grid__item pill-with-detail ${cmsClasses}`.trim();

          if (href) {
            return (
              <a
                key={id}
                className={className}
                style={style}
                href={href}
                target={isHttp ? "_blank" : undefined}
                rel={isHttp ? "noopener noreferrer" : undefined}
                onClick={(e) => {
                  if (hasExpanded) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleItem(id);
                  }
                }}
              >
                {content}
              </a>
            );
          }

          return (
            <span
              key={id}
              className={className}
              style={style}
              onClick={(e) => {
                if (hasExpanded) {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleItem(id);
                }
              }}
            >
              {isExpanded && hasExpanded && (
                <button
                  type="button"
                  className="pill-close"
                  aria-label="Close details"
                  title="Close"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleItem(id);
                  }}
                >
                  <span>Close</span>
                </button>
              )}
              {content}
            </span>
          );
        })}
      </div>

      {/* Overlay title */}
      <h1 className="app-title draw-title">{title}</h1>
    </div>
  );
}
