import { useState } from 'react';
import { Card } from '../components/Card';
import { AlertCircle, CheckCircle, Database, RefreshCw, TestTube } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export default function DatabaseDebug() {
  const [healthData, setHealthData] = useState<any>(null);
  const [testData, setTestData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/database/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      setHealthData(data);
      console.log('Health check results:', data);
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthData({ success: false, error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const runTestInsert = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/database/test-insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const data = await response.json();
      setTestData(data);
      console.log('Test insert results:', data);
      
      // Also refresh health after test
      setTimeout(() => checkHealth(), 1000);
    } catch (error) {
      console.error('Test insert failed:', error);
      setTestData({ success: false, error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Database Diagnostics</h1>
        <p className="text-[#6B7280]">
          Use this tool to diagnose and fix database connection issues
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={checkHealth}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-[#0B3060] hover:bg-[#0B3060]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Database className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`} />
          {isLoading ? 'Checking...' : 'Check Database Health'}
        </button>

        <button
          onClick={runTestInsert}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-[#F7B34C] hover:bg-[#F7B34C]/90 text-[#0B3060] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TestTube className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`} />
          {isLoading ? 'Testing...' : 'Test Employee Insert'}
        </button>
      </div>

      {/* Health Check Results */}
      {healthData && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            {healthData.success ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
            <h2 className="text-xl font-bold text-[#1F2937]">
              Database Health Check
            </h2>
          </div>

          {healthData.health && (
            <div className="space-y-4">
              {/* Connection Status */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Connection Status</h3>
                <div className="flex items-center gap-2">
                  {healthData.health.connection.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="capitalize">{healthData.health.connection.status}</span>
                </div>
                {healthData.health.connection.details && (
                  <p className="text-sm text-gray-600 mt-1">{healthData.health.connection.details}</p>
                )}
              </div>

              {/* Table Counts */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Table Row Counts</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(healthData.health.table_counts).map(([table, count]: [string, any]) => (
                    <div key={table} className="text-sm">
                      <span className="font-medium">{table}:</span>{' '}
                      <span className={count?.error ? 'text-red-600' : 'text-green-600'}>
                        {count?.error || count || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teams */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Teams ({healthData.health.teams_data.length})</h3>
                {healthData.health.teams_data.length === 0 ? (
                  <div className="text-red-600 text-sm">
                    ⚠️ No teams found! Run the setup SQL to create teams.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {healthData.health.teams_data.map((team: any) => (
                      <div key={team.id} className="text-sm">
                        {team.id}. {team.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Employees */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">
                  Recent Employees ({healthData.health.recent_employees.length})
                </h3>
                {healthData.health.recent_employees.length === 0 ? (
                  <div className="text-yellow-600 text-sm">
                    ⚠️ No employees in database
                  </div>
                ) : (
                  <div className="space-y-1">
                    {healthData.health.recent_employees.map((emp: any) => (
                      <div key={emp.employee_number} className="text-sm">
                        <span className="font-mono">{emp.employee_number}</span> - {emp.full_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Errors */}
              {healthData.health.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">Errors</h3>
                  <ul className="space-y-1">
                    {healthData.health.errors.map((error: string, index: number) => (
                      <li key={index} className="text-sm text-red-700">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Test Insert Results */}
      {testData && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            {testData.success ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
            <h2 className="text-xl font-bold text-[#1F2937]">
              Test Insert Results
            </h2>
          </div>

          {testData.message && (
            <div className={`p-4 rounded-lg mb-4 ${
              testData.success 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {testData.message}
              </pre>
            </div>
          )}

          {testData.testResults && (
            <div className="space-y-4">
              {/* Step 1: Teams Check */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {testData.testResults.step1_teams_check?.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <h3 className="font-semibold">Step 1: Teams Check</h3>
                </div>
                {testData.testResults.step1_teams_check && (
                  <pre className="text-sm bg-white p-2 rounded overflow-x-auto">
                    {JSON.stringify(testData.testResults.step1_teams_check, null, 2)}
                  </pre>
                )}
              </div>

              {/* Step 2: Insert Attempt */}
              {testData.testResults.step2_insert_attempt && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {testData.testResults.step2_insert_attempt?.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <h3 className="font-semibold">Step 2: Insert Attempt</h3>
                  </div>
                  <pre className="text-sm bg-white p-2 rounded overflow-x-auto">
                    {JSON.stringify(testData.testResults.step2_insert_attempt, null, 2)}
                  </pre>
                  
                  {/* Show RLS Fix if needed */}
                  {testData.testResults.final_status === 'RLS_BLOCKING' && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                      <h4 className="font-bold text-yellow-800 mb-2">⚠️ RLS IS BLOCKING INSERTS!</h4>
                      <p className="text-sm text-yellow-700 mb-2">
                        Run this SQL in Supabase SQL Editor:
                      </p>
                      <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;`}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Verification */}
              {testData.testResults.step3_verification && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {testData.testResults.step3_verification?.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <h3 className="font-semibold">Step 3: Verification</h3>
                  </div>
                  <pre className="text-sm bg-white p-2 rounded overflow-x-auto">
                    {JSON.stringify(testData.testResults.step3_verification, null, 2)}
                  </pre>
                </div>
              )}

              {/* Final Status */}
              <div className={`p-4 rounded-lg font-bold text-center ${
                testData.testResults.final_status === 'ALL_OK'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                Final Status: {testData.testResults.final_status}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Instructions */}
      {!healthData && !testData && (
        <Card>
          <h2 className="text-xl font-bold text-[#1F2937] mb-4">How to Use</h2>
          <ol className="space-y-3 text-[#6B7280]">
            <li>
              <strong>1. Check Database Health</strong> - Verify connection and see current table status
            </li>
            <li>
              <strong>2. Test Employee Insert</strong> - Try to create a test employee to identify issues
            </li>
            <li>
              <strong>3. Follow Instructions</strong> - If RLS is blocking, run the SQL shown in the results
            </li>
            <li>
              <strong>4. Re-test</strong> - Run the test again to verify the fix worked
            </li>
          </ol>
        </Card>
      )}
    </div>
  );
}
