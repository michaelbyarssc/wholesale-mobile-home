import { AdminAnalyticsDashboard } from './AdminAnalyticsDashboard';
import { useSecureRoles } from '@/hooks/useSecureRoles';

export const AdminAnalytics = () => {
  const { isSecureAdmin, isLoading } = useSecureRoles();
  if (isLoading) return <div className="p-6">Loading...</div>;
  if (!isSecureAdmin) return <div className="p-6">Access denied</div>;
  return <AdminAnalyticsDashboard />;
};