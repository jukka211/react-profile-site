import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useContent, type BlockData } from "../content/useContent";
import "../components/DraggableGrid.css";
import "./DrawPage.css";

// ---------------- CONFIG ----------------
const SPAWN_THROTTLE = 40;    // ms between bursts
const BURST_COUNT = 2;        // how many blocks per sound peak
const JITTER_RANGE = 120;     // pixel spread from random position
const LIFETIME_MS = 5000;     // block lifetime
const AUDIO_SENSITIVITY = 2; // lower = more reactive

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

type Spawn = {
  id: string;
  block: BlockData;
  x: number;
  y: number;
  createdAt: number;
};

// ---------------- COMPONENT ----------------
export default function AudioDrawPage() {
  const { loading, title, blocks } = useContent();
  const [spawns, setSpawns] = useState<Spawn[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const lastSpawnRef = useRef(0);
  const nextIndexRef = useRef(0);

  // only use certain sections
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

  // Cleanup old spawns
  useEffect(() => {
    const t = setInterval(() => {
      const now = performance.now();
      setSpawns((list) => list.filter((s) => now - s.createdAt < LIFETIME_MS));
    }, 400);
    return () => clearInterval(t);
  }, []);

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // 🎨 spawn logic
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

  // 🎤 setup mic input
  useEffect(() => {
    let animationFrame: number;

    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new AudioContext();

        // resume context on click/touch (autoplay policies)
        const resume = () => {
          if (audioCtx.state === "suspended") {
            audioCtx.resume();
            console.log("🎧 Audio context resumed");
          }
        };
        window.addEventListener("click", resume, { once: true });
        window.addEventListener("touchstart", resume, { once: true });

        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 512;
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;
        analyserRef.current = analyser;
        audioContextRef.current = audioCtx;

        const animate = () => {
          if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current)
            return;

          analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

          // calculate amplitude
          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            const val = dataArrayRef.current[i] - 128;
            sum += val * val;
          }
          const rms = Math.sqrt(sum / dataArrayRef.current.length);
          // console.log("RMS:", rms.toFixed(1));

          if (rms > AUDIO_SENSITIVITY) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = Math.random() * rect.width;
            const y = Math.random() * rect.height;
            spawnAt(x, y);
          }

          animationFrame = requestAnimationFrame(animate);
        };

        animate();
      } catch (err) {
        console.error("🎤 Microphone access failed:", err);
      }
    };

    setupAudio();
    return () => cancelAnimationFrame(animationFrame);
  }, [spawnAt]);

  if (loading) return <div className="app-loading">Loading…</div>;

  return (
    <div className="draw-page">
      <div ref={canvasRef} className="draw-canvas" role="application">
        {spawns.map((s) => {
          const id = s.id;
          const isExpanded = expandedItems.has(id);
          const hasExpanded =
            Boolean(s.block.expandedText || s.block.expandedImage);
          const cmsClasses = (s.block.classes || [])
            .filter((c) => ALLOWED.has(c))
            .join(" ");
          const isLoose = s.block.section === "loose";
          const href =
            s.block.section === "two" ? normalizeURL(s.block.url) : undefined;
          const isHttp = href ? /^https?:/i.test(href) : false;

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
                    <p className="detail-pill__text">{s.block.expandedText}</p>
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

      <h1 className="app-title draw-title">
        {title}       </h1>
    </div>
  );
}
