import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Crown, UserPlus, CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function SuperAdminInitializer() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [superAdminExists, setSuperAdminExists] = useState(false);
  const [checking, setChecking] = useState(true);
  const [createdSuperAdmins, setCreatedSuperAdmins] = useState<any[]>([]);

  useEffect(() => {
    checkExistingSuperAdmins();
  }, []);

  const checkExistingSuperAdmins = async () => {
    try {
      console.log('🔍 Checking existing super admins via server API...');
      
      const response = await fetch(`${API_URL}/super-admin/list`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('Server response:', result);

      if (result.success && result.data) {
        const accounts = result.data;
        if (accounts.length > 0) {
          setSuperAdminExists(true);
          setCreatedSuperAdmins(accounts);
          console.log(`✅ Found ${accounts.length} super admin account(s)`);
        } else {
          console.log('ℹ️ No super admin accounts found');
        }
      }
    } catch (error) {
      console.error('Error checking super admins:', error);
      toast.error('Failed to check existing accounts');
    } finally {
      setChecking(false);
    }
  };

  const createDefaultSuperAdmin = async () => {
    setIsLoading(true);
    try {
      console.log('👑 Creating default super admin...');
      
      const response = await fetch(`${API_URL}/super-admin/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'superadmin',
          password: 'super123',
          full_name: 'Super Administrator',
          email: 'superadmin@mnemosyne.com',
        }),
      });

      const result = await response.json();
      console.log('Create response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create account');
      }

      console.log('✅ Super Admin created:', result.data);
      toast.success('Default Super Admin created successfully!');
      
      await checkExistingSuperAdmins();
    } catch (error) {
      console.error('Error creating super admin:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const createCustomSuperAdmin = async (username: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      console.log('👑 Creating custom super admin...');
      
      const response = await fetch(`${API_URL}/super-admin/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          full_name: fullName,
          email: `${username}@mnemosyne.com`,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create account');
      }

      console.log('✅ Super Admin created:', result.data);
      toast.success(`Super Admin "${username}" created successfully!`);
      
      await checkExistingSuperAdmins();
    } catch (error) {
      console.error('Error creating super admin:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsSuperAdmin = (admin: any) => {
    localStorage.setItem('superAdminSession', JSON.stringify(admin));
    toast.success(`Logged in as ${admin.full_name || admin.username}`);
    navigate('/super-admin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#1a4a8a] to-[#0B3060] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#F7B34C] to-[#fcd34d] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Crown className="w-10 h-10 text-[#0B3060]" />
            </div>
            <h1 className="text-3xl font-bold text-[#0B3060] mb-2">Super Admin Initializer</h1>
            <p className="text-gray-600">Create and manage super admin accounts for Mnemosyne</p>
          </div>

          {checking ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-[#0B3060] animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Checking existing super admins...</p>
            </div>
          ) : (
            <>
              {/* Status */}
              <div className={`mb-6 p-4 rounded-lg border-2 ${
                superAdminExists 
                  ? 'bg-green-50 border-green-400' 
                  : 'bg-amber-50 border-amber-400'
              }`}>
                <div className="flex items-center gap-3">
                  {superAdminExists ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  )}
                  <div>
                    <h3 className={`font-bold ${superAdminExists ? 'text-green-900' : 'text-amber-900'}`}>
                      {superAdminExists ? `${createdSuperAdmins.length} Super Admin Account(s) Found` : 'No Super Admin Accounts Found'}
                    </h3>
                    <p className={`text-sm ${superAdminExists ? 'text-green-700' : 'text-amber-700'}`}>
                      {superAdminExists 
                        ? 'You can login with existing credentials or create more super admins below.' 
                        : 'Create a default super admin account to get started.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Create Default Super Admin Button */}
              {!superAdminExists && (
                <button
                  onClick={createDefaultSuperAdmin}
                  disabled={isLoading}
                  className="w-full mb-4 h-14 bg-gradient-to-r from-[#F7B34C] to-[#fcd34d] hover:from-[#fcd34d] hover:to-[#F7B34C] text-[#0B3060] rounded-lg font-semibold transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Super Admin...
                    </>
                  ) : (
                    <>
                      <Crown className="w-5 h-5" />
                      Create Default Super Admin Account
                    </>
                  )}
                </button>
              )}

              {/* Default Credentials Info */}
              {!superAdminExists && (
                <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-[#F7B34C] rounded-lg">
                  <p className="text-sm font-bold text-[#0B3060] mb-2 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#F7B34C]" />
                    Default Super Admin Credentials:
                  </p>
                  <div className="space-y-1 text-sm text-gray-800">
                    <p><strong>Username:</strong> <code className="bg-amber-100 px-2 py-1 rounded font-mono">superadmin</code></p>
                    <p><strong>Password:</strong> <code className="bg-amber-100 px-2 py-1 rounded font-mono">super123</code></p>
                    <p className="text-xs text-amber-700 mt-2">⚠️ Change this password after first login!</p>
                  </div>
                </div>
              )}

              {/* Existing Super Admins List */}
              {createdSuperAdmins.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-[#0B3060] text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5 text-[#F7B34C]" />
                    Existing Super Admin Accounts
                  </h3>
                  {createdSuperAdmins.map((admin) => (
                    <div key={admin.id} className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-[#F7B34C] rounded-lg p-4 shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-gray-600">Username</p>
                              <p className="font-bold text-[#0B3060] flex items-center gap-1">
                                <Crown className="w-4 h-4 text-[#F7B34C]" />
                                {admin.username}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Full Name</p>
                              <p className="font-semibold">{admin.full_name || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="bg-white border-2 border-[#F7B34C] rounded p-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Username</p>
                                <code className="font-mono font-bold text-[#0B3060]">{admin.username}</code>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Password</p>
                                <code className="font-mono font-bold text-[#F7B34C]">{admin.password_hash || admin.password}</code>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => loginAsSuperAdmin(admin)}
                          className="ml-4 px-6 py-3 bg-gradient-to-r from-[#F7B34C] to-[#fcd34d] text-[#0B3060] rounded-lg font-bold hover:from-[#fcd34d] hover:to-[#F7B34C] transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
                        >
                          <Crown className="w-4 h-4" />
                          Login
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Custom Super Admin Form */}
              <QuickSuperAdminForm onCreate={createCustomSuperAdmin} isLoading={isLoading} />

              {/* Navigation Buttons */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#F7B34C] to-[#fcd34d] text-[#0B3060] rounded-lg font-bold hover:from-[#fcd34d] hover:to-[#F7B34C] transition-colors flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Go to Super Admin Login Page
                </button>
                <button
                  onClick={() => navigate('/admin-credentials')}
                  className="w-full px-4 py-3 bg-[#0B3060] text-white rounded-lg font-semibold hover:bg-[#1a4a8a] transition-colors"
                >
                  View All Admin Credentials
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickSuperAdminForm({ onCreate, isLoading }: { onCreate: (u: string, p: string, n: string) => void; isLoading: boolean }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.fullName) {
      toast.error('Please fill all fields');
      return;
    }
    onCreate(formData.username, formData.password, formData.fullName);
    setFormData({ username: '', password: '', fullName: '' });
  };

  return (
    <div className="mt-6 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-[#F7B34C] rounded-lg">
      <h3 className="font-bold text-[#0B3060] mb-4 flex items-center gap-2">
        <Crown className="w-5 h-5 text-[#F7B34C]" />
        Create Custom Super Admin
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-3 py-2 border-2 border-[#F7B34C] rounded-lg focus:ring-2 focus:ring-[#F7B34C] focus:border-transparent"
            placeholder="e.g., john.super"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="text"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border-2 border-[#F7B34C] rounded-lg focus:ring-2 focus:ring-[#F7B34C] focus:border-transparent"
            placeholder="e.g., SuperSecure123"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full px-3 py-2 border-2 border-[#F7B34C] rounded-lg focus:ring-2 focus:ring-[#F7B34C] focus:border-transparent"
            placeholder="e.g., John Doe"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-gradient-to-r from-[#F7B34C] to-[#fcd34d] text-[#0B3060] rounded-lg font-bold hover:from-[#fcd34d] hover:to-[#F7B34C] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Crown className="w-4 h-4" />
          {isLoading ? 'Creating...' : 'Create Super Admin'}
        </button>
      </form>
    </div>
  );
}