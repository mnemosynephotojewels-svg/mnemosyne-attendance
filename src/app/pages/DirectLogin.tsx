import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Logo } from '../components/Logo';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function DirectLogin() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loginInProgress, setLoginInProgress] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/debug/accounts`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      const data = await response.json();
      console.log('Accounts data:', data);
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const directLogin = async (username: string, password: string, userType: string, name: string) => {
    setLoginInProgress(username);
    
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔐 DIRECT LOGIN TEST');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Username:', username);
      console.log('Password:', password);
      console.log('Expected Type:', userType);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      console.log('Login result:', result);

      if (result.success) {
        toast.success(`✅ Login successful! Welcome ${name}`);
        
        // Store session
        if (result.userType === 'employee') {
          localStorage.setItem('employeeSession', JSON.stringify(result.data));
          setTimeout(() => navigate('/employee'), 1000);
        } else if (result.userType === 'admin') {
          localStorage.setItem('adminSession', JSON.stringify(result.data));
          setTimeout(() => navigate('/admin'), 1000);
        } else if (result.userType === 'super_admin') {
          localStorage.setItem('superAdminSession', JSON.stringify(result.data));
          setTimeout(() => navigate('/super-admin'), 1000);
        }
      } else {
        toast.error(`❌ ${result.error}`);
        console.error('Login failed:', result);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login request failed');
    } finally {
      setLoginInProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#F7B34C] animate-spin mx-auto mb-4" />
          <p className="text-white">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-6">
      <div className="max-w-4xl mx-auto">
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
            <h1 className="text-3xl font-bold text-white">Direct Login - One-Click Access</h1>
            <p className="text-[#F7B34C]">Click any account below to login instantly</p>
          </div>
        </div>

        {accounts?.success && accounts.data.totalAccounts > 0 ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-[#F7B34C] mb-2">
                {accounts.data.totalAccounts} Accounts Available
              </h2>
              <p className="text-white/60">
                {accounts.data.employees.length} Employees • {accounts.data.admins.length} Admins • {accounts.data.superAdmins.length} Super Admins
              </p>
            </div>

            {/* Employees */}
            {accounts.data.employees.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                  Employees ({accounts.data.employees.length})
                </h3>
                <div className="grid gap-3">
                  {accounts.data.employees.map((emp: any) => (
                    <button
                      key={emp.employee_number}
                      onClick={() => directLogin(emp.employee_number, emp.password, 'employee', emp.full_name)}
                      disabled={loginInProgress === emp.employee_number}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 rounded-lg p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-bold text-lg mb-1">{emp.full_name}</div>
                          <div className="text-white/60 text-sm space-y-1">
                            <div>Username: <code className="text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded">{emp.employee_number}</code></div>
                            <div>Position: {emp.position}</div>
                            <div>Team: {emp.team}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {loginInProgress === emp.employee_number ? (
                            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                          ) : (
                            <div className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 group-hover:from-blue-600 group-hover:to-blue-700 text-white rounded-lg font-bold transition-all flex items-center gap-2">
                              <CheckCircle className="w-5 h-5" />
                              Login
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Admins */}
            {accounts.data.admins.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                  Admins ({accounts.data.admins.length})
                </h3>
                <div className="grid gap-3">
                  {accounts.data.admins.map((admin: any) => (
                    <button
                      key={admin.admin_id}
                      onClick={() => directLogin(admin.admin_id, admin.password, 'admin', admin.full_name)}
                      disabled={loginInProgress === admin.admin_id}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-400/50 rounded-lg p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-bold text-lg mb-1">{admin.full_name}</div>
                          <div className="text-white/60 text-sm space-y-1">
                            <div>Username: <code className="text-yellow-300 bg-yellow-900/30 px-2 py-0.5 rounded">{admin.admin_id}</code></div>
                            <div>Team: {admin.team}</div>
                            <div>Role: {admin.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {loginInProgress === admin.admin_id ? (
                            <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                          ) : (
                            <div className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 group-hover:from-yellow-600 group-hover:to-yellow-700 text-white rounded-lg font-bold transition-all flex items-center gap-2">
                              <CheckCircle className="w-5 h-5" />
                              Login
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Super Admins */}
            {accounts.data.superAdmins.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                  Super Admins ({accounts.data.superAdmins.length})
                </h3>
                <div className="grid gap-3">
                  {accounts.data.superAdmins.map((sa: any) => (
                    <button
                      key={sa.username}
                      onClick={() => directLogin(sa.username, sa.password, 'super_admin', sa.full_name || sa.username)}
                      disabled={loginInProgress === sa.username}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-400/50 rounded-lg p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-bold text-lg mb-1">{sa.full_name || sa.username}</div>
                          <div className="text-white/60 text-sm space-y-1">
                            <div>Username: <code className="text-red-300 bg-red-900/30 px-2 py-0.5 rounded">{sa.username}</code></div>
                            <div>Email: {sa.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {loginInProgress === sa.username ? (
                            <Loader2 className="w-6 h-6 text-red-400 animate-spin" />
                          ) : (
                            <div className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 group-hover:from-red-600 group-hover:to-red-700 text-white rounded-lg font-bold transition-all flex items-center gap-2">
                              <CheckCircle className="w-5 h-5" />
                              Login
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-red-500/10 backdrop-blur-lg border border-red-400/20 rounded-xl p-8 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-red-400 mb-2">No Accounts Found</h3>
            <p className="text-white/60 mb-4">Your database is empty or there was an error loading accounts.</p>
            {accounts?.errors && (
              <div className="text-left text-sm text-white/60 bg-black/20 p-4 rounded">
                <pre>{JSON.stringify(accounts.errors, null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-[#F7B34C]/10 backdrop-blur-lg border border-[#F7B34C]/20 rounded-xl p-6 mt-6">
          <h3 className="text-lg font-bold text-[#F7B34C] mb-3">💡 How This Works</h3>
          <ul className="space-y-2 text-white/80 text-sm">
            <li><strong>•</strong> Click any "Login" button to instantly login as that user</li>
            <li><strong>•</strong> No need to type username/password manually</li>
            <li><strong>•</strong> You'll be automatically redirected to the correct dashboard</li>
            <li><strong>•</strong> Check browser console (F12) for detailed logs</li>
            <li><strong>•</strong> Check Supabase Edge Function logs for backend details</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
