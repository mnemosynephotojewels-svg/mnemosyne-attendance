import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

export function AdminCredentialsViewer() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<any[]>([]);
  const [superAdmins, setSuperAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    try {
      // Load regular admins
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (adminError) {
        console.error('Error loading admins:', adminError);
        toast.error('Failed to load admin accounts');
      } else {
        setAdmins(adminData || []);
        console.log('Loaded admins:', adminData);
      }

      // Load super admins (identified by admin_number starting with "SA-")
      const { data: superAdminData, error: superAdminError } = await supabase
        .from('admins')
        .select('*')
        .like('admin_number', 'SA-%')
        .order('created_at', { ascending: false });

      if (superAdminError) {
        console.error('Error loading super admins:', superAdminError);
      } else {
        setSuperAdmins(superAdminData || []);
        console.log('Loaded super admins:', superAdminData);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`${id}-${type}`);
    toast.success(`${type} copied!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loginAsAdmin = (admin: any) => {
    localStorage.setItem('adminSession', JSON.stringify(admin));
    localStorage.setItem('mnemosyne_admin_profile', JSON.stringify(admin));
    toast.success(`Logged in as ${admin.full_name}`);
    navigate('/admin');
  };

  const loginAsSuperAdmin = (admin: any) => {
    localStorage.setItem('superAdminSession', JSON.stringify(admin));
    toast.success(`Logged in as Super Admin: ${admin.full_name}`);
    navigate('/super-admin');
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#1a4a8a] to-[#0B3060] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-[#0B3060] mb-2">Database Not Connected</h2>
          <p className="text-gray-600">Please configure Supabase to view credentials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#1a4a8a] to-[#0B3060] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Login
          </button>
          <button
            onClick={loadAccounts}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-[#F7B34C]" />
            </div>
            <h1 className="text-3xl font-bold text-[#0B3060] mb-2">Admin Credentials Viewer</h1>
            <p className="text-gray-600">View all admin login credentials from your database</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-[#0B3060] animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading admin accounts...</p>
            </div>
          ) : admins.length === 0 && superAdmins.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">No Admin Accounts Found</h3>
              <p className="text-gray-600 mb-6">Create an admin account to get started</p>
              <button
                onClick={() => navigate('/admin-initializer')}
                className="px-6 py-3 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white rounded-lg font-semibold hover:from-[#1a4a8a] hover:to-[#0B3060] transition-all"
              >
                Create Admin Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#0B3060]">
                  {admins.length + superAdmins.length} Admin Account{admins.length + superAdmins.length !== 1 ? 's' : ''} Found
                </h2>
              </div>

              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-6 hover:border-[#0B3060] transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      {/* Admin Info */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-[#0B3060]">{admin.full_name}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            admin.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {admin.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Admin #:</span> {admin.admin_number}
                          </div>
                          <div>
                            <span className="font-medium">Role:</span> {admin.role}
                          </div>
                          <div>
                            <span className="font-medium">Team:</span> {admin.team || admin.department}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {admin.email}
                          </div>
                        </div>
                      </div>

                      {/* Credentials Box */}
                      <div className="bg-white border-2 border-[#F7B34C] rounded-lg p-4">
                        <p className="text-xs font-bold text-[#0B3060] mb-3 uppercase">Login Credentials</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Username */}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Username</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-blue-50 text-blue-900 px-3 py-2 rounded font-mono font-bold text-sm">
                                {admin.username}
                              </code>
                              <button
                                onClick={() => copyToClipboard(admin.username, admin.id, 'Username')}
                                className="p-2 hover:bg-gray-100 rounded transition-colors"
                                title="Copy username"
                              >
                                {copiedId === `${admin.id}-Username` ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Password */}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Password</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-amber-50 text-amber-900 px-3 py-2 rounded font-mono font-bold text-sm">
                                {admin.password_hash}
                              </code>
                              <button
                                onClick={() => copyToClipboard(admin.password_hash, admin.id, 'Password')}
                                className="p-2 hover:bg-gray-100 rounded transition-colors"
                                title="Copy password"
                              >
                                {copiedId === `${admin.id}-Password` ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Login Button */}
                    <div className="lg:w-32">
                      <button
                        onClick={() => loginAsAdmin(admin)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white rounded-lg font-semibold hover:from-[#1a4a8a] hover:to-[#0B3060] transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Login
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {superAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-[#F7B34C] rounded-xl p-6 hover:border-[#0B3060] transition-all shadow-lg"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      {/* Super Admin Info */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="w-6 h-6 text-[#F7B34C]" />
                          <h3 className="text-xl font-bold text-[#0B3060]">{admin.full_name}</h3>
                          <span className="px-3 py-1 rounded bg-gradient-to-r from-[#F7B34C] to-[#fcd34d] text-[#0B3060] text-xs font-bold">
                            SUPER ADMIN
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            admin.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {admin.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Admin #:</span> {admin.admin_number}
                          </div>
                          <div>
                            <span className="font-medium">Role:</span> {admin.role}
                          </div>
                          <div>
                            <span className="font-medium">Team:</span> {admin.team || admin.department || 'All Teams'}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {admin.email}
                          </div>
                        </div>
                      </div>

                      {/* Credentials Box */}
                      <div className="bg-white border-2 border-[#F7B34C] rounded-lg p-4">
                        <p className="text-xs font-bold text-[#0B3060] mb-3 uppercase flex items-center gap-2">
                          <Crown className="w-4 h-4 text-[#F7B34C]" />
                          Super Admin Login Credentials
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Username */}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Username</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-blue-50 text-blue-900 px-3 py-2 rounded font-mono font-bold text-sm">
                                {admin.username}
                              </code>
                              <button
                                onClick={() => copyToClipboard(admin.username, admin.id, 'Username')}
                                className="p-2 hover:bg-gray-100 rounded transition-colors"
                                title="Copy username"
                              >
                                {copiedId === `${admin.id}-Username` ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Password */}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Password</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-amber-50 text-amber-900 px-3 py-2 rounded font-mono font-bold text-sm">
                                {admin.password_hash}
                              </code>
                              <button
                                onClick={() => copyToClipboard(admin.password_hash, admin.id, 'Password')}
                                className="p-2 hover:bg-gray-100 rounded transition-colors"
                                title="Copy password"
                              >
                                {copiedId === `${admin.id}-Password` ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Login Button */}
                    <div className="lg:w-32">
                      <button
                        onClick={() => loginAsSuperAdmin(admin)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-[#F7B34C] to-[#fcd34d] text-[#0B3060] rounded-lg font-bold hover:from-[#fcd34d] hover:to-[#F7B34C] transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Crown className="w-4 h-4" />
                        Login
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/admin-initializer')}
              className="flex-1 px-4 py-3 bg-green-50 border-2 border-green-400 text-green-900 rounded-lg font-semibold hover:bg-green-100 transition-colors"
            >
              + Create New Admin
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex-1 px-4 py-3 bg-[#0B3060] text-white rounded-lg font-semibold hover:bg-[#1a4a8a] transition-colors"
            >
              Go to Login Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}