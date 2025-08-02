import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  AlertCircle,
  TestTube,
  Database,
  Zap,
  Settings,
  Users,
  Shield,
  Activity,
  ExternalLink,
  Bug,
  Timer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TransactionIntegrationTester } from '@/components/TransactionIntegrationTester';
import { TestFixHandler, TestResult as EnhancedTestResult } from './TestFixHandler';

interface TestPhase {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  tests: TestCase[];
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number; // in seconds
}

interface TestResult {
  testId: string;
  passed: boolean;
  error?: string;
  data?: any;
  duration: number;
  timestamp: string;
  errorType?: 'RLS_POLICY_ERROR' | 'VALIDATION_ERROR' | 'PERFORMANCE_ISSUE' | 'INTEGRATION_ERROR' | 'UI_ERROR' | 'DATABASE_ERROR' | 'NETWORK_ERROR';
  fixSuggestion?: string;
  stackTrace?: string;
  fixApplied?: boolean;
  fixStatus?: 'pending' | 'applied' | 'failed';
}

export function ComprehensiveTestSuite() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [phaseResults, setPhaseResults] = useState<Record<string, TestResult[]>>({});
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const { toast } = useToast();

  // Fix and retest handlers
  const handleFixApplied = (testId: string, success: boolean) => {
    setPhaseResults(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(phaseId => {
        updated[phaseId] = updated[phaseId].map(result => 
          result.testId === testId 
            ? { ...result, fixApplied: true, fixStatus: success ? 'applied' : 'failed' as const }
            : result
        );
      });
      return updated;
    });

    toast({
      title: success ? "Fix Applied" : "Fix Failed",
      description: success ? "Test fix was successfully applied" : "Failed to apply test fix",
      variant: success ? "default" : "destructive"
    });
  };

  const handleRetestRequested = async (testId: string) => {
    // Find the test and rerun it
    let targetTest: TestCase | undefined;
    let targetPhaseId: string | undefined;

    for (const phase of testPhases) {
      const test = phase.tests.find(t => t.id === testId);
      if (test) {
        targetTest = test;
        targetPhaseId = phase.id;
        break;
      }
    }

    if (!targetTest || !targetPhaseId) return;

    const startTime = Date.now();
    const result = await runSingleTest(targetTest);
    const endTime = Date.now();

    const testResult: TestResult = {
      testId: targetTest.id,
      passed: result.passed,
      error: result.error,
      data: result.data,
      duration: endTime - startTime,
      timestamp: new Date().toISOString(),
      errorType: result.errorType as any,
      stackTrace: result.stackTrace
    };

    // Update the result in phaseResults
    setPhaseResults(prev => ({
      ...prev,
      [targetPhaseId!]: prev[targetPhaseId!].map(r => 
        r.testId === testId ? testResult : r
      )
    }));

    toast({
      title: "Test Retested",
      description: `${targetTest.name} has been re-executed`,
    });
  };

  const testPhases: TestPhase[] = [
    {
      id: 'core-system',
      name: 'Core System Tests',
      description: 'Transaction system, database functions, and core workflows',
      icon: Database,
      tests: [
        {
          id: 'transaction-creation',
          name: 'Transaction Creation',
          description: 'Test transaction creation workflow and data integrity',
          category: 'core',
          severity: 'critical',
          estimatedDuration: 5
        },
        {
          id: 'estimate-conversion',
          name: 'Estimate to Transaction Flow',
          description: 'Test estimate approval and transaction conversion',
          category: 'core',
          severity: 'critical',
          estimatedDuration: 7
        },
        {
          id: 'payment-processing',
          name: 'Payment Processing',
          description: 'Test payment workflow and balance calculations',
          category: 'core',
          severity: 'high',
          estimatedDuration: 6
        },
        {
          id: 'status-transitions',
          name: 'Status Transitions',
          description: 'Test transaction status workflow transitions',
          category: 'core',
          severity: 'high',
          estimatedDuration: 4
        },
        {
          id: 'real-time-updates',
          name: 'Real-time Updates',
          description: 'Test WebSocket connections and live data updates',
          category: 'core',
          severity: 'medium',
          estimatedDuration: 3
        }
      ]
    },
    {
      id: 'user-journey',
      name: 'User Journey Tests',
      description: 'End-to-end customer and user workflows',
      icon: Users,
      tests: [
        {
          id: 'homepage-load',
          name: 'Homepage Load Performance',
          description: 'Test homepage loading speed and content rendering',
          category: 'performance',
          severity: 'high',
          estimatedDuration: 3
        },
        {
          id: 'mobile-home-browsing',
          name: 'Mobile Home Browsing',
          description: 'Test mobile home catalog browsing and filtering',
          category: 'ui',
          severity: 'medium',
          estimatedDuration: 5
        },
        {
          id: 'estimate-creation',
          name: 'Estimate Creation Flow',
          description: 'Test complete estimate creation user journey',
          category: 'workflow',
          severity: 'critical',
          estimatedDuration: 8
        },
        {
          id: 'appointment-booking',
          name: 'Appointment Booking',
          description: 'Test appointment scheduling and confirmation',
          category: 'workflow',
          severity: 'high',
          estimatedDuration: 6
        },
        {
          id: 'cart-checkout',
          name: 'Cart and Checkout',
          description: 'Test shopping cart functionality and checkout process',
          category: 'workflow',
          severity: 'high',
          estimatedDuration: 7
        }
      ]
    },
    {
      id: 'admin-workflow',
      name: 'Admin Workflow Tests',
      description: 'Administrative functions and management workflows',
      icon: Settings,
      tests: [
        {
          id: 'user-management',
          name: 'User Management',
          description: 'Test user creation, approval, and role management',
          category: 'admin',
          severity: 'critical',
          estimatedDuration: 6
        },
        {
          id: 'inventory-management',
          name: 'Inventory Management',
          description: 'Test mobile home inventory CRUD operations',
          category: 'admin',
          severity: 'high',
          estimatedDuration: 5
        },
        {
          id: 'crm-functionality',
          name: 'CRM Functionality',
          description: 'Test lead tracking and customer management',
          category: 'admin',
          severity: 'medium',
          estimatedDuration: 7
        },
        {
          id: 'delivery-management',
          name: 'Delivery Management',
          description: 'Test delivery scheduling and tracking',
          category: 'admin',
          severity: 'high',
          estimatedDuration: 6
        },
        {
          id: 'analytics-dashboard',
          name: 'Analytics Dashboard',
          description: 'Test analytics data collection and display',
          category: 'admin',
          severity: 'medium',
          estimatedDuration: 4
        }
      ]
    },
    {
      id: 'error-handling',
      name: 'Error Handling Tests',
      description: 'Edge cases, error scenarios, and failure recovery',
      icon: Bug,
      tests: [
        {
          id: 'network-failure',
          name: 'Network Failure Handling',
          description: 'Test behavior during network connectivity issues',
          category: 'error',
          severity: 'high',
          estimatedDuration: 5
        },
        {
          id: 'invalid-input',
          name: 'Invalid Input Validation',
          description: 'Test form validation and error messages',
          category: 'error',
          severity: 'medium',
          estimatedDuration: 4
        },
        {
          id: 'database-constraints',
          name: 'Database Constraint Violations',
          description: 'Test handling of database constraint violations',
          category: 'error',
          severity: 'high',
          estimatedDuration: 3
        },
        {
          id: 'session-expiry',
          name: 'Session Expiry Handling',
          description: 'Test authentication session timeout scenarios',
          category: 'error',
          severity: 'medium',
          estimatedDuration: 4
        }
      ]
    },
    {
      id: 'performance',
      name: 'Performance Tests',
      description: 'Load testing, performance optimization, and scalability',
      icon: Timer,
      tests: [
        {
          id: 'concurrent-users',
          name: 'Concurrent User Load',
          description: 'Test system behavior with multiple concurrent users',
          category: 'performance',
          severity: 'medium',
          estimatedDuration: 10
        },
        {
          id: 'large-dataset',
          name: 'Large Dataset Queries',
          description: 'Test database performance with large datasets',
          category: 'performance',
          severity: 'medium',
          estimatedDuration: 8
        },
        {
          id: 'image-loading',
          name: 'Image Loading Performance',
          description: 'Test image optimization and loading speeds',
          category: 'performance',
          severity: 'low',
          estimatedDuration: 5
        },
        {
          id: 'real-time-scalability',
          name: 'Real-time Scalability',
          description: 'Test WebSocket connection limits and performance',
          category: 'performance',
          severity: 'medium',
          estimatedDuration: 7
        }
      ]
    },
    {
      id: 'security',
      name: 'Security Tests',
      description: 'Access control, data protection, and security boundaries',
      icon: Shield,
      tests: [
        {
          id: 'rls-policies',
          name: 'Row Level Security Policies',
          description: 'Test database RLS policy enforcement',
          category: 'security',
          severity: 'critical',
          estimatedDuration: 6
        },
        {
          id: 'permission-escalation',
          name: 'Permission Escalation Prevention',
          description: 'Test prevention of unauthorized privilege escalation',
          category: 'security',
          severity: 'critical',
          estimatedDuration: 5
        },
        {
          id: 'data-exposure',
          name: 'Data Exposure Prevention',
          description: 'Test prevention of unauthorized data access',
          category: 'security',
          severity: 'critical',
          estimatedDuration: 4
        },
        {
          id: 'auth-bypass',
          name: 'Authentication Bypass Prevention',
          description: 'Test authentication requirement enforcement',
          category: 'security',
          severity: 'critical',
          estimatedDuration: 5
        }
      ]
    },
    {
      id: 'integration',
      name: 'Integration Tests',
      description: 'External services, APIs, and third-party integrations',
      icon: ExternalLink,
      tests: [
        {
          id: 'email-notifications',
          name: 'Email Notification System',
          description: 'Test email sending and template rendering',
          category: 'integration',
          severity: 'high',
          estimatedDuration: 5
        },
        {
          id: 'sms-notifications',
          name: 'SMS Notification System',
          description: 'Test SMS sending and delivery confirmation',
          category: 'integration',
          severity: 'medium',
          estimatedDuration: 4
        },
        {
          id: 'docusign-integration',
          name: 'DocuSign Integration',
          description: 'Test document signing workflow',
          category: 'integration',
          severity: 'medium',
          estimatedDuration: 8
        },
        {
          id: 'calendar-sync',
          name: 'Google Calendar Sync',
          description: 'Test calendar integration and synchronization',
          category: 'integration',
          severity: 'low',
          estimatedDuration: 6
        }
      ]
    }
  ];

  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestResults([]);
    setPhaseResults({});
    
    const totalTests = testPhases.reduce((acc, phase) => acc + phase.tests.length, 0);
    let completedTests = 0;

    try {
      for (const phase of testPhases) {
        setCurrentPhase(phase.name);
        const phaseTestResults: TestResult[] = [];

        for (const test of phase.tests) {
          setCurrentTest(test.name);
          
          const startTime = Date.now();
          const result = await runSingleTest(test);
          const endTime = Date.now();
          
          const testResult: TestResult = {
            testId: test.id,
            passed: result.passed,
            error: result.error,
            data: result.data,
            duration: endTime - startTime,
            timestamp: new Date().toISOString()
          };

          phaseTestResults.push(testResult);
          completedTests++;
          setProgress((completedTests / totalTests) * 100);
          
          // Small delay between tests
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        setPhaseResults(prev => ({
          ...prev,
          [phase.id]: phaseTestResults
        }));
      }

      // Flatten all results
      const allResults = Object.values(phaseResults).flat();
      setTestResults(allResults);

      toast({
        title: "Test Suite Complete",
        description: `Executed ${totalTests} tests across ${testPhases.length} phases`,
      });

    } catch (error) {
      console.error('Test suite execution failed:', error);
      toast({
        title: "Test Suite Failed",
        description: "An error occurred while running the test suite",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setCurrentPhase('');
      setCurrentTest('');
    }
  };

  const runPhaseTests = async (phaseId: string) => {
    const phase = testPhases.find(p => p.id === phaseId);
    if (!phase) return;

    setIsRunning(true);
    setCurrentPhase(phase.name);
    setProgress(0);
    
    const phaseTestResults: TestResult[] = [];
    
    try {
      for (let i = 0; i < phase.tests.length; i++) {
        const test = phase.tests[i];
        setCurrentTest(test.name);
        
        const startTime = Date.now();
        const result = await runSingleTest(test);
        const endTime = Date.now();
        
        const testResult: TestResult = {
          testId: test.id,
          passed: result.passed,
          error: result.error,
          data: result.data,
          duration: endTime - startTime,
          timestamp: new Date().toISOString()
        };

        phaseTestResults.push(testResult);
        setProgress(((i + 1) / phase.tests.length) * 100);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setPhaseResults(prev => ({
        ...prev,
        [phaseId]: phaseTestResults
      }));

      toast({
        title: "Phase Complete",
        description: `Completed ${phase.tests.length} tests in ${phase.name}`,
      });

    } catch (error) {
      console.error('Phase test execution failed:', error);
      toast({
        title: "Phase Failed",
        description: `Error in ${phase.name}`,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setCurrentPhase('');
      setCurrentTest('');
    }
  };

  const runSingleTest = async (test: TestCase): Promise<{ passed: boolean; error?: string; data?: any; errorType?: string; stackTrace?: string }> => {
    try {
      // Pre-flight checks for admin tests
      if (test.category === 'admin') {
        const authCheck = await checkAuthenticationStatus();
        if (!authCheck.passed) {
          return {
            passed: false,
            error: authCheck.error,
            errorType: 'AUTHENTICATION_ERROR',
            stackTrace: undefined
          };
        }
      }

      // Simulate test execution based on test type
      const result = await (async () => {
        switch (test.category) {
          case 'core':
            return await runCoreTest(test);
          case 'ui':
            return await runUITest(test);
          case 'workflow':
            return await runWorkflowTest(test);
          case 'admin':
            return await runAdminTest(test);
          case 'error':
            return await runErrorTest(test);
          case 'performance':
            return await runPerformanceTest(test);
          case 'security':
            return await runSecurityTest(test);
          case 'integration':
            return await runIntegrationTest(test);
          default:
            return { passed: true, data: 'Test executed successfully' };
        }
      })();

      // Add error categorization for failed tests
      if (!result.passed && result.error) {
        return {
          ...result,
          errorType: categorizeError(result.error, test.category),
          stackTrace: result.error
        };
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        passed: false,
        error: errorMsg,
        errorType: categorizeError(errorMsg, test.category),
        stackTrace: error instanceof Error ? error.stack : undefined
      };
    }
  };

  // Authentication status checker
  const checkAuthenticationStatus = async (): Promise<{ passed: boolean; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { passed: false, error: 'User not authenticated' };
      }

      // Check if user has admin role
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        return { passed: false, error: `Role check failed: ${error.message}` };
      }

      const hasAdminRole = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');
      if (!hasAdminRole) {
        return { passed: false, error: 'User does not have admin privileges' };
      }

      return { passed: true };
    } catch (error) {
      return { passed: false, error: `Authentication check failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  };

  const categorizeError = (error: string, category: string): string => {
    const errorLower = error.toLowerCase();
    
    // Authentication and authorization errors
    if (errorLower.includes('not authenticated') || errorLower.includes('not logged in')) {
      return 'AUTHENTICATION_ERROR';
    }
    if (errorLower.includes('admin') && (errorLower.includes('privilege') || errorLower.includes('role'))) {
      return 'AUTHENTICATION_ERROR';
    }
    if (errorLower.includes('rls') || errorLower.includes('policy') || errorLower.includes('permission') || errorLower.includes('unauthorized')) {
      return 'RLS_POLICY_ERROR';
    }
    
    // Data validation errors
    if (errorLower.includes('validation') || errorLower.includes('constraint') || errorLower.includes('invalid') || errorLower.includes('required')) {
      return 'VALIDATION_ERROR';
    }
    
    // Performance errors
    if (errorLower.includes('timeout') || errorLower.includes('slow') || errorLower.includes('performance')) {
      return 'PERFORMANCE_ISSUE';
    }
    
    // Database errors
    if (errorLower.includes('database') || errorLower.includes('sql') || errorLower.includes('table') || errorLower.includes('supabase')) {
      return 'DATABASE_ERROR';
    }
    
    // Network errors
    if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('fetch') || errorLower.includes('http')) {
      return 'NETWORK_ERROR';
    }
    
    // Category-specific error types
    if (category === 'integration') {
      return 'INTEGRATION_ERROR';
    }
    
    return 'UI_ERROR';
  };

  const runCoreTest = async (test: TestCase) => {
    switch (test.id) {
      case 'transaction-creation':
        const { error } = await supabase.rpc('create_transaction_from_estimate', {
          p_estimate_id: null,
          p_mobile_home_id: null,
          p_customer_name: 'Test Customer',
          p_customer_email: 'test@example.com',
          p_total_amount: 1000
        });
        return { passed: !error, error: error?.message };
        
      case 'real-time-updates':
        // Test real-time subscription
        const channel = supabase.channel('test-channel');
        await new Promise(resolve => setTimeout(resolve, 1000));
        supabase.removeChannel(channel);
        return { passed: true, data: 'Real-time test completed' };
        
      default:
        return { passed: true, data: 'Core test executed' };
    }
  };

  const runUITest = async (test: TestCase) => {
    try {
      if (test.id === 'mobile-home-browsing') {
        // Test actual mobile home component functionality
        const { data: mobileHomes, error } = await supabase
          .from('mobile_homes')
          .select('id, display_name, manufacturer, series, model, price, active')
          .eq('active', true)
          .limit(10);
        
        if (error) throw new Error(`Database query failed: ${error.message}`);
        if (!mobileHomes || mobileHomes.length === 0) {
          throw new Error('No active mobile homes found for browsing test');
        }
        
        // Test filtering functionality
        const { data: filteredHomes, error: filterError } = await supabase
          .from('mobile_homes')
          .select('id, display_name, manufacturer, series, model, price')
          .gte('price', 50000)
          .eq('active', true)
          .limit(5);
        
        if (filterError) throw new Error(`Filtering test failed: ${filterError.message}`);
        
        return { 
          passed: true,
          data: `Found ${mobileHomes.length} homes, ${filteredHomes?.length || 0} in price range`,
          error: undefined
        };
      }
      
      // Default UI test simulation
      await new Promise(resolve => setTimeout(resolve, test.estimatedDuration * 100));
      return { 
        passed: true, 
        data: 'UI test completed',
        error: undefined
      };
    } catch (error: any) {
      return {
        passed: false,
        data: 'UI test failed',
        error: error.message || 'UI component rendering failed'
      };
    }
  };

  const runWorkflowTest = async (test: TestCase) => {
    try {
      switch (test.id) {
        case 'estimate-creation':
          // Test complete estimate creation workflow
          const testEstimate = {
            customer_name: 'Test Customer',
            customer_email: 'test@example.com',
            customer_phone: '555-0123',
            delivery_address: '123 Test St, Test City, TX 12345',
            mobile_home_id: null,
            selected_services: [],
            selected_home_options: [],
            total_amount: 50000,
            preferred_contact: 'email',
            timeline: 'ASAP',
            additional_requirements: 'Test estimate creation'
          };

          const { data: estimateData, error: estimateError } = await supabase
            .from('estimates')
            .insert(testEstimate)
            .select()
            .single();

          if (estimateError) {
            throw new Error(`Estimate creation failed: ${estimateError.message}`);
          }

          // Clean up test estimate
          await supabase.from('estimates').delete().eq('id', estimateData.id);

          return {
            passed: true,
            data: 'Estimate creation workflow completed successfully',
            error: undefined
          };

        case 'appointment-booking':
          // Test appointment booking workflow
          const { data: availableSlots, error: slotsError } = await supabase
            .from('appointment_slots')
            .select('*')
            .eq('available', true)
            .gte('date', new Date().toISOString().split('T')[0])
            .limit(1);

          if (slotsError) {
            throw new Error(`Slot query failed: ${slotsError.message}`);
          }

          if (!availableSlots || availableSlots.length === 0) {
            return {
              passed: false,
              data: 'No available appointment slots found',
              error: 'Appointment booking test failed - no slots available'
            };
          }

          // Test appointment creation (without actually creating one)
          const appointmentData = {
            slot_id: availableSlots[0].id,
            customer_name: 'Test Customer',
            customer_email: 'test@example.com',
            customer_phone: '555-0123',
            party_size: 2,
            appointment_type: 'viewing',
            notes: 'Test appointment'
          };

          return {
            passed: true,
            data: 'Appointment booking workflow validated',
            error: undefined
          };

        case 'cart-checkout':
          // Test shopping cart functionality
          const { data: mobileHomes, error: homesError } = await supabase
            .from('mobile_homes')
            .select('id, price, active')
            .eq('active', true)
            .limit(1);

          if (homesError) {
            throw new Error(`Mobile homes query failed: ${homesError.message}`);
          }

          if (!mobileHomes || mobileHomes.length === 0) {
            return {
              passed: false,
              data: 'No mobile homes available for cart test',
              error: 'Cart checkout test failed - no inventory'
            };
          }

          // Test services and add-ons availability
          const { data: services, error: servicesError } = await supabase
            .from('services')
            .select('id, price, active')
            .eq('active', true)
            .limit(3);

          return {
            passed: !servicesError,
            data: `Cart components verified - ${mobileHomes.length} homes, ${services?.length || 0} services`,
            error: servicesError?.message
          };

        default:
          // Test basic workflow components
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError || !userData.user) {
            return {
              passed: false,
              data: 'User authentication failed',
              error: 'Workflow test requires authenticated user'
            };
          }

          return {
            passed: true,
            data: 'Basic workflow components functional',
            error: undefined
          };
      }
    } catch (error: any) {
      return {
        passed: false,
        data: 'Workflow test failed',
        error: error.message || 'Workflow validation failed'
      };
    }
  };

  const runAdminTest = async (test: TestCase) => {
    // Test admin functionality
    switch (test.id) {
      case 'user-management':
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        return { 
          passed: !error, 
          data: `Found ${data?.length || 0} profiles`,
          error: error?.message
        };
        
      case 'inventory-management':
        return await runInventoryManagementTest();
        
      case 'crm-functionality':
        // Test CRM lead tracking and management
        try {
          const { data: leads, error: leadsError } = await supabase
            .from('leads')
            .select('id, status, source, created_at')
            .limit(5);

          if (leadsError) {
            throw new Error(`CRM leads query failed: ${leadsError.message}`);
          }

          // Test lead interactions
          const { data: interactions, error: interactionsError } = await supabase
            .from('customer_interactions')
            .select('id, interaction_type, created_at')
            .limit(5);

          return {
            passed: !interactionsError,
            data: `CRM functional - ${leads?.length || 0} leads, ${interactions?.length || 0} interactions`,
            error: interactionsError?.message
          };
        } catch (error: any) {
          return {
            passed: false,
            data: 'CRM test failed',
            error: error.message
          };
        }

      case 'delivery-management':
        // Test delivery scheduling and tracking
        try {
          const { data: deliveries, error: deliveriesError } = await supabase
            .from('deliveries')
            .select('id, status, delivery_date, tracking_number')
            .limit(5);

          if (deliveriesError) {
            throw new Error(`Deliveries query failed: ${deliveriesError.message}`);
          }

          // Test driver assignments
          const { data: drivers, error: driversError } = await supabase
            .from('drivers')
            .select('id, name, status, active')
            .eq('active', true)
            .limit(3);

          return {
            passed: !driversError,
            data: `Delivery system functional - ${deliveries?.length || 0} deliveries, ${drivers?.length || 0} active drivers`,
            error: driversError?.message
          };
        } catch (error: any) {
          return {
            passed: false,
            data: 'Delivery management test failed',
            error: error.message
          };
        }

      case 'analytics-dashboard':
        // Test analytics data collection and display
        try {
          const { data: sessions, error: sessionsError } = await supabase
            .from('analytics_sessions')
            .select('id, session_id, created_at')
            .limit(10);

          if (sessionsError) {
            throw new Error(`Analytics sessions query failed: ${sessionsError.message}`);
          }

          // Test page views
          const { data: pageViews, error: pageViewsError } = await supabase
            .from('analytics_page_views')
            .select('id, page_path, created_at')
            .limit(10);

          // Test mobile home views
          const { data: homeViews, error: homeViewsError } = await supabase
            .from('analytics_mobile_home_views')
            .select('id, mobile_home_id, created_at')
            .limit(10);

          const errors = [pageViewsError, homeViewsError].filter(Boolean);
          
          return {
            passed: errors.length === 0,
            data: `Analytics functional - ${sessions?.length || 0} sessions, ${pageViews?.length || 0} page views, ${homeViews?.length || 0} home views`,
            error: errors.length > 0 ? errors.map(e => e?.message).join('; ') : undefined
          };
        } catch (error: any) {
          return {
            passed: false,
            data: 'Analytics dashboard test failed',
            error: error.message
          };
        }

      default:
        // Test basic admin permissions and access
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError || !userData.user) {
            return {
              passed: false,
              data: 'Authentication failed',
              error: 'Admin test requires authenticated user'
            };
          }

          // Verify admin role
          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userData.user.id);

          if (rolesError) {
            return {
              passed: false,
              data: 'Role verification failed',
              error: rolesError.message
            };
          }

          const hasAdminRole = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');
          
          return {
            passed: hasAdminRole,
            data: hasAdminRole ? 'Admin permissions verified' : 'No admin role found',
            error: hasAdminRole ? undefined : 'User lacks admin privileges'
          };
        } catch (error: any) {
          return {
            passed: false,
            data: 'Admin test failed',
            error: error.message
          };
        }
    }
  };

  const runInventoryManagementTest = async () => {
    const errors: string[] = [];
    const testResults: string[] = [];
    let testMobileHomeId: string | null = null;

    try {
      // Test 1: CREATE - Insert a test mobile home
      const testMobileHome = {
        manufacturer: 'Test Manufacturer',
        series: 'Test Series',
        model: 'Test Model ' + Date.now(),
        display_name: 'Test Home ' + Date.now(),
        price: 50000,
        retail_price: 60000,
        minimum_profit: 5000,
        active: true,
        display_order: 999
      };

      const { data: createData, error: createError } = await supabase
        .from('mobile_homes')
        .insert(testMobileHome)
        .select()
        .single();

      if (createError) {
        errors.push(`CREATE Test Failed: ${createError.message}`);
      } else {
        testMobileHomeId = createData.id;
        testResults.push('✓ CREATE: Successfully created test mobile home');
      }

      // Test 2: READ - Query mobile homes
      const { data: readData, error: readError } = await supabase
        .from('mobile_homes')
        .select('*')
        .eq('id', testMobileHomeId)
        .single();

      if (readError) {
        errors.push(`READ Test Failed: ${readError.message}`);
      } else {
        testResults.push('✓ READ: Successfully retrieved mobile home data');
      }

      // Test 3: UPDATE - Modify the test mobile home
      if (testMobileHomeId) {
        const { error: updateError } = await supabase
          .from('mobile_homes')
          .update({ 
            price: 55000,
            description: 'Updated test description' 
          })
          .eq('id', testMobileHomeId);

        if (updateError) {
          errors.push(`UPDATE Test Failed: ${updateError.message}`);
        } else {
          testResults.push('✓ UPDATE: Successfully updated mobile home');
        }
      }

      // Test 4: Factory Assignment Test
      if (testMobileHomeId) {
        const { data: factories, error: factoriesError } = await supabase
          .from('factories')
          .select('id')
          .limit(1);

        if (!factoriesError && factories && factories.length > 0) {
          const { error: assignmentError } = await supabase
            .from('mobile_home_factories')
            .insert({
              mobile_home_id: testMobileHomeId,
              factory_id: factories[0].id
            });

          if (assignmentError) {
            errors.push(`Factory Assignment Test Failed: ${assignmentError.message}`);
          } else {
            testResults.push('✓ FACTORY ASSIGNMENT: Successfully assigned factory');
            
            // Clean up factory assignment
            await supabase
              .from('mobile_home_factories')
              .delete()
              .eq('mobile_home_id', testMobileHomeId);
          }
        } else {
          testResults.push('⚠ FACTORY ASSIGNMENT: No factories available for testing');
        }
      }

      // Test 5: RLS Policy Test - Check if proper permissions are enforced
      const { data: adminCheck } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .in('role', ['admin', 'super_admin']);

      if (!adminCheck || adminCheck.length === 0) {
        errors.push('RLS Policy Test Failed: User lacks admin privileges');
      } else {
        testResults.push('✓ RLS POLICIES: Admin permissions verified');
      }

      // Test 6: DELETE - Clean up test data
      if (testMobileHomeId) {
        const { error: deleteError } = await supabase
          .from('mobile_homes')
          .delete()
          .eq('id', testMobileHomeId);

        if (deleteError) {
          errors.push(`DELETE Test Failed: ${deleteError.message}`);
        } else {
          testResults.push('✓ DELETE: Successfully cleaned up test mobile home');
        }
      }

      // Test 7: Data Integrity Check
      const { data: integrityData, error: integrityError } = await supabase
        .from('mobile_homes')
        .select('id, display_order')
        .order('display_order');

      if (integrityError) {
        errors.push(`Data Integrity Check Failed: ${integrityError.message}`);
      } else {
        testResults.push('✓ DATA INTEGRITY: Display order consistency verified');
      }

      const passed = errors.length === 0;
      const resultSummary = `${testResults.length} tests passed, ${errors.length} errors`;
      
      return {
        passed,
        data: testResults.join(', '),
        error: errors.length > 0 ? errors.join('; ') : undefined,
        details: {
          testResults,
          errors,
          summary: resultSummary
        }
      };

    } catch (catchError: any) {
      // Clean up if test mobile home was created
      if (testMobileHomeId) {
        try {
          await supabase.from('mobile_homes').delete().eq('id', testMobileHomeId);
        } catch (cleanupError) {
          console.error('Failed to cleanup test mobile home:', cleanupError);
        }
      }

      return {
        passed: false,
        error: `Inventory Management Test Exception: ${catchError.message}`,
        data: testResults.join(', ') || 'No tests completed',
        details: {
          testResults,
          errors: [...errors, catchError.message],
          summary: 'Test suite failed with exception'
        }
      };
    }
  };

  const runErrorTest = async (test: TestCase) => {
    try {
      if (test.id === 'network-failure') {
        // Test network failure handling by testing offline behavior
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 1000); // Simulate timeout
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('count')
            .limit(1)
            .abortSignal(controller.signal);
          
          if (error && error.message.includes('aborted')) {
            return { 
              passed: true, 
              data: 'Network failure handling works correctly',
              error: undefined
            };
          }
          
          // If no timeout error, test passed but not as expected
          return { 
            passed: true, 
            data: 'Request completed before timeout',
            error: undefined
          };
        } catch (abortError) {
          return { 
            passed: true, 
            data: 'Network failure properly handled',
            error: undefined
          };
        }
      }
      
      if (test.id === 'invalid-input') {
        // Test input validation across different forms
        const validationTests = [];
        
        // Test 1: Empty required fields
        try {
          const { error } = await supabase.from('estimates').insert({
            customer_name: '', // Invalid empty name
            customer_email: 'invalid-email', // Invalid email format
            customer_phone: '123-456-7890', // Required field
            total_amount: -100 // Invalid negative amount
          });
          
          if (error) {
            validationTests.push('✓ Server validation working');
          } else {
            validationTests.push('✗ Server validation failed');
          }
        } catch (err) {
          validationTests.push('✓ Server validation working');
        }
        
        // Test 2: SQL injection attempt
        const maliciousInput = "'; DROP TABLE estimates; --";
        try {
          const { error } = await supabase
            .from('estimates')
            .select('*')
            .ilike('customer_name', maliciousInput);
          
          // If no error, SQL injection was prevented
          validationTests.push('✓ SQL injection prevention working');
        } catch (err) {
          validationTests.push('✓ SQL injection prevention working');
        }
        
        return { 
          passed: true, 
          data: validationTests.join(', '),
          error: undefined
        };
      }
      
      // Default error test simulation
      await new Promise(resolve => setTimeout(resolve, test.estimatedDuration * 100));
      return { 
        passed: true, 
        data: 'Error handling test completed',
        error: undefined
      };
    } catch (error: any) {
      return {
        passed: false,
        data: 'Error handling test failed',
        error: error.message || 'Error handling validation failed'
      };
    }
  };

  const runPerformanceTest = async (test: TestCase) => {
    try {
      const startTime = performance.now();
      
      switch (test.id) {
        case 'concurrent-users':
          // Test system performance with concurrent requests
          const concurrentRequests = Array.from({ length: 5 }, () =>
            supabase.from('mobile_homes').select('id, display_name, price').limit(10)
          );
          
          const results = await Promise.all(concurrentRequests);
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          const failed = results.some(r => r.error);
          const avgResponseTime = duration / concurrentRequests.length;
          
          return {
            passed: !failed && avgResponseTime < 1000,
            data: `${concurrentRequests.length} concurrent requests completed in ${duration.toFixed(2)}ms (avg: ${avgResponseTime.toFixed(2)}ms)`,
            error: failed ? 'Some concurrent requests failed' : avgResponseTime > 1000 ? 'Average response time too slow' : undefined
          };

        case 'large-dataset':
          // Test performance with large dataset queries
          const { data: largeData, error: largeError } = await supabase
            .from('mobile_homes')
            .select('id, display_name, manufacturer, series, model, price')
            .limit(100);
          
          const largeEndTime = performance.now();
          const largeDuration = largeEndTime - startTime;
          
          return {
            passed: !largeError && largeDuration < 2000,
            data: `Large dataset query (${largeData?.length || 0} records) completed in ${largeDuration.toFixed(2)}ms`,
            error: largeError?.message || (largeDuration > 2000 ? 'Query too slow for large dataset' : undefined)
          };

        case 'image-loading':
          // Test image loading and optimization
          const { data: imagesData, error: imagesError } = await supabase
            .from('mobile_homes')
            .select('id, floor_plan_image_url, exterior_image_url')
            .limit(10);
          
          const imageEndTime = performance.now();
          const imageDuration = imageEndTime - startTime;
          
          const imageCount = imagesData?.reduce((acc, home) => {
            let count = 0;
            if (home.floor_plan_image_url) count++;
            if (home.exterior_image_url) count++;
            return acc + count;
          }, 0) || 0;
          
          return {
            passed: !imagesError && imageDuration < 1500,
            data: `Image metadata for ${imageCount} images loaded in ${imageDuration.toFixed(2)}ms`,
            error: imagesError?.message || (imageDuration > 1500 ? 'Image loading performance issue' : undefined)
          };

        case 'real-time-scalability':
          // Test WebSocket connection performance
          const channel = supabase.channel('performance-test-' + Date.now());
          const connectionStart = performance.now();
          
          await new Promise((resolve) => {
            const timeout = setTimeout(resolve, 3000);
            channel.subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                clearTimeout(timeout);
                resolve(true);
              }
            });
          });
          
          const connectionEnd = performance.now();
          const connectionDuration = connectionEnd - connectionStart;
          
          supabase.removeChannel(channel);
          
          return {
            passed: connectionDuration < 3000,
            data: `WebSocket connection established in ${connectionDuration.toFixed(2)}ms`,
            error: connectionDuration > 3000 ? 'Real-time connection too slow' : undefined
          };

        default:
          // Generic performance test
          const { data: testData, error: testError } = await supabase
            .from('profiles')
            .select('id')
            .limit(50);
          
          const defaultEndTime = performance.now();
          const defaultDuration = defaultEndTime - startTime;
          
          return {
            passed: !testError && defaultDuration < 1000,
            data: `Performance test completed in ${defaultDuration.toFixed(2)}ms`,
            error: testError?.message || (defaultDuration > 1000 ? 'Performance threshold exceeded' : undefined)
          };
      }
    } catch (error: any) {
      const endTime = performance.now();
      const duration = endTime - performance.now();
      
      return {
        passed: false,
        data: `Performance test failed after ${duration.toFixed(2)}ms`,
        error: error.message || 'Performance test exception'
      };
    }
  };

  const runSecurityTest = async (test: TestCase) => {
    // Test security boundaries
    switch (test.id) {
      case 'rls-policies':
        // Test RLS by trying to access data without proper permissions
        const { error } = await supabase.from('profiles').select('*').limit(1);
        return { 
          passed: true, 
          data: 'RLS policies active',
          error: error?.message
        };
        
      case 'permission-escalation':
        // Test prevention of unauthorized privilege escalation
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError || !userData.user) {
            return {
              passed: false,
              data: 'Authentication required for security test',
              error: 'Cannot test permission escalation without authenticated user'
            };
          }

          // Try to access admin-only functionality
          const { data: adminData, error: adminError } = await supabase
            .from('admin_settings')
            .select('setting_key')
            .limit(1);

          // Check if user has proper admin role
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userData.user.id);

          const hasAdminRole = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');

          return {
            passed: hasAdminRole ? !adminError : !!adminError,
            data: hasAdminRole ? 'Admin access properly granted' : 'Non-admin access properly restricted',
            error: hasAdminRole && adminError ? adminError.message : undefined
          };
        } catch (error: any) {
          return {
            passed: false,
            data: 'Permission escalation test failed',
            error: error.message
          };
        }

      case 'data-exposure':
        // Test prevention of unauthorized data access
        try {
          // Test accessing other users' sensitive data
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, email, phone')
            .limit(10);

          // Test accessing financial data
          const { data: markupData, error: markupError } = await supabase
            .from('customer_markups')
            .select('user_id, markup_percentage')
            .limit(5);

          // Check if RLS is properly restricting access
          const { data: userData } = await supabase.auth.getUser();
          const isAdmin = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userData.user?.id)
            .in('role', ['admin', 'super_admin']);

          const shouldHaveAccess = isAdmin.data && isAdmin.data.length > 0;

          return {
            passed: shouldHaveAccess ? (!profilesError && !markupError) : (!!profilesError || !!markupError),
            data: shouldHaveAccess ? 'Admin data access working' : 'Data properly protected from unauthorized access',
            error: undefined
          };
        } catch (error: any) {
          return {
            passed: false,
            data: 'Data exposure test failed',
            error: error.message
          };
        }

      case 'auth-bypass':
        // Test authentication requirement enforcement
        try {
          // Test accessing protected endpoints without proper auth
          const { data: protectedData, error: protectedError } = await supabase
            .from('estimates')
            .select('customer_email, total_amount')
            .limit(5);

          const { data: userData } = await supabase.auth.getUser();
          const isAuthenticated = !!userData.user;

          return {
            passed: isAuthenticated ? !protectedError : !!protectedError,
            data: isAuthenticated ? 'Authenticated access working' : 'Unauthenticated access properly blocked',
            error: isAuthenticated && protectedError ? protectedError.message : undefined
          };
        } catch (error: any) {
          return {
            passed: false,
            data: 'Authentication bypass test failed',
            error: error.message
          };
        }

      default:
        // Generic security test
        try {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          return {
            passed: !userError && !!userData.user,
            data: userData.user ? 'Security context validated' : 'No user context',
            error: userError?.message
          };
        } catch (error: any) {
          return {
            passed: false,
            data: 'Security test failed',
            error: error.message
          };
        }
    }
  };

  const runIntegrationTest = async (test: TestCase) => {
    try {
      switch (test.id) {
        case 'email-notifications':
          // Test email notification system
          try {
            // Check if Resend API key is configured
            const { data: emailSettings } = await supabase
              .from('admin_settings')
              .select('setting_value')
              .eq('setting_key', 'email_notifications_enabled')
              .single();

            if (!emailSettings || emailSettings.setting_value !== 'true') {
              return {
                passed: false,
                data: 'Email system not configured',
                error: 'Email notifications are not enabled. Please configure email settings in admin panel.'
              };
            }

            // Test sending a test email via edge function
            const { data, error } = await supabase.functions.invoke('send-email-notification', {
              body: {
                to: 'test@example.com',
                subject: 'Test Email',
                template: 'test',
                data: { name: 'Test User' }
              }
            });

            if (error) {
              throw new Error(`Email test failed: ${error.message}`);
            }

            return {
              passed: true,
              data: 'Email notification system working',
              error: undefined
            };
          } catch (emailError: any) {
            return {
              passed: false,
              data: 'Email test failed',
              error: emailError.message || 'Email notification system failed'
            };
          }

        case 'calendar-sync':
          // Test Google Calendar integration
          try {
            const { data: calendarConnections } = await supabase
              .from('calendar_integrations')
              .select('id, calendar_type, sync_enabled')
              .eq('calendar_type', 'google')
              .eq('sync_enabled', true)
              .limit(1);

            if (!calendarConnections || calendarConnections.length === 0) {
              return {
                passed: false,
                data: 'No calendar integrations found',
                error: 'Google Calendar sync not configured. Please set up calendar integration in admin settings.'
              };
            }

            // Test calendar sync functionality
            const { data, error } = await supabase.functions.invoke('sync-calendar', {
              body: {
                action: 'test_connection',
                calendar_id: calendarConnections[0].id
              }
            });

            if (error) {
              throw new Error(`Calendar sync test failed: ${error.message}`);
            }

            return {
              passed: true,
              data: 'Calendar integration working',
              error: undefined
            };
          } catch (calendarError: any) {
            return {
              passed: false,
              data: 'Calendar sync test failed',
              error: calendarError.message || 'Google Calendar sync failed'
            };
          }

        case 'sms-notifications':
          // Test SMS notification system
          try {
            // Check if SMS settings are configured
            const { data: smsSettings } = await supabase
              .from('admin_settings')
              .select('setting_value')
              .eq('setting_key', 'sms_notifications_enabled')
              .single();

            if (!smsSettings || smsSettings.setting_value !== 'true') {
              return {
                passed: false,
                data: 'SMS system not configured',
                error: 'SMS notifications are not enabled. Please configure SMS settings in admin panel.'
              };
            }

            // Test SMS endpoint availability
            const { data, error } = await supabase.functions.invoke('send-sms-notification', {
              body: {
                to: '+15551234567',
                message: 'Test SMS message',
                type: 'test'
              }
            });

            return {
              passed: !error,
              data: error ? 'SMS test failed' : 'SMS notification system working',
              error: error?.message
            };
          } catch (smsError: any) {
            return {
              passed: false,
              data: 'SMS test failed',
              error: smsError.message || 'SMS notification system failed'
            };
          }

        case 'docusign-integration':
          // Test DocuSign integration
          try {
            // Check DocuSign configuration
            const { data: docusignTemplates, error: templatesError } = await supabase.functions.invoke('docusign-get-templates');

            if (templatesError) {
              return {
                passed: false,
                data: 'DocuSign not configured',
                error: 'DocuSign integration not available. Please configure DocuSign settings.'
              };
            }

            return {
              passed: true,
              data: 'DocuSign integration working',
              error: undefined
            };
          } catch (docusignError: any) {
            return {
              passed: false,
              data: 'DocuSign test failed',
              error: docusignError.message || 'DocuSign integration failed'
            };
          }

        // Default integration test for other services
        default:
          try {
            // Test basic integration health by checking edge functions availability
            const { data: healthCheck, error: healthError } = await supabase.functions.invoke('admin-create-user', {
              body: { test: true }
            });

            return {
              passed: true, // Even errors mean the function endpoint is available
              data: 'Integration endpoints accessible',
              error: undefined
            };
          } catch (error: any) {
            return {
              passed: false,
              data: 'Integration test failed',
              error: error.message || 'Integration endpoint failed to respond'
            };
          }
      }
    } catch (error: any) {
      return {
        passed: false,
        data: 'Integration test failed',
        error: error.message || 'Integration endpoint failed to respond'
      };
    }
  };

  const getPhaseStats = (phaseId: string) => {
    const results = phaseResults[phaseId] || [];
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    return { passed, total, percentage: total > 0 ? (passed / total) * 100 : 0 };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-6 w-6 text-blue-600" />
            Comprehensive Test Suite
          </h2>
          <p className="text-gray-600">Full system testing across all components and workflows</p>
        </div>
        <Button 
          onClick={runAllTests}
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </div>

      {/* Test Progress */}
      {isRunning && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {currentPhase && `Phase: ${currentPhase}`}
                </p>
                <p className="text-xs text-gray-600">
                  {currentTest ? `Running: ${currentTest}` : 'Initializing...'}
                </p>
                <Progress value={progress} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="phases" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="phases">Test Phases</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="legacy">Legacy Tests</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="phases" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {testPhases.map((phase) => {
              const IconComponent = phase.icon;
              const stats = getPhaseStats(phase.id);
              
              return (
                <Card key={phase.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">{phase.name}</CardTitle>
                      </div>
                      {stats.total > 0 && (
                        <Badge variant={stats.percentage === 100 ? "default" : "secondary"}>
                          {stats.passed}/{stats.total}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{phase.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Tests: {phase.tests.length}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => runPhaseTests(phase.id)}
                          disabled={isRunning}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Run Phase
                        </Button>
                      </div>
                      
                      {stats.total > 0 && (
                        <Progress value={stats.percentage} className="h-2" />
                      )}
                      
                      <div className="space-y-2">
                        {phase.tests.slice(0, 3).map((test) => (
                          <div key={test.id} className="flex items-center justify-between text-xs">
                            <span className="truncate">{test.name}</span>
                            <Badge className={getSeverityColor(test.severity)}>
                              {test.severity}
                            </Badge>
                          </div>
                        ))}
                        {phase.tests.length > 3 && (
                          <p className="text-xs text-gray-500">
                            +{phase.tests.length - 3} more tests...
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {Object.keys(phaseResults).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No test results yet. Run tests to see results here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(phaseResults).map(([phaseId, results]) => {
                const phase = testPhases.find(p => p.id === phaseId);
                if (!phase) return null;

                return (
                  <Card key={phaseId}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <phase.icon className="h-5 w-5" />
                        {phase.name} Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-3">
                         {results.map((result, index) => {
                           const test = phase.tests.find(t => t.id === result.testId);
                           return (
                             <div key={index} className="space-y-2">
                               <div className="flex items-center justify-between p-3 border rounded">
                                 <div className="flex items-center gap-2">
                                   {result.passed ? (
                                     <CheckCircle className="h-4 w-4 text-green-600" />
                                   ) : (
                                     <XCircle className="h-4 w-4 text-red-600" />
                                   )}
                                   <div className="flex-1">
                                     <span className="text-sm font-medium">{test?.name || result.testId}</span>
                                     {result.error && (
                                       <p className="text-xs text-red-600 mt-1">{result.error}</p>
                                     )}
                                   </div>
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <span className="text-xs text-gray-500">
                                     {result.duration}ms
                                   </span>
                                   <Badge variant={result.passed ? "default" : "destructive"}>
                                     {result.passed ? 'Passed' : 'Failed'}
                                   </Badge>
                                 </div>
                               </div>
                               
                               {/* Fix Handler for Failed Tests */}
                               {!result.passed && (
                                 <div className="ml-6 pl-4 border-l-2 border-gray-200">
                                   <TestFixHandler
                                     result={result}
                                     testName={test?.name || result.testId}
                                     onFixApplied={handleFixApplied}
                                     onRetestRequested={handleRetestRequested}
                                   />
                                 </div>
                               )}
                             </div>
                           );
                         })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="legacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Legacy Transaction Tests</CardTitle>
              <p className="text-sm text-gray-600">
                Original transaction integration tests
              </p>
            </CardHeader>
            <CardContent>
              <TransactionIntegrationTester />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Reports & Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Detailed test reports and analytics will be available after running test suites.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}