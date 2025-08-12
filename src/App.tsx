// src/App.tsx
import React, { useEffect, useState } from 'react';
import { client } from './contentful';
import { DraggableGrid } from './components/DraggableGrid';
import EmojiPopper from './components/EmojiPopper';
import './index.css';

type BlockData = {
  section: string;
  text: string;
  url?: string;
  bgColor: string;

  // optional extras
  expandedText?: string;
  expandedImage?: string;

  // small icon inside the pill
  imageUrl?: string;
  imageAlt?: string;

  // presentation
  classes?: string[];   // CMS tokens: pad, no-border, outline, size-*
  order?: number;       // manual ordering number (lower = earlier)
};

type NameEntry = { title: string };

export default function App() {
  const [title, setTitle] = useState('Loading title…');
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const [nameRes, blockRes] = await Promise.all([
          client.getEntries<NameEntry>({ content_type: 'name', limit: 1 }),
          client.getEntries({ content_type: 'block', limit: 100 }),
        ]);

        setTitle(nameRes.items[0]?.fields.title ?? '—');

        const data: BlockData[] = blockRes.items.map((item: any) => {
          const f = item.fields as any;

          const iconRaw: string | undefined = f.image?.fields?.file?.url;
          const imageUrl =
            iconRaw && iconRaw.startsWith('//') ? `https:${iconRaw}` : iconRaw;

          const expandedRaw: string | undefined = f.expandedImage?.fields?.file?.url;
          const expandedImage =
            expandedRaw && expandedRaw.startsWith('//')
              ? `https:${expandedRaw}`
              : expandedRaw;

          let classes: string[] = [];
          if (Array.isArray(f.classes)) {
            classes = f.classes;
          } else if (typeof f.classes === 'string') {
            classes = f.classes
              .split(/[,\s]+/)
              .map((s: string) => s.trim())
              .filter(Boolean);
          } else if (Array.isArray(f.classTokens)) {
            classes = f.classTokens;
          }

          return {
            section: f.section,
            text: f.text,
            url: f.url,
            bgColor: (f.color || '#eee').trim(),
            expandedText: f.expandedText || f.description,
            expandedImage,
            imageUrl,
            imageAlt: f.image?.fields?.title || f.text,
            classes,
            order: typeof f.order === 'number' ? f.order : 9999,
          };
        });

        setBlocks(data);
      } catch (e) {
        console.error(e);
        setTitle('Error loading title');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="app-loading">Loading…</div>;

  // group by section
  const bySection = blocks.reduce<Record<string, BlockData[]>>((acc, b) => {
    (acc[b.section] = acc[b.section] || []).push(b);
    return acc;
  }, {});

  // sort inside each section by "order" then by "text"
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

  // allow ONLY these class tokens from CMS
  const ALLOWED = new Set([
    'pad',
    'no-border',
    'outline',
    'size-small',
    'size-medium',
    'size-large',
  ]);

  // Convert BlockData[] → JSX[]
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

      // ---------- NEW: section "one" renders a sibling detail pill ----------
      if (b.section === 'one') {
        const mainPill = (
          <span
            key={`${id}-main`}
            className={`draggable-grid__item ${cmsClasses}`.trim()}
            style={{
              backgroundColor: b.bgColor,
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (hasExpanded) toggleItem(id);
            }}
          >
            {b.imageUrl && (
              <img
                src={b.imageUrl}
                alt={b.imageAlt || b.text}
                className="draggable-grid__icon"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {b.text}
          </span>
        );

        const detailPill = hasExpanded ? (
          <span
            key={`${id}-detail`}
            className={`draggable-grid__item detail-pill ${isExpanded ? 'visible' : ''}`}
            style={{
              backgroundColor: b.bgColor,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {b.expandedImage && (
              <img src={b.expandedImage} alt="" className="detail-pill__img" />
            )}
            {b.expandedText && <p className="detail-pill__text">{b.expandedText}</p>}
          </span>
        ) : null;

        // return both pills as siblings so they appear "next to" each other
        return detailPill ? [mainPill, detailPill] : [mainPill];
      }
      // ---------- END section "one" special rendering ----------

      // Default rendering for sections "two" and "three"
      return [
        <span
          key={id}
          className={`draggable-grid__item ${cmsClasses}`.trim()}
          style={{
            backgroundColor: b.bgColor,
            ...(wantsBorder ? { border: defaultBorder } : {}),
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (hasExpanded) toggleItem(id);
          }}
        >
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
              className={`draggable-grid__expandable ${isExpanded ? 'visible' : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              {b.expandedImage && <img src={b.expandedImage} alt="" />}
              {b.expandedText && <p>{b.expandedText}</p>}
            </div>
          )}
        </span>,
      ];
    });

  return (
    <div>
      <EmojiPopper selector="body" size="5rem" durationMs={800} />
      <h1 className="app-title">{title}</h1>

      <div className="app-container">
        <div className="section section--one">
          <DraggableGrid items={makeItems(bySection.one || [])} />
        </div>

        <div className="section section--two">
          <DraggableGrid items={makeItems(bySection.two || [])} />
        </div>

        <div className="section section--three">
          <DraggableGrid items={makeItems(bySection.three || [])} />
        </div>
      </div>
    </div>
  );
}
