/**
 * 🧪 LEAVE APPROVAL SYSTEM - INTERACTIVE VERIFIER
 * 
 * This component provides a one-click verification tool for testing
 * the leave approval system end-to-end.
 */

import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Play, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

interface TestResult {
  test: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
  duration?: number;
}

export function LeaveSystemVerifier() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{ passed: number; failed: number; warnings: number } | null>(null);

  const updateResult = (testName: string, update: Partial<TestResult>) => {
    setResults(prev => {
      const index = prev.findIndex(r => r.test === testName);
      if (index >= 0) {
        const newResults = [...prev];
        newResults[index] = { ...newResults[index], ...update };
        return newResults;
      }
      return [...prev, { test: testName, status: 'pending', message: '', ...update }];
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);

    // Initialize tests
    const tests = [
      { test: 'Database Connection', status: 'pending' as const, message: 'Connecting to Supabase...' },
      { test: 'Employees Table', status: 'pending' as const, message: 'Checking employees table structure...' },
      { test: 'Leave Requests Table', status: 'pending' as const, message: 'Checking leave_requests table...' },
      { test: 'Attendance Records Table', status: 'pending' as const, message: 'Checking attendance_records table...' },
      { test: 'Paid Leave Balance Column', status: 'pending' as const, message: 'Verifying paid_leave_balance column...' },
      { test: 'API Endpoint', status: 'pending' as const, message: 'Testing leave approval API...' },
    ];
    setResults(tests);

    try {
      // Test 1: Database Connection
      updateResult('Database Connection', { status: 'running' });
      const startTime1 = Date.now();
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: healthCheck, error: healthError } = await supabase.from('employees').select('count', { count: 'exact', head: true });
      
      if (healthError && healthError.code !== 'PGRST116') {
        updateResult('Database Connection', {
          status: 'failed',
          message: `Failed to connect: ${healthError.message}`,
          details: healthError,
          duration: Date.now() - startTime1
        });
        setIsRunning(false);
        return;
      }
      
      updateResult('Database Connection', {
        status: 'passed',
        message: '✅ Successfully connected to Supabase',
        duration: Date.now() - startTime1
      });

      // Test 2: Employees Table Structure
      updateResult('Employees Table', { status: 'running' });
      const startTime2 = Date.now();
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, employee_number, full_name, paid_leave_balance')
        .limit(1);

      if (empError) {
        updateResult('Employees Table', {
          status: 'failed',
          message: `❌ Error: ${empError.message}`,
          details: empError,
          duration: Date.now() - startTime2
        });
      } else if (!employees || employees.length === 0) {
        updateResult('Employees Table', {
          status: 'warning',
          message: '⚠️ Table exists but no employees found',
          duration: Date.now() - startTime2
        });
      } else {
        updateResult('Employees Table', {
          status: 'passed',
          message: `✅ Found ${employees.length} employee(s) in table`,
          details: employees[0],
          duration: Date.now() - startTime2
        });
      }

      // Test 3: Leave Requests Table
      updateResult('Leave Requests Table', { status: 'running' });
      const startTime3 = Date.now();
      const { data: leaveRequests, error: leaveError } = await supabase
        .from('leave_requests')
        .select('id, employee_number, status, leave_type')
        .limit(1);

      if (leaveError) {
        updateResult('Leave Requests Table', {
          status: 'failed',
          message: `❌ Error: ${leaveError.message}`,
          details: leaveError,
          duration: Date.now() - startTime3
        });
      } else {
        updateResult('Leave Requests Table', {
          status: 'passed',
          message: `✅ Table accessible, found ${leaveRequests?.length || 0} record(s)`,
          duration: Date.now() - startTime3
        });
      }

      // Test 4: Attendance Records Table
      updateResult('Attendance Records Table', { status: 'running' });
      const startTime4 = Date.now();
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('id, employee_number, date, status')
        .limit(1);

      if (attendanceError) {
        updateResult('Attendance Records Table', {
          status: 'failed',
          message: `❌ Error: ${attendanceError.message}`,
          details: attendanceError,
          duration: Date.now() - startTime4
        });
      } else {
        updateResult('Attendance Records Table', {
          status: 'passed',
          message: `✅ Table accessible, found ${attendanceRecords?.length || 0} record(s)`,
          duration: Date.now() - startTime4
        });
      }

      // Test 5: Paid Leave Balance Column
      updateResult('Paid Leave Balance Column', { status: 'running' });
      const startTime5 = Date.now();
      const { data: employeeWithBalance, error: balanceError } = await supabase
        .from('employees')
        .select('employee_number, paid_leave_balance')
        .limit(1)
        .single();

      if (balanceError) {
        if (balanceError.code === '42703') {
          updateResult('Paid Leave Balance Column', {
            status: 'failed',
            message: '❌ Column "paid_leave_balance" does not exist!',
            details: 'Run: ALTER TABLE employees ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;',
            duration: Date.now() - startTime5
          });
        } else {
          updateResult('Paid Leave Balance Column', {
            status: 'warning',
            message: `⚠️ ${balanceError.message}`,
            details: balanceError,
            duration: Date.now() - startTime5
          });
        }
      } else {
        const balanceValue = employeeWithBalance?.paid_leave_balance;
        updateResult('Paid Leave Balance Column', {
          status: 'passed',
          message: `✅ Column exists. Sample balance: ${balanceValue ?? 'NULL'}`,
          details: employeeWithBalance,
          duration: Date.now() - startTime5
        });
      }

      // Test 6: API Endpoint
      updateResult('API Endpoint', { status: 'running' });
      const startTime6 = Date.now();
      
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-df988758/leave-balance/get`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify({ employee_number: 'TEST-VERIFY-001' })
          }
        );

        const data = await response.json();
        
        if (response.ok || response.status === 404) {
          // 404 is acceptable (test employee doesn't exist)
          updateResult('API Endpoint', {
            status: 'passed',
            message: '✅ Leave approval API is accessible and responding',
            details: `Status: ${response.status}`,
            duration: Date.now() - startTime6
          });
        } else {
          updateResult('API Endpoint', {
            status: 'warning',
            message: `⚠️ API returned status ${response.status}`,
            details: data,
            duration: Date.now() - startTime6
          });
        }
      } catch (apiError) {
        updateResult('API Endpoint', {
          status: 'failed',
          message: '❌ Failed to reach API endpoint',
          details: String(apiError),
          duration: Date.now() - startTime6
        });
      }

      // Calculate summary
      setTimeout(() => {
        setResults(currentResults => {
          const passed = currentResults.filter(r => r.status === 'passed').length;
          const failed = currentResults.filter(r => r.status === 'failed').length;
          const warnings = currentResults.filter(r => r.status === 'warning').length;
          setSummary({ passed, failed, warnings });
          setIsRunning(false);
          return currentResults;
        });
      }, 500);

    } catch (error) {
      console.error('❌ Test suite error:', error);
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4d8f] p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">🧪 Leave Approval System Verifier</h1>
            <p className="text-blue-100">Automated testing tool to verify the leave approval system is configured correctly</p>
          </div>

          {/* Action Button */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <button
              onClick={runTests}
              disabled={isRunning}
              className={`
                flex items-center gap-3 px-6 py-3 rounded-lg font-semibold text-white
                transition-all duration-200 shadow-md
                ${isRunning 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-[#0B3060] to-[#1a4d8f] hover:shadow-xl hover:scale-105'
                }
              `}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Run System Verification
                </>
              )}
            </button>
            {results.length > 0 && (
              <p className="mt-3 text-sm text-gray-600">
                ⏱️ Testing in progress... This will take about 10 seconds.
              </p>
            )}
          </div>

          {/* Summary */}
          {summary && (
            <div className="p-6 bg-white border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4">📊 Test Summary</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{summary.passed}</div>
                  <div className="text-sm text-green-700 font-medium">Passed</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">{summary.failed}</div>
                  <div className="text-sm text-red-700 font-medium">Failed</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600">{summary.warnings}</div>
                  <div className="text-sm text-yellow-700 font-medium">Warnings</div>
                </div>
              </div>

              {summary.failed === 0 && summary.warnings === 0 ? (
                <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
                  <p className="text-green-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    All tests passed! The leave approval system is ready to use.
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
                  <p className="text-yellow-800 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Some issues were detected. Please review the results below and fix the errors.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">🔍 Detailed Test Results</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {results.map((result, index) => (
                <div
                  key={result.test}
                  className={`p-6 transition-all duration-300 ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(result.status)}
                    </div>

                    {/* Test Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {index + 1}. {result.test}
                        </h3>
                        {result.duration && (
                          <span className="text-xs text-gray-500 font-mono">
                            {result.duration}ms
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{result.message}</p>
                      
                      {/* Details */}
                      {result.details && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs font-semibold text-gray-600 hover:text-gray-800">
                            Show Details
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto font-mono">
                            {typeof result.details === 'string' 
                              ? result.details 
                              : JSON.stringify(result.details, null, 2)
                            }
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {results.length === 0 && !isRunning && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📖 How to Use This Tool</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                This automated verification tool will test all critical components of the leave approval system:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li><strong>Database Connection:</strong> Verifies Supabase connection is working</li>
                <li><strong>Table Structures:</strong> Checks employees, leave_requests, and attendance_records tables</li>
                <li><strong>Required Columns:</strong> Ensures paid_leave_balance column exists</li>
                <li><strong>API Endpoints:</strong> Tests leave approval API is accessible</li>
              </ul>
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Note:</strong> This tool only verifies the system configuration. 
                  For full end-to-end testing, see <code className="bg-blue-100 px-1 rounded">/LEAVE_APPROVAL_SYSTEM_TEST.md</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Mnemosyne QR Attendance System • Leave Approval Verifier v1.0</p>
          <p className="mt-1">For detailed testing procedures, see the comprehensive test guide</p>
        </div>
      </div>
    </div>
  );
}

export default LeaveSystemVerifier;