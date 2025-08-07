// src/components/DraggableGrid.tsx
import React, { useEffect, useRef, ReactElement } from 'react';
import Sortable from 'sortablejs';
import './DraggableGrid.css';  // ← make sure this line is here

type DraggableGridProps = {
  children: React.ReactNode[];
};

export const DraggableGrid: React.FC<Props> = ({ items }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const s = Sortable.create(ref.current, { animation: 150 });
    return () => s.destroy();
  }, []);

  return (
<div 
   className="draggable-grid__item"
  ref={ref}
  style={{

    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',  // ← add this
    alignItems: 'center',      // ← optional, for vertical centering
    gap: '0px',
    margin: '0px 0'
  }}
>
  {items}
</div>

  );
};
