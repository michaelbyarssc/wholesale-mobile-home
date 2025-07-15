import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Transaction, TransactionStatus } from '@/types/transaction';
import { CheckSquare, Square, MoreHorizontal, Check, X, Archive, Send } from 'lucide-react';

interface TransactionBulkActionsProps {
  transactions: Transaction[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onBulkAction: (action: string, transactionIds: string[]) => void;
  className?: string;
}

export function TransactionBulkActions({
  transactions,
  selectedIds,
  onSelectionChange,
  onBulkAction,
  className
}: TransactionBulkActionsProps) {
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');

  const allSelected = transactions.length > 0 && selectedIds.length === transactions.length;
  const someSelected = selectedIds.length > 0;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(transactions.map(t => t.id));
    }
  };

  const handleBulkAction = () => {
    if (selectedAction && selectedIds.length > 0) {
      onBulkAction(selectedAction, selectedIds);
      setBulkActionDialogOpen(false);
      setSelectedAction('');
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'bulk_approve':
        return 'Approve Selected';
      case 'bulk_invoice':
        return 'Generate Invoices';
      case 'bulk_archive':
        return 'Archive Selected';
      case 'bulk_export':
        return 'Export Selected';
      default:
        return action;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'bulk_approve':
        return <Check className="h-4 w-4" />;
      case 'bulk_invoice':
        return <Send className="h-4 w-4" />;
      case 'bulk_archive':
        return <Archive className="h-4 w-4" />;
      case 'bulk_export':
        return <Send className="h-4 w-4" />;
      default:
        return <MoreHorizontal className="h-4 w-4" />;
    }
  };

  const bulkActions = [
    { value: 'bulk_approve', label: 'Approve Estimates', icon: Check },
    { value: 'bulk_invoice', label: 'Generate Invoices', icon: Send },
    { value: 'bulk_archive', label: 'Archive Transactions', icon: Archive },
    { value: 'bulk_export', label: 'Export to CSV', icon: Send },
  ];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Select All Checkbox */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={handleSelectAll}
          className="h-4 w-4"
        />
        <span className="text-sm text-gray-600">
          {someSelected ? `${selectedIds.length} selected` : 'Select all'}
        </span>
      </div>

      {/* Bulk Actions */}
      {someSelected && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedIds.length} transaction{selectedIds.length !== 1 ? 's' : ''} selected
          </Badge>
          
          <Dialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Bulk Actions
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Actions</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Select an action to perform on {selectedIds.length} transaction{selectedIds.length !== 1 ? 's' : ''}:
                  </p>
                  <Select value={selectedAction} onValueChange={setSelectedAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an action" />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkActions.map(action => (
                        <SelectItem key={action.value} value={action.value}>
                          <div className="flex items-center gap-2">
                            <action.icon className="h-4 w-4" />
                            {action.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedAction && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-2">
                      {getActionLabel(selectedAction)}
                    </p>
                    <p className="text-sm text-gray-600">
                      This action will be applied to {selectedIds.length} selected transaction{selectedIds.length !== 1 ? 's' : ''}. 
                      This action cannot be undone.
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setBulkActionDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkAction}
                    disabled={!selectedAction}
                    className="flex-1"
                  >
                    {getActionIcon(selectedAction)}
                    Execute Action
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}