
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const ImageDataInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const clearAllImages = async () => {
    setIsLoading(true);
    console.log('Clearing all stock images from the database...');

    try {
      // Delete all existing images from the database
      const { error: deleteError } = await supabase
        .from('mobile_home_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all existing images

      if (deleteError) {
        console.error('Error clearing images:', deleteError);
      } else {
        console.log('Successfully cleared all stock images from the database');
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Error clearing images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      clearAllImages();
    }
  }, [isInitialized, isLoading]);

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 p-2 bg-red-50 rounded border">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Clearing stock images from database...</span>
        </div>
      </div>
    );
  }

  return null;
};
