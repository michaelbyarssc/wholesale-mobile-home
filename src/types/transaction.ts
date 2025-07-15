export type TransactionStatus = 
  | 'draft'
  | 'estimate_submitted'
  | 'estimate_approved'
  | 'invoice_generated'
  | 'payment_partial'
  | 'payment_complete'
  | 'delivery_scheduled'
  | 'delivery_in_progress'
  | 'delivery_complete'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type TransactionType = 'sale' | 'repair' | 'service' | 'delivery_only';

export type TransactionPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Transaction {
  id: string;
  transaction_number: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  priority: TransactionPriority;
  
  // Customer information
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  delivery_address?: string;
  
  // Mobile home and services
  mobile_home_id?: string;
  mobile_home?: {
    model: string;
    manufacturer: string;
    series: string;
    display_name?: string;
    price: number;
  };
  selected_services: string[];
  selected_home_options: any[];
  
  // Financial information
  base_amount: number;
  service_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  
  // User and assignment
  user_id?: string;
  assigned_admin_id?: string;
  created_by?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  estimate_expires_at?: string;
  invoice_expires_at?: string;
  scheduled_delivery_date?: string;
  completed_at?: string;
  
  // Additional fields
  preferred_contact?: string;
  timeline?: string;
  additional_requirements?: string;
  internal_notes?: string;
  user_notes?: string;
  
  // Integration fields
  quickbooks_id?: string;
  quickbooks_synced_at?: string;
  
  // Repair fields
  repair_description?: string;
  repair_category?: string;
  repair_urgency?: string;
  repair_completed_at?: string;
  
  // File attachments
  attachment_urls: string[];
}

export interface TransactionStageHistory {
  id: string;
  transaction_id: string;
  from_status?: TransactionStatus;
  to_status: TransactionStatus;
  changed_by?: string;
  changed_at: string;
  notes?: string;
  metadata?: any;
}

export interface TransactionNote {
  id: string;
  transaction_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionPayment {
  id: string;
  transaction_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  payment_reference?: string;
  recorded_by?: string;
  notes?: string;
  created_at: string;
}

export interface TransactionNotification {
  id: string;
  transaction_id: string;
  user_id?: string;
  notification_type: string;
  title: string;
  message: string;
  read_at?: string;
  created_at: string;
  metadata?: any;
}

export interface TransactionDashboardData {
  status_counts: Record<TransactionStatus, number>;
  total_revenue: number;
  pending_amount: number;
  avg_transaction_value: number;
  transaction_count: number;
  date_range_days: number;
}

export interface TransactionFilters {
  status?: TransactionStatus[];
  type?: TransactionType[];
  priority?: TransactionPriority[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
  assignedAdmin?: string;
  minAmount?: number;
  maxAmount?: number;
}