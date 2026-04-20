import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

export function AdminInitializer() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(false);
  const [checking, setChecking] = useState(true);
  const [createdAdmins, setCreatedAdmins] = useState<any[]>([]);

  useEffect(() => {
    checkExistingAdmins();
  }, []);

  const checkExistingAdmins = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setChecking(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .limit(10);

      if (!error && data && data.length > 0) {
        setAdminExists(true);
        setCreatedAdmins(data);
      }
    } catch (error) {
      console.error('Error checking admins:', error);
    } finally {
      setChecking(false);
    }
  };

  const createDefaultAdmin = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase is not configured');
      return;
    }

    setIsLoading(true);
    try {
      // Check for existing team
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('*')
        .eq('name', 'Management')
        .maybeSingle();

      let teamId = existingTeam?.id;

      // Create team if it doesn't exist
      if (!existingTeam) {
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: 'Management',
            description: 'Management Team',
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (teamError) {
          toast.error(`Failed to create team: ${teamError.message}`);
          setIsLoading(false);
          return;
        }

        teamId = newTeam.id;
      }

      // Get next admin number
      const { data: existingAdmins } = await supabase
        .from('admins')
        .select('admin_number')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (existingAdmins && existingAdmins.length > 0) {
        const lastNumber = parseInt(existingAdmins[0].admin_number.replace('ADM', ''));
        nextNumber = lastNumber + 1;
      }

      const adminNumber = `ADM${String(nextNumber).padStart(3, '0')}`;

      // Create default admin
      const adminData = {
        admin_number: adminNumber,
        username: 'admin',
        password_hash: 'admin123',
        full_name: 'System Administrator',
        email: 'admin@mnemosyne.com',
        phone_number: '09123456789',
        role: 'Team Leader',
        department: 'Management',
        team: 'Management',
        team_id: teamId,
        status: 'active',
        access_level: 'full',
        created_at: new Date().toISOString(),
      };

      const { data: newAdmin, error: adminError } = await supabase
        .from('admins')
        .insert(adminData)
        .select()
        .single();

      if (adminError) {
        if (adminError.code === '23505') {
          toast.error('Admin with username "admin" already exists');
        } else {
          toast.error(`Failed to create admin: ${adminError.message}`);
        }
        setIsLoading(false);
        return;
      }

      console.log('✅ Admin created:', newAdmin);
      toast.success('Default admin created successfully!');
      
      await checkExistingAdmins();
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error('Failed to create admin');
    } finally {
      setIsLoading(false);
    }
  };

  const createCustomAdmin = async (username: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase is not configured');
      return;
    }

    setIsLoading(true);
    try {
      // Check for existing team
      const { data: existingTeam } = await supabase
        .from('teams')
        .select('*')
        .eq('name', 'Management')
        .maybeSingle();

      let teamId = existingTeam?.id;

      if (!existingTeam) {
        const { data: newTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: 'Management',
            description: 'Management Team',
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (teamError) {
          toast.error(`Failed to create team: ${teamError.message}`);
          setIsLoading(false);
          return;
        }

        teamId = newTeam.id;
      }

      // Get next admin number
      const { data: existingAdmins } = await supabase
        .from('admins')
        .select('admin_number')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (existingAdmins && existingAdmins.length > 0) {
        const lastNumber = parseInt(existingAdmins[0].admin_number.replace('ADM', ''));
        nextNumber = lastNumber + 1;
      }

      const adminNumber = `ADM${String(nextNumber).padStart(3, '0')}`;

      const adminData = {
        admin_number: adminNumber,
        username: username,
        password_hash: password,
        full_name: fullName,
        email: `${username}@mnemosyne.com`,
        phone_number: '09123456789',
        role: 'Team Leader',
        department: 'Management',
        team: 'Management',
        team_id: teamId,
        status: 'active',
        access_level: 'full',
        created_at: new Date().toISOString(),
      };

      const { data: newAdmin, error: adminError } = await supabase
        .from('admins')
        .insert(adminData)
        .select()
        .single();

      if (adminError) {
        if (adminError.code === '23505') {
          toast.error(`Admin with username "${username}" already exists`);
        } else {
          toast.error(`Failed to create admin: ${adminError.message}`);
        }
        setIsLoading(false);
        return;
      }

      console.log('✅ Admin created:', newAdmin);
      toast.success(`Admin "${username}" created successfully!`);
      
      await checkExistingAdmins();
    } catch (error) {
      console.error('Error creating admin:', error);
      toast.error('Failed to create admin');
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsAdmin = (admin: any) => {
    localStorage.setItem('adminSession', JSON.stringify(admin));
    localStorage.setItem('mnemosyne_admin_profile', JSON.stringify(admin));
    toast.success(`Logged in as ${admin.full_name}`);
    navigate('/admin');
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#1a4a8a] to-[#0B3060] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0B3060] mb-2">Supabase Not Configured</h2>
          <p className="text-gray-600">Please configure Supabase to use this feature.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#1a4a8a] to-[#0B3060] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-10 h-10 text-[#F7B34C]" />
            </div>
            <h1 className="text-3xl font-bold text-[#0B3060] mb-2">Admin Account Initializer</h1>
            <p className="text-gray-600">Create and manage admin accounts for Mnemosyne</p>
          </div>

          {checking ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-[#0B3060] animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Checking existing admins...</p>
            </div>
          ) : (
            <>
              {/* Status */}
              <div className={`mb-6 p-4 rounded-lg border-2 ${
                adminExists 
                  ? 'bg-green-50 border-green-400' 
                  : 'bg-amber-50 border-amber-400'
              }`}>
                <div className="flex items-center gap-3">
                  {adminExists ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  )}
                  <div>
                    <h3 className={`font-bold ${adminExists ? 'text-green-900' : 'text-amber-900'}`}>
                      {adminExists ? `${createdAdmins.length} Admin Account(s) Found` : 'No Admin Accounts Found'}
                    </h3>
                    <p className={`text-sm ${adminExists ? 'text-green-700' : 'text-amber-700'}`}>
                      {adminExists 
                        ? 'You can login with existing credentials or create more admins below.' 
                        : 'Create a default admin account to get started.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Create Default Admin Button */}
              {!adminExists && (
                <button
                  onClick={createDefaultAdmin}
                  disabled={isLoading}
                  className="w-full mb-4 h-14 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] hover:from-[#1a4a8a] hover:to-[#0B3060] text-white rounded-lg font-semibold transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Admin...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create Default Admin Account
                    </>
                  )}
                </button>
              )}

              {/* Default Credentials Info */}
              {!adminExists && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-300 rounded-lg">
                  <p className="text-sm font-bold text-blue-900 mb-2">Default Admin Credentials:</p>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p><strong>Username:</strong> <code className="bg-blue-100 px-2 py-1 rounded">admin</code></p>
                    <p><strong>Password:</strong> <code className="bg-blue-100 px-2 py-1 rounded">admin123</code></p>
                    <p className="text-xs text-blue-600 mt-2">⚠️ Change this password after first login!</p>
                  </div>
                </div>
              )}

              {/* Existing Admins List */}
              {createdAdmins.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-[#0B3060] text-lg">Existing Admin Accounts</h3>
                  {createdAdmins.map((admin) => (
                    <div key={admin.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-xs text-gray-500">Admin Number</p>
                              <p className="font-bold text-[#0B3060]">{admin.admin_number}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Full Name</p>
                              <p className="font-semibold">{admin.full_name}</p>
                            </div>
                          </div>
                          <div className="bg-white border border-gray-300 rounded p-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Username</p>
                                <code className="font-mono font-bold text-[#0B3060]">{admin.username}</code>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Password</p>
                                <code className="font-mono font-bold text-[#F7B34C]">{admin.password_hash}</code>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => loginAsAdmin(admin)}
                          className="ml-4 px-6 py-3 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white rounded-lg font-semibold hover:from-[#1a4a8a] hover:to-[#0B3060] transition-all transform hover:scale-105"
                        >
                          Login
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Custom Admin Form */}
              <QuickAdminForm onCreate={createCustomAdmin} isLoading={isLoading} />

              {/* Navigation Buttons */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full px-4 py-3 bg-[#0B3060] text-white rounded-lg font-semibold hover:bg-[#1a4a8a] transition-colors"
                >
                  Go to Admin Login Page
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

function QuickAdminForm({ onCreate, isLoading }: { onCreate: (u: string, p: string, n: string) => void; isLoading: boolean }) {
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
    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="font-bold text-[#0B3060] mb-4">Create Custom Admin</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
            placeholder="e.g., john.doe"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="text"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
            placeholder="e.g., SecurePass123"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
            placeholder="e.g., John Doe"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-[#F7B34C] text-[#0B3060] rounded-lg font-semibold hover:bg-[#f5a832] transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Admin'}
        </button>
      </form>
    </div>
  );
}