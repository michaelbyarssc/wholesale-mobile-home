
import React from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { Image } from 'lucide-react';
import { ImageItem } from './ImageItem';

interface MobileHomeImage {
  id: string;
  image_url: string;
  image_type: string;
  display_order: number;
  alt_text: string | null;
}

interface ImageListSectionProps {
  images: MobileHomeImage[];
  editingLabel: string | null;
  labelText: string;
  onImageDragEnd: (result: DropResult) => void;
  onStartEditLabel: (imageId: string, currentLabel: string | null) => void;
  onSaveLabel: (imageId: string) => void;
  onCancelEditLabel: () => void;
  onLabelTextChange: (text: string) => void;
  onDeleteImage: (imageId: string) => void;
}

export const ImageListSection = ({
  images,
  editingLabel,
  labelText,
  onImageDragEnd,
  onStartEditLabel,
  onSaveLabel,
  onCancelEditLabel,
  onLabelTextChange,
  onDeleteImage
}: ImageListSectionProps) => {
  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <div className="text-center text-gray-500">
          <Image className="h-8 w-8 mx-auto mb-2" />
          <span className="text-sm">No images uploaded</span>
          <p className="text-xs text-gray-400 mt-1">Upload up to 40 images</p>
          <p className="text-xs text-gray-400">Auto-converts to JPG format</p>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onImageDragEnd}>
      <Droppable droppableId="images">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`space-y-3 max-h-96 overflow-y-auto p-2 rounded-lg transition-colors ${
              snapshot.isDraggingOver ? 'bg-blue-100 border-2 border-blue-300 border-dashed' : 'bg-gray-50'
            }`}
          >
            {images.map((image, index) => (
              <ImageItem
                key={image.id}
                image={image}
                index={index}
                editingLabel={editingLabel}
                labelText={labelText}
                onStartEditLabel={onStartEditLabel}
                onSaveLabel={onSaveLabel}
                onCancelEditLabel={onCancelEditLabel}
                onLabelTextChange={onLabelTextChange}
                onDeleteImage={onDeleteImage}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
