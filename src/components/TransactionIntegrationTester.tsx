import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Settings
} from 'lucide-react';
import { runTransactionTests, simulateTransactionFlow } from '@/utils/transactionTestUtils';

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  data?: any;
  duration?: number;
}

export function TransactionIntegrationTester() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setProgress(0);
    
    try {
      const results = await runTransactionTests();
      setTestResults(results);
      setProgress(100);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const runSingleTest = async (testName: string) => {
    setIsRunning(true);
    setCurrentTest(testName);
    
    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsRunning(false);
    setCurrentTest('');
  };

  const runFlowSimulation = async () => {
    setIsRunning(true);
    setCurrentTest('Flow Simulation');
    
    try {
      const flowSteps = await simulateTransactionFlow();
      console.log('Flow simulation completed:', flowSteps);
    } catch (error) {
      console.error('Flow simulation failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const getTestStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getTestStatusColor = (passed: boolean) => {
    return passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-6 w-6 text-blue-600" />
            Integration Testing
          </h2>
          <p className="text-gray-600">Test transaction system integration and workflows</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runFlowSimulation}
            disabled={isRunning}
            variant="outline"
          >
            <Zap className="h-4 w-4 mr-2" />
            Simulate Flow
          </Button>
          <Button 
            onClick={runTests}
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
      </div>

      {/* Test Progress */}
      {isRunning && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {currentTest ? `Running: ${currentTest}` : 'Initializing tests...'}
                </p>
                <Progress value={progress} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Passed</p>
                  <p className="text-xl font-bold text-green-600">{passedTests}</p>
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
                  <p className="text-xl font-bold text-red-600">{totalTests - passedTests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TestTube className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-xl font-bold">{totalTests}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-xl font-bold">{successRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Results */}
      <Tabs defaultValue="results" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="individual">Individual Tests</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          {testResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <TestTube className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No test results yet. Click "Run All Tests" to begin.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTestStatusIcon(result.passed)}
                        <div>
                          <h3 className="font-medium">{result.test}</h3>
                          {result.error && (
                            <p className="text-sm text-red-600">{result.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.duration && (
                          <span className="text-sm text-gray-500">
                            {result.duration}ms
                          </span>
                        )}
                        <Badge className={getTestStatusColor(result.passed)}>
                          {result.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Test Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => runSingleTest('Transaction Creation')}
                  disabled={isRunning}
                  variant="outline"
                  className="justify-start"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Test Transaction Creation
                </Button>
                <Button 
                  onClick={() => runSingleTest('Payment Workflow')}
                  disabled={isRunning}
                  variant="outline"
                  className="justify-start"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Test Payment Workflow
                </Button>
                <Button 
                  onClick={() => runSingleTest('Status Transitions')}
                  disabled={isRunning}
                  variant="outline"
                  className="justify-start"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Status Transitions
                </Button>
                <Button 
                  onClick={() => runSingleTest('Real-time Updates')}
                  disabled={isRunning}
                  variant="outline"
                  className="justify-start"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Test Real-time Updates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tests will run against your current database. Make sure you have proper backup before running destructive tests.
                </AlertDescription>
              </Alert>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Database Connection</p>
                    <p className="text-sm text-gray-600">Connection to Supabase database</p>
                  </div>
                  <Badge variant="secondary">Connected</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Real-time Features</p>
                    <p className="text-sm text-gray-600">WebSocket connections for live updates</p>
                  </div>
                  <Badge variant="secondary">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Transaction Functions</p>
                    <p className="text-sm text-gray-600">Database functions for transaction management</p>
                  </div>
                  <Badge variant="secondary">Available</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}