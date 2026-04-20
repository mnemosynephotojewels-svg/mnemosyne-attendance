import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Play, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

interface TestResult {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

export function LoginDiagnostic() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const updateResult = (step: string, status: TestResult['status'], message: string, details?: any) => {
    setResults(prev => {
      const existing = prev.find(r => r.step === step);
      if (existing) {
        return prev.map(r => r.step === step ? { step, status, message, details } : r);
      }
      return [...prev, { step, status, message, details }];
    });
  };

  const runDiagnostics = async () => {
    setRunning(true);
    setResults([]);

    // Step 1: Test Backend Connection
    updateResult('backend', 'running', 'Testing backend connection...');
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        }
      });
      
      if (response.ok) {
        updateResult('backend', 'success', 'Backend is online and responding');
      } else {
        updateResult('backend', 'error', `Backend returned status ${response.status}`, { status: response.status });
      }
    } catch (error: any) {
      updateResult('backend', 'error', 'Cannot connect to backend', { error: error.message });
      setRunning(false);
      return;
    }

    // Step 2: Fetch Database Accounts
    updateResult('database', 'running', 'Fetching accounts from database...');
    let accounts: any = null;
    try {
      const response = await fetch(`${API_BASE_URL}/debug/accounts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        updateResult('database', 'error', 'Failed to fetch accounts', { 
          status: response.status, 
          error: data.error 
        });
        setRunning(false);
        return;
      }

      accounts = data.data;
      const totalAccounts = accounts.totalAccounts || 0;
      
      if (totalAccounts === 0) {
        updateResult('database', 'error', 'No accounts found in database', {
          message: 'Your database tables are empty. You need to create accounts first.'
        });
        setRunning(false);
        return;
      }

      updateResult('database', 'success', `Found ${totalAccounts} accounts`, {
        employees: accounts.employees?.length || 0,
        admins: accounts.admins?.length || 0,
        superAdmins: accounts.superAdmins?.length || 0
      });
    } catch (error: any) {
      updateResult('database', 'error', 'Error fetching accounts', { error: error.message });
      setRunning(false);
      return;
    }

    // Step 3: Test Login with First Available Account
    updateResult('login', 'running', 'Testing login with first account...');
    
    let testAccount: any = null;
    let testUsername = '';
    let testPassword = '';
    let accountType = '';

    if (accounts.employees && accounts.employees.length > 0) {
      testAccount = accounts.employees[0];
      testUsername = testAccount.employee_number || testAccount.employee_id || testAccount.id;
      testPassword = testAccount.password;
      accountType = 'employee';
    } else if (accounts.admins && accounts.admins.length > 0) {
      testAccount = accounts.admins[0];
      testUsername = testAccount.admin_id || testAccount.admin_number || testAccount.username || testAccount.id;
      testPassword = testAccount.password;
      accountType = 'admin';
    } else if (accounts.superAdmins && accounts.superAdmins.length > 0) {
      testAccount = accounts.superAdmins[0];
      testUsername = testAccount.username || testAccount.id;
      testPassword = testAccount.password;
      accountType = 'super_admin';
    }

    if (!testAccount) {
      updateResult('login', 'error', 'No valid test account found');
      setRunning(false);
      return;
    }

    console.log('🧪 Testing login with:', {
      type: accountType,
      username: testUsername,
      password: testPassword
    });

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          username: testUsername,
          password: testPassword
        }),
      });

      const data = await response.json();
      
      console.log('Login response:', data);

      if (data.success) {
        updateResult('login', 'success', `Login successful as ${accountType}!`, {
          userType: data.userType,
          username: testUsername,
          fullData: data.data
        });
      } else {
        updateResult('login', 'error', `Login failed: ${data.error}`, {
          username: testUsername,
          password: testPassword,
          accountType: accountType,
          response: data
        });
      }
    } catch (error: any) {
      updateResult('login', 'error', 'Login request failed', { 
        error: error.message,
        username: testUsername
      });
    }

    setRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Login
          </button>
        </div>

        {/* Title */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-[#0B3060] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Login Diagnostic Tool
          </h1>
          <p className="text-gray-600 mb-6">
            This tool will run a series of tests to identify why you can't log in.
          </p>
          
          <button
            onClick={runDiagnostics}
            disabled={running}
            className="flex items-center gap-2 px-6 py-3 bg-[#0B3060] hover:bg-[#1a4a8a] text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Diagnostics...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Run Full Diagnostic
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`bg-white/95 backdrop-blur-xl rounded-xl shadow-xl p-6 border-2 ${
                  result.status === 'success' ? 'border-green-200' :
                  result.status === 'error' ? 'border-red-200' :
                  result.status === 'running' ? 'border-blue-200' :
                  'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {result.step === 'backend' && 'Step 1: Backend Connection'}
                      {result.step === 'database' && 'Step 2: Database Access'}
                      {result.step === 'login' && 'Step 3: Login Test'}
                    </h3>
                    <p className={`text-sm ${
                      result.status === 'error' ? 'text-red-700 font-semibold' : 'text-gray-600'
                    }`}>
                      {result.message}
                    </p>

                    {/* Details */}
                    {result.details && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Details:</p>
                        <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {result.status === 'error' && result.step === 'database' && (
                      <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                        <p className="text-sm font-semibold text-yellow-900 mb-2">
                          ⚠️ No accounts found in your database
                        </p>
                        <p className="text-sm text-yellow-800 mb-3">
                          You need to add accounts to your Supabase database first:
                        </p>
                        <ol className="text-sm text-yellow-800 space-y-2 ml-4 list-decimal">
                          <li>Go to your Supabase project dashboard</li>
                          <li>Click "Table Editor" in the left menu</li>
                          <li>Select the "employees", "admins", or "super_admin" table</li>
                          <li>Click "Insert" → "Insert row"</li>
                          <li>Add your account details (username, password, etc.)</li>
                          <li>Click "Save"</li>
                          <li>Return here and run the diagnostic again</li>
                        </ol>
                      </div>
                    )}

                    {result.status === 'success' && result.step === 'login' && (
                      <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                        <p className="text-sm font-semibold text-green-900 mb-2">
                          ✅ Login is working! You can now log in with your credentials.
                        </p>
                        <button
                          onClick={() => navigate('/login')}
                          className="mt-2 px-4 py-2 bg-[#0B3060] hover:bg-[#1a4a8a] text-white rounded-lg text-sm font-bold transition-colors"
                        >
                          Go to Login Page
                        </button>
                      </div>
                    )}

                    {result.status === 'error' && result.step === 'login' && (
                      <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                        <p className="text-sm font-semibold text-red-900 mb-2">
                          ❌ Login failed even though accounts exist
                        </p>
                        <p className="text-sm text-red-800 mb-3">
                          Tested credentials:
                        </p>
                        <ul className="text-sm text-red-800 space-y-1 ml-4">
                          <li><strong>Username:</strong> {result.details?.username}</li>
                          <li><strong>Password:</strong> {result.details?.password}</li>
                          <li><strong>Account Type:</strong> {result.details?.accountType}</li>
                        </ul>
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
                          <p className="text-xs font-bold text-yellow-900 mb-2">🔍 CRITICAL DEBUGGING STEPS:</p>
                          <ol className="text-xs text-yellow-800 space-y-2 list-decimal ml-4">
                            <li>Open your Supabase Dashboard</li>
                            <li>Click "Edge Functions" in the left menu</li>
                            <li>Click on "make-server-df988758" function</li>
                            <li>Click "Logs" tab</li>
                            <li>Look for the most recent login attempt</li>
                            <li>The logs will show EXACTLY which table was checked and why the password didn't match</li>
                            <li>Screenshot the logs and check what the actual stored password is</li>
                          </ol>
                        </div>
                        <p className="text-sm text-red-800 mt-3 font-semibold">
                          The backend has EXTENSIVE logging. Check your Supabase Edge Function logs to see the detailed error with character-by-character password comparison.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        {results.length === 0 && (
          <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">What this tool does:</h2>
            <ol className="space-y-3 text-gray-700 ml-4 list-decimal">
              <li className="text-sm">
                <strong>Tests Backend Connection:</strong> Verifies that the Supabase Edge Function is running
              </li>
              <li className="text-sm">
                <strong>Checks Database:</strong> Fetches all accounts from your Supabase tables
              </li>
              <li className="text-sm">
                <strong>Tests Login:</strong> Attempts to log in with the first account found
              </li>
            </ol>
            <p className="text-sm text-gray-600 mt-4">
              Click "Run Full Diagnostic" above to start the tests.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}