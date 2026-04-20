import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Wrench, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  Play,
  Database,
  Server,
  User,
  Eye,
  EyeOff,
  Key,
  RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

interface Issue {
  id: string;
  title: string;
  status: 'checking' | 'ok' | 'error' | 'warning';
  message: string;
  fix?: () => Promise<void>;
  fixLabel?: string;
}

export function OneClickFix() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [testUsername, setTestUsername] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [supabaseClient, setSupabaseClient] = useState<any>(null);

  useEffect(() => {
    initSupabase();
  }, []);

  const initSupabase = async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );
    setSupabaseClient(client);
  };

  const updateIssue = (id: string, updates: Partial<Issue>) => {
    setIssues(prev => prev.map(issue => 
      issue.id === id ? { ...issue, ...updates } : issue
    ));
  };

  const addIssue = (issue: Issue) => {
    setIssues(prev => [...prev, issue]);
  };

  const runFullDiagnostic = async () => {
    setIsChecking(true);
    setIssues([]);
    setAccounts([]);

    console.log('🔍 STARTING FULL SYSTEM DIAGNOSTIC...');

    // Issue 1: Check Backend
    addIssue({
      id: 'backend',
      title: 'Backend Server',
      status: 'checking',
      message: 'Checking if Edge Function is deployed...'
    });

    let backendOk = false;
    try {
      const response = await fetch(`${API_URL}/health`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      if (response.ok) {
        backendOk = true;
        updateIssue('backend', {
          status: 'ok',
          message: '✅ Backend server is running'
        });
      } else {
        updateIssue('backend', {
          status: 'error',
          message: '❌ Backend not responding - Edge Function not deployed',
          fixLabel: 'Deploy Backend',
          fix: async () => {
            navigate('/manual-deployment-guide');
          }
        });
        setIsChecking(false);
        return;
      }
    } catch (error) {
      updateIssue('backend', {
        status: 'error',
        message: '❌ Cannot connect to backend',
        fixLabel: 'Deploy Backend',
        fix: async () => {
          navigate('/manual-deployment-guide');
        }
      });
      setIsChecking(false);
      return;
    }

    // Issue 2: Check Database Tables
    if (backendOk && supabaseClient) {
      addIssue({
        id: 'tables',
        title: 'Database Tables',
        status: 'checking',
        message: 'Checking database tables...'
      });

      try {
        const { data: employees, error: empError } = await supabaseClient
          .from('employees')
          .select('count')
          .limit(1);

        const { data: admins, error: adminError } = await supabaseClient
          .from('admins')
          .select('count')
          .limit(1);

        const { data: superAdmins, error: superError } = await supabaseClient
          .from('super_admin')
          .select('count')
          .limit(1);

        if (empError || adminError || superError) {
          updateIssue('tables', {
            status: 'error',
            message: '❌ Database tables not found',
            fixLabel: 'Create Tables',
            fix: async () => {
              navigate('/setup');
            }
          });
          setIsChecking(false);
          return;
        }

        updateIssue('tables', {
          status: 'ok',
          message: '✅ All database tables exist'
        });

      } catch (error: any) {
        updateIssue('tables', {
          status: 'error',
          message: `❌ Database error: ${error.message}`,
          fixLabel: 'Setup Database',
          fix: async () => {
            navigate('/setup');
          }
        });
        setIsChecking(false);
        return;
      }

      // Issue 3: Check for User Accounts
      addIssue({
        id: 'accounts',
        title: 'User Accounts',
        status: 'checking',
        message: 'Looking for user accounts...'
      });

      try {
        const allAccounts: any[] = [];

        // Get super admins
        const { data: superAdmins } = await supabaseClient
          .from('super_admin')
          .select('*');

        if (superAdmins && superAdmins.length > 0) {
          allAccounts.push(...superAdmins.map((sa: any) => ({
            ...sa,
            userType: 'super_admin',
            displayName: sa.username,
            usernameField: sa.username,
            passwordField: sa.password
          })));
        }

        // Get admins
        const { data: admins } = await supabaseClient
          .from('admins')
          .select('*');

        if (admins && admins.length > 0) {
          allAccounts.push(...admins.map((a: any) => ({
            ...a,
            userType: 'admin',
            displayName: a.full_name || a.admin_id,
            usernameField: a.admin_id,
            passwordField: a.password
          })));
        }

        // Get employees
        const { data: employees } = await supabaseClient
          .from('employees')
          .select('*');

        if (employees && employees.length > 0) {
          allAccounts.push(...employees.map((e: any) => ({
            ...e,
            userType: 'employee',
            displayName: e.full_name || e.employee_number,
            usernameField: e.employee_number,
            passwordField: e.password
          })));
        }

        setAccounts(allAccounts);

        if (allAccounts.length === 0) {
          updateIssue('accounts', {
            status: 'error',
            message: '❌ No user accounts found in database',
            fixLabel: 'Create Account',
            fix: async () => {
              navigate('/setup');
            }
          });
        } else {
          updateIssue('accounts', {
            status: 'ok',
            message: `✅ Found ${allAccounts.length} user account(s)`
          });

          // Auto-fill first account
          if (allAccounts.length > 0) {
            setTestUsername(allAccounts[0].usernameField);
            setTestPassword(allAccounts[0].passwordField);
          }
        }

      } catch (error: any) {
        updateIssue('accounts', {
          status: 'error',
          message: `❌ Error fetching accounts: ${error.message}`
        });
      }

      // Issue 4: Test Login Endpoint
      if (accounts.length > 0 || testUsername) {
        addIssue({
          id: 'login',
          title: 'Login System',
          status: 'checking',
          message: 'Testing login endpoint...'
        });

        const testUser = testUsername || accounts[0]?.usernameField;
        const testPass = testPassword || accounts[0]?.passwordField;

        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({
              username: testUser,
              password: testPass
            })
          });

          const result = await response.json();

          if (response.ok && result.success) {
            updateIssue('login', {
              status: 'ok',
              message: '✅ Login system is working perfectly!'
            });
          } else {
            updateIssue('login', {
              status: 'error',
              message: `❌ Login failed: ${result.error || 'Unknown error'}`,
              fixLabel: 'Check Credentials',
              fix: async () => {
                toast.error('Try using the exact credentials shown below');
              }
            });
          }
        } catch (error: any) {
          updateIssue('login', {
            status: 'error',
            message: `❌ Login error: ${error.message}`
          });
        }
      }
    }

    setIsChecking(false);
  };

  const testLogin = async () => {
    if (!testUsername || !testPassword) {
      toast.error('Please enter username and password');
      return;
    }

    toast.loading('Testing login...');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          username: testUsername.trim(),
          password: testPassword.trim()
        })
      });

      const result = await response.json();
      toast.dismiss();

      if (response.ok && result.success) {
        toast.success('✅ Login successful!');
        
        // Store session
        if (result.userType === 'employee') {
          localStorage.setItem('employeeSession', JSON.stringify(result.data));
          setTimeout(() => navigate('/employee'), 500);
        } else if (result.userType === 'admin') {
          localStorage.setItem('adminSession', JSON.stringify(result.data));
          setTimeout(() => navigate('/admin'), 500);
        } else if (result.userType === 'super_admin') {
          localStorage.setItem('superAdminSession', JSON.stringify(result.data));
          setTimeout(() => navigate('/super-admin'), 500);
        }
      } else {
        toast.error(`❌ ${result.error || 'Login failed'}`);
        console.error('Login failed:', result);
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(`❌ Error: ${error.message}`);
      console.error('Login error:', error);
    }
  };

  const getStatusIcon = (status: Issue['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'ok':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wrench className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">One-Click Fix Everything</h1>
                  <p className="text-sm text-white/90 mt-1">
                    Comprehensive system check and automatic fixes
                  </p>
                </div>
              </div>
              {!isChecking && (
                <Button
                  onClick={runFullDiagnostic}
                  className="bg-white text-[#0B3060] hover:bg-gray-100"
                >
                  <RefreshCw className="w-5 h-5" />
                  Rerun Check
                </Button>
              )}
            </div>
          </div>

          {/* Start Button */}
          {issues.length === 0 && !isChecking && (
            <div className="p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Ready to diagnose your system
              </h2>
              <p className="text-gray-600 mb-6">
                Click the button below to check everything and find solutions
              </p>
              <Button
                onClick={runFullDiagnostic}
                size="lg"
                className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a]"
              >
                <Play className="w-5 h-5" />
                Start System Check
              </Button>
            </div>
          )}

          {/* Issues List */}
          {issues.length > 0 && (
            <div className="p-8 space-y-4">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`border rounded-lg p-4 ${
                    issue.status === 'ok' ? 'bg-green-50 border-green-200' :
                    issue.status === 'error' ? 'bg-red-50 border-red-200' :
                    issue.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(issue.status)}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {issue.title}
                        </h3>
                        <p className="text-sm text-gray-700">{issue.message}</p>
                      </div>
                    </div>
                    {issue.fix && issue.fixLabel && (
                      <Button
                        onClick={issue.fix}
                        size="sm"
                        variant="outline"
                        className="ml-4"
                      >
                        {issue.fixLabel}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Accounts */}
        {accounts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-green-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                Available Accounts ({accounts.length})
              </h2>
            </div>
            <div className="p-8 space-y-3">
              {accounts.map((account, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        account.userType === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                        account.userType === 'admin' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {account.userType === 'super_admin' ? 'Super Admin' :
                         account.userType === 'admin' ? 'Admin' : 'Employee'}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {account.displayName}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Username:</span>
                      <div className="font-mono font-semibold text-gray-900 mt-1">
                        {account.usernameField}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Password:</span>
                      <div className="font-mono font-semibold text-gray-900 mt-1">
                        {account.passwordField}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setTestUsername(account.usernameField);
                      setTestPassword(account.passwordField);
                      toast.success('Credentials loaded!');
                      setTimeout(() => {
                        document.getElementById('test-login-section')?.scrollIntoView({ 
                          behavior: 'smooth' 
                        });
                      }, 100);
                    }}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    Use This Account
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Login */}
        {accounts.length > 0 && (
          <div id="test-login-section" className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-blue-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                Test Login Now
              </h2>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={testUsername}
                    onChange={(e) => setTestUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                onClick={testLogin}
                size="lg"
                className="w-full bg-gradient-to-r from-green-600 to-green-700"
              >
                <Play className="w-5 h-5" />
                Login & Go to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Button
            onClick={() => navigate('/manual-deployment-guide')}
            variant="outline"
          >
            <Server className="w-4 h-4" />
            Deploy Backend
          </Button>
          <Button
            onClick={() => navigate('/setup')}
            variant="outline"
          >
            <Database className="w-4 h-4" />
            Setup Database
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
