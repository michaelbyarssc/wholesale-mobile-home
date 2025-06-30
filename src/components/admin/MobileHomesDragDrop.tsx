
import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface MobileHomesDragDropProps {
  mobileHomes: MobileHome[];
  onEdit: (home: MobileHome) => void;
  onDelete: (homeId: string, homeName: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onRefetch: () => void;
}

export const MobileHomesDragDrop = ({
  mobileHomes,
  onEdit,
  onDelete,
  onToggleActive,
  onRefetch
}: MobileHomesDragDropProps) => {
  const { toast } = useToast();

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(mobileHomes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display_order for all items
    const updates = items.map((item, index) => ({
      id: item.id,
      display_order: index + 1
    }));

    try {
      for (const update of updates) {
        const { error } = await supabase
          .from('mobile_homes')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      onRefetch();
      toast({
        title: "Success",
        description: "Mobile homes reordered successfully.",
      });
    } catch (error) {
      console.error('Error reordering mobile homes:', error);
      toast({
        title: "Error",
        description: "Failed to reorder mobile homes.",
        variant: "destructive",
      });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="mobile-homes">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
            {mobileHomes.map((home, index) => (
              <Draggable key={home.id} draggableId={home.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`border rounded-lg p-4 bg-white ${
                      snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="h-5 w-5 text-gray-400" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-lg">
                              {home.display_name || `${home.manufacturer} ${home.model}`}
                            </h3>
                            <Badge variant={home.active ? "default" : "secondary"}>
                              {home.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center space-x-4">
                              <span><strong>Series:</strong> {home.series}</span>
                              <span><strong>Model:</strong> {home.model}</span>
                              <span><strong>Manufacturer:</strong> {home.manufacturer}</span>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                              <span><strong>Internal Cost:</strong> {formatPrice(home.price)}</span>
                              <span><strong>Retail Price:</strong> 
                                <span className="font-medium text-blue-600 ml-1">
                                  {home.retail_price ? formatPrice(home.retail_price) : 'Not set'}
                                </span>
                              </span>
                              {home.minimum_profit > 0 && (
                                <span><strong>Min Profit:</strong> {formatPrice(home.minimum_profit)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onToggleActive(home.id, home.active)}
                        >
                          {home.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(home)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(home.id, home.display_name || `${home.manufacturer} ${home.model}`)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
