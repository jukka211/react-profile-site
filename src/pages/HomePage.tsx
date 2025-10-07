// src/pages/HomePage.tsx
import React, { useState } from 'react';
import { DraggableGrid } from '../components/DraggableGrid';
import EmojiPopper from '../components/EmojiPopper';
import { useContent } from '../content/useContent';
import type { BlockData } from '../content/useContent';
import '../index.css';

// Normalize whatever the CMS gives for links (http, tel, mailto, //, www.)
const normalizeURL = (u?: string) => {
  if (!u) return undefined;
  if (u.startsWith('//')) return `https:${u}`;
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (u.startsWith('www.')) return `https://${u}`;
  return u;
};

export default function HomePage() {
  // ⬇️ pulled from the shared content hook
  const { title, blocks, loading } = useContent();

  // ⬇️ page-local UI state (kept here)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  if (loading) return <div className="app-loading">Loading…</div>;

  const bySection = blocks.reduce<Record<string, BlockData[]>>((acc, b) => {
    (acc[b.section] = acc[b.section] || []).push(b);
    return acc;
  }, {});

  Object.values(bySection).forEach((arr) => {
    arr.sort(
      (a, b) =>
        (a.order ?? 9999) - (b.order ?? 9999) ||
        a.text.localeCompare(b.text)
    );
  });

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const ALLOWED = new Set([
    'pad',
    'no-border',
    'outline',
    'size-small',
    'size-medium',
    'size-large',
  ]);

  const makeItems = (arr: BlockData[], defaultBorder?: string): React.ReactNode[] =>
    arr.flatMap((b, i) => {
      const id = `${b.section}-${i}`;
      const isExpanded = expandedItems.has(id);
      const hasExpanded = Boolean(b.expandedText || b.expandedImage);

      const cmsClasses = (b.classes || [])
        .filter(c => ALLOWED.has(c))
        .join(' ');

      const hasNoBorder = cmsClasses.includes('no-border');
      const hasOutline  = cmsClasses.includes('outline');

      const wantsBorder =
        b.section === 'two' &&
        !hasNoBorder &&
        !hasOutline &&
        Boolean(defaultBorder);

      // Should this "loose" block reveal its CMS image on hover?
      const isLooseHover = b.section === 'loose' && !!b.imageUrl;

      // SECTION "one": pill + detail in one draggable item
      if (b.section === 'one') {
        return [
          <span
            key={`${id}-wrapper`}
            className={`draggable-grid__item pill-with-detail ${cmsClasses}`.trim()}
            style={{ ['--pill-bg' as any]: b.bgColor }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (hasExpanded) toggleItem(id);
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

            {b.imageUrl && (
              <img
                src={b.imageUrl}
                alt={b.imageAlt || b.text}
                className="draggable-grid__icon"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {b.text}

            {hasExpanded && (
              <div
                className={`detail-pill ${isExpanded ? 'visible' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                {b.expandedImage && (
                  <img src={b.expandedImage} alt="" className="detail-pill__img" />
                )}
                {b.expandedText && <p className="detail-pill__text">{b.expandedText}</p>}
              </div>
            )}
          </span>,
        ];
      }

      // OTHER SECTIONS
      return [
        (() => {
          const href = b.section === 'two' ? normalizeURL(b.url) : undefined;
          const isHttp = href ? /^https?:/i.test(href) : false;

          const itemClasses =
            `draggable-grid__item ${cmsClasses} ${isLooseHover ? 'has-hover-img' : ''}`.trim();

          const commonProps = {
            className: itemClasses,
            style: {
              backgroundColor: b.bgColor,
              ...(wantsBorder ? { border: defaultBorder } : {}),
            },
            // enable :focus-within CSS for keyboard users
            tabIndex: isLooseHover ? 0 : undefined,
          } as const;

          const content = (
            <>
              {/* Show the little icon normally, but NOT for the special loose hover block */}
              {b.imageUrl && !isLooseHover && (
                <img
                  src={b.imageUrl}
                  alt={b.imageAlt || b.text}
                  className="draggable-grid__icon"
                  onClick={(e) => e.stopPropagation()}
                />
              )}

              {b.text}

              {/* For the special loose block: reveal the CMS image inside the flow on hover/focus */}
              {isLooseHover && (
                <img
                  src={b.imageUrl!}
                  alt={b.imageAlt || ''}
                  className="loose-hover-img"
                />
              )}

              {hasExpanded && (
                <div
                  className={`draggable-grid__expandable ${isExpanded ? 'visible' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {b.expandedImage && <img src={b.expandedImage} alt="" />}
                  {b.expandedText && <p>{b.expandedText}</p>}
                </div>
              )}
            </>
          );

          // All "two" blocks render as <a>
          if (b.section === 'two') {
            if (!href && import.meta.env.DEV) {
                console.warn('Section "two" block missing URL:', b.text);
              }
              
            return (
              <a
                key={id}
                href={href || '#'}
                {...commonProps}
                target={isHttp ? '_blank' : undefined}
                rel={isHttp ? 'noopener noreferrer' : undefined}
              >
                {content}
              </a>
            );
          }

          // Non-link sections
          return (
            <span
              key={id}
              {...commonProps}
              onClick={(e) => {
                if (hasExpanded) {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleItem(id);
                }
              }}
            >
              {content}
            </span>
          );
        })(),
      ];
    });

  const LIMITS = { one: 3, loose: 10, two: 7 };

  const sectionOneItems = makeItems((bySection.one || []).slice(0, LIMITS.one));
  const looseBlockItems = makeItems((bySection.loose || []).slice(0, LIMITS.loose));
  const sectionTwoItems = makeItems((bySection.two || []).slice(0, LIMITS.two));

  const wrapAsBoardItems = (nodes: React.ReactNode[], keyPrefix: string) =>
    nodes.map((n, i) => (
      <div className="board-item" key={`${keyPrefix}-${i}`}>
        {n}
      </div>
    ));

  // Title: no hidden image anymore (just the H1)
  const titleItem = (
    <div className="board-item board-item--full" key="title">
      <div className="draggable-grid__item title-item">
        <div className="title-wrapper">
          <h1 className="app-title">{title}</h1>
        </div>
      </div>
    </div>
  );

  const outerItems: React.ReactNode[] = [
    titleItem,
    <div className="board-item" key="section-1">
      <div className="section section--one">
        <DraggableGrid items={sectionOneItems} />
      </div>
    </div>,
    ...wrapAsBoardItems(looseBlockItems, 'loose'),
    <div className="board-item" key="section-2">
      <div className="section section--two-inner">
        <DraggableGrid items={sectionTwoItems} />
      </div>
    </div>,
  ];

  return (
    <div>
      <EmojiPopper selector="body" size="5rem" durationMs={800} />
      <div className="app-container">
        <div className="section section--board">
          <DraggableGrid
            items={outerItems}
            draggableSelector=".board-item"
          />
        </div>
      </div>
    </div>
  );
}
