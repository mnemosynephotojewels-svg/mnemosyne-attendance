import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Users, Shield, UserCog, ArrowLeft, Copy, CheckCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Logo } from '../components/Logo';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

interface Employee {
  employee_number: string;
  full_name: string;
  email: string;
  password: string;
  position: string;
  team: string;
}

interface Admin {
  admin_id: string;
  full_name: string;
  email: string;
  password: string;
  team: string;
}

interface SuperAdmin {
  id: string;
  username: string;
  full_name?: string;
  email: string;
  password: string;
}

export function ViewAccounts() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllAccounts();
  }, []);

  const fetchAllAccounts = async () => {
    setLoading(true);
    try {
      // Fetch all account types in parallel
      const [empRes, adminRes, superRes] = await Promise.all([
        fetch(`${API_BASE_URL}/employees/list`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }),
        fetch(`${API_BASE_URL}/admins/list`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }),
        fetch(`${API_BASE_URL}/super-admin/list`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        })
      ]);

      const [empData, adminData, superData] = await Promise.all([
        empRes.json(),
        adminRes.json(),
        superRes.json()
      ]);

      if (empData.success) setEmployees(empData.data || []);
      if (adminData.success) setAdmins(adminData.data || []);
      if (superData.success) setSuperAdmins(superData.data || []);

      console.log('✅ Accounts fetched:', {
        employees: empData.data?.length || 0,
        admins: adminData.data?.length || 0,
        superAdmins: superData.data?.length || 0
      });
    } catch (error) {
      console.error('❌ Error fetching accounts:', error);
      toast.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`${type}-${id}`);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loginWithAccount = (username: string, password: string) => {
    // Store credentials in localStorage temporarily
    localStorage.setItem('autofill_username', username);
    localStorage.setItem('autofill_password', password);
    toast.success('Credentials loaded! Redirecting to login...');
    setTimeout(() => navigate('/'), 500);
  };

  const directTestLogin = async (username: string, password: string, fullName: string) => {
    try {
      toast.info('Testing login with exact database credentials...');
      
      console.log('🔬 DIRECT TEST LOGIN');
      console.log('Username:', username);
      console.log('Password:', password);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
      
      console.log('Test login response:', result);
      
      if (result.success) {
        toast.success(`✅ Login works! Welcome ${fullName}`);
        
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
        toast.error(`❌ Login failed: ${result.error}`);
        console.error('Login failed:', result);
      }
    } catch (error) {
      console.error('Test login error:', error);
      toast.error('Test login failed - check console');
    }
  };

  const totalAccounts = employees.length + admins.length + superAdmins.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <button
          onClick={() => navigate('/')}
          className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        <div className="flex items-center gap-4 mb-4">
          <Logo className="text-4xl" />
          <div>
            <h1 className="text-3xl font-bold text-white">Account Viewer</h1>
            <p className="text-[#F7B34C]">All accounts in your Supabase database</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#F7B34C]">{totalAccounts}</div>
              <div className="text-xs text-white/60">Total Accounts</div>
            </div>
            <div className="h-12 w-px bg-white/20" />
            <div className="text-center">
              <div className="text-xl font-bold text-white">{employees.length}</div>
              <div className="text-xs text-white/60">Employees</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">{admins.length}</div>
              <div className="text-xs text-white/60">Admins</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">{superAdmins.length}</div>
              <div className="text-xs text-white/60">Super Admins</div>
            </div>
          </div>
          <button
            onClick={fetchAllAccounts}
            disabled={loading}
            className="px-4 py-2 bg-[#F7B34C] hover:bg-[#e5a23b] text-[#0B3060] rounded-lg font-bold transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-xl">Loading accounts...</div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Super Admins */}
          {superAdmins.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Super Admins</h2>
                  <p className="text-sm text-white/60">{superAdmins.length} account(s)</p>
                </div>
              </div>
              <div className="space-y-3">
                {superAdmins.map((sa) => (
                  <div
                    key={sa.id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-white/40 mb-1">Username</div>
                        <div className="flex items-center gap-2">
                          <code className="text-[#F7B34C] font-mono font-bold">{sa.username}</code>
                          <button
                            onClick={() => copyToClipboard(sa.username, sa.id, 'super')}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            {copiedId === `super-${sa.id}` ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-white/40" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Password</div>
                        <div className="flex items-center gap-2">
                          <code className="text-white font-mono">
                            {showPasswords[`super-${sa.id}`] ? sa.password : '••••••••'}
                          </code>
                          <button
                            onClick={() => togglePassword(`super-${sa.id}`)}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            {showPasswords[`super-${sa.id}`] ? (
                              <EyeOff className="w-4 h-4 text-white/40" />
                            ) : (
                              <Eye className="w-4 h-4 text-white/40" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Name</div>
                        <div className="text-white">{sa.full_name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Email</div>
                        <div className="text-white/60 text-sm">{sa.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => directTestLogin(sa.username, sa.password, sa.full_name || 'Super Admin')}
                      className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-bold transition-all"
                    >
                      Login as {sa.username}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admins */}
          {admins.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#F7B34C] to-[#e5a23b] rounded-lg flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-[#0B3060]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Admins</h2>
                  <p className="text-sm text-white/60">{admins.length} account(s)</p>
                </div>
              </div>
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.admin_id}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-white/40 mb-1">Admin ID</div>
                        <div className="flex items-center gap-2">
                          <code className="text-[#F7B34C] font-mono font-bold">{admin.admin_id}</code>
                          <button
                            onClick={() => copyToClipboard(admin.admin_id, admin.admin_id, 'admin')}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            {copiedId === `admin-${admin.admin_id}` ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-white/40" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Password</div>
                        <div className="flex items-center gap-2">
                          <code className="text-white font-mono">
                            {showPasswords[`admin-${admin.admin_id}`] ? admin.password : '••••••••'}
                          </code>
                          <button
                            onClick={() => togglePassword(`admin-${admin.admin_id}`)}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            {showPasswords[`admin-${admin.admin_id}`] ? (
                              <EyeOff className="w-4 h-4 text-white/40" />
                            ) : (
                              <Eye className="w-4 h-4 text-white/40" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Name</div>
                        <div className="text-white">{admin.full_name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Team</div>
                        <div className="text-white/60">{admin.team}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => directTestLogin(admin.admin_id, admin.password, admin.full_name)}
                      className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-[#F7B34C] to-[#e5a23b] hover:from-[#e5a23b] hover:to-[#d49330] text-[#0B3060] rounded-lg font-bold transition-all"
                    >
                      Login as {admin.full_name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employees */}
          {employees.length > 0 && (
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Employees</h2>
                  <p className="text-sm text-white/60">{employees.length} account(s)</p>
                </div>
              </div>
              <div className="space-y-3">
                {employees.map((emp) => (
                  <div
                    key={emp.employee_number}
                    className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-white/40 mb-1">Employee Number</div>
                        <div className="flex items-center gap-2">
                          <code className="text-[#F7B34C] font-mono font-bold">{emp.employee_number}</code>
                          <button
                            onClick={() => copyToClipboard(emp.employee_number, emp.employee_number, 'emp')}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            {copiedId === `emp-${emp.employee_number}` ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-white/40" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Password</div>
                        <div className="flex items-center gap-2">
                          <code className="text-white font-mono">
                            {showPasswords[`emp-${emp.employee_number}`] ? emp.password : '••••••••'}
                          </code>
                          <button
                            onClick={() => togglePassword(`emp-${emp.employee_number}`)}
                            className="p-1 hover:bg-white/10 rounded"
                          >
                            {showPasswords[`emp-${emp.employee_number}`] ? (
                              <EyeOff className="w-4 h-4 text-white/40" />
                            ) : (
                              <Eye className="w-4 h-4 text-white/40" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Name</div>
                        <div className="text-white">{emp.full_name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-1">Position</div>
                        <div className="text-white/60">{emp.position}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => directTestLogin(emp.employee_number, emp.password, emp.full_name)}
                      className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-bold transition-all"
                    >
                      Login as {emp.full_name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalAccounts === 0 && (
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 text-center">
              <div className="text-white/40 text-lg mb-2">No accounts found</div>
              <div className="text-white/60 text-sm">Create accounts in your Supabase database</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}