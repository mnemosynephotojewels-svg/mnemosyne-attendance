import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Database, RefreshCw, CheckCircle, XCircle, AlertCircle, Key, Save, Eye, EyeOff } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function SuperAdminPasswordFixer() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>({});
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

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

  useEffect(() => {
    fetchAccounts();
  }, []);

  const testPassword = async (account: any, testPasswordValue: string) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TESTING PASSWORD');
    console.log('Username:', account.username);
    console.log('Test Password:', testPasswordValue);
    console.log('Stored Password Hash:', account.password_hash || account.password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: account.username, 
          password: testPasswordValue 
        }),
      });

      const result = await response.json();
      console.log('Login Result:', result);

      setTestResults((prev: any) => ({
        ...prev,
        [account.id]: {
          success: result.success,
          message: result.success ? '✅ Password is correct!' : `❌ ${result.error}`,
          userType: result.userType
        }
      }));

      if (result.success) {
        toast.success(`✅ Password works! This is the correct password for ${account.username}`);
      } else {
        toast.error(`❌ Password failed: ${result.error}`);
      }
    } catch (err: any) {
      console.error('❌ Test error:', err);
      setTestResults((prev: any) => ({
        ...prev,
        [account.id]: {
          success: false,
          message: `❌ Error: ${err.message}`
        }
      }));
      toast.error(`Test failed: ${err.message}`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };

  const updatePassword = async (accountId: string, username: string, newPassword: string) => {
    if (!newPassword || newPassword.trim().length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 UPDATING PASSWORD');
    console.log('Account ID:', accountId);
    console.log('Username:', username);
    console.log('New Password:', newPassword);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/super-admin/update-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: accountId,
          password: newPassword
        }),
      });

      const result = await response.json();
      console.log('Update Result:', result);

      if (result.success) {
        toast.success('✅ Password updated successfully!');
        fetchAccounts(); // Refresh the list
        
        // Test the new password
        setTimeout(() => {
          testPassword({ id: accountId, username, password_hash: newPassword }, newPassword);
        }, 500);
      } else {
        toast.error(`Failed to update password: ${result.error}`);
      }
    } catch (err: any) {
      console.error('❌ Update error:', err);
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };

  const togglePasswordVisibility = (accountId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl p-8 text-white shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
              <Key className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Super Admin Password Fixer</h1>
              <p className="text-red-100">Test and update your super admin password</p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button
              onClick={fetchAccounts}
              disabled={isLoading}
              className="bg-white/20 hover:bg-white/30 backdrop-blur"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Accounts
            </Button>
            <Button
              onClick={() => navigate('/super-admin-debug')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur"
            >
              <Database className="w-4 h-4" />
              Debug Console
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

        {/* Instructions */}
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 mb-3">How to Fix Your Login</h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="bg-white/50 rounded-lg p-3">
                  <p className="font-semibold mb-2">Step 1: Test Current Password</p>
                  <p>Look at the "Stored Password Hash" field below. Try logging in with that exact value as your password.</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3">
                  <p className="font-semibold mb-2">Step 2: Test the Password</p>
                  <p>Click "🧪 Test Current Password" to verify if the stored password works.</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3">
                  <p className="font-semibold mb-2">Step 3: Update if Needed</p>
                  <p>If the test fails, enter a new password (e.g., "admin123") and click "💾 Update Password".</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3">
                  <p className="font-semibold mb-2">Step 4: Login</p>
                  <p>After updating, use the new password to log in at <code className="bg-blue-100 px-1 rounded">/super-admin/login</code></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Accounts List */}
        {isLoading && !accounts.length ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <RefreshCw className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Loading accounts...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold mb-2">No super admin accounts found</p>
            <p className="text-sm text-gray-500 mb-4">Create one to get started</p>
            <Button
              onClick={() => navigate('/super-admin/initialize')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              Create Super Admin Account
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {accounts.map((account) => {
              const passwordField = account.password_hash || account.password || '';
              const testResult = testResults[account.id];
              const isPasswordVisible = showPasswords[account.id];

              return (
                <div key={account.id} className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{account.username}</h3>
                        <p className="text-sm text-gray-600">{account.email || 'No email'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Account ID</p>
                        <p className="text-sm font-mono">{account.id}</p>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6">
                    {/* Current Password Display */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-gray-700">
                          Stored Password Hash (from database)
                        </label>
                        <button
                          onClick={() => togglePasswordVisibility(account.id)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                          {isPasswordVisible ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Show
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                        <p className="font-mono text-lg font-bold text-gray-900">
                          {isPasswordVisible ? passwordField : '••••••••••••'}
                        </p>
                        <p className="text-xs text-yellow-700 mt-2">
                          ⚠️ Try logging in with this exact value as your password
                        </p>
                      </div>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                      <div className={`rounded-lg p-4 border-2 ${
                        testResult.success 
                          ? 'bg-green-50 border-green-300' 
                          : 'bg-red-50 border-red-300'
                      }`}>
                        <p className={`font-semibold ${
                          testResult.success ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {testResult.message}
                        </p>
                        {testResult.userType && (
                          <p className="text-sm text-gray-600 mt-1">
                            User type: {testResult.userType}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Test Button */}
                    <Button
                      onClick={() => testPassword(account, passwordField)}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                      size="lg"
                    >
                      🧪 Test Current Password
                    </Button>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white px-4 text-sm text-gray-500 font-semibold">
                          OR UPDATE PASSWORD
                        </span>
                      </div>
                    </div>

                    {/* Update Password Form */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newPassword = formData.get('newPassword') as string;
                        updatePassword(account.id, account.username, newPassword);
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="text"
                          name="newPassword"
                          placeholder="Enter new password (e.g., admin123)"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-mono"
                          required
                          minLength={4}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Minimum 4 characters. Example: admin123, superadmin, password123
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        size="lg"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            💾 Update Password
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Back Button */}
        <div className="text-center">
          <Button
            onClick={() => navigate('/super-admin/login')}
            variant="outline"
            size="lg"
            className="bg-white"
          >
            ← Back to Super Admin Login
          </Button>
        </div>
      </div>
    </div>
  );
}
