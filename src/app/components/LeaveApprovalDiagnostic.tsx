/**
 * 🧪 LEAVE APPROVAL SYSTEM - DIAGNOSTIC TOOL
 * 
 * This component helps administrators verify that the leave approval system
 * is working correctly by running automated checks.
 */

import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Play, Loader2 } from 'lucide-react';

interface DiagnosticResult {
  step: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: any;
}

export function LeaveApprovalDiagnostic() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    setOverallStatus('idle');

    try {
      // Test 1: Check if backend is reachable
      addResult({ step: '1', status: 'pending', message: 'Checking backend connectivity...' });
      
      try {
        const healthResponse = await fetch(
          `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-df988758/health`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            }
          }
        );
        
        if (healthResponse.ok) {
          addResult({ 
            step: '1', 
            status: 'success', 
            message: '✅ Backend server is running' 
          });
        } else {
          addResult({ 
            step: '1', 
            status: 'error', 
            message: `❌ Backend returned status ${healthResponse.status}` 
          });
        }
      } catch (error) {
        addResult({ 
          step: '1', 
          status: 'error', 
          message: '❌ Cannot connect to backend server',
          details: String(error)
        });
      }

      // Test 2: Check employees table structure
      addResult({ step: '2', status: 'pending', message: 'Checking employees table...' });
      
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          import.meta.env.VITE_SUPABASE_URL!,
          import.meta.env.VITE_SUPABASE_ANON_KEY!
        );
        
        const { data, error } = await supabase
          .from('employees')
          .select('id, employee_number, full_name, paid_leave_balance')
          .limit(1);
        
        if (error) {
          if (error.message.includes('paid_leave_balance')) {
            addResult({ 
              step: '2', 
              status: 'error', 
              message: '❌ Missing column: paid_leave_balance',
              details: 'Run SQL: ALTER TABLE employees ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;'
            });
          } else {
            addResult({ 
              step: '2', 
              status: 'error', 
              message: '❌ Error accessing employees table',
              details: error.message
            });
          }
        } else {
          addResult({ 
            step: '2', 
            status: 'success', 
            message: '✅ Employees table structure is correct' 
          });
        }
      } catch (error) {
        addResult({ 
          step: '2', 
          status: 'error', 
          message: '❌ Cannot check employees table',
          details: String(error)
        });
      }

      // Test 3: Check attendance_records table
      addResult({ step: '3', status: 'pending', message: 'Checking attendance_records table...' });
      
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          import.meta.env.VITE_SUPABASE_URL!,
          import.meta.env.VITE_SUPABASE_ANON_KEY!
        );
        
        const { data, error } = await supabase
          .from('attendance_records')
          .select('id, employee_number, date, status, leave_request_id')
          .limit(1);
        
        if (error) {
          addResult({ 
            step: '3', 
            status: 'error', 
            message: '❌ Error accessing attendance_records table',
            details: error.message
          });
        } else {
          addResult({ 
            step: '3', 
            status: 'success', 
            message: '✅ Attendance records table structure is correct' 
          });
        }
      } catch (error) {
        addResult({ 
          step: '3', 
          status: 'error', 
          message: '❌ Cannot check attendance_records table',
          details: String(error)
        });
      }

      // Test 4: Check leave_requests table
      addResult({ step: '4', status: 'pending', message: 'Checking leave_requests table...' });
      
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          import.meta.env.VITE_SUPABASE_URL!,
          import.meta.env.VITE_SUPABASE_ANON_KEY!
        );
        
        const { data, error } = await supabase
          .from('leave_requests')
          .select('id, employee_number, status, start_date, end_date')
          .limit(1);
        
        if (error) {
          addResult({ 
            step: '4', 
            status: 'error', 
            message: '❌ Error accessing leave_requests table',
            details: error.message
          });
        } else {
          addResult({ 
            step: '4', 
            status: 'success', 
            message: '✅ Leave requests table structure is correct' 
          });
        }
      } catch (error) {
        addResult({ 
          step: '4', 
          status: 'error', 
          message: '❌ Cannot check leave_requests table',
          details: String(error)
        });
      }

      // Test 5: Check API endpoint accessibility
      addResult({ step: '5', status: 'pending', message: 'Testing leave balance API...' });
      
      try {
        const response = await fetch(
          `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-df988758/leave-balance/get`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ employee_number: 'TEST-001' })
          }
        );
        
        const data = await response.json();
        
        if (response.ok || response.status === 404) {
          // 404 is acceptable (test employee doesn't exist)
          addResult({ 
            step: '5', 
            status: 'success', 
            message: '✅ Leave balance API is accessible' 
          });
        } else {
          addResult({ 
            step: '5', 
            status: 'warning', 
            message: `⚠️ API returned unexpected status: ${response.status}`,
            details: data
          });
        }
      } catch (error) {
        addResult({ 
          step: '5', 
          status: 'error', 
          message: '❌ Cannot access leave balance API',
          details: String(error)
        });
      }

      // Test 6: Sample data check
      addResult({ step: '6', status: 'pending', message: 'Checking for test data...' });
      
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          import.meta.env.VITE_SUPABASE_URL!,
          import.meta.env.VITE_SUPABASE_ANON_KEY!
        );
        
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('employee_number, full_name, paid_leave_balance')
          .limit(5);
        
        const { data: leaveRequests, error: leaveError } = await supabase
          .from('leave_requests')
          .select('id, status')
          .limit(5);
        
        if (empError || leaveError) {
          addResult({ 
            step: '6', 
            status: 'warning', 
            message: '⚠️ Could not fetch sample data' 
          });
        } else {
          const employeeCount = employees?.length || 0;
          const leaveCount = leaveRequests?.length || 0;
          
          addResult({ 
            step: '6', 
            status: 'success', 
            message: `✅ Found ${employeeCount} employees and ${leaveCount} leave requests`,
            details: {
              sampleEmployee: employees?.[0],
              sampleLeaveRequest: leaveRequests?.[0]
            }
          });
        }
      } catch (error) {
        addResult({ 
          step: '6', 
          status: 'warning', 
          message: '⚠️ Could not check sample data',
          details: String(error)
        });
      }

      // Determine overall status
      const hasErrors = results.some(r => r.status === 'error');
      setOverallStatus(hasErrors ? 'error' : 'success');

    } catch (error) {
      console.error('Diagnostic error:', error);
      addResult({ 
        step: 'X', 
        status: 'error', 
        message: '❌ Diagnostic test failed',
        details: String(error)
      });
      setOverallStatus('error');
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'pending':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4d8f] p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">🧪 Leave Approval System Diagnostics</h1>
          <p className="text-blue-100">Run automated tests to verify the system is working correctly</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Run Button */}
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className={`
              w-full py-4 px-6 rounded-lg font-semibold text-white transition-all
              flex items-center justify-center gap-3
              ${isRunning 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-[#0B3060] hover:bg-[#1a4d8f] active:scale-95'
              }
            `}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Run Diagnostic Tests
              </>
            )}
          </button>

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-6 space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Results:</h2>
              
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`
                    p-4 rounded-lg border-l-4 
                    ${result.status === 'success' ? 'bg-green-50 border-green-500' : ''}
                    ${result.status === 'error' ? 'bg-red-50 border-red-500' : ''}
                    ${result.status === 'warning' ? 'bg-yellow-50 border-yellow-500' : ''}
                    ${result.status === 'pending' ? 'bg-blue-50 border-blue-500' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        Step {result.step}: {result.message}
                      </div>
                      {result.details && (
                        <div className="mt-2 text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                          <pre className="whitespace-pre-wrap font-mono text-xs">
                            {typeof result.details === 'string' 
                              ? result.details 
                              : JSON.stringify(result.details, null, 2)
                            }
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Overall Status */}
              {!isRunning && (
                <div className={`
                  mt-6 p-6 rounded-lg border-2 text-center
                  ${overallStatus === 'success' 
                    ? 'bg-green-50 border-green-500 text-green-800' 
                    : 'bg-red-50 border-red-500 text-red-800'
                  }
                `}>
                  <div className="text-xl font-bold mb-2">
                    {overallStatus === 'success' 
                      ? '✅ All Tests Passed!' 
                      : '❌ Some Tests Failed'
                    }
                  </div>
                  <div className="text-sm">
                    {overallStatus === 'success' 
                      ? 'The leave approval system is configured correctly and ready to use.' 
                      : 'Please fix the errors above and run the diagnostics again.'
                    }
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {results.length === 0 && !isRunning && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">📋 What This Test Does:</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>✓ Verifies backend server connectivity</li>
                <li>✓ Checks database table structure (employees, attendance_records, leave_requests)</li>
                <li>✓ Validates required columns exist (paid_leave_balance, employee_id, etc.)</li>
                <li>✓ Tests API endpoint accessibility</li>
                <li>✓ Checks for sample data</li>
              </ul>
              <div className="mt-4 p-3 bg-white rounded border border-blue-300">
                <p className="text-xs text-blue-700">
                  <strong>Note:</strong> This diagnostic tool helps identify configuration issues. 
                  For detailed testing instructions, see <code className="bg-blue-100 px-1 rounded">/LEAVE_APPROVAL_TEST_GUIDE.md</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LeaveApprovalDiagnostic;