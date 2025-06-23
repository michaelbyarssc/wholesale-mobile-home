
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const ImageDataInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');

  const clearAllImages = async () => {
    setIsLoading(true);
    console.log('Starting to clear all mobile home images...');

    try {
      setProgress('Deleting all mobile home images...');
      
      // Delete all images from the mobile_home_images table
      const { error: deleteError } = await supabase
        .from('mobile_home_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // This deletes all records

      if (deleteError) {
        console.error('Error deleting images:', deleteError);
        setProgress('Error occurred while deleting images');
        throw deleteError;
      }

      setProgress('All mobile home images deleted successfully');
      console.log('Successfully deleted all mobile home images');
      setIsInitialized(true);

    } catch (error) {
      console.error('Error clearing images:', error);
      setProgress('Error occurred during deletion');
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
      <div className="text-sm text-red-600 p-3 bg-red-50 rounded border">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <div className="font-medium">Deleting Mobile Home Images</div>
            <div className="text-xs text-red-500 mt-1">{progress}</div>
          </div>
        </div>
      </div>
    );
  }

  if (isInitialized) {
    return (
      <div className="text-sm text-green-600 p-2 bg-green-50 rounded border">
        ✓ All mobile home images have been deleted from the database
      </div>
    );
  }

  return null;
};
