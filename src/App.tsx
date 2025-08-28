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
  expandedText?: string;
  expandedImage?: string;
  imageUrl?: string;
  imageAlt?: string;
  classes?: string[];
  order?: number;
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

      // SECTION "one": pill + detail in one draggable item (adds close button when open)
  // SECTION "one": pill + detail in one draggable item
if (b.section === 'one') {
  return [
    <span
      key={`${id}-wrapper`}
      className={`draggable-grid__item pill-with-detail ${cmsClasses}`.trim()}
      style={{ ['--pill-bg' as any]: b.bgColor }}     // << pass color via CSS var
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hasExpanded) toggleItem(id);
      }}
    >
      {/* Close button (only when expanded) */}
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
        ><span>Close</span>
        </button>
      )}

      {/* Main pill */}
      {b.imageUrl && (
        <img
          src={b.imageUrl}
          alt={b.imageAlt || b.text}
          className="draggable-grid__icon"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {b.text}

      {/* Inline expandable: keep transparent so it doesn't paint a rectangle */}
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


      // Other sections
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

  const LIMITS = {
    one: 3,
    loose: 10,
    two: 7,
  };

  const sectionOneItems = makeItems((bySection.one   || []).slice(0, LIMITS.one));
  const looseBlockItems = makeItems((bySection.loose || []).slice(0, LIMITS.loose));
  const sectionTwoItems = makeItems((bySection.two   || []).slice(0, LIMITS.two));

  const wrapAsBoardItems = (nodes: React.ReactNode[], keyPrefix: string) =>
    nodes.map((n, i) => (
      <div className="board-item" key={`${keyPrefix}-${i}`}>
        {n}
      </div>
    ));

  const outerItems: React.ReactNode[] = [
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
      <h1 className="app-title">{title}</h1>

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
