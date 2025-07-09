
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit2, X, GripVertical } from 'lucide-react';
import { Draggable } from '@hello-pangea/dnd';
import { OptimizedImage } from '@/components/OptimizedImage';

interface MobileHomeImage {
  id: string;
  image_url: string;
  image_type: string;
  display_order: number;
  alt_text: string | null;
}

interface ImageItemProps {
  image: MobileHomeImage;
  index: number;
  editingLabel: string | null;
  labelText: string;
  onStartEditLabel: (imageId: string, currentLabel: string | null) => void;
  onSaveLabel: (imageId: string) => void;
  onCancelEditLabel: () => void;
  onLabelTextChange: (text: string) => void;
  onDeleteImage: (imageId: string) => void;
}

export const ImageItem = ({
  image,
  index,
  editingLabel,
  labelText,
  onStartEditLabel,
  onSaveLabel,
  onCancelEditLabel,
  onLabelTextChange,
  onDeleteImage
}: ImageItemProps) => {
  return (
    <Draggable key={image.id} draggableId={image.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`relative group border-2 rounded-lg p-3 bg-white transition-all ${
            snapshot.isDragging 
              ? 'shadow-xl border-blue-400 bg-blue-50 rotate-1 scale-105' 
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start space-x-3">
            {/* Enhanced Drag Handle */}
            <div
              {...provided.dragHandleProps}
              className={`flex-shrink-0 cursor-grab active:cursor-grabbing p-2 rounded-md transition-colors ${
                snapshot.isDragging 
                  ? 'bg-blue-200 text-blue-700' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
              }`}
              title="Drag to reorder"
            >
              <GripVertical className="h-5 w-5" />
            </div>
            
            {/* Image Preview */}
            <div className="flex-shrink-0 relative">
              <OptimizedImage
                src={image.image_url}
                alt={image.alt_text || ''}
                className="w-20 h-20 object-cover rounded-md border"
                aspectRatio="square"
                sizes="80px"
              />
              {index === 0 && (
                <div className="absolute -top-1 -left-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  Main
                </div>
              )}
            </div>
            
            {/* Image Info and Controls */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Image #{index + 1}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onStartEditLabel(image.id, image.alt_text)}
                    className="bg-blue-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                    title="Edit label"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onDeleteImage(image.id)}
                    className="bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Delete image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
              
              {editingLabel === image.id ? (
                <div className="space-y-2">
                  <Input
                    value={labelText}
                    onChange={(e) => onLabelTextChange(e.target.value)}
                    placeholder="Enter image label"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onSaveLabel(image.id)}
                      className="text-xs px-3 py-1 h-7"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onCancelEditLabel}
                      className="text-xs px-3 py-1 h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 truncate" title={image.alt_text || 'No label'}>
                  {image.alt_text || 'No label'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};
