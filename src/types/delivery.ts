export type DeliveryStatus = 
  | 'pending_payment'
  | 'scheduled'
  | 'factory_pickup_scheduled'
  | 'factory_pickup_in_progress'
  | 'factory_pickup_completed'
  | 'in_transit'
  | 'delivery_in_progress'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'delayed';