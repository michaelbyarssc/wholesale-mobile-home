import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction, TransactionStatus } from '@/types/transaction';
import { 
  CheckCircle, 
  CreditCard, 
  FileText, 
  Send, 
  Truck, 
  Archive,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  DollarSign
} from 'lucide-react';

interface TransactionQuickActionsProps {
  transaction: Transaction;
  onAction: (action: string, data?: any) => void;
  className?: string;
}

export function TransactionQuickActions({ 
  transaction, 
  onAction,
  className 
}: TransactionQuickActionsProps) {
  const getAvailableActions = () => {
    const actions = [];
    
    switch (transaction.status) {
      case 'draft':
        actions.push(
          { id: 'submit_estimate', label: 'Submit Estimate', icon: Send, variant: 'default' as const },
          { id: 'save_draft', label: 'Save Draft', icon: FileText, variant: 'outline' as const }
        );
        break;
        
      case 'estimate_submitted':
        actions.push(
          { id: 'approve_estimate', label: 'Approve Estimate', icon: CheckCircle, variant: 'default' as const },
          { id: 'request_changes', label: 'Request Changes', icon: MessageSquare, variant: 'outline' as const }
        );
        break;
        
      case 'estimate_approved':
        actions.push(
          { id: 'generate_invoice', label: 'Generate Invoice', icon: FileText, variant: 'default' as const },
          { id: 'schedule_delivery', label: 'Schedule Delivery', icon: Truck, variant: 'outline' as const }
        );
        break;
        
      case 'invoice_generated':
        actions.push(
          { id: 'record_payment', label: 'Record Payment', icon: CreditCard, variant: 'default' as const },
          { id: 'send_invoice', label: 'Send Invoice', icon: Send, variant: 'outline' as const }
        );
        break;
        
      case 'payment_partial':
        actions.push(
          { id: 'record_payment', label: 'Record Payment', icon: CreditCard, variant: 'default' as const },
          { id: 'send_reminder', label: 'Send Reminder', icon: Clock, variant: 'outline' as const }
        );
        break;
        
      case 'payment_complete':
        actions.push(
          { id: 'schedule_delivery', label: 'Schedule Delivery', icon: Truck, variant: 'default' as const },
          { id: 'mark_complete', label: 'Mark Complete', icon: CheckCircle, variant: 'outline' as const }
        );
        break;
        
      case 'delivery_scheduled':
        actions.push(
          { id: 'start_delivery', label: 'Start Delivery', icon: Truck, variant: 'default' as const },
          { id: 'update_schedule', label: 'Update Schedule', icon: Clock, variant: 'outline' as const }
        );
        break;
        
      case 'delivery_in_progress':
        actions.push(
          { id: 'complete_delivery', label: 'Complete Delivery', icon: CheckCircle, variant: 'default' as const },
          { id: 'update_status', label: 'Update Status', icon: MessageSquare, variant: 'outline' as const }
        );
        break;
        
      case 'delivery_complete':
        actions.push(
          { id: 'mark_complete', label: 'Mark Complete', icon: CheckCircle, variant: 'default' as const },
          { id: 'send_survey', label: 'Send Survey', icon: MessageSquare, variant: 'outline' as const }
        );
        break;
        
      default:
        break;
    }
    
    // Common actions available for most statuses
    if (!['completed', 'cancelled', 'expired'].includes(transaction.status)) {
      actions.push(
        { id: 'add_note', label: 'Add Note', icon: MessageSquare, variant: 'outline' as const },
        { id: 'contact_customer', label: 'Contact Customer', icon: Phone, variant: 'outline' as const }
      );
    }
    
    return actions;
  };

  const actions = getAvailableActions();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-500">No actions available for this transaction status.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant}
                size="sm"
                onClick={() => onAction(action.id)}
                className="justify-start"
              >
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        )}
        
        {/* Priority Actions */}
        <div className="border-t pt-3">
          <h4 className="text-sm font-medium mb-2">Priority Actions</h4>
          <div className="space-y-2">
            {transaction.balance_due > 0 && (
              <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-600">Outstanding Balance</span>
                </div>
                <Badge variant="destructive">
                  ${transaction.balance_due.toFixed(2)}
                </Badge>
              </div>
            )}
            
            {transaction.estimate_expires_at && new Date(transaction.estimate_expires_at) < new Date() && (
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-600">Estimate Expired</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onAction('renew_estimate')}
                >
                  Renew
                </Button>
              </div>
            )}
            
            {transaction.invoice_expires_at && new Date(transaction.invoice_expires_at) < new Date() && (
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-600">Invoice Expired</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onAction('renew_invoice')}
                >
                  Renew
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}