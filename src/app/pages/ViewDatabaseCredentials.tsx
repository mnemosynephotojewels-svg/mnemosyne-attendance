import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { Eye, EyeOff, RefreshCw, ArrowLeft, Database, CheckCircle, XCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function ViewDatabaseCredentials() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [data, setData] = useState<any>({
    superAdmins: [],
    admins: [],
    employees: []
  });

  const loadCredentials = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('🔍 Starting database credentials load...');
      console.log('📡 Fetching from:', `${projectId}.supabase.co/functions/v1/make-server-df988758/debug/accounts`);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/debug/accounts`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const text = await response.text();
      console.log('📄 Raw response text (first 500 chars):', text.substring(0, 500));

      let responseData;
      try {
        responseData = JSON.parse(text);
        console.log('✅ Successfully parsed JSON response');
      } catch (parseError: any) {
        console.error('❌❌❌ [CRITICAL ERROR] JSON Parse Error:', parseError.message);
        console.error('Raw response that failed to parse:', text);
        throw new Error(`Failed to parse server response as JSON: ${parseError.message}. Raw response: ${text.substring(0, 200)}`);
      }

      console.log('📊 Response data:', responseData);

      setData({
        superAdmins: responseData.superAdmins || [],
        admins: responseData.admins || [],
        employees: responseData.employees || []
      });

      console.log('✅ Loaded credentials:');
      console.log('- Super Admins:', responseData.superAdmins?.length || 0);
      console.log('- Admins:', responseData.admins?.length || 0);
      console.log('- Employees:', responseData.employees?.length || 0);

      toast.success('✅ Database credentials loaded!');
    } catch (error: any) {
      console.error('❌ Error loading credentials:', error);
      toast.error(`Error: ${error.message}`);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const copyToLogin = (username: string, password: string) => {
    localStorage.setItem('autofill_username', username);
    localStorage.setItem('autofill_password', password);
    toast.success('✅ Credentials copied! Redirecting to login...');
    setTimeout(() => {
      navigate('/login');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>

          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6 text-[#F7B34C]" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#0B3060]" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Database Credentials
                  </h1>
                  <p className="text-gray-600 text-sm">View all accounts in your Supabase database</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all flex items-center gap-2"
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="hidden sm:inline">{showPasswords ? 'Hide' : 'Show'} Passwords</span>
                </button>
                <button
                  onClick={loadCredentials}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#0B3060] hover:bg-[#1a4a8a] text-white rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {isLoading && (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-[#0B3060] mx-auto mb-2" />
                <p className="text-gray-600">Loading credentials...</p>
              </div>
            )}
          </div>
        </div>

        {!isLoading && (
          <div className="space-y-6">
            {/* Super Admins */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">👑</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Super Admins</h2>
                  <p className="text-sm text-gray-600">{data.superAdmins.length} account(s) found</p>
                </div>
              </div>

              {data.superAdmins.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-4">No super admin accounts found</p>
                  
                  {/* Quick Fix Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-6">
                    <button
                      onClick={() => navigate('/super-admin-sql-fixer')}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
                    >
                      <Database className="w-5 h-5" />
                      Get SQL Commands to Create Account
                    </button>
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-500">
                    <p>Click above to get SQL commands to run in your Supabase dashboard</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {data.superAdmins.map((admin: any, idx: number) => (
                    <div key={idx} className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50">
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Username</p>
                          <p className="font-bold text-purple-900">{admin.username}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Password</p>
                          <p className="font-mono text-purple-900">
                            {showPasswords ? (admin.password_hash || admin.password || 'N/A') : '••••••••'}
                          </p>
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => copyToLogin(admin.username, admin.password_hash || admin.password)}
                            className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all text-sm font-semibold"
                          >
                            Use This Account
                          </button>
                        </div>
                      </div>
                      {admin.full_name && (
                        <p className="text-sm text-gray-600 mt-2">Name: {admin.full_name}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admins */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">👔</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Admins / Team Leaders</h2>
                  <p className="text-sm text-gray-600">{data.admins.length} account(s) found</p>
                </div>
              </div>

              {data.admins.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No admin accounts found</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {data.admins.map((admin: any, idx: number) => (
                    <div key={idx} className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50">
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Admin Number</p>
                          <p className="font-bold text-blue-900">{admin.admin_number}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Password</p>
                          <p className="font-mono text-blue-900">
                            {showPasswords ? (admin.password_hash || admin.password || 'N/A') : '••••••••'}
                          </p>
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => copyToLogin(admin.admin_number, admin.password_hash || admin.password)}
                            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-semibold"
                          >
                            Use This Account
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        {admin.full_name && <p>Name: {admin.full_name}</p>}
                        {admin.email && <p>Email: {admin.email}</p>}
                        {admin.username && <p>Username: {admin.username}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Employees */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">👤</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Employees</h2>
                  <p className="text-sm text-gray-600">{data.employees.length} account(s) found</p>
                </div>
              </div>

              {data.employees.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No employee accounts found</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {data.employees.map((emp: any, idx: number) => (
                    <div key={idx} className="border-2 border-green-200 rounded-xl p-4 bg-green-50">
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Employee Number</p>
                          <p className="font-bold text-green-900">{emp.employee_number}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Password</p>
                          <p className="font-mono text-green-900">
                            {showPasswords ? (emp.password_hash || emp.password || 'N/A') : '••••••••'}
                          </p>
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => copyToLogin(emp.employee_number, emp.password_hash || emp.password)}
                            className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all text-sm font-semibold"
                          >
                            Use This Account
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        {emp.full_name && <p>Name: {emp.full_name}</p>}
                        {emp.email && <p>Email: {emp.email}</p>}
                        {emp.position && <p>Position: {emp.position}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}