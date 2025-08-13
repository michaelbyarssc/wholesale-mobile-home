import React, { useMemo, useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { OptimizedMobileHomeCard } from './OptimizedMobileHomeCard';
import { User } from '@supabase/supabase-js';

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
  const columnsPerRow = 1; // Single column for mobile-first approach
  const columnWidth = 400;
  const rowHeight = 800;
  const containerWidth = 400;
  const containerHeight = Math.min(600, homes.length * rowHeight);

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
    onRemoveFromWishlist
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