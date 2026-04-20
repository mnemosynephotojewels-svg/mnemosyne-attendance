import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, RefreshCw, Database, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function DirectDatabaseTest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any>(null);
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    setError('');
    setAccounts(null);

    try {
      console.log('🔍 Fetching accounts from database...');
      console.log('API URL:', `${API_BASE_URL}/debug/accounts`);

      const response = await fetch(`${API_BASE_URL}/debug/accounts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const rawText = await response.text();
      console.log('Raw response (first 1000 chars):', rawText.substring(0, 1000));

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError: any) {
        console.error('Failed to parse JSON:', parseError);
        if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
          throw new Error('Backend returned HTML instead of JSON. The endpoint may not be deployed.');
        }
        throw new Error('Invalid JSON response from server');
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      console.log('✅ Accounts fetched successfully:', data);
      
      // Display detailed backend info
      if (data.data) {
        setAccounts(data.data);
        console.log('📊 Account breakdown:');
        console.log('  - Employees:', data.data.employees?.length || 0);
        console.log('  - Admins:', data.data.admins?.length || 0);
        console.log('  - Super Admins:', data.data.superAdmins?.length || 0);
        
        toast.success(`Loaded ${data.data.totalAccounts || 0} accounts!`);
      }
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
      toast.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async (username: string, password: string) => {
    console.log('🧪 Testing login with:', username);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (data.success) {
        toast.success(`✅ Login successful! User type: ${data.userType}`);
        
        // Store session and redirect
        if (data.userType === 'employee') {
          localStorage.setItem('employeeSession', JSON.stringify(data.data));
          navigate('/employee');
        } else if (data.userType === 'admin') {
          localStorage.setItem('adminSession', JSON.stringify(data.data));
          navigate('/admin');
        } else if (data.userType === 'super_admin') {
          localStorage.setItem('superAdminSession', JSON.stringify(data.data));
          navigate('/super-admin');
        }
      } else {
        toast.error(data.error || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error('Login test failed');
    }
  };

  const copyCredentials = (username: string, password: string) => {
    localStorage.setItem('autofill_username', username);
    localStorage.setItem('autofill_password', password);
    toast.success('Credentials copied! Redirecting to login...');
    setTimeout(() => navigate('/login'), 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Login
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPasswords ? 'Hide' : 'Show'} Passwords
            </button>
            <button
              onClick={fetchAccounts}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#F7B34C] hover:bg-[#e5a23b] text-[#0B3060] rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Fetch Accounts'}
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-[#0B3060] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Direct Database Access Test
          </h1>
          <p className="text-gray-600">
            This tool directly queries your database tables to show ALL accounts. Use this to verify your data is correct.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="font-bold text-red-900">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-12 text-center">
            <RefreshCw className="w-12 h-12 text-[#0B3060] animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Fetching accounts from database...</p>
          </div>
        )}

        {/* Results */}
        {accounts && !loading && (
          <div className="space-y-6">
            {/* Employees */}
            {accounts.employees && accounts.employees.length > 0 && (
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <CheckCircle className="w-6 h-6" />
                    Employees ({accounts.employees.length})
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {accounts.employees.map((emp: any, idx: number) => (
                      <div key={idx} className="border-2 border-gray-200 rounded-xl p-4 hover:border-[#0B3060] transition-colors">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Employee ID</p>
                            <p className="font-mono font-bold text-[#0B3060]">
                              {emp.employee_number || emp.employee_id || emp.id || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Name</p>
                            <p className="font-semibold">{emp.full_name || emp.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Email</p>
                            <p className="text-sm">{emp.email || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Password</p>
                            <p className="font-mono text-sm">
                              {showPasswords ? (emp.password || 'N/A') : '••••••••'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => testLogin(
                              emp.employee_number || emp.employee_id || emp.id,
                              emp.password
                            )}
                            className="px-4 py-2 bg-[#0B3060] hover:bg-[#1a4a8a] text-white rounded-lg text-sm font-bold transition-colors"
                          >
                            Test Login
                          </button>
                          <button
                            onClick={() => copyCredentials(
                              emp.employee_number || emp.employee_id || emp.id,
                              emp.password
                            )}
                            className="px-4 py-2 bg-[#F7B34C] hover:bg-[#e5a23b] text-[#0B3060] rounded-lg text-sm font-bold transition-colors"
                          >
                            Copy to Login Page
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Admins */}
            {accounts.admins && accounts.admins.length > 0 && (
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <CheckCircle className="w-6 h-6" />
                    Team Leader Admins ({accounts.admins.length})
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {accounts.admins.map((admin: any, idx: number) => (
                      <div key={idx} className="border-2 border-gray-200 rounded-xl p-4 hover:border-[#0B3060] transition-colors">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Admin ID / Username</p>
                            <p className="font-mono font-bold text-[#0B3060]">
                              {admin.admin_number || admin.admin_id || admin.username || admin.id || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Name</p>
                            <p className="font-semibold">{admin.full_name || admin.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Department</p>
                            <p className="text-sm">{admin.department || admin.team || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Password</p>
                            <p className="font-mono text-sm">
                              {showPasswords ? (admin.password || 'N/A') : '••••••••'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => testLogin(
                              admin.admin_number || admin.admin_id || admin.username || admin.id,
                              admin.password
                            )}
                            className="px-4 py-2 bg-[#0B3060] hover:bg-[#1a4a8a] text-white rounded-lg text-sm font-bold transition-colors"
                          >
                            Test Login
                          </button>
                          <button
                            onClick={() => copyCredentials(
                              admin.admin_number || admin.admin_id || admin.username || admin.id,
                              admin.password
                            )}
                            className="px-4 py-2 bg-[#F7B34C] hover:bg-[#e5a23b] text-[#0B3060] rounded-lg text-sm font-bold transition-colors"
                          >
                            Copy to Login Page
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Super Admins */}
            {accounts.superAdmins && accounts.superAdmins.length > 0 && (
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <CheckCircle className="w-6 h-6" />
                    Super Admins ({accounts.superAdmins.length})
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {accounts.superAdmins.map((sa: any, idx: number) => (
                      <div key={idx} className="border-2 border-gray-200 rounded-xl p-4 hover:border-[#0B3060] transition-colors">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Username</p>
                            <p className="font-mono font-bold text-[#0B3060]">
                              {sa.username || sa.id || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Name</p>
                            <p className="font-semibold">{sa.full_name || sa.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Email</p>
                            <p className="text-sm">{sa.email || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold mb-1">Password</p>
                            <p className="font-mono text-sm">
                              {showPasswords ? (sa.password || 'N/A') : '••••••••'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => testLogin(sa.username || sa.id, sa.password)}
                            className="px-4 py-2 bg-[#0B3060] hover:bg-[#1a4a8a] text-white rounded-lg text-sm font-bold transition-colors"
                          >
                            Test Login
                          </button>
                          <button
                            onClick={() => copyCredentials(sa.username || sa.id, sa.password)}
                            className="px-4 py-2 bg-[#F7B34C] hover:bg-[#e5a23b] text-[#0B3060] rounded-lg text-sm font-bold transition-colors"
                          >
                            Copy to Login Page
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!accounts.employees || accounts.employees.length === 0) &&
             (!accounts.admins || accounts.admins.length === 0) &&
             (!accounts.superAdmins || accounts.superAdmins.length === 0) && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 text-center">
                <Database className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-yellow-900 mb-2">No Accounts Found</h3>
                <p className="text-yellow-700">
                  Your database tables exist but don't have any user accounts yet. Create some accounts first!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}