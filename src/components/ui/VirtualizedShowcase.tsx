import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useViewportSize } from '@/hooks/useViewportSize';

interface VirtualizedShowcaseProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  itemHeight?: number;
  overscan?: number;
  className?: string;
}

export const VirtualizedShowcase: React.FC<VirtualizedShowcaseProps> = ({
  items,
  renderItem,
  itemHeight = 600,
  overscan = 3,
  className = ''
}) => {
  const { height: viewportHeight } = useViewportSize();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const listHeight = useMemo(() => {
    return Math.min(viewportHeight * 0.8, itemHeight * Math.min(items.length, 6));
  }, [viewportHeight, itemHeight, items.length]);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      {renderItem(items[index], index)}
    </div>
  );

  if (items.length === 0) {
    return <div className={className}>No items to display</div>;
  }

  return (
    <div ref={containerRef} className={className}>
      <List
        height={listHeight}
        itemCount={items.length}
        itemSize={itemHeight}
        overscanCount={overscan}
        style={{ scrollBehavior: 'smooth' }}
      >
        {Row}
      </List>
    </div>
  );
};