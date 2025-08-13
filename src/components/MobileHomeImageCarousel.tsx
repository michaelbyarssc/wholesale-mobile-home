
import { OptimizedImageCarousel } from './optimized/OptimizedImageCarousel';

interface MobileHomeImage {
  id: string;
  image_url: string;
  image_type: string;
  alt_text: string | null;
  display_order: number;
}

interface MobileHomeImageCarouselProps {
  images: MobileHomeImage[];
  homeModel: string;
}

export const MobileHomeImageCarousel = ({ images, homeModel }: MobileHomeImageCarouselProps) => {
  return <OptimizedImageCarousel images={images} homeModel={homeModel} />;
};
