// src/App.tsx
import React, { useEffect, useState } from 'react';
import { client } from './contentful';
import { DraggableGrid } from './components/DraggableGrid';

type BlockData = { section: string; text: string; url?: string; bgColor: string };
type NameEntry = { title: string };

export default function App() {
  const [title, setTitle] = useState('Loading title…');
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [nameRes, blockRes] = await Promise.all([
          client.getEntries<NameEntry>({ content_type: 'name', limit: 1 }),
          client.getEntries({ content_type: 'block', limit: 100 }),
        ]);
        const rawName = nameRes.items[0]?.fields.title;
        setTitle(rawName ?? '—');

        const data = blockRes.items.map(item => {
          const f = item.fields as any;
          return {
            section: f.section,
            text:    f.text,
            url:     f.url,
            bgColor: (f.color || '#eee').trim(),
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

  if (loading) return <div style={{ textAlign:'center', marginTop:40 }}>Loading…</div>;

  const bySection = blocks.reduce<Record<string, BlockData[]>>((acc, b) => {
    (acc[b.section] = acc[b.section] || []).push(b);
    return acc;
  }, {});

  // Convert BlockData[] → JSX[]
  const makeItems = (arr: BlockData[]) =>
    arr.map((b, i) => (
      <span  className="draggable-grid__item"
        key={i}
        style={{
          backgroundColor: b.bgColor,
          padding: '8px 16px',
        
          display: 'inline-block',
        }}
      >
        {b.text}
      </span>
    ));

  return (
    <div>
      <h1
        style={{
          whiteSpace: 'pre-line',
          width: '100%',
          textAlign: 'center',
         
          fontWeight: 200,
     
          boxSizing: 'border-box',
        }}
      >
        {title}
      </h1>

      <div style={{ maxWidth:800, margin:'0 auto', padding:0 }}>
        <DraggableGrid items={makeItems(bySection.one || [])} />
        <DraggableGrid items={makeItems(bySection.two || [])} />
        <DraggableGrid items={makeItems(bySection.three || [])} />
      </div>
    </div>
  );
}
