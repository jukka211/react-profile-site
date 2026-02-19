// src/pages/DrawPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useContent } from "../content/useContent";
import "./AudioDrawPage.css";
import "./DrawPage.css";

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
  return v === "#fff" || v === "#ffffff" || v === "white" || v === "rgb(255,255,255)";
};

// Palette for "random" pill colors
const PALETTE = ["#3AEA00", "#FF6A00", "#FFE500", "#3B9DFF", "#DF61BD", "#D5987C"];

// Stable hash -> consistent random-ish color per (eventId + text)
function hashToIndex(input: string, mod: number) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % mod;
}
function pillColor(eventId: string, text: string) {
  return PALETTE[hashToIndex(`${eventId}::${text}`, PALETTE.length)];
}

// Stable random size (small / large) per pill
function pillIsLarge(eventId: string, text: string) {
  return hashToIndex(`${eventId}::${text}::size`, 2) === 1;
}

export default function DrawPage() {
  const navigate = useNavigate();
  const { loading, error, blocks, eventPostings } = useContent();

  if (loading) return <div className="app-loading">Loading…</div>;
  if (error) return <div className="app-loading">Failed to load: {error}</div>;

  // CONTACT BUTTONS (same as before): section "two"
  const sectionTwoBlocks = (blocks || [])
    .filter((b) => b.section === "two")
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.text.localeCompare(b.text));

  const contactItems = sectionTwoBlocks.map((b, i) => {
    const href = normalizeURL(b.pdfUrl || b.url);
    const isPdf = !!href && /\.pdf(\?|#|$)/i.test(href);
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

    const className = ["draggable-grid__item", cmsClasses].filter(Boolean).join(" ");

    return (
      <a
        key={`contact-${i}`}
        href={href || "#"}
        className={className}
        style={style}
        target={isPdf || isHttp ? "_blank" : undefined}
        rel={isPdf || isHttp ? "noopener noreferrer" : undefined}
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

  const events = (eventPostings || [])
    .slice()
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

  return (
    <div className="draw-page">
      <div className="draw-topbar">
        <button
          type="button"
          className="info-nav-button draw-info-button"
          aria-label="Back to start"
          onClick={() => navigate("/")}
        >
          back
        </button>

        {/* Contact buttons, centered horizontally */}
        <div className="draggable-grid draw-contact-grid">{contactItems}</div>
      </div>


      {/* Event-Postings grid */}
      <div className="draw-events-wrap">
        {events.length === 0 ? (
          <div className="app-loading">No Event-Postings found.</div>
        ) : (
          <div className="event-grid" aria-label="Event postings">
            {events.map((ev) => {
              const href = normalizeURL(ev.url || undefined);
              const isHttp = href ? /^https?:/i.test(href) : false;

              // RULES:
              // - If image selected => image fills card, hide title + custom fields
              // - If no image => show centered title + pills (no image area)
              const hasImage = !!ev.imageUrl;

              const CardInner = (
                <div className={`event-card ${hasImage ? "is-image" : "is-text"}`}>
                  {hasImage ? (
                    <img
                      src={ev.imageUrl}
                      alt={ev.imageAlt || "Event image"}
                      className="event-card__imgFill"
                      loading="lazy"
                    />
                  ) : (
                    <div className="event-card__center">
                      {!!ev.title && <div className="event-title">{ev.title}</div>}
                      {!!ev.description && <div className="event-description">{ev.description}</div>}

                      {!!ev.customFields?.length && (
                        <div className="event-pills">
                          {ev.customFields.map((text, idx) => {
                            const large = pillIsLarge(ev.id, text);
                            return (
                              <span
                                key={`${ev.id}-cf-${idx}`}
                                className={`event-pill ${large ? "pill--large" : "pill--small"}`}
                                style={{ backgroundColor: pillColor(ev.id, text) }}
                              >
                                {text}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );

              if (href) {
                return (
                  <a
                    key={ev.id}
                    href={href}
                    className="event-cardLink"
                    target={isHttp ? "_blank" : undefined}
                    rel={isHttp ? "noopener noreferrer" : undefined}
                  >
                    {CardInner}
                  </a>
                );
              }

              return (
                <div key={ev.id} className="event-cardLink">
                  {CardInner}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
