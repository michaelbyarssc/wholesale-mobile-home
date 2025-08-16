import React, { useMemo, useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { OptimizedMobileHomeCard } from './OptimizedMobileHomeCard';
import { User } from '@supabase/supabase-js';
import { useViewportSize } from '@/hooks/useViewportSize';

import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type HomeOption = Database['public']['Tables']['home_options']['Row'];

interface MobileHomeImage {
  id: string;
  mobile_home_id: string;
  image_url: string;
  image_type: string;
  display_order: number;
  alt_text: string | null;
}

interface VirtualizedMobileHomesGridProps {
  homes: MobileHome[];
  homeImages: MobileHomeImage[];
  user?: User | null;
  cartItems: any[];
  pricingLoading: boolean;
  getHomePrice: (homeId: string) => number;
  isInComparison: (homeId: string) => boolean;
  isInWishlist: (homeId: string) => boolean;
  onAddToCart: (home: MobileHome) => void;
  onViewDetails: (homeId: string) => void;
  onQuickView: (home: MobileHome) => void;
  onAddToComparison: (home: MobileHome) => void;
  onRemoveFromComparison: (homeId: string) => void;
  onAddToWishlist: (home: MobileHome) => void;
  onRemoveFromWishlist: (homeId: string) => void;
}

interface CellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    homes: MobileHome[];
    homeImages: MobileHomeImage[];
    user?: User | null;
    cartItems: any[];
    pricingLoading: boolean;
    getHomePrice: (homeId: string) => number;
    isInComparison: (homeId: string) => boolean;
    isInWishlist: (homeId: string) => boolean;
    onAddToCart: (home: MobileHome) => void;
    onViewDetails: (homeId: string) => void;
    onQuickView: (home: MobileHome) => void;
    onAddToComparison: (home: MobileHome) => void;
    onRemoveFromComparison: (homeId: string) => void;
    onAddToWishlist: (home: MobileHome) => void;
    onRemoveFromWishlist: (homeId: string) => void;
    columnsPerRow: number;
  };
}

const Cell = React.memo(({ columnIndex, rowIndex, style, data }: CellProps) => {
  const {
    homes,
    homeImages,
    user,
    cartItems,
    pricingLoading,
    getHomePrice,
    isInComparison,
    isInWishlist,
    onAddToCart,
    onViewDetails,
    onQuickView,
    onAddToComparison,
    onRemoveFromComparison,
    onAddToWishlist,
    onRemoveFromWishlist,
    columnsPerRow
  } = data;

  const homeIndex = rowIndex * columnsPerRow + columnIndex;
  const home = homes[homeIndex];

  if (!home) {
    return <div style={style} />;
  }

  const homeImagesForHome = homeImages.filter(img => img.mobile_home_id === home.id);
  const isInCart = cartItems.some(item => item.mobileHome.id === home.id);

  return (
    <div style={{ ...style, padding: '8px' }}>
      <OptimizedMobileHomeCard
        home={home}
        images={homeImagesForHome}
        user={user}
        isInCart={isInCart}
        pricingLoading={pricingLoading}
        homePrice={getHomePrice(home.id)}
        isInComparison={isInComparison(home.id)}
        isInWishlist={isInWishlist(home.id)}
        onAddToCart={onAddToCart}
        onViewDetails={onViewDetails}
        onQuickView={onQuickView}
        onAddToComparison={onAddToComparison}
        onRemoveFromComparison={onRemoveFromComparison}
        onAddToWishlist={onAddToWishlist}
        onRemoveFromWishlist={onRemoveFromWishlist}
      />
    </div>
  );
});

Cell.displayName = 'Cell';

export const VirtualizedMobileHomesGrid = React.memo(({
  homes,
  homeImages,
  user,
  cartItems,
  pricingLoading,
  getHomePrice,
  isInComparison,
  isInWishlist,
  onAddToCart,
  onViewDetails,
  onQuickView,
  onAddToComparison,
  onRemoveFromComparison,
  onAddToWishlist,
  onRemoveFromWishlist
}: VirtualizedMobileHomesGridProps) => {
  const { width, isMobile, isTablet, isDesktop } = useViewportSize();
  
  // Responsive column calculation
  const columnsPerRow = useMemo(() => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    if (width >= 1024) return 4; // lg breakpoint for 4 columns
    return 3; // fallback for unexpected cases
  }, [isMobile, isTablet, isDesktop, width]);

  // Responsive sizing
  const { columnWidth, containerWidth, rowHeight } = useMemo(() => {
    const padding = 16; // 8px on each side
    const gap = 16; // gap between items
    
    if (isMobile) {
      return {
        columnWidth: Math.min(400, width - 32),
        containerWidth: Math.min(400, width - 32),
        rowHeight: 800
      };
    }
    
    const availableWidth = Math.min(width - 64, 1536); // max container width
    const totalGaps = (columnsPerRow - 1) * gap;
    const itemWidth = (availableWidth - totalGaps) / columnsPerRow;
    
    return {
      columnWidth: itemWidth,
      containerWidth: availableWidth,
      rowHeight: isTablet ? 700 : 650 // slightly shorter for desktop
    };
  }, [columnsPerRow, width, isMobile, isTablet]);

  const containerHeight = Math.min(600, Math.ceil(homes.length / columnsPerRow) * rowHeight);

  const itemData = useMemo(() => ({
    homes,
    homeImages,
    user,
    cartItems,
    pricingLoading,
    getHomePrice,
    isInComparison,
    isInWishlist,
    onAddToCart,
    onViewDetails,
    onQuickView,
    onAddToComparison,
    onRemoveFromComparison,
    onAddToWishlist,
    onRemoveFromWishlist,
    columnsPerRow
  }), [
    homes,
    homeImages,
    user,
    cartItems,
    pricingLoading,
    getHomePrice,
    isInComparison,
    isInWishlist,
    onAddToCart,
    onViewDetails,
    onQuickView,
    onAddToComparison,
    onRemoveFromComparison,
    onAddToWishlist,
    onRemoveFromWishlist,
    columnsPerRow
  ]);

  if (homes.length === 0) {
    return <div>No homes available</div>;
  }

  return (
    <div className="w-full">
      <Grid
        columnCount={columnsPerRow}
        columnWidth={columnWidth}
        height={containerHeight}
        rowCount={Math.ceil(homes.length / columnsPerRow)}
        rowHeight={rowHeight}
        width={containerWidth}
        itemData={itemData}
        overscanRowCount={2}
        style={{ margin: '0 auto' }}
      >
        {Cell}
      </Grid>
    </div>
  );
});

VirtualizedMobileHomesGrid.displayName = 'VirtualizedMobileHomesGrid';