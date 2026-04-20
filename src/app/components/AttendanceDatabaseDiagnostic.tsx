import { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface DiagnosticResult {
  test: string;
  status: string;
  message?: string;
  error?: string;
  code?: string;
  details?: string;
  hint?: string;
  count?: number;
  sampleRecords?: any[];
  testRecord?: any;
  insertedId?: number;
}

export function AttendanceDatabaseDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallSuccess, setOverallSuccess] = useState<boolean | null>(null);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);
    setOverallSuccess(null);

    try {
      console.log('🔍 Starting attendance database diagnostic...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/attendance/diagnostic`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      console.log('📊 Diagnostic results:', data);

      setResults(data.results || []);
      setOverallSuccess(data.success);

    } catch (error: any) {
      console.error('❌ Diagnostic error:', error);
      setResults([{
        test: 'Connection Test',
        status: 'FAILED',
        error: error.message
      }]);
      setOverallSuccess(false);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return '✅';
      case 'FAILED':
        return '❌';
      case 'SKIPPED':
        return '⏭️';
      default:
        return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASSED':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'FAILED':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'SKIPPED':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="border-b border-gray-200 pb-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 Attendance Database Diagnostic
          </h1>
          <p className="text-gray-600">
            This tool will check if the attendance_records table exists and can accept new records.
          </p>
        </div>

        {/* Run Button */}
        <div className="mb-8">
          <button
            onClick={runDiagnostic}
            disabled={isRunning}
            className={`
              px-6 py-3 rounded-lg font-semibold text-white
              ${isRunning 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }
              transition-colors
            `}
          >
            {isRunning ? '⏳ Running Diagnostic...' : '▶️ Run Diagnostic'}
          </button>
        </div>

        {/* Overall Status */}
        {overallSuccess !== null && (
          <div className={`
            p-4 rounded-lg border-2 mb-6
            ${overallSuccess 
              ? 'bg-green-50 border-green-300' 
              : 'bg-red-50 border-red-300'
            }
          `}>
            <h2 className={`text-xl font-bold ${overallSuccess ? 'text-green-800' : 'text-red-800'}`}>
              {overallSuccess ? '✅ All Tests Passed!' : '❌ Some Tests Failed'}
            </h2>
            <p className={`mt-2 ${overallSuccess ? 'text-green-700' : 'text-red-700'}`}>
              {overallSuccess 
                ? 'The attendance_records table is properly configured and ready to use.'
                : 'There are issues with the attendance_records table. See details below.'
              }
            </p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Test Results:</h3>
            
            {results.map((result, index) => (
              <div
                key={index}
                className={`
                  border rounded-lg p-5
                  ${getStatusColor(result.status)}
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-lg">
                    {getStatusIcon(result.status)} {result.test}
                  </h4>
                  <span className={`
                    px-3 py-1 rounded-full text-sm font-semibold
                    ${result.status === 'PASSED' ? 'bg-green-200 text-green-800' : ''}
                    ${result.status === 'FAILED' ? 'bg-red-200 text-red-800' : ''}
                    ${result.status === 'SKIPPED' ? 'bg-gray-200 text-gray-800' : ''}
                  `}>
                    {result.status}
                  </span>
                </div>

                {result.message && (
                  <p className="text-sm mb-2">{result.message}</p>
                )}

                {result.error && (
                  <div className="mt-3 p-3 bg-white/50 rounded border border-red-300">
                    <p className="font-semibold text-red-900 mb-1">Error:</p>
                    <p className="text-sm text-red-800 font-mono">{result.error}</p>
                    
                    {result.code && (
                      <p className="text-sm text-red-700 mt-2">
                        <strong>Code:</strong> {result.code}
                      </p>
                    )}
                    
                    {result.details && (
                      <p className="text-sm text-red-700 mt-1">
                        <strong>Details:</strong> {result.details}
                      </p>
                    )}
                    
                    {result.hint && (
                      <p className="text-sm text-red-700 mt-1">
                        <strong>Hint:</strong> {result.hint}
                      </p>
                    )}
                  </div>
                )}

                {result.count !== undefined && (
                  <p className="text-sm mt-2">
                    <strong>Existing Records:</strong> {result.count}
                  </p>
                )}

                {result.sampleRecords && result.sampleRecords.length > 0 && (
                  <div className="mt-3 p-3 bg-white/50 rounded border border-gray-300">
                    <p className="font-semibold mb-2">Sample Records:</p>
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(result.sampleRecords, null, 2)}
                    </pre>
                  </div>
                )}

                {result.insertedId && (
                  <p className="text-sm mt-2 text-green-700">
                    ✅ Successfully inserted and deleted test record (ID: {result.insertedId})
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        {results.length === 0 && !isRunning && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">📋 What This Test Does:</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✓ Verifies the attendance_records table exists in Supabase</li>
              <li>✓ Tests if new records can be inserted into the table</li>
              <li>✓ Checks if existing records can be retrieved</li>
              <li>✓ Identifies any permission or schema issues</li>
            </ul>
            
            <div className="mt-6 p-4 bg-white rounded border border-blue-300">
              <p className="text-blue-900 font-semibold mb-2">If Tests Fail:</p>
              <ol className="list-decimal ml-5 space-y-1 text-sm text-blue-800">
                <li>Copy the error message shown in the results</li>
                <li>Go to Supabase Dashboard → SQL Editor</li>
                <li>Run the CREATE_ATTENDANCE_RECORDS_TABLE.sql script</li>
                <li>Click "Reload schema cache" in Settings → API</li>
                <li>Run this diagnostic again</li>
              </ol>
            </div>
          </div>
        )}

        {/* SQL Script Info */}
        {overallSuccess === false && (
          <div className="mt-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
            <h3 className="font-semibold text-yellow-900 mb-3">
              🛠️ How to Fix Database Issues:
            </h3>
            <div className="space-y-3 text-sm text-yellow-900">
              <p>
                <strong>Step 1:</strong> Go to your Supabase project dashboard
              </p>
              <p>
                <strong>Step 2:</strong> Navigate to <strong>SQL Editor</strong> → <strong>New Query</strong>
              </p>
              <p>
                <strong>Step 3:</strong> Copy and paste the contents of 
                <code className="mx-1 px-2 py-1 bg-yellow-100 rounded font-mono">
                  CREATE_ATTENDANCE_RECORDS_TABLE.sql
                </code>
              </p>
              <p>
                <strong>Step 4:</strong> Click <strong>Run</strong> to execute the script
              </p>
              <p>
                <strong>Step 5:</strong> Go to <strong>Settings</strong> → <strong>API</strong> → 
                Click <strong>"Reload schema cache"</strong>
              </p>
              <p>
                <strong>Step 6:</strong> Run this diagnostic again to verify the fix
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
