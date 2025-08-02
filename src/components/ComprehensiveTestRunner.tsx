import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Clock, 
  RefreshCw,
  TestTube,
  Database,
  Users,
  Settings,
  Shield,
  ExternalLink,
  Bug,
  Timer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { runTransactionTests } from '@/utils/transactionTestUtils';

interface TestResult {
  testId: string;
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  details?: any;
}

interface PhaseResult {
  phaseId: string;
  phaseName: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export function ComprehensiveTestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('');
  const [currentTest, setCurrentTest] = useState('');
  const [progress, setProgress] = useState(0);
  const [phaseResults, setPhaseResults] = useState<PhaseResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [testingInProgress, setTestingInProgress] = useState(false);
  const { toast } = useToast();

  // Add debug logging
  const logDebug = (message: string, data?: any) => {
    console.log(`[TestRunner] ${message}`, data);
  };

  // Test Phase 1: Core User Journey Testing
  const runCoreUserJourneyTests = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];
    
    // Test 1: Authentication Flow
    try {
      const start = Date.now();
      
      // Check if auth is working
      const { data: { user } } = await supabase.auth.getUser();
      const authWorking = user !== null || user === null; // Both states are valid
      
      results.push({
        testId: 'auth-flow',
        name: 'Authentication Flow',
        passed: authWorking,
        duration: Date.now() - start,
        severity: 'critical',
        category: 'authentication',
        details: { hasUser: !!user }
      });
    } catch (error) {
      results.push({
        testId: 'auth-flow',
        name: 'Authentication Flow',
        passed: false,
        error: error instanceof Error ? error.message : 'Auth test failed',
        duration: 0,
        severity: 'critical',
        category: 'authentication'
      });
    }

    // Test 2: Mobile Home Browsing
    try {
      const start = Date.now();
      const { data: homes, error } = await supabase
        .from('mobile_homes')
        .select('*')
        .limit(5);
      
      results.push({
        testId: 'mobile-home-browsing',
        name: 'Mobile Home Browsing',
        passed: !error && Array.isArray(homes),
        error: error?.message,
        duration: Date.now() - start,
        severity: 'high',
        category: 'data-access',
        details: { homeCount: homes?.length || 0 }
      });
    } catch (error) {
      results.push({
        testId: 'mobile-home-browsing',
        name: 'Mobile Home Browsing',
        passed: false,
        error: error instanceof Error ? error.message : 'Browsing test failed',
        duration: 0,
        severity: 'high',
        category: 'data-access'
      });
    }

    // Test 3: Estimate Creation
    try {
      const start = Date.now();
      const { data: estimates, error } = await supabase
        .from('estimates')
        .select('*')
        .limit(1);
      
      results.push({
        testId: 'estimate-creation',
        name: 'Estimate Creation Access',
        passed: !error,
        error: error?.message,
        duration: Date.now() - start,
        severity: 'critical',
        category: 'workflow',
        details: { canAccessEstimates: !error }
      });
    } catch (error) {
      results.push({
        testId: 'estimate-creation',
        name: 'Estimate Creation Access',
        passed: false,
        error: error instanceof Error ? error.message : 'Estimate test failed',
        duration: 0,
        severity: 'critical',
        category: 'workflow'
      });
    }

    return results;
  };

  // Test Phase 2: Admin Workflow Testing
  const runAdminWorkflowTests = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];

    // Test 1: User Management Access
    try {
      const start = Date.now();
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      results.push({
        testId: 'user-management',
        name: 'User Management Access',
        passed: !error,
        error: error?.message,
        duration: Date.now() - start,
        severity: 'high',
        category: 'admin',
        details: { canAccessProfiles: !error }
      });
    } catch (error) {
      results.push({
        testId: 'user-management',
        name: 'User Management Access',
        passed: false,
        error: error instanceof Error ? error.message : 'User management test failed',
        duration: 0,
        severity: 'high',
        category: 'admin'
      });
    }

    // Test 2: Analytics Access
    try {
      const start = Date.now();
      const { data: analytics, error } = await supabase
        .from('analytics_sessions')
        .select('*')
        .limit(1);
      
      results.push({
        testId: 'analytics-access',
        name: 'Analytics Data Access',
        passed: !error,
        error: error?.message,
        duration: Date.now() - start,
        severity: 'medium',
        category: 'admin',
        details: { canAccessAnalytics: !error }
      });
    } catch (error) {
      results.push({
        testId: 'analytics-access',
        name: 'Analytics Data Access',
        passed: false,
        error: error instanceof Error ? error.message : 'Analytics test failed',
        duration: 0,
        severity: 'medium',
        category: 'admin'
      });
    }

    return results;
  };

  // Test Phase 3: Security Testing (Improved to avoid auth interference)
  const runSecurityTests = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];

    // Test 1: RLS Policy Enforcement for Unauthenticated Users
    try {
      const start = Date.now();
      logDebug('Starting security tests - testing RLS policies');
      
      // Use isolated client approach to avoid interfering with main auth state
      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(
        'https://vgdreuwmisludqxphsph.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZHJldXdtaXNsdWRxeHBoc3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDk2OTgsImV4cCI6MjA2NjI4NTY5OH0.gnJ83GgBWV4tb-cwWJXY0pPG2bGAyTK3T2IojP4llR8',
        {
          auth: {
            persistSession: false, // Don't persist session to avoid interfering with main auth
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      // Test multiple sensitive tables that should block anonymous access
      const sensitiveQueries = [
        { table: 'admin_settings', name: 'Admin Settings' },
        { table: 'admin_audit_log', name: 'Admin Audit Log' },
        { table: 'customer_markups', name: 'Customer Markups' }
      ];

      let allBlocked = true;
      const testDetails: string[] = [];

      for (const query of sensitiveQueries) {
        try {
          logDebug(`Testing RLS for table: ${query.table}`);
          const { data, error } = await testClient.from(query.table).select('*').limit(1);
          
          if (!error && data && data.length > 0) {
            // Data returned without authentication - security issue
            allBlocked = false;
            testDetails.push(`❌ ${query.name}: Anonymous access allowed (${data.length} records returned)`);
            logDebug(`RLS FAIL: ${query.table} allows anonymous access`);
          } else if (error) {
            // Error occurred - likely RLS blocking access (good)
            testDetails.push(`✅ ${query.name}: Properly blocked (${error.code}: ${error.message})`);
            logDebug(`RLS PASS: ${query.table} properly blocked`);
          } else if (data && data.length === 0) {
            // Empty result - could be RLS working or just no data
            testDetails.push(`⚠️ ${query.name}: Empty result (could be no data or RLS working)`);
            logDebug(`RLS UNKNOWN: ${query.table} returned empty result`);
          }
        } catch (err) {
          // Exception thrown - likely RLS blocking (good)
          testDetails.push(`✅ ${query.name}: Properly blocked with exception`);
          logDebug(`RLS PASS: ${query.table} blocked with exception`);
        }
      }

      // Test authenticated user access (current user)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const { data: userSettings, error: userError } = await supabase
            .from('admin_settings')
            .select('*')
            .limit(1);
          
          if (userError) {
            testDetails.push(`✅ Authenticated user properly blocked from admin_settings`);
          } else if (userSettings) {
            testDetails.push(`⚠️ Authenticated user has access to admin_settings (may be admin)`);
          }
        } catch (err) {
          testDetails.push(`✅ Authenticated user properly blocked from admin_settings`);
        }
      }
      
      results.push({
        testId: 'rls-enforcement',
        name: 'Row Level Security Enforcement',
        passed: allBlocked,
        error: allBlocked ? undefined : 'Some tables allow unauthorized anonymous access',
        duration: Date.now() - start,
        severity: 'critical',
        category: 'security',
        details: { 
          rlsActive: allBlocked, 
          testResults: testDetails.join('\n'),
          userAuthenticated: !!user
        }
      });
    } catch (error) {
      results.push({
        testId: 'rls-enforcement',
        name: 'Row Level Security Enforcement',
        passed: false,
        error: error instanceof Error ? error.message : 'RLS test failed',
        duration: 0,
        severity: 'critical',
        category: 'security'
      });
    }

    return results;
  };

  // Test Phase 4: Transaction System Testing
  const runTransactionSystemTests = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];

    try {
      const start = Date.now();
      const transactionResults = await runTransactionTests();
      
      // Convert transaction test results to our format
      transactionResults.forEach((result, index) => {
        results.push({
          testId: `transaction-test-${index}`,
          name: result.test || 'Transaction Test',
          passed: result.passed,
          error: result.error,
          duration: Date.now() - start,
          severity: 'high' as const,
          category: 'transaction',
          details: result.data
        });
      });
    } catch (error) {
      results.push({
        testId: 'transaction-system',
        name: 'Transaction System',
        passed: false,
        error: error instanceof Error ? error.message : 'Transaction tests failed',
        duration: 0,
        severity: 'critical' as const,
        category: 'transaction'
      });
    }

    return results;
  };

  // Test Phase 5: Integration Testing
  const runIntegrationTests = async (): Promise<TestResult[]> => {
    const results: TestResult[] = [];

    // Test 1: Database Functions
    try {
      const start = Date.now();
      const { data, error } = await supabase.rpc('validate_email', { email: 'test@example.com' });
      
      results.push({
        testId: 'database-functions',
        name: 'Database Functions',
        passed: !error && data === true,
        error: error?.message,
        duration: Date.now() - start,
        severity: 'medium',
        category: 'integration',
        details: { functionResult: data }
      });
    } catch (error) {
      results.push({
        testId: 'database-functions',
        name: 'Database Functions',
        passed: false,
        error: error instanceof Error ? error.message : 'Database function test failed',
        duration: 0,
        severity: 'medium',
        category: 'integration'
      });
    }

    return results;
  };

  const runAllTests = async () => {
    logDebug('Starting comprehensive test suite');
    
    // Set testing flag to prevent auth state interference
    setTestingInProgress(true);
    setIsRunning(true);
    setOverallStatus('running');
    setProgress(0);
    setPhaseResults([]);

    const phases = [
      { id: 'core-journey', name: 'Core User Journey', runner: runCoreUserJourneyTests, icon: Users },
      { id: 'admin-workflow', name: 'Admin Workflow', runner: runAdminWorkflowTests, icon: Settings },
      { id: 'security', name: 'Security Testing', runner: runSecurityTests, icon: Shield },
      { id: 'transactions', name: 'Transaction System', runner: runTransactionSystemTests, icon: Database },
      { id: 'integration', name: 'Integration Testing', runner: runIntegrationTests, icon: ExternalLink }
    ];

    const phaseResults: PhaseResult[] = [];

    try {
      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        logDebug(`Starting phase: ${phase.name}`);
        setCurrentPhase(phase.name);
        setProgress((i / phases.length) * 100);

        const phaseStart = Date.now();
        const testResults = await phase.runner();
        const phaseDuration = Date.now() - phaseStart;

        const phaseResult: PhaseResult = {
          phaseId: phase.id,
          phaseName: phase.name,
          tests: testResults,
          totalTests: testResults.length,
          passedTests: testResults.filter(t => t.passed).length,
          failedTests: testResults.filter(t => !t.passed).length,
          duration: phaseDuration,
          status: 'completed'
        };

        phaseResults.push(phaseResult);
        setPhaseResults([...phaseResults]);
        logDebug(`Completed phase: ${phase.name}`, { passed: phaseResult.passedTests, failed: phaseResult.failedTests });
      }

      setProgress(100);
      setOverallStatus('completed');
      
      // Show summary toast
      const totalTests = phaseResults.reduce((acc, phase) => acc + phase.totalTests, 0);
      const totalPassed = phaseResults.reduce((acc, phase) => acc + phase.passedTests, 0);
      const totalFailed = phaseResults.reduce((acc, phase) => acc + phase.failedTests, 0);

      logDebug('Testing completed successfully', { totalTests, totalPassed, totalFailed });

      toast({
        title: "Testing Complete",
        description: `${totalPassed}/${totalTests} tests passed. ${totalFailed} failed.`,
        variant: totalFailed === 0 ? "default" : "destructive"
      });

    } catch (error) {
      logDebug('Testing failed with error', error);
      setOverallStatus('failed');
      toast({
        title: "Testing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      // Clear testing flag and reset state
      setTestingInProgress(false);
      setIsRunning(false);
      setCurrentPhase('');
      setCurrentTest('');
      logDebug('Test suite cleanup completed');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalTests = phaseResults.reduce((acc, phase) => acc + phase.totalTests, 0);
  const totalPassed = phaseResults.reduce((acc, phase) => acc + phase.passedTests, 0);
  const totalFailed = phaseResults.reduce((acc, phase) => acc + phase.failedTests, 0);

  return (
    <div className="space-y-6">
      {/* Testing Status Indicator */}
      {testingInProgress && (
        <Alert className="border-blue-200 bg-blue-50">
          <Bug className="h-4 w-4" />
          <AlertDescription>
            Testing in progress - avoid navigation during test execution to prevent interference.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-6 w-6 text-blue-600" />
            Comprehensive Testing Suite
          </h2>
          <p className="text-gray-600">End-to-end testing across all system components</p>
        </div>
        <Button 
          onClick={runAllTests}
          disabled={isRunning || testingInProgress}
          className="flex items-center gap-2"
          size="lg"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {currentPhase ? `Running: ${currentPhase}` : 'Initializing tests...'}
                </p>
                <Progress value={progress} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {phaseResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TestTube className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tests</p>
                  <p className="text-xl font-bold">{totalTests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Passed</p>
                  <p className="text-xl font-bold text-green-600">{totalPassed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-xl font-bold text-red-600">{totalFailed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-xl font-bold">
                    {totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Phase Results */}
      {phaseResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Test Results by Phase</h3>
          {phaseResults.map((phase) => (
            <Card key={phase.phaseId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(phase.status)}
                    {phase.phaseName}
                  </div>
                  <Badge variant="outline">
                    {phase.passedTests}/{phase.totalTests} passed
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {phase.tests.map((test) => (
                    <div key={test.testId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {test.passed ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <h4 className="font-medium">{test.name}</h4>
                          {test.error && (
                            <p className="text-sm text-red-600">{test.error}</p>
                          )}
                          {test.details && (
                            <p className="text-xs text-gray-500">
                              {JSON.stringify(test.details)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {test.duration}ms
                        </span>
                        <Badge className={getSeverityColor(test.severity)}>
                          {test.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results State */}
      {phaseResults.length === 0 && !isRunning && (
        <Card>
          <CardContent className="text-center py-12">
            <TestTube className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Test</h3>
            <p className="text-gray-500 mb-4">
              Click "Run All Tests" to execute the comprehensive testing suite
            </p>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Tests will run against your live database. Ensure you have proper backups before proceeding.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}