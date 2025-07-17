import { useParams } from 'react-router-dom';
import { useTransactionDetails } from '@/hooks/useTransactionDetails';
import { useTransactionRealtime } from '@/hooks/useTransactionRealtime';
import { TransactionStatus } from '@/types/transaction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  Clock, 
  DollarSign, 
  FileText, 
  MessageSquare, 
  Plus,
  History,
  CreditCard,
  Truck,
  User,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';

const statusColors: Record<TransactionStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  estimate_submitted: 'bg-blue-100 text-blue-800',
  estimate_approved: 'bg-green-100 text-green-800',
  invoice_generated: 'bg-purple-100 text-purple-800',
  payment_partial: 'bg-yellow-100 text-yellow-800',
  payment_complete: 'bg-green-100 text-green-800',
  delivery_scheduled: 'bg-orange-100 text-orange-800',
  delivery_in_progress: 'bg-orange-100 text-orange-800',
  delivery_complete: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  expired: 'bg-red-100 text-red-800',
};

const statusLabels: Record<TransactionStatus, string> = {
  draft: 'Draft',
  estimate_submitted: 'Estimate Submitted',
  estimate_approved: 'Estimate Approved',
  invoice_generated: 'Invoice Generated',
  payment_partial: 'Partial Payment',
  payment_complete: 'Payment Complete',
  delivery_scheduled: 'Delivery Scheduled',
  delivery_in_progress: 'Delivery In Progress',
  delivery_complete: 'Delivery Complete',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export default function TransactionDetails() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteInternal, setNoteInternal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'cash',
    paymentReference: '',
    notes: ''
  });

  const {
    transaction,
    stageHistory,
    notes,
    payments,
    isLoading,
    approveTransaction,
    transitionStage,
    addPayment,
    addNote,
  } = useTransactionDetails(transactionId!);

  // Enable real-time updates for this transaction
  useTransactionRealtime(transactionId);

  const handleApprove = () => {
    approveTransaction.mutate();
  };

  const handleStatusChange = (newStatus: TransactionStatus) => {
    transitionStage.mutate({
      newStatus,
      notes: `Status changed to ${statusLabels[newStatus]}`
    });
  };

  const handleAddPayment = () => {
    addPayment.mutate({
      amount: Number(paymentData.amount),
      paymentMethod: paymentData.paymentMethod,
      paymentReference: paymentData.paymentReference,
      notes: paymentData.notes
    });
    setPaymentDialogOpen(false);
    setPaymentData({
      amount: '',
      paymentMethod: 'cash',
      paymentReference: '',
      notes: ''
    });
  };

  const handleAddNote = () => {
    addNote.mutate({
      content: noteContent,
      isInternal: noteInternal
    });
    setNoteDialogOpen(false);
    setNoteContent('');
    setNoteInternal(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Transaction Found</h2>
            <p className="text-gray-600 mb-4">
              This estimate hasn't been converted to a transaction yet. 
              Estimates need to be approved by an admin before they become transactions.
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => window.history.back()} 
                variant="outline"
              >
                Go Back
              </Button>
              <Button 
                onClick={() => window.location.href = '/transactions'} 
                variant="default"
              >
                View All Transactions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {transaction.transaction_number}
          </h1>
          <p className="text-gray-600">Transaction Details</p>
        </div>
        <div className="flex gap-2">
          <Badge className={statusColors[transaction.status]}>
            {statusLabels[transaction.status]}
          </Badge>
          {transaction.status === 'estimate_submitted' && (
            <Button onClick={handleApprove} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-gray-900">{transaction.customer_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-gray-900">{transaction.customer_email}</p>
                </div>
                {transaction.customer_phone && (
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-gray-900">{transaction.customer_phone}</p>
                  </div>
                )}
                {transaction.delivery_address && (
                  <div>
                    <Label className="text-sm font-medium">Delivery Address</Label>
                    <p className="text-gray-900">{transaction.delivery_address}</p>
                  </div>
                )}
                {transaction.preferred_contact && (
                  <div>
                    <Label className="text-sm font-medium">Preferred Contact</Label>
                    <p className="text-gray-900">{transaction.preferred_contact}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Base Amount:</span>
                  <span className="font-medium">{formatCurrency(transaction.base_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Amount:</span>
                  <span className="font-medium">{formatCurrency(transaction.service_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Amount:</span>
                  <span className="font-medium">{formatCurrency(transaction.tax_amount)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Total Amount:</span>
                  <span className="font-bold">{formatCurrency(transaction.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid Amount:</span>
                  <span className="font-medium text-green-600">{formatCurrency(transaction.paid_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Balance Due:</span>
                  <span className="font-bold text-red-600">{formatCurrency(transaction.balance_due)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Home Information */}
            {transaction.mobile_home && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Mobile Home
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Model</Label>
                    <p className="text-gray-900">{transaction.mobile_home.manufacturer} {transaction.mobile_home.model}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Series</Label>
                    <p className="text-gray-900">{transaction.mobile_home.series}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Base Price</Label>
                    <p className="text-gray-900">{formatCurrency(transaction.mobile_home.price)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Change Status</Label>
                  <Select onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estimate_approved">Approve Estimate</SelectItem>
                      <SelectItem value="invoice_generated">Generate Invoice</SelectItem>
                      <SelectItem value="delivery_scheduled">Schedule Delivery</SelectItem>
                      <SelectItem value="delivery_in_progress">Start Delivery</SelectItem>
                      <SelectItem value="delivery_complete">Complete Delivery</SelectItem>
                      <SelectItem value="completed">Mark Complete</SelectItem>
                      <SelectItem value="cancelled">Cancel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Add Payment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Payment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="paymentMethod">Payment Method</Label>
                          <Select value={paymentData.paymentMethod} onValueChange={(value) => setPaymentData(prev => ({ ...prev, paymentMethod: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="check">Check</SelectItem>
                              <SelectItem value="credit_card">Credit Card</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="paymentReference">Reference</Label>
                          <Input
                            id="paymentReference"
                            value={paymentData.paymentReference}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, paymentReference: e.target.value }))}
                            placeholder="Check number, transaction ID, etc."
                          />
                        </div>
                        <div>
                          <Label htmlFor="paymentNotes">Notes</Label>
                          <Textarea
                            id="paymentNotes"
                            value={paymentData.notes}
                            onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Additional notes..."
                          />
                        </div>
                        <Button onClick={handleAddPayment} className="w-full">
                          Add Payment
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Note</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="noteContent">Note</Label>
                          <Textarea
                            id="noteContent"
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Enter your note..."
                            rows={4}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="noteInternal"
                            checked={noteInternal}
                            onChange={(e) => setNoteInternal(e.target.checked)}
                          />
                          <Label htmlFor="noteInternal">Internal note (not visible to customer)</Label>
                        </div>
                        <Button onClick={handleAddNote} className="w-full">
                          Add Note
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stageHistory.map((history, index) => (
                  <div key={history.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {history.from_status ? `${statusLabels[history.from_status]} → ${statusLabels[history.to_status]}` : `${statusLabels[history.to_status]}`}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(history.changed_at).toLocaleString()}
                        </span>
                      </div>
                      {history.notes && (
                        <p className="text-sm text-gray-600">{history.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                      <p className="text-sm text-gray-600">
                        {payment.payment_method} • {new Date(payment.payment_date).toLocaleDateString()}
                      </p>
                      {payment.payment_reference && (
                        <p className="text-sm text-gray-500">Ref: {payment.payment_reference}</p>
                      )}
                    </div>
                    {payment.notes && (
                      <p className="text-sm text-gray-600 max-w-xs">{payment.notes}</p>
                    )}
                  </div>
                ))}
                {payments.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No payments recorded yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notes & Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">User</span>
                        {note.is_internal && (
                          <Badge variant="secondary" className="text-xs">Internal</Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700">{note.content}</p>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No notes added yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents & Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Document management coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}