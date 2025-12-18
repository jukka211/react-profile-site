// src/components/DraggableGrid.tsx
import React, { useEffect, useRef } from 'react';
import Sortable from 'sortablejs';
import './DraggableGrid.css';

type Props = { items: React.ReactNode[] };

export const DraggableGrid: React.FC<Props> = ({ items }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const s = Sortable.create(ref.current, { animation: 200 });
    return () => s.destroy();
  }, []);

  return (
    <div
      className="draggable-grid"   // 👈 container class (NOT __item)
      ref={ref}
      style={{
        width: '100%',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',   // try 'space-between' if you want full row spread
        alignItems: 'flex-start',
        gap: '6px',
        margin: '0',
        padding: '0',
      }}
    >
      {items}
    </div>
  );
};
