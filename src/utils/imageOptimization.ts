// Image optimization utilities for delivery photos
import { toast } from "sonner";

export interface OptimizedImage {
  file: File;
  thumbnail: File;
  preview: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

// Compress image using Canvas API
export const compressImage = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Image compression failed'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Create thumbnail
export const createThumbnail = async (
  file: File,
  size: number = 150
): Promise<File> => {
  return compressImage(file, size, size, 0.7);
};

// Optimize delivery photo with progressive loading
export const optimizeDeliveryPhoto = async (file: File): Promise<OptimizedImage> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB');
    }

    const originalSize = file.size;

    // Compress main image (max 1920x1080, 80% quality)
    const optimizedFile = await compressImage(file, 1920, 1080, 0.8);
    
    // Create thumbnail (150x150, 70% quality)  
    const thumbnail = await createThumbnail(file, 150);

    // Create preview URL
    const preview = URL.createObjectURL(optimizedFile);

    const optimizedSize = optimizedFile.size;
    const compressionRatio = Math.round(((originalSize - optimizedSize) / originalSize) * 100);

    return {
      file: optimizedFile,
      thumbnail,
      preview,
      originalSize,
      optimizedSize,
      compressionRatio
    };

  } catch (error) {
    console.error('Image optimization failed:', error);
    throw error;
  }
};

// Progressive image loader component utility
export const createProgressiveImageLoader = (
  thumbnailSrc: string,
  fullImageSrc: string,
  onLoad?: () => void
) => {
  const img = new Image();
  
  img.onload = () => {
    onLoad?.();
  };
  
  img.src = fullImageSrc;
  
  return {
    thumbnailSrc,
    fullImageSrc,
    isLoading: true
  };
};

// Batch image processing for multiple photos
export const batchOptimizeImages = async (
  files: File[],
  onProgress?: (progress: number) => void
): Promise<OptimizedImage[]> => {
  const optimizedImages: OptimizedImage[] = [];
  
  for (let i = 0; i < files.length; i++) {
    try {
      const optimized = await optimizeDeliveryPhoto(files[i]);
      optimizedImages.push(optimized);
      
      const progress = Math.round(((i + 1) / files.length) * 100);
      onProgress?.(progress);
      
    } catch (error) {
      console.error(`Failed to optimize image ${files[i].name}:`, error);
      toast.error(`Failed to optimize ${files[i].name}`);
    }
  }
  
  return optimizedImages;
};

// Clean up blob URLs to prevent memory leaks
export const cleanupImageUrls = (urls: string[]) => {
  urls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
};