import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Wrench, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  ArrowRight,
  Database,
  Server,
  Key,
  User,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

interface DiagnosticStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message: string;
  action?: string;
  fixable?: boolean;
}

export function LoginAutoFix() {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<DiagnosticStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testUsername, setTestUsername] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [foundAccounts, setFoundAccounts] = useState<any[]>([]);
  const [canLogin, setCanLogin] = useState(false);

  const updateStep = (id: string, updates: Partial<DiagnosticStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const addStep = (step: DiagnosticStep) => {
    setSteps(prev => [...prev, step]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setSteps([]);
    setFoundAccounts([]);
    setCanLogin(false);

    console.log('🔍 AUTO-DIAGNOSTIC STARTED');

    // Step 1: Check Backend
    addStep({
      id: 'backend',
      name: 'Backend Connection',
      status: 'running',
      message: 'Checking if Edge Function is deployed...'
    });

    let backendAvailable = false;
    try {
      const healthResponse = await fetch(`${API_URL}/health`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      if (healthResponse.ok) {
        backendAvailable = true;
        updateStep('backend', {
          status: 'success',
          message: '✅ Backend is running and accessible'
        });
      } else {
        updateStep('backend', {
          status: 'error',
          message: '❌ Edge Function is not responding',
          action: 'Deploy the Edge Function in Supabase Dashboard',
          fixable: false
        });
        setIsRunning(false);
        return;
      }
    } catch (error) {
      updateStep('backend', {
        status: 'error',
        message: '❌ Cannot connect to backend',
        action: 'Deploy the Edge Function first',
        fixable: false
      });
      setIsRunning(false);
      return;
    }

    // Step 2: Check Database Tables
    addStep({
      id: 'database',
      name: 'Database Tables',
      status: 'running',
      message: 'Checking database tables...'
    });

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      // Check for super_admin table
      const { data: superAdmins, error: superAdminError } = await supabase
        .from('super_admin')
        .select('*')
        .limit(1);

      // Check for admins table
      const { data: admins, error: adminsError } = await supabase
        .from('admins')
        .select('*')
        .limit(1);

      // Check for employees table
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .limit(1);

      if (superAdminError && adminsError && employeesError) {
        updateStep('database', {
          status: 'error',
          message: '❌ Database tables not found',
          action: 'Run Database Setup to create tables',
          fixable: true
        });
        setIsRunning(false);
        return;
      }

      updateStep('database', {
        status: 'success',
        message: '✅ Database tables exist'
      });

    } catch (error: any) {
      updateStep('database', {
        status: 'error',
        message: `❌ Database error: ${error.message}`,
        fixable: false
      });
      setIsRunning(false);
      return;
    }

    // Step 3: Check for existing accounts
    addStep({
      id: 'accounts',
      name: 'User Accounts',
      status: 'running',
      message: 'Looking for user accounts...'
    });

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      const allAccounts: any[] = [];

      // Get super admins
      const { data: superAdmins } = await supabase
        .from('super_admin')
        .select('*');

      if (superAdmins && superAdmins.length > 0) {
        allAccounts.push(...superAdmins.map(sa => ({
          ...sa,
          userType: 'super_admin',
          usernameField: 'username',
          passwordField: 'password'
        })));
      }

      // Get admins
      const { data: admins } = await supabase
        .from('admins')
        .select('*');

      if (admins && admins.length > 0) {
        allAccounts.push(...admins.map(a => ({
          ...a,
          userType: 'admin',
          usernameField: 'admin_id',
          passwordField: 'password'
        })));
      }

      // Get employees
      const { data: employees } = await supabase
        .from('employees')
        .select('*');

      if (employees && employees.length > 0) {
        allAccounts.push(...employees.map(e => ({
          ...e,
          userType: 'employee',
          usernameField: 'employee_number',
          passwordField: 'password'
        })));
      }

      setFoundAccounts(allAccounts);

      if (allAccounts.length === 0) {
        updateStep('accounts', {
          status: 'warning',
          message: '⚠️ No user accounts found in database',
          action: 'Create at least one account to login',
          fixable: true
        });
      } else {
        updateStep('accounts', {
          status: 'success',
          message: `✅ Found ${allAccounts.length} account(s) in database`
        });
      }

    } catch (error: any) {
      updateStep('accounts', {
        status: 'error',
        message: `❌ Error fetching accounts: ${error.message}`,
        fixable: false
      });
    }

    // Step 4: Test Login Endpoint
    if (foundAccounts.length > 0) {
      addStep({
        id: 'login-endpoint',
        name: 'Login Endpoint',
        status: 'running',
        message: 'Testing login endpoint...'
      });

      const testAccount = foundAccounts[0];
      const testUser = testAccount[testAccount.usernameField];
      const testPass = testAccount[testAccount.passwordField];

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
          updateStep('login-endpoint', {
            status: 'success',
            message: '✅ Login endpoint is working correctly'
          });
          setCanLogin(true);
        } else {
          updateStep('login-endpoint', {
            status: 'error',
            message: `❌ Login endpoint failed: ${result.error}`,
            action: 'Check server logs for details',
            fixable: false
          });
        }
      } catch (error: any) {
        updateStep('login-endpoint', {
          status: 'error',
          message: `❌ Login endpoint error: ${error.message}`,
          fixable: false
        });
      }
    }

    // Final Summary
    addStep({
      id: 'summary',
      name: 'Diagnostic Summary',
      status: canLogin ? 'success' : 'warning',
      message: canLogin 
        ? '✅ All systems operational - Login should work!'
        : '⚠️ Issues detected - See above for fixes'
    });

    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const testLogin = async () => {
    if (!testUsername || !testPassword) {
      toast.error('Please enter username and password');
      return;
    }

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

      if (response.ok && result.success) {
        toast.success('Login successful!');
        
        // Store session
        if (result.userType === 'employee') {
          localStorage.setItem('employeeSession', JSON.stringify(result.data));
          navigate('/employee');
        } else if (result.userType === 'admin') {
          localStorage.setItem('adminSession', JSON.stringify(result.data));
          navigate('/admin');
        } else if (result.userType === 'super_admin') {
          localStorage.setItem('superAdminSession', JSON.stringify(result.data));
          navigate('/super-admin');
        }
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  const getStatusIcon = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-300" />;
    }
  };

  const getStatusColor = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'running':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0B3060] to-[#0d2847] px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wrench className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold">Login Auto-Fix</h1>
                  <p className="text-sm text-white/80 mt-1">
                    Automatically diagnose and fix login issues
                  </p>
                </div>
              </div>
              {!isRunning && (
                <Button
                  onClick={runDiagnostics}
                  variant="outline"
                  className="bg-white text-[#0B3060]"
                >
                  Rerun Diagnostics
                </Button>
              )}
            </div>
          </div>

          {/* Diagnostic Steps */}
          <div className="p-8">
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`border rounded-lg p-4 ${getStatusColor(step.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(step.status)}
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">
                        {index + 1}. {step.name}
                      </div>
                      <div className="text-sm text-gray-700 mb-2">
                        {step.message}
                      </div>
                      {step.action && (
                        <div className="mt-2 text-sm font-medium text-gray-900 bg-white/50 p-3 rounded border">
                          💡 <strong>Action Required:</strong> {step.action}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Found Accounts */}
        {foundAccounts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-green-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                Available Accounts ({foundAccounts.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                These accounts exist in your database and should work for login
              </p>
            </div>
            <div className="p-8">
              <div className="space-y-3">
                {foundAccounts.map((account, index) => {
                  const username = account[account.usernameField];
                  const password = account[account.passwordField];
                  
                  return (
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
                          {account.full_name && (
                            <span className="text-sm text-gray-600">{account.full_name}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Username:</span>
                          <div className="font-mono font-semibold text-gray-900 mt-1">
                            {username}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Password:</span>
                          <div className="font-mono font-semibold text-gray-900 mt-1">
                            {password}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setTestUsername(username);
                            setTestPassword(password);
                            toast.success('Credentials filled in!');
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Use These Credentials
                        </Button>
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(`Username: ${username}\nPassword: ${password}`);
                            toast.success('Copied to clipboard!');
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Test Login */}
        {canLogin && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200 bg-blue-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                Test Login
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Enter credentials to test the login system
              </p>
            </div>
            <div className="p-8">
              <div className="space-y-4">
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
                  className="w-full"
                  size="lg"
                >
                  <ArrowRight className="w-5 h-5" />
                  Test Login & Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Button
            onClick={() => navigate('/setup')}
            variant="outline"
            className="w-full"
          >
            <Database className="w-4 h-4" />
            Database Setup
          </Button>
          <Button
            onClick={() => navigate('/deployment-guide')}
            variant="outline"
            className="w-full"
          >
            <Server className="w-4 h-4" />
            Deployment Guide
          </Button>
          <Button
            onClick={() => navigate('/')}
            className="w-full"
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}
