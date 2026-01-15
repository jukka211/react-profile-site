// src/pages/AudioDrawPage.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useContent, type BlockData } from "../content/useContent";

import { useNavigate } from "react-router-dom";

import "./AudioDrawPage.css";


// ---------------- CONFIG ----------------
const SPAWN_THROTTLE = 50; // ms between bursts
const BURST_COUNT = 1; // how many blocks/emojis per sound peak
const JITTER_RANGE = 220; // pixel spread from random position
const LIFETIME_MS = 5000; // block + emoji lifetime
const AUDIO_SENSITIVITY = 1.5; // RMS threshold - typical speech/sound is 20-50, silence is ~0-5

// no borders anymore
const ALLOWED = new Set(["pad", "size-small", "size-medium", "size-large"]);

const EMOJIS = [
  "💬",
  "💭",
  "💯",
  "😂",
  "😀",
  "🐝",
  "😆",
  "💛",
  "😃",
  "✅",
  "🎈",
  "👏",
  "🎯",
  "💡",
];

const EMOJI_SIZES_REM = [6.5]; // 2rem, 5rem, 10rem

const normalizeURL = (u?: string) => {
  if (!u) return undefined;
  if (u.startsWith("//")) return `https:${u}`;
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (u.startsWith("www.")) return `https://${u}`;
  return u;
};

const isWhiteColor = (c?: string | null) => {
  if (!c) return false;
  const v = c.trim().toLowerCase();
  return (
    v === "#fff" ||
    v === "#ffffff" ||
    v === "white" ||
    v === "rgb(255,255,255)"
  );
};

type Spawn = {
  id: string;
  block: BlockData;
  x: number;
  y: number;
  createdAt: number;
};

type EmojiSpawn = {
  id: string;
  emoji: string;
  x: number;
  y: number;
  sizeRem: number;
  createdAt: number;
};

