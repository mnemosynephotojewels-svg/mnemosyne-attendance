import { useState } from 'react';
import { 
  Key, 
  User, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle,
  Loader2,
  AlertCircle,
  Server,
  Database,
  ArrowRight,
  Copy
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { useNavigate } from 'react-router';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

interface TestStep {
  name: string;
  status: 'pending' | 'testing' | 'success' | 'error';
  message: string;
  details?: any;
}

export function LoginCredentialTester() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<'employee' | 'admin' | 'super_admin'>('super_admin');
  const [isTesting, setIsTesting] = useState(false);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [dbAccounts, setDbAccounts] = useState<any[]>([]);

  const updateStep = (index: number, updates: Partial<TestStep>) => {
    setTestSteps(prev => {
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], ...updates };
      return newSteps;
    });
  };

  const addStep = (step: TestStep) => {
    setTestSteps(prev => [...prev, step]);
  };

  const runCredentialTest = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter both username and password');
      return;
    }

    setIsTesting(true);
    setTestSteps([]);
    setDbAccounts([]);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 CREDENTIAL TEST STARTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('User Type:', userType);
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Step 1: Check Backend Health
    addStep({
      name: 'Backend Connection',
      status: 'testing',
      message: 'Testing connection to Edge Function...'
    });

    try {
      const healthResponse = await fetch(`${API_URL}/health`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      if (!healthResponse.ok) {
        updateStep(0, {
          status: 'error',
          message: '❌ Edge Function is NOT deployed',
          details: {
            status: healthResponse.status,
            solution: 'Deploy the Edge Function in Supabase Dashboard'
          }
        });
        setIsTesting(false);
        toast.error('Backend not available - check deployment');
        return;
      }

      updateStep(0, {
        status: 'success',
        message: '✅ Backend is running'
      });

      console.log('✅ Backend connection successful');

    } catch (error: any) {
      updateStep(0, {
        status: 'error',
        message: '❌ Cannot connect to backend',
        details: { error: error.message }
      });
      setIsTesting(false);
      toast.error('Network error - check your connection');
      return;
    }

    // Step 2: Fetch all accounts from database
    addStep({
      name: 'Database Query',
      status: 'testing',
      message: `Fetching ${userType} accounts from database...`
    });

    try {
      let endpoint = '';
      let tableName = '';
      
      if (userType === 'super_admin') {
        endpoint = `${API_URL}/super-admin/list`;
        tableName = 'super_admin';
      } else if (userType === 'admin') {
        endpoint = `${API_URL}/admins/list`;
        tableName = 'admins';
      } else {
        endpoint = `${API_URL}/employees/list`;
        tableName = 'employees';
      }

      // For now, use Supabase client directly for employees and admins
      if (userType !== 'super_admin') {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          `https://${projectId}.supabase.co`,
          publicAnonKey
        );

        const { data: accounts, error } = await supabase
          .from(tableName)
          .select('*');

        if (error) {
          updateStep(1, {
            status: 'error',
            message: `❌ Failed to query ${tableName} table`,
            details: { error: error.message }
          });
          setIsTesting(false);
          return;
        }

        setDbAccounts(accounts || []);
        updateStep(1, {
          status: 'success',
          message: `✅ Found ${accounts?.length || 0} account(s) in ${tableName} table`,
          details: accounts
        });

        console.log(`✅ Found ${accounts?.length || 0} accounts in database`);

      } else {
        // Super admin - use API endpoint
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          updateStep(1, {
            status: 'error',
            message: `❌ Failed to fetch ${userType} accounts`,
            details: { status: response.status }
          });
          setIsTesting(false);
          return;
        }

        const result = await response.json();
        const accounts = result.data || [];
        setDbAccounts(accounts);

        updateStep(1, {
          status: 'success',
          message: `✅ Found ${accounts.length} account(s) in database`,
          details: accounts
        });

        console.log(`✅ Found ${accounts.length} accounts in database`);
      }

    } catch (error: any) {
      updateStep(1, {
        status: 'error',
        message: '❌ Database query failed',
        details: { error: error.message }
      });
      setIsTesting(false);
      return;
    }

    // Step 3: Find matching username
    addStep({
      name: 'Username Search',
      status: 'testing',
      message: 'Searching for matching username...'
    });

    const usernameField = userType === 'super_admin' ? 'username' : 
                          userType === 'admin' ? 'admin_id' : 'employee_number';

    const matchingAccount = dbAccounts.find(acc => {
      const accountUsername = acc[usernameField];
      return accountUsername && 
             accountUsername.toLowerCase() === username.trim().toLowerCase();
    });

    if (!matchingAccount) {
      updateStep(2, {
        status: 'error',
        message: `❌ No account found with ${usernameField}: "${username}"`,
        details: {
          available_usernames: dbAccounts.map(acc => acc[usernameField]),
          note: 'Username comparison is case-insensitive'
        }
      });
      setIsTesting(false);
      toast.error('Username not found in database');
      return;
    }

    updateStep(2, {
      status: 'success',
      message: `✅ Account found: ${matchingAccount[usernameField]}`,
      details: {
        username: matchingAccount[usernameField],
        email: matchingAccount.email,
        status: matchingAccount.status
      }
    });

    console.log('✅ Found matching account:', matchingAccount);

    // Step 4: Check password
    addStep({
      name: 'Password Verification',
      status: 'testing',
      message: 'Comparing password...'
    });

    const storedPassword = matchingAccount.password_hash || matchingAccount.password;
    const enteredPassword = password;

    console.log('🔐 Password Comparison:');
    console.log('  Stored in DB:', `"${storedPassword}"`);
    console.log('  Entered by you:', `"${enteredPassword}"`);
    console.log('  Exact match:', storedPassword === enteredPassword);
    console.log('  Case-sensitive match:', storedPassword.toLowerCase() === enteredPassword.toLowerCase());

    if (storedPassword !== enteredPassword) {
      updateStep(3, {
        status: 'error',
        message: '❌ Password does not match',
        details: {
          stored_password: storedPassword,
          entered_password: enteredPassword,
          match: false,
          case_sensitive_note: 'Passwords are case-sensitive',
          length_comparison: {
            stored: storedPassword?.length,
            entered: enteredPassword?.length
          }
        }
      });
      setIsTesting(false);
      toast.error('Password mismatch - check for typos, spaces, or case differences');
      return;
    }

    updateStep(3, {
      status: 'success',
      message: '✅ Password matches!',
      details: {
        password: storedPassword,
        match: true
      }
    });

    console.log('✅ Password matches!');

    // Step 5: Test actual login endpoint
    addStep({
      name: 'Login API Test',
      status: 'testing',
      message: 'Testing login endpoint...'
    });

    try {
      let loginEndpoint = '';
      if (userType === 'super_admin') {
        loginEndpoint = `${API_URL}/super-admins/login`;
      } else if (userType === 'admin') {
        loginEndpoint = `${API_URL}/admins/login`;
      } else {
        loginEndpoint = `${API_URL}/employees/login`;
      }

      const loginResponse = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          username: username.trim(),
          password: enteredPassword
        })
      });

      const loginResult = await loginResponse.json();

      if (!loginResponse.ok || !loginResult.success) {
        updateStep(4, {
          status: 'error',
          message: '❌ Login API returned error',
          details: {
            status: loginResponse.status,
            error: loginResult.error,
            response: loginResult
          }
        });
        setIsTesting(false);
        toast.error('Login endpoint failed - check backend logs');
        return;
      }

      updateStep(4, {
        status: 'success',
        message: '✅ Login API successful!',
        details: loginResult
      });

      console.log('✅ Login API test passed!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎉 ALL TESTS PASSED - LOGIN SHOULD WORK!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      toast.success('All tests passed! Login should work now.');

    } catch (error: any) {
      updateStep(4, {
        status: 'error',
        message: '❌ Login endpoint error',
        details: { error: error.message }
      });
      setIsTesting(false);
      return;
    }

    setIsTesting(false);
  };

  const getStepIcon = (status: TestStep['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-6 h-6 rounded-full bg-gray-200" />;
      case 'testing':
        return <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0B3060] to-[#0d2847] px-8 py-6 text-white">
            <div className="flex items-center gap-3">
              <Key className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Login Credential Tester</h1>
                <p className="text-sm text-white/80 mt-1">
                  Test your exact credentials step-by-step
                </p>
              </div>
            </div>
          </div>

          {/* Input Form */}
          <div className="p-8">
            <div className="space-y-4">
              {/* User Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['employee', 'admin', 'super_admin'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setUserType(type)}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        userType === type
                          ? 'border-[#0B3060] bg-[#0B3060] text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {type === 'super_admin' ? 'Super Admin' : 
                       type === 'admin' ? 'Admin' : 'Employee'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username / {userType === 'employee' ? 'Employee Number' : 
                             userType === 'admin' ? 'Admin ID' : 'Username'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
                    placeholder="Enter your username"
                    disabled={isTesting}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
                    placeholder="Enter your password"
                    disabled={isTesting}
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

              {/* Test Button */}
              <Button
                onClick={runCredentialTest}
                disabled={isTesting || !username.trim() || !password.trim()}
                className="w-full"
                size="lg"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    Test These Credentials
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testSteps.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Server className="w-5 h-5" />
                Test Results
              </h2>
            </div>
            <div className="p-8">
              <div className="space-y-4">
                {testSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      step.status === 'success' ? 'bg-green-50 border-green-200' :
                      step.status === 'error' ? 'bg-red-50 border-red-200' :
                      step.status === 'testing' ? 'bg-blue-50 border-blue-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getStepIcon(step.status)}
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">
                          {index + 1}. {step.name}
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          {step.message}
                        </div>
                        {step.details && (
                          <details className="mt-2">
                            <summary className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-900">
                              View Details
                            </summary>
                            <pre className="mt-2 text-xs bg-white/50 p-3 rounded border overflow-auto max-h-64 font-mono">
                              {JSON.stringify(step.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Available Accounts */}
        {dbAccounts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Available Accounts in Database ({dbAccounts.length})
              </h2>
            </div>
            <div className="p-8">
              <div className="space-y-3">
                {dbAccounts.map((account, index) => {
                  const usernameField = userType === 'super_admin' ? 'username' : 
                                       userType === 'admin' ? 'admin_id' : 'employee_number';
                  const passwordField = account.password_hash || account.password;
                  
                  return (
                    <div
                      key={account.id || index}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Username:</span>
                          <div className="font-mono font-semibold text-gray-900 mt-1">
                            {account[usernameField]}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Password:</span>
                          <div className="font-mono font-semibold text-gray-900 mt-1">
                            {passwordField}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                        <Button
                          onClick={() => {
                            setUsername(account[usernameField]);
                            setPassword(passwordField);
                            toast.success('Credentials filled in!');
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Use These Credentials
                        </Button>
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `Username: ${account[usernameField]}\nPassword: ${passwordField}`
                            );
                            toast.success('Credentials copied!');
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Copy className="w-4 h-4" />
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

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button
            onClick={() => navigate('/login-diagnostic')}
            variant="outline"
            className="flex-1"
          >
            Full System Diagnostic
          </Button>
          <Button
            onClick={() => navigate('/deployment-guide')}
            variant="outline"
            className="flex-1"
          >
            Deployment Guide
          </Button>
          <Button
            onClick={() => {
              if (userType === 'super_admin') navigate('/super-admin/login');
              else if (userType === 'admin') navigate('/admin/login');
              else navigate('/employee/login');
            }}
            className="flex-1"
          >
            Go to Login Page
          </Button>
        </div>
      </div>
    </div>
  );
}
