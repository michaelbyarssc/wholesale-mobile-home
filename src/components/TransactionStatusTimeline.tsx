import { TransactionStatus } from '@/types/transaction';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

interface TransactionStatusTimelineProps {
  currentStatus: TransactionStatus;
  className?: string;
}

const statusFlow: { status: TransactionStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'estimate_submitted', label: 'Estimate Submitted' },
  { status: 'estimate_approved', label: 'Estimate Approved' },
  { status: 'invoice_generated', label: 'Invoice Generated' },
  { status: 'payment_partial', label: 'Payment Received' },
  { status: 'payment_complete', label: 'Payment Complete' },
  { status: 'delivery_scheduled', label: 'Delivery Scheduled' },
  { status: 'delivery_in_progress', label: 'Delivery In Progress' },
  { status: 'delivery_complete', label: 'Delivery Complete' },
  { status: 'completed', label: 'Completed' },
];

export function TransactionStatusTimeline({ currentStatus, className }: TransactionStatusTimelineProps) {
  const currentIndex = statusFlow.findIndex(step => step.status === currentStatus);
  
  const getStepStatus = (index: number) => {
    if (currentStatus === 'cancelled' || currentStatus === 'expired') {
      return index === 0 ? 'completed' : 'cancelled';
    }
    
    if (index <= currentIndex) return 'completed';
    if (index === currentIndex + 1) return 'current';
    return 'pending';
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'current':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'current':
        return 'text-blue-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  if (currentStatus === 'cancelled' || currentStatus === 'expired') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AlertCircle className="h-5 w-5 text-red-600" />
        <span className="text-red-600 font-medium">
          {currentStatus === 'cancelled' ? 'Transaction Cancelled' : 'Transaction Expired'}
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {statusFlow.map((step, index) => {
        const stepStatus = getStepStatus(index);
        const isLast = index === statusFlow.length - 1;
        
        return (
          <div key={step.status} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              {getStepIcon(stepStatus)}
              {!isLast && (
                <div className={`w-0.5 h-8 mt-2 ${
                  stepStatus === 'completed' ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
            <div className={`flex-1 ${getStepColor(stepStatus)}`}>
              <p className={`font-medium ${stepStatus === 'current' ? 'text-blue-600' : ''}`}>
                {step.label}
              </p>
              {stepStatus === 'current' && (
                <p className="text-sm text-gray-500 mt-1">In progress...</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}