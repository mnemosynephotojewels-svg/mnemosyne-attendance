import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';

export function QuickLoginFix() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const createDefaultAccounts = async () => {
    setIsCreating(true);
    try {
      console.log('🚀 Creating default accounts...');

      // Create Super Admin
      const { data: superAdminData, error: superAdminError } = await supabase
        .from('super_admin')
        .upsert({
          username: 'admin',
          password: 'admin123',
          full_name: 'System Administrator',
          email: 'admin@mnemosyne.com'
        }, { onConflict: 'username' })
        .select()
        .single();

      if (superAdminError && superAdminError.code !== '23505') {
        console.error('Super admin error:', superAdminError);
      }

      // Create Admin
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .upsert({
          admin_number: 'ADM-001',
          password: 'admin123',
          full_name: 'Demo Admin',
          email: 'admin001@mnemosyne.com',
          team_id: null,
          contact_number: '1234567890',
          status: 'active'
        }, { onConflict: 'admin_number' })
        .select()
        .single();

      if (adminError && adminError.code !== '23505') {
        console.error('Admin error:', adminError);
      }

      // Create Employee
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .upsert({
          employee_number: 'EMP001',
          password: 'emp123',
          full_name: 'Demo Employee',
          email: 'emp001@mnemosyne.com',
          position: 'Staff',
          team: 'General',
          contact_number: '1234567890',
          paid_leave_balance: 12
        }, { onConflict: 'employee_number' })
        .select()
        .single();

      if (employeeError && employeeError.code !== '23505') {
        console.error('Employee error:', employeeError);
      }

      setCredentials({
        superAdmin: { username: 'admin', password: 'admin123' },
        admin: { username: 'ADM-001', password: 'admin123' },
        employee: { username: 'EMP001', password: 'emp123' }
      });

      toast.success('✅ Default accounts created!');
      console.log('✅ All accounts created successfully');

    } catch (error: any) {
      console.error('❌ Error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const loginAs = async (userType: 'superAdmin' | 'admin' | 'employee') => {
    setIsLoggingIn(true);
    try {
      const creds = credentials[userType];
      console.log(`🔐 Logging in as ${userType}:`, creds.username);

      // Direct database login (bypass RLS)
      let userData = null;
      let redirectPath = '';

      if (userType === 'superAdmin') {
        const { data, error } = await supabase
          .from('super_admin')
          .select('*')
          .eq('username', creds.username)
          .eq('password', creds.password)
          .single();

        if (error || !data) {
          toast.error('Login failed: Invalid credentials');
          return;
        }

        userData = data;
        redirectPath = '/super-admin';
        localStorage.removeItem('employeeSession');
        localStorage.removeItem('adminSession');
        localStorage.setItem('superAdminSession', JSON.stringify(userData));

      } else if (userType === 'admin') {
        const { data, error } = await supabase
          .from('admins')
          .select('*')
          .eq('admin_number', creds.username)
          .eq('password', creds.password)
          .single();

        if (error || !data) {
          toast.error('Login failed: Invalid credentials');
          return;
        }

        userData = data;
        redirectPath = '/admin';
        localStorage.removeItem('employeeSession');
        localStorage.removeItem('superAdminSession');
        localStorage.setItem('adminSession', JSON.stringify(userData));

      } else if (userType === 'employee') {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('employee_number', creds.username)
          .eq('password', creds.password)
          .single();

        if (error || !data) {
          toast.error('Login failed: Invalid credentials');
          return;
        }

        userData = data;
        redirectPath = '/employee';
        localStorage.removeItem('adminSession');
        localStorage.removeItem('superAdminSession');
        localStorage.setItem('employeeSession', JSON.stringify(userData));
      }

      toast.success(`✅ Logged in as ${userData.full_name || userData.username}!`);
      console.log('✅ Login successful, redirecting to:', redirectPath);
      
      // Small delay to ensure localStorage is set
      setTimeout(() => {
        navigate(redirectPath);
      }, 100);

    } catch (error: any) {
      console.error('❌ Login error:', error);
      toast.error(`Login failed: ${error.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🔧 Quick Login Fix</h1>
            <p className="text-gray-600">Create default accounts and login instantly</p>
          </div>

          {!credentials ? (
            <div className="text-center">
              <button
                onClick={createDefaultAccounts}
                disabled={isCreating}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? '⏳ Creating Accounts...' : '🚀 Create Default Accounts'}
              </button>
              <p className="text-sm text-gray-500 mt-4">
                This will create 3 default accounts in your database
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <h2 className="text-lg font-semibold text-green-900">✅ Accounts Created Successfully!</h2>
                </div>
                <p className="text-sm text-green-700">Click any button below to login instantly</p>
              </div>

              {/* Super Admin */}
              <div className="border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-purple-900">👑 Super Admin</h3>
                    <p className="text-sm text-purple-700">Full system access</p>
                  </div>
                </div>
                <div className="bg-white rounded p-4 mb-4 font-mono text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600">Username:</div>
                    <div className="font-bold text-purple-900">{credentials.superAdmin.username}</div>
                    <div className="text-gray-600">Password:</div>
                    <div className="font-bold text-purple-900">{credentials.superAdmin.password}</div>
                  </div>
                </div>
                <button
                  onClick={() => loginAs('superAdmin')}
                  disabled={isLoggingIn}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                >
                  {isLoggingIn ? '⏳ Logging in...' : '🚀 Login as Super Admin'}
                </button>
              </div>

              {/* Admin */}
              <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">👔 Admin</h3>
                    <p className="text-sm text-blue-700">Team management access</p>
                  </div>
                </div>
                <div className="bg-white rounded p-4 mb-4 font-mono text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600">Username:</div>
                    <div className="font-bold text-blue-900">{credentials.admin.username}</div>
                    <div className="text-gray-600">Password:</div>
                    <div className="font-bold text-blue-900">{credentials.admin.password}</div>
                  </div>
                </div>
                <button
                  onClick={() => loginAs('admin')}
                  disabled={isLoggingIn}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {isLoggingIn ? '⏳ Logging in...' : '🚀 Login as Admin'}
                </button>
              </div>

              {/* Employee */}
              <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-green-900">👤 Employee</h3>
                    <p className="text-sm text-green-700">Employee portal access</p>
                  </div>
                </div>
                <div className="bg-white rounded p-4 mb-4 font-mono text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600">Username:</div>
                    <div className="font-bold text-green-900">{credentials.employee.username}</div>
                    <div className="text-gray-600">Password:</div>
                    <div className="font-bold text-green-900">{credentials.employee.password}</div>
                  </div>
                </div>
                <button
                  onClick={() => loginAs('employee')}
                  disabled={isLoggingIn}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {isLoggingIn ? '⏳ Logging in...' : '🚀 Login as Employee'}
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  💡 <strong>Tip:</strong> You can now use these credentials on the main <button onClick={() => navigate('/login')} className="underline font-semibold">login page</button> too!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}