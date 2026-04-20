import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Crown, Eye, EyeOff, Loader2, AlertCircle, Key, UserCircle, Database, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { AuthLayout } from '../components/AuthLayout';
import { FormInput } from '../components/FormInput';
import { Button } from '../components/ui/button';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function SuperAdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Check if already logged in
  useEffect(() => {
    const session = localStorage.getItem('superAdminSession');
    if (session) {
      navigate('/super-admin');
    }
  }, [navigate]);

  const loadAccounts = async () => {
    setIsLoadingAccounts(true);
    setConnectionError(null);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 LOADING SUPER ADMIN ACCOUNTS (VIA SERVER)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('API URL:', API_URL);
    
    try {
      const response = await fetch(`${API_URL}/super-admin/list`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response Status:', response.status);
      console.log('Response OK:', response.ok);

      const result = await response.json();
      console.log('Response Data:', result);

      if (!response.ok || !result.success) {
        const errMsg = result.error || `Server error: ${response.status}`;
        console.error('❌ Server Error:', errMsg);
        setConnectionError(errMsg);
        return;
      }

      const accounts = result.data || [];
      console.log(`✅ Successfully loaded ${accounts.length} account(s)`);
      accounts.forEach((acc: any, idx: number) => {
        console.log(`  ${idx + 1}. ${acc.username} (${acc.email || 'no email'})`);
      });
      
      setDbAccounts(accounts);
      
      if (accounts.length === 0) {
        console.log('⚠️ Table exists but is empty');
      }

    } catch (err) {
      console.error('💥 Unexpected Error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setConnectionError(`Network Error: ${errMsg}`);
      toast.error('Failed to connect to server');
    } finally {
      setIsLoadingAccounts(false);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  };

  useEffect(() => {
    if (showDebug) {
      loadAccounts();
    }
  }, [showDebug]);

  const directLogin = async (account: any) => {
    console.log('🚀 Direct login with account:', account);
    
    // Clear old sessions
    localStorage.removeItem('mnemosyne_employee_profile');
    localStorage.removeItem('mnemosyne_admin_profile');
    localStorage.removeItem('mnemosyne_super_admin_profile');
    localStorage.removeItem('employeeSession');
    localStorage.removeItem('adminSession');

    // Store new session
    localStorage.setItem('superAdminSession', JSON.stringify(account));

    const displayName = account.full_name || account.fullName || account.name || account.username || 'Super Admin';
    toast.success(`Welcome, ${displayName}!`);
    
    // Navigate to dashboard
    navigate('/super-admin');
  };

  const testConnection = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TESTING SERVER CONNECTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      const response = await fetch(`${API_URL}/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      console.log('Test Result:', result);

      if (response.ok && result.status === 'ok') {
        console.log('✅ Server connection successful!');
        toast.success('Server connection successful!');
      } else {
        console.error('Connection test failed:', result);
        toast.error('Server connection failed');
      }
    } catch (err) {
      console.error('Test error:', err);
      toast.error('Connection test failed');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 SUPER ADMIN LOGIN ATTEMPT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username:', `"${trimmedUsername}"`);
    console.log('Password:', `"${trimmedPassword}"`);

    try {
      // Use the unified login endpoint
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: trimmedUsername,
          password: trimmedPassword,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const result = await response.json();
      console.log('Response data:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Login failed');
      }

      // Verify it's a super admin account
      if (result.userType !== 'super_admin') {
        throw new Error(`This is a ${result.userType} account. Please use the Super Admin login.`);
      }

      // Clear old sessions
      localStorage.removeItem('mnemosyne_employee_profile');
      localStorage.removeItem('mnemosyne_admin_profile');
      localStorage.removeItem('mnemosyne_super_admin_profile');
      localStorage.removeItem('employeeSession');
      localStorage.removeItem('adminSession');

      // Store new session
      localStorage.setItem('superAdminSession', JSON.stringify(result.data));

      console.log('✅ LOGIN SUCCESSFUL!');

      const displayName = result.data.full_name || result.data.username;
      toast.success(`Welcome back, ${displayName}!`);
      navigate('/super-admin');

    } catch (err) {
      console.error('💥 LOGIN ERROR:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  };

  return (
    <AuthLayout
      title="Super Admin Portal"
      subtitle="Full system administration access"
      icon={Crown}
    >
      {/* Connection Status */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">Server Connection</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <CheckCircle className="w-4 h-4" />
              Ready
            </span>
            <Button
              onClick={testConnection}
              variant="ghost"
              size="sm"
            >
              Test
            </Button>
          </div>
        </div>

        <Button
          onClick={() => setShowDebug(!showDebug)}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <Database className="w-4 h-4" />
          {showDebug ? 'Hide' : 'Show'} Database Accounts
        </Button>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-800 mb-1">Connection Error</p>
              <pre className="text-xs text-yellow-700 whitespace-pre-wrap font-mono bg-yellow-100 p-2 rounded mb-3">
                {connectionError}
              </pre>
              <div className="text-sm text-yellow-700 space-y-2 mb-3">
                <p><strong>Possible Cause:</strong> The Edge Function may not be deployed.</p>
                <p>The server code has been updated but needs to be deployed in the Supabase Dashboard.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.location.href = '/deployment-guide'}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  📘 View Deployment Guide
                </Button>
                <Button
                  onClick={() => window.location.href = '/health'}
                  variant="outline"
                  size="sm"
                >
                  Test Connection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug View */}
      {showDebug && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Database Accounts ({dbAccounts.length})</h3>
            <Button
              onClick={loadAccounts}
              disabled={isLoadingAccounts}
              variant="ghost"
              size="sm"
            >
              {isLoadingAccounts ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>

          {isLoadingAccounts ? (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading accounts...</p>
            </div>
          ) : dbAccounts.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700 mb-1">No accounts found</p>
              <p className="text-xs text-gray-600 mb-3">
                Create your first super admin account to get started.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => navigate('/super-admin/initialize')}
                  size="sm"
                  className="w-full"
                >
                  Create Account
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {dbAccounts.map((account) => (
                <div key={account.id} className="bg-white border border-gray-200 rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{account.username}</div>
                      <div className="text-xs text-gray-600">{account.email || 'No email'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Status: <span className={account.status === 'active' ? 'text-green-600' : 'text-red-600'}>
                          {account.status || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => directLogin(account)}
                      size="sm"
                      className="ml-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Login
                    </Button>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Username:</span>
                        <span className="font-mono font-semibold">{account.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Password:</span>
                        <span className="font-mono font-semibold">
                          {account.password_hash || account.password || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 mb-1">Login Failed</p>
            <p className="text-sm text-red-700 mb-3">{error}</p>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowDebug(true)}
                variant="outline"
                size="sm"
              >
                Show Database Accounts
              </Button>
              <Button
                onClick={() => navigate('/super-admin-password-fixer')}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                🔧 Fix Password
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-5">
        <FormInput
          label="Username"
          icon={UserCircle}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          disabled={isLoading}
          required
          autoComplete="username"
        />

        <FormInput
          label="Password"
          icon={Key}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          disabled={isLoading}
          required
          autoComplete="current-password"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              disabled={isLoading}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Eye className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          }
        />

        <Button
          type="submit"
          disabled={isLoading || !username.trim() || !password.trim()}
          className="w-full h-12 text-base"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <Crown className="w-5 h-5" />
              Sign In as Super Admin
            </>
          )}
        </Button>
      </form>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground mb-3">Need help?</p>
          
          {/* Diagnostic Tools */}
          <Button
            onClick={() => navigate('/super-admin-password-fixer')}
            size="sm"
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold shadow-lg"
          >
            <Key className="w-4 h-4" />
            🔧 Can't Login? Fix Password Here!
          </Button>

          <Button
            onClick={() => navigate('/login-diagnostic')}
            variant="outline"
            size="sm"
            className="w-full bg-purple-50 hover:bg-purple-100 border-purple-200"
          >
            <AlertCircle className="w-4 h-4" />
            Can't Log In? Run Diagnostic
          </Button>

          <Button
            onClick={() => navigate('/super-admin-debug')}
            variant="outline"
            size="sm"
            className="w-full bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
          >
            <Database className="w-4 h-4" />
            🔧 Super Admin Debug Console
          </Button>

          <Button
            onClick={() => navigate('/direct-database-test')}
            variant="outline"
            size="sm"
            className="w-full bg-green-50 hover:bg-green-100 border-green-200"
          >
            <Database className="w-4 h-4" />
            View All Database Accounts
          </Button>

          <Button
            onClick={() => navigate('/super-admin/initialize')}
            variant="outline"
            size="sm"
            className="w-full"
          >
            ⚙️ Create New Super Admin Account
          </Button>

          <div className="pt-3 border-t border-gray-200">
            <Button
              onClick={() => navigate('/login')}
              variant="ghost"
              size="sm"
              className="w-full text-gray-500"
            >
              ← Back to Unified Login
            </Button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}