
import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Move, GripVertical } from 'lucide-react';

interface ImageUploadSectionProps {
  imagesCount: number;
  uploading: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ImageUploadSection = ({ 
  imagesCount, 
  uploading, 
  onFileUpload 
}: ImageUploadSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Images ({imagesCount}/40)</h3>
        <div className="relative">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
            onChange={onFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading || imagesCount >= 40}
          />
          <Button size="sm" disabled={uploading || imagesCount >= 40}>
            <Upload className="h-4 w-4 mr-1" />
            {uploading ? 'Converting & Uploading...' : 'Upload Images'}
          </Button>
        </div>
      </div>
      
      {imagesCount >= 40 && (
        <p className="text-sm text-amber-600">
          Maximum of 40 images reached. Delete some images to upload new ones.
        </p>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2 text-blue-700">
          <Upload className="h-4 w-4" />
          <span className="text-sm font-medium">Auto-conversion enabled:</span>
        </div>
        <div className="text-xs text-blue-600 mt-1 space-y-1">
          <p>• All images automatically converted to JPG format</p>
          <p>• Supports: JPG, PNG, WebP, GIF, AVIF uploads</p>
          <p>• Transparent backgrounds become white</p>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2 text-blue-700">
          <Move className="h-4 w-4" />
          <span className="text-sm font-medium">How to arrange images:</span>
        </div>
        <div className="text-xs text-blue-600 mt-1 space-y-1">
          <p>• Grab the <GripVertical className="inline h-3 w-3" /> handle to drag and reorder</p>
          <p>• First image becomes the main showcase photo</p>
          <p>• Drop zones will highlight in blue when dragging</p>
        </div>
      </div>
    </div>
  );
};
