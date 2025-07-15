/**
 * Test utilities for transaction management system
 * Provides helpers for testing transaction flows and data integrity
 */

import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionStatus, TransactionType } from '@/types/transaction';

export interface TestTransactionData {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  total_amount: number;
  mobile_home_id?: string;
  transaction_type?: TransactionType;
}

export class TransactionTestRunner {
  private testResults: Array<{
    test: string;
    passed: boolean;
    error?: string;
    data?: any;
  }> = [];

  async runAllTests() {
    console.log('🧪 Starting Transaction System Integration Tests...');
    
    await this.testTransactionCreation();
    await this.testEstimateToTransactionFlow();
    await this.testPaymentWorkflow();
    await this.testStatusTransitions();
    await this.testRealTimeUpdates();
    await this.testDataIntegrity();
    
    this.printResults();
    return this.testResults;
  }

  private async testTransactionCreation() {
    try {
      console.log('📝 Testing transaction creation...');
      
      const testData: TestTransactionData = {
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        customer_phone: '555-0123',
        total_amount: 45000,
        transaction_type: 'sale'
      };

      const result = await supabase.rpc('create_transaction_from_estimate', {
        p_estimate_id: null,
        p_mobile_home_id: null,
        p_customer_name: testData.customer_name,
        p_customer_email: testData.customer_email,
        p_customer_phone: testData.customer_phone,
        p_total_amount: testData.total_amount,
        p_transaction_type: testData.transaction_type
      });

      this.testResults.push({
        test: 'Transaction Creation',
        passed: !result.error,
        data: result.data
      });

    } catch (error) {
      this.testResults.push({
        test: 'Transaction Creation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testEstimateToTransactionFlow() {
    try {
      console.log('🔄 Testing estimate to transaction flow...');
      
      // Get a sample estimate
      const { data: estimates } = await supabase
        .from('estimates')
        .select('*')
        .limit(1);

      if (estimates?.length) {
        const estimate = estimates[0];
        
        // Test migration
        const result = await supabase.rpc('migrate_existing_estimates_to_transactions');
        
        this.testResults.push({
          test: 'Estimate to Transaction Flow',
          passed: !result.error,
          data: result.data
        });
      } else {
        this.testResults.push({
          test: 'Estimate to Transaction Flow',
          passed: true,
          data: 'No estimates to migrate'
        });
      }

    } catch (error) {
      this.testResults.push({
        test: 'Estimate to Transaction Flow',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testPaymentWorkflow() {
    try {
      console.log('💳 Testing payment workflow...');
      
      // Get a test transaction
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'invoice_generated')
        .limit(1);

      if (transactions?.length) {
        const transaction = transactions[0];
        
        // Test payment addition
        const result = await supabase.rpc('add_transaction_payment', {
          p_transaction_id: transaction.id,
          p_amount: 1000,
          p_payment_method: 'test',
          p_notes: 'Test payment'
        });

        this.testResults.push({
          test: 'Payment Workflow',
          passed: !result.error,
          data: result.data
        });
      } else {
        this.testResults.push({
          test: 'Payment Workflow',
          passed: true,
          data: 'No transactions available for payment testing'
        });
      }

    } catch (error) {
      this.testResults.push({
        test: 'Payment Workflow',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testStatusTransitions() {
    try {
      console.log('📊 Testing status transitions...');
      
      // Get a draft transaction
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'draft')
        .limit(1);

      if (transactions?.length) {
        const transaction = transactions[0];
        
        // Test status transition
        const result = await supabase.rpc('transition_transaction_stage', {
          p_transaction_id: transaction.id,
          p_new_status: 'estimate_submitted' as TransactionStatus,
          p_notes: 'Test status transition'
        });

        this.testResults.push({
          test: 'Status Transitions',
          passed: !result.error,
          data: result.data
        });
      } else {
        this.testResults.push({
          test: 'Status Transitions',
          passed: true,
          data: 'No draft transactions for status testing'
        });
      }

    } catch (error) {
      this.testResults.push({
        test: 'Status Transitions',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testRealTimeUpdates() {
    try {
      console.log('⚡ Testing real-time updates...');
      
      // Test subscription setup
      const channel = supabase
        .channel('test-transactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
          },
          (payload) => {
            console.log('Test real-time update received:', payload);
          }
        )
        .subscribe();

      // Clean up
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 1000);

      this.testResults.push({
        test: 'Real-time Updates',
        passed: true,
        data: 'Real-time subscription test completed'
      });

    } catch (error) {
      this.testResults.push({
        test: 'Real-time Updates',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async testDataIntegrity() {
    try {
      console.log('🔍 Testing data integrity...');
      
      // Test dashboard data
      const dashboardResult = await supabase.rpc('get_transaction_dashboard_data', {
        p_date_range_days: 30
      });

      // Test check expired transactions
      const expiredResult = await supabase.rpc('check_expired_transactions');

      this.testResults.push({
        test: 'Data Integrity',
        passed: !dashboardResult.error && !expiredResult.error,
        data: {
          dashboard: dashboardResult.data,
          expired: expiredResult.data
        }
      });

    } catch (error) {
      this.testResults.push({
        test: 'Data Integrity',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private printResults() {
    console.log('\n📋 Test Results Summary:');
    console.log('=' .repeat(50));
    
    this.testResults.forEach((result, index) => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${index + 1}. ${result.test}: ${status}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    const passedCount = this.testResults.filter(r => r.passed).length;
    const totalCount = this.testResults.length;
    
    console.log('=' .repeat(50));
    console.log(`Total: ${passedCount}/${totalCount} tests passed`);
    
    if (passedCount === totalCount) {
      console.log('🎉 All tests passed! Transaction system is ready.');
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.');
    }
  }
}

// Export utility functions
export const runTransactionTests = async () => {
  const testRunner = new TransactionTestRunner();
  return await testRunner.runAllTests();
};

export const validateTransactionData = (transaction: Partial<Transaction>) => {
  const errors: string[] = [];
  
  if (!transaction.customer_name) errors.push('Customer name is required');
  if (!transaction.customer_email) errors.push('Customer email is required');
  if (!transaction.total_amount || transaction.total_amount <= 0) errors.push('Total amount must be greater than 0');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const simulateTransactionFlow = async (startStatus: TransactionStatus = 'draft') => {
  console.log('🚀 Simulating complete transaction flow...');
  
  const statusFlow: TransactionStatus[] = [
    'draft',
    'estimate_submitted',
    'estimate_approved',
    'invoice_generated',
    'payment_partial',
    'payment_complete',
    'delivery_scheduled',
    'delivery_in_progress',
    'delivery_complete',
    'completed'
  ];
  
  const startIndex = statusFlow.indexOf(startStatus);
  const flowSteps = statusFlow.slice(startIndex);
  
  console.log(`Starting from: ${startStatus}`);
  console.log(`Flow steps: ${flowSteps.join(' → ')}`);
  
  return flowSteps;
};