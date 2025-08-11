// src/App.tsx
import React, { useEffect, useState } from 'react';
import { client } from './contentful';
import { DraggableGrid } from './components/DraggableGrid';
import './index.css';

type BlockData = {
  section: string;
  text: string;
  url?: string;
  bgColor: string;
  expandedText?: string;
  expandedImage?: string;
  size?: 'small' | 'medium' | 'large'; // NEW: per-block font size (used in section "two")
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

        const rawName = nameRes.items[0]?.fields.title;
        setTitle(rawName ?? '—');

        const data: BlockData[] = blockRes.items.map((item) => {
          const f = item.fields as any;
          return {
            section: f.section,
            text: f.text,
            url: f.url,
            bgColor: (f.color || '#eee').trim(),
            expandedText: f.expandedText || f.description,
            expandedImage: f.expandedImage?.fields?.file?.url,
            size: f.size as BlockData['size'], // "small" | "medium" | "large" | undefined
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

  // Group by section
  const bySection = blocks.reduce<Record<string, BlockData[]>>((acc, b) => {
    (acc[b.section] = acc[b.section] || []).push(b);
    return acc;
  }, {});

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  // Convert BlockData[] → JSX[]
  const makeItems = (arr: BlockData[], border?: string): React.ReactNode[] =>
    arr.map((b, i) => {
      const itemId = `${b.section}-${i}`;
      const isExpanded = expandedItems.has(itemId);
      const hasExpandedContent = Boolean(b.expandedText || b.expandedImage);

      // Apply per-item font size class ONLY for section "two" (defaults to medium)
      const sizeClass =
        b.section === 'two' ? `size-${b.size ?? 'medium'}` : '';

      return (
        <span
          key={i}
          className={`draggable-grid__item ${sizeClass}`}
          style={{
            backgroundColor: b.bgColor,
            ...(border ? { border } : {}), // apply border if provided
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (hasExpandedContent) toggleItem(itemId);
          }}
        >
          {b.text}

          {hasExpandedContent && (
            <div
              className={`draggable-grid__expandable ${
                isExpanded ? 'visible' : ''
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {b.expandedImage && (
                <img
                  src={
                    b.expandedImage.startsWith('//')
                      ? `https:${b.expandedImage}`
                      : b.expandedImage
                  }
                  alt="Expanded content"
                />
              )}
              {b.expandedText && <p>{b.expandedText}</p>}
            </div>
          )}
        </span>
      );
    });

  return (
    <div>
      <h1 className="app-title">{title}</h1>

      <div className="app-container">
        <DraggableGrid items={makeItems(bySection.one || [])} />
        {/* Section "two" gets a 1px black border and per-item size classes */}
        <DraggableGrid items={makeItems(bySection.two || [], '1px solid #000')} />
        <DraggableGrid items={makeItems(bySection.three || [])} />
      </div>
    </div>
  );
}
