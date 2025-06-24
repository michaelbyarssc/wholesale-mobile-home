
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface AuditLogEntry {
  id: string;
  admin_user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export const AuditLogTab = () => {
  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as AuditLogEntry[];
    }
  });

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'CREATE':
      case 'INSERT':
        return 'default';
      case 'UPDATE':
      case 'UPDATE_SETTING':
        return 'secondary';
      case 'DELETE':
        return 'destructive';
      case 'PASSWORD_RESET':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading audit logs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No audit log entries found.</p>
          ) : (
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                      {log.table_name && (
                        <Badge variant="outline">
                          {log.table_name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </div>
                  </div>
                  
                  {log.admin_user_id && (
                    <div className="text-sm text-gray-600">
                      Admin ID: {log.admin_user_id}
                    </div>
                  )}
                  
                  {log.record_id && (
                    <div className="text-sm text-gray-600">
                      Record ID: {log.record_id}
                    </div>
                  )}
                  
                  {log.new_values && (
                    <div className="text-sm">
                      <div className="font-medium text-gray-700">Changes:</div>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(log.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {log.old_values && (
                    <div className="text-sm">
                      <div className="font-medium text-gray-700">Previous values:</div>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(log.old_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {log.ip_address && (
                    <div className="text-xs text-gray-500">
                      IP: {log.ip_address}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
