// src/pages/DrawPage.tsx  (your DrawPage file)
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
  return (
    v === "#fff" ||
    v === "#ffffff" ||
    v === "white" ||
    v === "rgb(255,255,255)"
  );
};

export default function DrawPage() {
  const navigate = useNavigate();
  const { loading, blocks, error, newsItems } = useContent();

  if (loading) return <div className="app-loading">Loading…</div>;
  if (error) return <div className="app-loading">Failed to load: {error}</div>;

  const tickerItems = (newsItems || []).sort(
    (a, b) =>
      (a.order ?? 9999) - (b.order ?? 9999) || a.text.localeCompare(b.text)
  );

  const hasNews = tickerItems.length > 0;

  const sectionTwoBlocks = (blocks || [])
    .filter((b) => b.section === "two")
    .sort(
      (a, b) =>
        (a.order ?? 9999) - (b.order ?? 9999) || a.text.localeCompare(b.text)
    );

  const items = sectionTwoBlocks.map((b, i) => {
    // ✅ Prefer PDF URL if present, fallback to normal url
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

    const className = ["draggable-grid__item", cmsClasses]
      .filter(Boolean)
      .join(" ");

    return (
      <a
        key={`two-${i}`}
        href={href || "#"}
        className={className}
        style={style}
        // ✅ Open PDFs in a new tab (browser PDF viewer allows download)
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

  const renderNewsItems = (list: typeof tickerItems, isClone: boolean) =>
    list.map((b, i) => {
      const href = normalizeURL(b.url);
      const isHttp = href ? /^https?:/i.test(href) : false;
      const key = `${isClone ? "clone" : "main"}-${i}`;
      const commonProps = {
        className: href
          ? "news-ticker__item news-ticker__link"
          : "news-ticker__item",
        "aria-hidden": isClone ? true : undefined,
      };

      if (href) {
        return (
          <a
            key={key}
            href={href}
            target={isHttp ? "_blank" : undefined}
            rel={isHttp ? "noopener noreferrer" : undefined}
            {...commonProps}
          >
            {b.text}
          </a>
        );
      }

      return (
        <span key={key} {...commonProps}>
          {b.text}
        </span>
      );
    });

  return (
    <div
      className="news-page"
      style={
        !hasNews
          ? ({ "--news-ticker-height": "0px" } as React.CSSProperties)
          : undefined
      }
    >
      {hasNews && (
        <div className="news-ticker" role="region" aria-label="News">
          <div className="news-ticker__track">
            {renderNewsItems(tickerItems, false)}
            {renderNewsItems(tickerItems, true)}
          </div>
        </div>
      )}

      <button
        type="button"
        className="info-nav-button draw-info-button"
        aria-label="Back to start"
        onClick={() => navigate("/")}
      >
        back
      </button>

      <div className="center-page draw-page-buttons">
        <div className="draggable-grid">
          {items.length > 0 ? (
            items
          ) : (
            <div className="app-loading">No items in section "two".</div>
          )}
        </div>
      </div>
    </div>
  );
}
