import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Search, CheckCircle, XCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Logo } from '../components/Logo';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function SimpleDebug() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showPasswords, setShowPasswords] = useState(true);
  const [testUsername, setTestUsername] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [loginResult, setLoginResult] = useState<any>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    setResult(null);
    try {
      console.log('🔍 Fetching accounts from debug endpoint...');
      console.log('API URL:', `${API_BASE_URL}/debug/accounts`);
      
      const response = await fetch(`${API_BASE_URL}/debug/accounts`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const data = await response.json();
      console.log('Debug response:', data);
      
      setResult(data);
      
      if (data.success) {
        const total = data.data.totalAccounts;
        if (total === 0) {
          toast.error('No accounts found in database!');
          
          // Show detailed error info if available
          if (data.errors.employees || data.errors.admins || data.errors.superAdmins) {
            console.error('Database errors:');
            console.error('Employees:', data.errors.employees);
            console.error('Admins:', data.errors.admins);
            console.error('Super Admins:', data.errors.superAdmins);
          }
        } else {
          toast.success(`Found ${total} account(s) in database!`);
        }
      } else {
        toast.error('Failed to fetch accounts');
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      toast.error('Failed to connect to backend');
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    if (!testUsername || !testPassword) {
      toast.error('Enter username and password');
      return;
    }

    setLoginResult(null);
    try {
      console.log('🧪 Testing login...');
      console.log('Username:', testUsername);
      console.log('Password:', testPassword);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          username: testUsername,
          password: testPassword,
        }),
      });

      const data = await response.json();
      console.log('Login response:', data);
      
      setLoginResult(data);
      
      if (data.success) {
        toast.success('✅ Login successful!');
        
        // Store session and redirect
        if (data.userType === 'employee') {
          localStorage.setItem('employeeSession', JSON.stringify(data.data));
          setTimeout(() => navigate('/employee'), 1000);
        } else if (data.userType === 'admin') {
          localStorage.setItem('adminSession', JSON.stringify(data.data));
          setTimeout(() => navigate('/admin'), 1000);
        } else if (data.userType === 'super_admin') {
          localStorage.setItem('superAdminSession', JSON.stringify(data.data));
          setTimeout(() => navigate('/super-admin'), 1000);
        }
      } else {
        toast.error(`❌ ${data.error}`);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Login request failed');
      setLoginResult({ error: error.message });
    }
  };

  const copyCredentials = (username: string, password: string) => {
    setTestUsername(username);
    setTestPassword(password);
    toast.success('Credentials copied to test form!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        <div className="flex items-center gap-4 mb-8">
          <Logo className="text-4xl" />
          <div>
            <h1 className="text-3xl font-bold text-white">Simple Debug Tool</h1>
            <p className="text-[#F7B34C]">Direct database access - see exactly what's stored</p>
          </div>
        </div>

        {/* Fetch Button */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Step 1: View Database Accounts</h2>
          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="w-full px-6 py-4 bg-gradient-to-r from-[#F7B34C] to-[#e5a23b] hover:from-[#e5a23b] hover:to-[#d49330] text-[#0B3060] rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Search className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Show All Accounts in Database'}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {result.success ? (
              <>
                {/* Summary */}
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-[#F7B34C]">
                        {result.data.totalAccounts} Total Accounts
                      </h3>
                      <p className="text-white/60">
                        {result.data.employees.length} Employees • {result.data.admins.length} Admins • {result.data.superAdmins.length} Super Admins
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all flex items-center gap-2"
                    >
                      {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showPasswords ? 'Hide' : 'Show'} Passwords
                    </button>
                  </div>
                </div>

                {/* Employees */}
                {result.data.employees.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">👥 Employees ({result.data.employees.length})</h3>
                    <div className="space-y-3">
                      {result.data.employees.map((emp: any, idx: number) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <div className="text-xs text-white/40">Username (employee_number)</div>
                              <code className="text-[#F7B34C] font-mono text-sm">{emp.employee_number}</code>
                            </div>
                            <div>
                              <div className="text-xs text-white/40">Password</div>
                              <code className="text-white font-mono text-sm">
                                {showPasswords ? emp.password : '••••••••'}
                              </code>
                            </div>
                            <div>
                              <div className="text-xs text-white/40">Full Name</div>
                              <div className="text-white text-sm">{emp.full_name}</div>
                            </div>
                            <div>
                              <div className="text-xs text-white/40">Email</div>
                              <div className="text-white/60 text-sm">{emp.email}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => copyCredentials(emp.employee_number, emp.password)}
                            className="w-full px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-300 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Copy to Test Form
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admins */}
                {result.data.admins.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">⚙️ Admins ({result.data.admins.length})</h3>
                    <div className="space-y-3">
                      {result.data.admins.map((admin: any, idx: number) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <div className="text-xs text-white/40">Username (admin_id)</div>
                              <code className="text-[#F7B34C] font-mono text-sm">{admin.admin_id}</code>
                            </div>
                            <div>
                              <div className="text-xs text-white/40">Password</div>
                              <code className="text-white font-mono text-sm">
                                {showPasswords ? admin.password : '••••••••'}
                              </code>
                            </div>
                            <div>
                              <div className="text-xs text-white/40">Full Name</div>
                              <div className="text-white text-sm">{admin.full_name}</div>
                            </div>
                            <div>
                              <div className="text-xs text-white/40">Email</div>
                              <div className="text-white/60 text-sm">{admin.email}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => copyCredentials(admin.admin_id, admin.password)}
                            className="w-full px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 text-yellow-300 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Copy to Test Form
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Super Admins */}
                {result.data.superAdmins.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">🛡️ Super Admins ({result.data.superAdmins.length})</h3>
                    <div className="space-y-3">
                      {result.data.superAdmins.map((sa: any, idx: number) => (
                        <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <div className="text-xs text-white/40">Username</div>
                              <code className="text-[#F7B34C] font-mono text-sm">{sa.username}</code>
                            </div>
                            <div>
                              <div className="text-xs text-white/40">Password</div>
                              <code className="text-white font-mono text-sm">
                                {showPasswords ? sa.password : '••••••••'}
                              </code>
                            </div>
                            <div>
                              <div className="text-xs text-white/40">Full Name</div>
                              <div className="text-white text-sm">{sa.full_name || 'N/A'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-white/40">Email</div>
                              <div className="text-white/60 text-sm">{sa.email}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => copyCredentials(sa.username, sa.password)}
                            className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Copy to Test Form
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Accounts */}
                {result.data.totalAccounts === 0 && (
                  <div className="bg-red-500/10 backdrop-blur-lg border border-red-400/20 rounded-xl p-8 text-center">
                    <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-red-400 mb-2">No Accounts Found</h3>
                    <p className="text-white/60">Your database is empty. Create accounts in Supabase first.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-red-500/10 backdrop-blur-lg border border-red-400/20 rounded-xl p-6">
                <XCircle className="w-8 h-8 text-red-400 mb-2" />
                <h3 className="text-lg font-bold text-red-400 mb-2">Error</h3>
                <pre className="text-white/80 text-sm bg-black/20 p-4 rounded overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Test Login Form */}
        {result?.success && result.data.totalAccounts > 0 && (
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Step 2: Test Login</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-white/60 mb-1 block">Username</label>
                <input
                  type="text"
                  value={testUsername}
                  onChange={(e) => setTestUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:border-[#F7B34C] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Password</label>
                <input
                  type="text"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:border-[#F7B34C] focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={testLogin}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Test Login
            </button>

            {/* Login Result */}
            {loginResult && (
              <div className={`mt-4 p-4 rounded-lg ${loginResult.success ? 'bg-green-500/10 border border-green-400/20' : 'bg-red-500/10 border border-red-400/20'}`}>
                {loginResult.success ? (
                  <>
                    <div className="flex items-center gap-2 text-green-400 font-bold mb-2">
                      <CheckCircle className="w-5 h-5" />
                      Login Successful!
                    </div>
                    <div className="text-white/80 text-sm">
                      <div>User Type: {loginResult.userType}</div>
                      <div>Redirecting to dashboard...</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                      <XCircle className="w-5 h-5" />
                      Login Failed
                    </div>
                    <div className="text-white/80 text-sm">{loginResult.error || 'Unknown error'}</div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-[#F7B34C]/10 backdrop-blur-lg border border-[#F7B34C]/20 rounded-xl p-6 mt-6">
          <h3 className="text-lg font-bold text-[#F7B34C] mb-3">💡 How to Use This Tool</h3>
          <ol className="space-y-2 text-white/80 text-sm">
            <li><strong>1.</strong> Click "Show All Accounts in Database" to see what's stored</li>
            <li><strong>2.</strong> Click "Copy to Test Form" on any account</li>
            <li><strong>3.</strong> Click "Test Login" to try logging in</li>
            <li><strong>4.</strong> Check browser console (F12) for detailed logs</li>
            <li><strong>5.</strong> Check Supabase Edge Function logs for backend logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}