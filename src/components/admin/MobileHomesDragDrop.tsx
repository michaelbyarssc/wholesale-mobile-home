
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, GripVertical } from 'lucide-react';
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
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);

  const updateOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      const { error } = await supabase
        .from('mobile_homes')
        .upsert(updates, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Mobile homes order updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-mobile-homes'] });
      onRefetch();
    },
    onError: (error) => {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update mobile homes order.",
        variant: "destructive",
      });
    }
  });

  const handleDragEnd = (result: DropResult) => {
    setIsDragging(false);
    
    if (!result.destination) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) {
      return;
    }

    // Create a new array with the reordered items
    const reorderedHomes = Array.from(mobileHomes);
    const [removed] = reorderedHomes.splice(sourceIndex, 1);
    reorderedHomes.splice(destinationIndex, 0, removed);

    // Update display_order for all affected items
    const updates = reorderedHomes.map((home, index) => ({
      id: home.id,
      display_order: index + 1
    }));

    updateOrderMutation.mutate(updates);
  };

  const formatSize = (home: MobileHome) => {
    if (home.length_feet && home.width_feet) {
      return `${home.width_feet}x${home.length_feet}`;
    }
    return 'N/A';
  };

  const getHomeName = (home: MobileHome) => {
    return home.display_name || `${home.series} ${home.model}`;
  };

  const calculateCustomerPrice = (home: MobileHome, customerMarkup: number = 30) => {
    const baseCost = home.cost || home.price;
    const minimumProfit = home.minimum_profit || 0;
    
    const markupPrice = baseCost * (1 + customerMarkup / 100);
    const minimumPrice = baseCost + minimumProfit;
    
    return Math.max(markupPrice, minimumPrice);
  };

  return (
    <div className="overflow-x-auto">
      <DragDropContext onDragEnd={handleDragEnd} onDragStart={() => setIsDragging(true)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Series</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Cost (Internal)</TableHead>
              <TableHead>Min Profit</TableHead>
              <TableHead>Customer Price (30% markup)</TableHead>
              <TableHead>Sq Ft</TableHead>
              <TableHead>Bed/Bath</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <Droppable droppableId="mobile-homes">
            {(provided, snapshot) => (
              <TableBody
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={snapshot.isDraggingOver ? 'bg-blue-50' : ''}
              >
                {mobileHomes.map((home, index) => {
                  const customerPrice = calculateCustomerPrice(home, 30);
                  return (
                    <Draggable key={home.id} draggableId={home.id} index={index}>
                      {(provided, snapshot) => (
                        <TableRow
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`${
                            snapshot.isDragging ? 'bg-blue-100 shadow-lg' : ''
                          } ${isDragging && !snapshot.isDragging ? 'opacity-50' : ''}`}
                        >
                          <TableCell {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                          </TableCell>
                          <TableCell className="font-medium">{getHomeName(home)}</TableCell>
                          <TableCell>{formatSize(home)}</TableCell>
                          <TableCell>{home.manufacturer}</TableCell>
                          <TableCell>{home.series}</TableCell>
                          <TableCell>{home.model}</TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-gray-600">{formatPrice(home.cost || home.price)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-blue-600">{formatPrice(home.minimum_profit || 0)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-green-600">{formatPrice(customerPrice)}</span>
                          </TableCell>
                          <TableCell>{home.square_footage || 'N/A'}</TableCell>
                          <TableCell>
                            {home.bedrooms || 'N/A'}/{home.bathrooms || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              home.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {home.active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onEdit(home)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onToggleActive(home.id, home.active)}
                              >
                                {home.active ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => onDelete(home.id, getHomeName(home))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </TableBody>
            )}
          </Droppable>
        </Table>
      </DragDropContext>
    </div>
  );
};
