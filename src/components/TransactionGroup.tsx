interface UnifiedRecord {
  id: string;
  type: 'estimate' | 'invoice' | 'delivery' | 'payment';
  number: string;
  customer_name: string;
  amount: number;
  status: string;
  created_at: string;
  transaction_number?: string;
}

interface TransactionGroupProps {
  records: UnifiedRecord[];
  baseTransactionNumber: string;
}

export function TransactionGroup({ records, baseTransactionNumber }: TransactionGroupProps) {
  const sortedRecords = records.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  return (
    <div className="relative">
      {sortedRecords.map((record, index) => (
        <div key={record.id} className="relative">
          {/* Connecting line */}
          {index > 0 && (
            <div className="absolute left-4 -top-4 w-0.5 h-4 bg-border" />
          )}
          
          {/* Record content */}
          <div className="flex items-center gap-3 py-2">
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{record.transaction_number || record.number}</span>
                  <span className="text-xs text-muted-foreground ml-2">({record.type})</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">${record.amount.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{record.status}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}