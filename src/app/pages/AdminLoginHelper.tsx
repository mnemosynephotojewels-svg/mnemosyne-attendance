import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card } from '../components/Card';
import { Shield, Key, CheckCircle, AlertCircle, RefreshCw, LogIn, Eye, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export default function AdminLoginHelper() {
  const navigate = useNavigate();
  const [adminsData, setAdminsData] = useState<any>(null);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [testingLogin, setTestingLogin] = useState<string | null>(null);
  const [loginResults, setLoginResults] = useState<Record<string, any>>({});
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const fetchAdmins = async () => {
    setIsLoadingAdmins(true);
    try {
      console.log('📋 Fetching admins from:', `${API_BASE_URL}/admin/list-all`);
      
      const response = await fetch(`${API_BASE_URL}/admin/list-all`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', response.headers);
      
      // Get the raw text first to see what we're getting
      const rawText = await response.text();
      console.log('Raw response text:', rawText);
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response was not valid JSON:', rawText);
        setAdminsData({ 
          success: false, 
          error: `Invalid response from server. Got: ${rawText.substring(0, 100)}...` 
        });
        setIsLoadingAdmins(false);
        return;
      }
      
      setAdminsData(data);
      console.log('📋 Admins list:', data);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      setAdminsData({ success: false, error: String(error) });
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  const testLogin = async (username: string, password: string, adminId: string) => {
    setTestingLogin(adminId);
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🧪 TESTING LOGIN');
      console.log('Username:', username);
      console.log('Password:', password);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const result = await response.json();
      
      console.log('📥 Login result:', result);
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      setLoginResults(prev => ({
        ...prev,
        [adminId]: {
          success: result.success,
          result: result,
          status: response.status
        }
      }));

      if (result.success) {
        toast.success('✅ Login test successful!');
      } else {
        toast.error(`❌ Login test failed: ${result.error}`);
      }

    } catch (error) {
      console.error('❌ Test login error:', error);
      setLoginResults(prev => ({
        ...prev,
        [adminId]: {
          success: false,
          error: String(error)
        }
      }));
      toast.error('Test failed: ' + String(error));
    } finally {
      setTestingLogin(null);
    }
  };

  const loginAndRedirect = async (username: string, password: string) => {
    try {
      console.log('🔐 Attempting real login...');
      
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.success) {
        // Store admin session
        localStorage.setItem('adminSession', JSON.stringify(result.admin));
        toast.success(`Welcome back, ${result.admin.full_name}!`);
        navigate('/admin');
      } else {
        toast.error(result.error || 'Login failed');
      }

    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed: ' + String(error));
    }
  };

  const copyCredentials = (username: string, password: string) => {
    const text = `Username: ${username}\nPassword: ${password}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Credentials copied!');
    });
  };

  const createDefaultAdmin = async () => {
    setIsCreatingAdmin(true);
    try {
      console.log('🔧 Creating default admin account...');
      
      const response = await fetch(`${API_BASE_URL}/admin/create-default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        toast.success('✅ Default admin created successfully!');
        toast.success(`Username: admin | Password: admin123`);
        
        // Automatically reload admins list
        setTimeout(() => {
          fetchAdmins();
        }, 1000);
      } else {
        toast.error(result.error || 'Failed to create default admin');
      }

    } catch (error) {
      console.error('Create default admin error:', error);
      toast.error('Failed to create default admin: ' + String(error));
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const fixAdminCredentials = async (adminNumber: string) => {
    try {
      console.log('🔧 Fixing admin credentials for:', adminNumber);
      
      const response = await fetch(`${API_BASE_URL}/admin/fix-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          admin_number: adminNumber,
          new_username: 'admin',
          new_password: 'admin123'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('✅ Credentials updated!');
        toast.success(`New Username: admin | Password: admin123`);
        
        // Reload admins list
        setTimeout(() => {
          fetchAdmins();
        }, 1000);
      } else {
        toast.error(result.error || 'Failed to update credentials');
      }

    } catch (error) {
      console.error('Fix credentials error:', error);
      toast.error('Failed to update credentials: ' + String(error));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
            <Shield className="w-12 h-12 text-[#0B3060]" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Admin Login Helper</h1>
          <p className="text-white/80 text-lg">
            Test and verify admin login credentials
          </p>
        </div>

        {/* Action Button */}
        <div className="mb-6 text-center flex gap-4 justify-center">
          <button
            onClick={fetchAdmins}
            disabled={isLoadingAdmins}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#F7B34C] hover:bg-[#F7B34C]/90 text-[#0B3060] rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-6 h-6 ${isLoadingAdmins ? 'animate-spin' : ''}`} />
            {isLoadingAdmins ? 'Loading Admins...' : 'Load All Admins'}
          </button>

          <button
            onClick={createDefaultAdmin}
            disabled={isCreatingAdmin}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Shield className={`w-6 h-6 ${isCreatingAdmin ? 'animate-pulse' : ''}`} />
            {isCreatingAdmin ? 'Creating...' : 'Create Default Admin'}
          </button>
        </div>

        {/* Results */}
        {adminsData && (
          <>
            {adminsData.success && adminsData.admins && adminsData.admins.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {adminsData.admins.map((admin: any) => {
                  const testResult = loginResults[admin.id];
                  
                  return (
                    <Card key={admin.id} className="bg-white">
                      {/* Admin Header */}
                      <div className="border-b border-gray-200 pb-4 mb-4">
                        <h3 className="text-xl font-bold text-[#1F2937] mb-1">
                          {admin.full_name}
                        </h3>
                        <p className="text-sm font-mono text-[#6B7280] mb-2">
                          {admin.admin_number}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            admin.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {admin.status?.toUpperCase()}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {admin.role?.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Credentials */}
                      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Key className="w-5 h-5 text-amber-700" />
                          <h4 className="font-bold text-amber-900">Credentials</h4>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-amber-800 font-semibold mb-1">USERNAME</p>
                            <div className="bg-white px-3 py-2 rounded border border-amber-300">
                              <p className="text-sm font-mono font-bold text-[#0B3060] break-all">
                                {admin.username}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-amber-800 font-semibold mb-1">PASSWORD</p>
                            <div className="bg-white px-3 py-2 rounded border border-amber-300">
                              <p className="text-sm font-mono font-bold text-[#0B3060] break-all">
                                {admin.password_hash || 'NOT SET'}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-amber-800 font-semibold mb-1">TEAM</p>
                            <div className="bg-white px-3 py-2 rounded border border-amber-300">
                              <p className="text-sm font-medium text-[#0B3060]">
                                {admin.teams?.name || admin.team_id || 'No team'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Test Result */}
                      {testResult && (
                        <div className={`mb-4 p-4 rounded-lg border-2 ${
                          testResult.success
                            ? 'bg-green-50 border-green-300'
                            : 'bg-red-50 border-red-300'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            {testResult.success ? (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <p className="font-bold text-green-900">✅ Login Successful!</p>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <p className="font-bold text-red-900">❌ Login Failed</p>
                              </>
                            )}
                          </div>
                          {!testResult.success && (
                            <p className="text-sm text-red-700">
                              Error: {testResult.result?.error || testResult.error || 'Unknown error'}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => testLogin(admin.username, admin.password_hash, admin.id)}
                            disabled={testingLogin === admin.id}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                          >
                            <Eye className="w-4 h-4" />
                            Test
                          </button>

                          <button
                            onClick={() => copyCredentials(admin.username, admin.password_hash)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-[#6B7280] hover:bg-[#4B5563] text-white rounded-lg font-semibold text-sm transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            Copy
                          </button>

                          <button
                            onClick={() => loginAndRedirect(admin.username, admin.password_hash)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-[#0B3060] hover:bg-[#0B3060]/90 text-white rounded-lg font-semibold text-sm transition-colors"
                          >
                            <LogIn className="w-4 h-4" />
                            Login
                          </button>
                        </div>

                        {/* Fix Credentials Button */}
                        {(admin.username !== 'admin' || admin.password_hash !== 'admin123') && (
                          <button
                            onClick={() => fixAdminCredentials(admin.admin_number)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold text-sm transition-colors"
                          >
                            <Shield className="w-4 h-4" />
                            Fix to Simple Login (admin / admin123)
                          </button>
                        )}
                      </div>

                      {/* Additional Info */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-xs text-[#6B7280] space-y-1">
                          <p><strong>Email:</strong> {admin.email}</p>
                          <p><strong>Team ID:</strong> {admin.team_id || 'NULL'}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : adminsData.success && adminsData.count === 0 ? (
              <Card className="text-center py-12 bg-white">
                <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#1F2937] mb-2">
                  No Admin Accounts Found
                </h3>
                <p className="text-[#6B7280] mb-4">
                  You need to register an admin account first
                </p>
                <button
                  onClick={() => navigate('/super-admin/register-admin')}
                  className="px-6 py-3 bg-[#0B3060] text-white rounded-lg font-semibold hover:bg-[#0B3060]/90 transition-colors"
                >
                  Register Admin
                </button>
              </Card>
            ) : (
              <Card className="bg-red-50 border border-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                  <div className="w-full">
                    <p className="font-bold text-red-900 mb-2">Error Loading Admins</p>
                    <p className="text-sm text-red-700 mb-4">
                      {adminsData.error || 'Unknown error'}
                    </p>
                    
                    {/* Debug Information */}
                    <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
                      <p className="font-bold text-red-900 text-xs mb-2">🔧 Debug Information:</p>
                      <div className="space-y-1 text-xs text-red-800 font-mono">
                        <p><strong>API URL:</strong> {API_BASE_URL}/admin/list-all</p>
                        <p><strong>Project ID:</strong> {projectId}</p>
                        <p><strong>Has Auth Key:</strong> {publicAnonKey ? 'Yes' : 'No'}</p>
                      </div>
                    </div>

                    {/* Helpful Actions */}
                    <div className="space-y-2">
                      <p className="font-semibold text-red-900 text-sm">Try these solutions:</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-red-800">
                        <li>Open browser console (F12) and check for detailed error logs</li>
                        <li>Try clicking "Create Default Admin" instead</li>
                        <li>Make sure your Supabase Edge Function is deployed</li>
                        <li>Verify database connection at /setup</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Instructions */}
        {!adminsData && (
          <Card className="bg-white/10 border border-white/20 text-white">
            <h3 className="font-bold text-lg mb-3">📝 How to Use This Tool</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-white/90">
              <li>Click <strong>"Load All Admins"</strong> to fetch admin accounts from database</li>
              <li>Each card shows the admin's <strong>exact username and password</strong></li>
              <li>Click <strong>"Test"</strong> to verify if credentials work</li>
              <li>Click <strong>"Copy"</strong> to copy credentials to clipboard</li>
              <li>Click <strong>"Login"</strong> to login and redirect to admin portal</li>
              <li>Check browser console (F12) for detailed debugging logs</li>
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}