export default function AudioDrawPage() {
  const navigate = useNavigate(); // ✅ hook inside component

  const { loading, title, blocks, infoCards } = useContent();

  const [showInfo, setShowInfo] = useState(false);

  const [spawns, setSpawns] = useState<Spawn[]>([]);
  const [emojiSpawns, setEmojiSpawns] = useState<EmojiSpawn[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const canvasRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const lastSpawnRef = useRef(0);
  const nextIndexRef = useRef(0);

  const usable = useMemo(() => blocks, [blocks]);

  // Cleanup old spawns (pills + emojis)
  useEffect(() => {
    const t = setInterval(() => {
      const now = performance.now();
      setSpawns((list) => list.filter((s) => now - s.createdAt < LIFETIME_MS));
      setEmojiSpawns((list) =>
        list.filter((e) => now - e.createdAt < LIFETIME_MS)
      );
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

  // 🎨 pill + emoji spawn logic
  const spawnAt = useCallback(
    (x: number, y: number) => {
      if (!usable?.length || !canvasRef.current) return;

      const now = performance.now();
      if (now - lastSpawnRef.current < SPAWN_THROTTLE) return;
      lastSpawnRef.current = now;

      const rect = canvasRef.current.getBoundingClientRect();
      const jitter = () => (Math.random() - 0.5) * JITTER_RANGE;

      // Alternate between spawning a text block or an emoji (not both)
      const spawnTextBlock = Math.random() > 0.5;

      if (spawnTextBlock) {
        const idx = nextIndexRef.current++ % usable.length;
        const block = usable[idx];

        const pillX = Math.random() * rect.width + jitter();
        const pillY = Math.random() * rect.height + jitter();

        const pillId = `${idx}-${now.toFixed(2)}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;

        setSpawns((list) => [
          ...list,
          { id: pillId, block, x: pillX, y: pillY, createdAt: now },
        ]);
      } else {
        const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        const emojiId = `${emoji}-${now.toFixed(2)}-${Math.random()
          .toString(36)
          .slice(2, 7)}`;

        const emojiX = Math.random() * rect.width + jitter();
        const emojiY = Math.random() * rect.height + jitter();
        const sizeRem =
          EMOJI_SIZES_REM[
            Math.floor(Math.random() * EMOJI_SIZES_REM.length)
          ];

        setEmojiSpawns((list) => [
          ...list,
          { id: emojiId, emoji, x: emojiX, y: emojiY, sizeRem, createdAt: now },
        ]);
      }
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
          if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) {
            animationFrame = requestAnimationFrame(animate);
            return;
          }

          analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

          // calculate amplitude
          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            const val = dataArrayRef.current[i] - 128;
            sum += val * val;
          }
          const rms = Math.sqrt(sum / dataArrayRef.current.length);

          if (rms > AUDIO_SENSITIVITY) {
            spawnAt(0, 0);
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

  // ---------------- INFO VIEW (old HomePage) ----------------
  if (showInfo) {
    const sectionTwoBlocks = (blocks || [])
      .filter((b) => b.section === "two")
      .sort(
        (a, b) =>
          (a.order ?? 9999) - (b.order ?? 9999) ||
          a.text.localeCompare(b.text)
      );

    const sectionTwoItems = sectionTwoBlocks.map((b, i) => {
      const href = normalizeURL(b.url);
      const isHttp = href ? /^https?:/i.test(href) : false;
      const cmsClasses = (b.classes || []).join(" ");

      const white = isWhiteColor(b.bgColor);

      const style: React.CSSProperties = {
        ...(white
          ? { backgroundColor: "rgba(255, 255, 255, 0.9)" }
          : b.bgColor
          ? { backgroundColor: b.bgColor }
          : {}),
      };

      const className = ["draggable-grid__item", cmsClasses]
        .filter(Boolean)
        .join(" ");

      return (
        <a
          key={`two-${i}`}
          href={href || "#"}
          className={className}
          style={style}
          target={isHttp ? "_blank" : undefined}
          rel={isHttp ? "noopener noreferrer" : undefined}
        >
          {b.imageUrl && (
            <img
              src={b.imageUrl}
              alt={b.imageAlt || b.text}
              className="draggable-grid__icon"
            />
          )}
          {b.text}
        </a>
      );
    });

    return (
      <div>
        <nav className="top-nav">
          <button
            onClick={() => setShowInfo(false)}
            className="reload-btn"
            title="Back to audio"
          >
            back
          </button>
        </nav>

        <div className="app-container">
          <h1 className="app-title">{title}</h1>

          <div className="draggable-grid">{sectionTwoItems}</div>

          <section className="info-section">
            {infoCards?.map((c, i) => (
              <article className="info-card" key={`info-${i}`}>
                <h2 className="info-title">{c.title}</h2>
                {c.body && <p className="info-body">{c.body}</p>}
              </article>
            ))}
          </section>
        </div>
      </div>
    );
  }

  // ---------------- AUDIO VIEW (with emojis) ----------------
  return (
    <div className="draw-page">
      <button
        type="button"
        className="info-nav-button"
        aria-label="Show Info"
        onClick={() => navigate("/draw")}
      >
        info
      </button>

      <div ref={canvasRef} className="draw-canvas" role="application">
        {spawns.map((s) => {
          const id = s.id;
          const isExpanded = expandedItems.has(id);
          const hasExpanded = Boolean(s.block.expandedText || s.block.expandedImage);

          const cmsClasses = (s.block.classes || [])
            .filter((c) => ALLOWED.has(c))
            .join(" ");

          const isLoose = s.block.section === "loose";
          const href = s.block.section === "two" ? normalizeURL(s.block.url) : undefined;
          const isHttp = href ? /^https?:/i.test(href) : false;

          const white = isWhiteColor(s.block.bgColor);

          const style: React.CSSProperties = {
            transform: `translate(${s.x}px, ${s.y}px)`,
            position: "absolute",
            left: 0,
            top: 0,
            ...(white
              ? { backgroundColor: "rgba(255, 255, 255)" }
              : s.block.bgColor
              ? { backgroundColor: s.block.bgColor }
              : {}),
          };

          const className = ["draggable-grid__item", "pill-with-detail", cmsClasses]
            .filter(Boolean)
            .join(" ");

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
                    <img src={s.block.expandedImage} alt="" className="detail-pill__img" />
                  )}
                  {s.block.expandedText && (
                    <p className="detail-pill__text">{s.block.expandedText}</p>
                  )}
                </div>
              )}
            </>
          );

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

        {emojiSpawns.map((e) => (
          <span
            key={e.id}
            className="emoji-pop"
            style={{
              position: "absolute",
              left: `${e.x}px`,
              top: `${e.y}px`,
              pointerEvents: "none",
              lineHeight: 1,
              opacity: 1,
              transition: "none",
              animation: "none",
            }}
          >
            {e.emoji}
          </span>
        ))}
      </div>

      <h1 className="app-title draw-title">{title}</h1>
    </div>
  );
}
