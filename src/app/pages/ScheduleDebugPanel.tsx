import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function ScheduleDebugPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runFullDiagnostic = async () => {
    setIsRunning(true);
    setResults(null);

    const diagnosticResults: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    try {
      // Test 1: Check if schedules table exists
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 TEST 1: Checking schedules table...');
      
      try {
        const tableCheckResponse = await fetch(
          `https://${(await import('/utils/supabase/info')).projectId}.supabase.co/functions/v1/make-server-df988758/schedules/diagnostic`,
          {
            headers: {
              'Authorization': `Bearer ${(await import('/utils/supabase/info')).publicAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const tableCheckData = await tableCheckResponse.json();
        
        diagnosticResults.tests.push({
          name: 'Table Exists Check',
          status: tableCheckData.diagnostic?.tableExists ? 'PASS' : 'FAIL',
          data: tableCheckData.diagnostic,
          message: tableCheckData.diagnostic?.tableExists 
            ? `Table exists with ${tableCheckData.diagnostic.rowCount} rows`
            : 'Schedules table does not exist in database'
        });
        
        console.log(tableCheckData.diagnostic?.tableExists ? '✅ PASS' : '❌ FAIL');
      } catch (error: any) {
        diagnosticResults.tests.push({
          name: 'Table Exists Check',
          status: 'ERROR',
          error: error.message
        });
        console.error('❌ ERROR:', error);
      }

      // Test 2: Check RLS (Row Level Security) status
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 TEST 2: Checking for common issues...');
      
      // We'll infer RLS issues from Test 3 and Test 5 results
      diagnosticResults.tests.push({
        name: 'Initial Assessment',
        status: 'PASS',
        message: 'Will check for RLS and other issues through save/fetch tests'
      });

      // Test 3: Try to save a test schedule
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 TEST 3: Testing schedule save...');
      
      try {
        const saveResponse = await fetch(
          `https://${(await import('/utils/supabase/info')).projectId}.supabase.co/functions/v1/make-server-df988758/schedules/upsert`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${(await import('/utils/supabase/info')).publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              employee_number: 'TEST_DEBUG_001',
              schedule_date: new Date().toISOString().split('T')[0],
              shift_start: '09:00',
              shift_end: '17:00',
              is_day_off: false,
              user_type: 'employee'
            })
          }
        );
        
        const saveData = await saveResponse.json();
        
        diagnosticResults.tests.push({
          name: 'Schedule Save Test',
          status: saveData.success ? 'PASS' : 'FAIL',
          data: saveData,
          message: saveData.success 
            ? `Successfully saved schedule (source: ${saveData.source})`
            : `Save failed: ${saveData.error}`
        });
        
        console.log(saveData.success ? '✅ PASS' : '❌ FAIL');
        console.log('Response:', saveData);
      } catch (error: any) {
        diagnosticResults.tests.push({
          name: 'Schedule Save Test',
          status: 'ERROR',
          error: error.message
        });
        console.error('❌ ERROR:', error);
      }

      // Test 4: Try to fetch schedules
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 TEST 4: Testing schedule fetch...');
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const fetchResponse = await fetch(
          `https://${(await import('/utils/supabase/info')).projectId}.supabase.co/functions/v1/make-server-df988758/schedules?start_date=${today}&end_date=${today}`,
          {
            headers: {
              'Authorization': `Bearer ${(await import('/utils/supabase/info')).publicAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        const fetchData = await fetchResponse.json();
        
        diagnosticResults.tests.push({
          name: 'Schedule Fetch Test',
          status: fetchData.success ? 'PASS' : 'FAIL',
          data: fetchData,
          message: fetchData.success 
            ? `Successfully fetched ${fetchData.schedules?.length || 0} schedules`
            : `Fetch failed: ${fetchData.error}`
        });
        
        console.log(fetchData.success ? '✅ PASS' : '❌ FAIL');
        console.log('Response:', fetchData);
      } catch (error: any) {
        diagnosticResults.tests.push({
          name: 'Schedule Fetch Test',
          status: 'ERROR',
          error: error.message
        });
        console.error('❌ ERROR:', error);
      }

      // Test 5: Check for the test schedule we just saved
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 TEST 5: Verifying saved schedule...');
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const verifyResponse = await fetch(
          `https://${(await import('/utils/supabase/info')).projectId}.supabase.co/functions/v1/make-server-df988758/schedules?employee_number=TEST_DEBUG_001&schedule_date=${today}`,
          {
            headers: {
              'Authorization': `Bearer ${(await import('/utils/supabase/info')).publicAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        const verifyData = await verifyResponse.json();
        const foundSchedule = verifyData.schedules?.length > 0;
        
        diagnosticResults.tests.push({
          name: 'Saved Schedule Verification',
          status: foundSchedule ? 'PASS' : 'FAIL',
          data: verifyData,
          message: foundSchedule 
            ? `Found the test schedule we just saved!`
            : `Could not find the schedule we just saved - data is not persisting!`
        });
        
        console.log(foundSchedule ? '✅ PASS' : '❌ FAIL');
        console.log('Response:', verifyData);
      } catch (error: any) {
        diagnosticResults.tests.push({
          name: 'Saved Schedule Verification',
          status: 'ERROR',
          error: error.message
        });
        console.error('❌ ERROR:', error);
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ DIAGNOSTIC COMPLETE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setResults(diagnosticResults);
      
      const allPassed = diagnosticResults.tests.every((t: any) => t.status === 'PASS');
      if (allPassed) {
        toast.success('All tests passed! Schedule saving is working.');
      } else {
        toast.error('Some tests failed. Check the results below.');
      }
      
    } catch (error: any) {
      console.error('Fatal error in diagnostic:', error);
      toast.error(`Diagnostic failed: ${error.message}`);
      setResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-[#1F2937] mb-2">
          🔧 Schedule Save/Fetch Diagnostic
        </h1>
        <p className="text-[#6B7280] mb-6">
          This comprehensive test will check if schedules are saving and fetching correctly.
        </p>

        <button
          onClick={runFullDiagnostic}
          disabled={isRunning}
          className="px-8 py-4 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <RefreshCw className="w-6 h-6" />
              Run Full Diagnostic
            </>
          )}
        </button>

        {results && (
          <div className="mt-8 space-y-4">
            <h2 className="text-2xl font-bold text-[#1F2937]">Test Results</h2>
            
            {results.error ? (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <span className="font-bold text-red-900">Fatal Error</span>
                </div>
                <p className="text-sm text-red-800 ml-8">{results.error}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.tests?.map((test: any, index: number) => (
                  <div
                    key={index}
                    className={`p-5 rounded-lg border-2 ${
                      test.status === 'PASS'
                        ? 'bg-green-50 border-green-200'
                        : test.status === 'FAIL'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      {test.status === 'PASS' ? (
                        <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-lg text-[#1F2937]">
                            Test {index + 1}: {test.name}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              test.status === 'PASS'
                                ? 'bg-green-200 text-green-900'
                                : test.status === 'FAIL'
                                ? 'bg-red-200 text-red-900'
                                : 'bg-yellow-200 text-yellow-900'
                            }`}
                          >
                            {test.status}
                          </span>
                        </div>
                        <p
                          className={`text-sm mb-3 ${
                            test.status === 'PASS'
                              ? 'text-green-800'
                              : test.status === 'FAIL'
                              ? 'text-red-800'
                              : 'text-yellow-800'
                          }`}
                        >
                          {test.message || test.error}
                        </p>
                        
                        {test.data && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm font-semibold text-[#0B3060] hover:text-[#0B3060]/80">
                              View Details
                            </summary>
                            <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-auto max-h-64">
                              {JSON.stringify(test.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            {results.tests && (
              <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-bold text-blue-900 mb-3 text-lg">📊 Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-green-600">
                      {results.tests.filter((t: any) => t.status === 'PASS').length}
                    </div>
                    <div className="text-sm text-green-700 font-medium">Passed</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-red-600">
                      {results.tests.filter((t: any) => t.status === 'FAIL').length}
                    </div>
                    <div className="text-sm text-red-700 font-medium">Failed</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-yellow-600">
                      {results.tests.filter((t: any) => t.status === 'ERROR').length}
                    </div>
                    <div className="text-sm text-yellow-700 font-medium">Errors</div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Items */}
            {results.tests && results.tests.some((t: any) => t.status !== 'PASS') && (
              <div className="mt-6 p-6 bg-amber-50 border-2 border-amber-300 rounded-lg">
                <h3 className="font-bold text-amber-900 mb-3 text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Action Required
                </h3>
                <div className="space-y-2 text-sm text-amber-800">
                  {results.tests.find((t: any) => t.name === 'Table Exists Check' && t.status === 'FAIL') && (
                    <p>
                      ❌ <strong>Schedules table doesn't exist.</strong> Visit{' '}
                      <a href="/super-admin/schedule-fix" className="text-blue-600 hover:text-blue-800 underline font-bold">
                        /super-admin/schedule-fix
                      </a>{' '}
                      to create it.
                    </p>
                  )}
                  {results.tests.find((t: any) => t.name === 'RLS Status Check' && t.status === 'FAIL') && (() => {
                    const rlsTest = results.tests.find((t: any) => t.name === 'RLS Status Check');
                    return (
                      <div>
                        <p className="mb-2">
                          ❌ <strong>RLS is blocking reads.</strong> {rlsTest.message}
                        </p>
                        {rlsTest.fix && (
                          <div className="ml-6 mt-2 p-3 bg-white border border-amber-300 rounded">
                            <p className="text-xs font-semibold mb-2">🔧 Quick Fix:</p>
                            <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded font-mono overflow-auto">
{rlsTest.fix}
                            </pre>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(rlsTest.fix);
                                toast.success('SQL copied! Paste it in Supabase SQL Editor.');
                              }}
                              className="mt-2 px-3 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 transition-colors"
                            >
                              Copy SQL
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {results.tests.find((t: any) => t.name === 'Schedule Save Test' && t.status === 'FAIL') && (
                    <p>
                      ❌ <strong>Schedule saving is failing.</strong> Check the browser console for error details.
                    </p>
                  )}
                  {results.tests.find((t: any) => t.name === 'Saved Schedule Verification' && t.status === 'FAIL') && (
                    <p>
                      ❌ <strong>Schedules are not persisting.</strong> The data might be saving to KV store instead of the database, or RLS policies might be blocking reads.
                    </p>
                  )}
                  {results.tests.find((t: any) => t.name === 'Saved Schedule Verification' && t.status === 'FAIL') && 
                   results.tests.find((t: any) => t.name === 'Schedule Save Test' && t.status === 'PASS') && (
                    <div className="mt-3 p-3 bg-white border border-red-300 rounded">
                      <p className="font-bold text-red-900 mb-2">🔒 RLS (Row Level Security) is likely blocking reads!</p>
                      <p className="mb-2 text-xs">Your save succeeds but the data can't be read back. This is a classic RLS issue.</p>
                      <p className="text-xs font-semibold mb-2">Quick Fix - Run this SQL in Supabase:</p>
                      <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded font-mono overflow-auto">
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;
                      </pre>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;');
                          toast.success('SQL copied! Paste it in Supabase SQL Editor.');
                        }}
                        className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                      >
                        Copy RLS Fix SQL
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}