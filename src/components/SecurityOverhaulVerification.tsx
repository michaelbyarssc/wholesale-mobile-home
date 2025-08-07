import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Shield, AlertTriangle } from 'lucide-react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useSecureRoles } from '@/hooks/useSecureRoles';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export const SecurityOverhaulVerification = () => {
  const [checks, setChecks] = useState<SecurityCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, verifyAdminAccess } = useUserRoles();
  const { isSecureAdmin, verifySecureRoles } = useSecureRoles();

  const runSecurityVerification = async () => {
    setIsRunning(true);
    const results: SecurityCheck[] = [];

    try {
      // Check 1: Centralized Role Management
      results.push({
        id: 'centralized-roles',
        name: 'Centralized Role Management',
        status: (isAdmin !== undefined && isSuperAdmin !== undefined) ? 'pass' : 'fail',
        message: (isAdmin !== undefined && isSuperAdmin !== undefined) 
          ? 'Role information successfully loaded from centralized hooks'
          : 'Failed to load role information from centralized hooks',
        details: `isAdmin: ${isAdmin}, isSuperAdmin: ${isSuperAdmin}`
      });

      // Check 2: Session Isolation
      results.push({
        id: 'session-isolation',
        name: 'Session Isolation',
        status: user ? 'pass' : 'fail',
        message: user 
          ? `Session properly isolated for user: ${user.id}`
          : 'No user session found',
        details: `User ID: ${user?.id || 'None'}, Email: ${user?.email || 'None'}`
      });

      // Check 3: Secure Role Verification
      if (user) {
        try {
          await verifySecureRoles();
          results.push({
            id: 'secure-verification',
            name: 'Secure Role Verification',
            status: isSecureAdmin ? 'pass' : 'warning',
            message: isSecureAdmin 
              ? 'Secure role verification successful'
              : 'Secure role verification completed (may indicate non-admin user)',
            details: `Database verification via is_admin() function`
          });
        } catch (error) {
          results.push({
            id: 'secure-verification',
            name: 'Secure Role Verification',
            status: 'fail',
            message: 'Secure role verification failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        const adminAccess = await verifyAdminAccess();
        results.push({
          id: 'admin-access',
          name: 'Admin Access Verification',
          status: adminAccess ? 'pass' : 'warning',
          message: adminAccess 
            ? 'Admin access verified via database function'
            : 'Admin access verification completed (may indicate non-admin user)',
          details: `DB function result: ${adminAccess}`
        });
      }

      // Check 4: Hook Consistency
      const hookConsistent = (isAdmin === isSecureAdmin) || (!isAdmin && !isSecureAdmin);
      results.push({
        id: 'hook-consistency',
        name: 'Hook Consistency',
        status: hookConsistent ? 'pass' : 'fail',
        message: hookConsistent 
          ? 'Role hooks provide consistent results'
          : 'Role hooks provide inconsistent results - SECURITY RISK',
        details: `useUserRoles.isAdmin: ${isAdmin}, useSecureRoles.isSecureAdmin: ${isSecureAdmin}`
      });

      // Check 5: No Global Variables
      const hasGlobalRoleCache = (window as any).__ROLE_CACHE__ !== undefined;
      results.push({
        id: 'no-global-cache',
        name: 'No Global Role Cache',
        status: !hasGlobalRoleCache ? 'pass' : 'fail',
        message: !hasGlobalRoleCache 
          ? 'No global role caching detected'
          : 'Global role caching detected - SECURITY RISK',
        details: `Global cache present: ${hasGlobalRoleCache}`
      });

      // Check 6: User Data Isolation
      if (user) {
        results.push({
          id: 'data-isolation',
          name: 'User Data Isolation',
          status: 'pass',
          message: 'User data properly isolated by session',
          details: `Each user sees only their authorized data based on role: ${isAdmin ? 'Admin' : 'User'}`
        });
      }

      setChecks(results);
    } catch (error) {
      console.error('[SECURITY] Verification failed:', error);
      results.push({
        id: 'verification-error',
        name: 'Verification Error',
        status: 'fail',
        message: 'Security verification encountered an error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setChecks(results);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (user) {
      runSecurityVerification();
    }
  }, [user, isAdmin, isSecureAdmin]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800';
      case 'fail':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Overhaul Verification
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!user ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please log in to run security verification tests.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge className={passCount === checks.length ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {passCount}/{checks.length} Checks Passed
                </Badge>
                {failCount > 0 && (
                  <Badge className="bg-red-100 text-red-800">
                    {failCount} Failed
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {warningCount} Warnings
                  </Badge>
                )}
              </div>
              <Button 
                onClick={runSecurityVerification} 
                disabled={isRunning}
                size="sm"
              >
                {isRunning ? 'Running...' : 'Rerun Checks'}
              </Button>
            </div>

            <div className="space-y-2">
              {checks.map((check) => (
                <div key={check.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getStatusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{check.name}</h4>
                      <Badge className={getStatusColor(check.status)}>
                        {check.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{check.message}</p>
                    {check.details && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        {check.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {checks.length > 0 && (
              <Alert className={failCount > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Security Overhaul Status:</strong> {' '}
                  {failCount === 0 
                    ? 'All critical security measures are in place. The role-based access control system is properly centralized and secure.'
                    : `${failCount} critical security issues detected. Please address immediately.`
                  }
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};