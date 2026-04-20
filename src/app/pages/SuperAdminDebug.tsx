import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from '../components/ui/button';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function SuperAdminDebug() {
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tableStructure, setTableStructure] = useState<any>(null);

  const fetchAccounts = async () => {
    setIsLoading(true);
    setError(null);
    console.log('🔍 Fetching super admin accounts...');

    try {
      const response = await fetch(`${API_URL}/super-admin/list`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      console.log('Response:', result);

      if (result.success) {
        setAccounts(result.data || []);
        console.log('✅ Accounts loaded:', result.data);
      } else {
        setError(result.error || 'Failed to fetch accounts');
      }
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTableStructure = async () => {
    setIsLoading(true);
    console.log('🔍 Fetching table structure...');

    try {
      const response = await fetch(`${API_URL}/debug/table-structure`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      console.log('Table Structure:', result);
      setTableStructure(result);
    } catch (err: any) {
      console.error('❌ Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const testLogin = async (username: string, password: string) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TESTING LOGIN');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      console.log('Login Result:', result);

      if (result.success) {
        alert(`✅ Login successful!\nUser Type: ${result.userType}\nData: ${JSON.stringify(result.data, null, 2)}`);
      } else {
        alert(`❌ Login failed!\nError: ${result.error}`);
      }
    } catch (err: any) {
      console.error('❌ Login error:', err);
      alert(`❌ Login error: ${err.message}`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };

  useEffect(() => {
    fetchAccounts();
    fetchTableStructure();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <Database className="w-12 h-12" />
            <div>
              <h1 className="text-3xl font-bold">Super Admin Debug Console</h1>
              <p className="text-purple-100">Database diagnostic and testing tool</p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button
              onClick={fetchAccounts}
              disabled={isLoading}
              className="bg-white/20 hover:bg-white/30"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Accounts
            </Button>
            <Button
              onClick={fetchTableStructure}
              disabled={isLoading}
              className="bg-white/20 hover:bg-white/30"
            >
              <Database className="w-4 h-4" />
              Check Table Structure
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Table Structure */}
        {tableStructure && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Table Structure Analysis
            </h2>
            
            {tableStructure.tables && (
              <div className="space-y-4">
                {Object.entries(tableStructure.tables).map(([tableName, info]: [string, any]) => (
                  <div key={tableName} className="border-2 border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-bold text-lg capitalize">{tableName}</h3>
                      {info.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>

                    {info.status === 'success' ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <strong>Record Count:</strong> {info.recordCount}
                        </p>
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">Columns:</p>
                          <div className="flex flex-wrap gap-2">
                            {info.columns?.map((col: string) => (
                              <span
                                key={col}
                                className={`px-3 py-1 rounded-full text-xs font-mono ${
                                  col === 'password_hash' || col === 'password'
                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                    : col === 'username'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>
                        {info.sampleData && (
                          <div className="mt-3 bg-gray-50 rounded p-3">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Sample Data:</p>
                            <pre className="text-xs font-mono overflow-x-auto">
                              {JSON.stringify(info.sampleData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm text-red-700 font-mono">{info.error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Super Admin Accounts */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Super Admin Accounts ({accounts.length})
          </h2>

          {isLoading && !accounts.length ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Loading accounts...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
              <p className="text-gray-600 font-semibold mb-2">No super admin accounts found</p>
              <p className="text-sm text-gray-500">Create one to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account, index) => {
                const columns = Object.keys(account);
                const hasPasswordHash = columns.includes('password_hash');
                const hasPassword = columns.includes('password');
                const passwordField = hasPasswordHash ? 'password_hash' : hasPassword ? 'password' : null;
                const passwordValue = passwordField ? account[passwordField] : 'NO PASSWORD FIELD';

                return (
                  <div key={account.id || index} className="border-2 border-gray-200 rounded-lg p-5 hover:border-purple-300 transition-colors">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">ID</p>
                        <p className="font-mono text-sm">{account.id || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Username</p>
                        <p className="font-mono text-sm font-bold">{account.username || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Full Name</p>
                        <p className="text-sm">{account.full_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Email</p>
                        <p className="text-sm">{account.email || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                          Password Field: <span className={passwordField ? 'text-green-600' : 'text-red-600'}>
                            {passwordField || 'MISSING'}
                          </span>
                        </p>
                        <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                          {passwordValue}
                        </p>
                      </div>
                    </div>

                    {/* All Columns */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-purple-600">
                        View All Columns ({columns.length})
                      </summary>
                      <div className="mt-3 bg-gray-50 rounded p-3">
                        <pre className="text-xs font-mono overflow-x-auto">
                          {JSON.stringify(account, null, 2)}
                        </pre>
                      </div>
                    </details>

                    {/* Test Login Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Button
                        onClick={() => testLogin(account.username, passwordValue)}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      >
                        🧪 Test Login with This Account
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Debug Instructions
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>1. Check the <strong>Table Structure Analysis</strong> to see which columns exist</li>
            <li>2. Verify the <strong>password field</strong> (should be <code className="bg-blue-100 px-1 rounded">password_hash</code> or <code className="bg-blue-100 px-1 rounded">password</code>)</li>
            <li>3. Click <strong>"Test Login"</strong> to test authentication with actual credentials</li>
            <li>4. Check browser console for detailed logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
