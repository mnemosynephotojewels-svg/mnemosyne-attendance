import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

export function AdminDebugHelper() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testUsername, setTestUsername] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const fetchAdmins = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase is not configured');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Fetching all admins...');
      
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching admins:', error);
        toast.error(`Failed to fetch admins: ${error.message}`);
        return;
      }

      console.log('✅ Admins fetched:', data);
      setAdmins(data || []);
      toast.success(`Found ${data?.length || 0} admin(s)`);
    } catch (error) {
      console.error('Exception:', error);
      toast.error('An error occurred while fetching admins');
    } finally {
      setIsLoading(false);
    }
  };

  const testLogin = async (username: string, password: string) => {
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }

    setTestResult(null);
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🧪 TESTING LOGIN');
      console.log('Username:', username);
      console.log('Password:', password);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Try username first
      let { data: dbAdmin, error: dbError } = await supabase!
        .from('admins')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      // If not found by username, try admin_number
      if (!dbAdmin && !dbError) {
        console.log('Not found by username, trying admin_number...');
        const result = await supabase!
          .from('admins')
          .select('*')
          .eq('admin_number', username)
          .maybeSingle();
        
        dbAdmin = result.data;
        dbError = result.error;
      }

      console.log('📊 Database check result:');
      console.log('Admin found:', dbAdmin);
      console.log('Error:', dbError);

      if (!dbAdmin) {
        setTestResult({
          success: false,
          message: 'Admin not found in database',
          details: {
            username,
            searchedBy: 'username OR admin_number',
            found: false
          }
        });
        toast.error('Admin not found in database');
        return;
      }

      // Check password
      const passwordMatch = dbAdmin.password_hash === password;
      
      console.log('🔑 Password verification:');
      console.log('Stored password:', dbAdmin.password_hash);
      console.log('Entered password:', password);
      console.log('Match:', passwordMatch);

      if (!passwordMatch) {
        setTestResult({
          success: false,
          message: 'Password does not match',
          details: {
            username,
            storedPassword: dbAdmin.password_hash,
            enteredPassword: password,
            match: false
          }
        });
        toast.error('Password does not match');
        return;
      }

      // Success
      setTestResult({
        success: true,
        message: 'Login credentials are valid!',
        admin: dbAdmin
      });
      toast.success('Login credentials are valid!');
      console.log('✅ Login test successful');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      console.error('Exception during login test:', error);
      setTestResult({
        success: false,
        message: 'Exception occurred',
        error: String(error)
      });
      toast.error('An error occurred during login test');
    }
  };

  const copyCredentials = (admin: any) => {
    const text = `Username: ${admin.username}\nPassword: ${admin.password_hash}`;
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied!');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-[#0B3060]" />
        <h1 className="text-3xl font-bold text-[#0B3060]">Admin Login Debug Helper</h1>
      </div>

      {/* Fetch Admins */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#1F2937]">Database Admins</h2>
            <button
              onClick={fetchAdmins}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Fetch Admins
            </button>
          </div>

          {admins.length > 0 ? (
            <div className="space-y-3">
              {admins.map((admin, index) => (
                <div key={admin.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Admin Number</p>
                      <p className="font-semibold text-[#0B3060]">{admin.admin_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Username</p>
                      <p className="font-semibold">{admin.username}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Full Name</p>
                      <p className="font-semibold">{admin.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Department</p>
                      <p className="font-semibold">{admin.department || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Password (Stored)</p>
                        <p className="font-mono text-sm font-bold text-[#F7B34C]">{admin.password_hash}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setTestUsername(admin.username);
                            setTestPassword(admin.password_hash);
                          }}
                          className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyCredentials(admin)}
                          className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => testLogin(admin.username, admin.password_hash)}
                          className="px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors flex items-center gap-1"
                        >
                          <LogIn className="w-4 h-4" />
                          Test
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No admins found. Click "Fetch Admins" to load data.
            </div>
          )}
        </div>
      </Card>

      {/* Manual Login Test */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-[#1F2937] mb-4">Manual Login Test</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
                placeholder="Enter username or admin number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="text"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={() => testLogin(testUsername, testPassword)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-semibold"
          >
            <LogIn className="w-5 h-5" />
            Test Login Credentials
          </button>

          {testResult && (
            <div className={`mt-4 p-4 rounded-lg border-2 ${
              testResult.success 
                ? 'bg-green-50 border-green-400' 
                : 'bg-red-50 border-red-400'
            }`}>
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className={`font-bold mb-2 ${
                    testResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {testResult.message}
                  </h3>
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-[#1F2937] mb-4">How to Use This Tool</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Click <strong>"Fetch Admins"</strong> to load all admin accounts from the database</li>
            <li>Each admin card shows the username and stored password</li>
            <li>Click the <strong>Test</strong> button to verify the credentials work</li>
            <li>Or use the Manual Login Test section to test custom credentials</li>
            <li>If the test passes, those credentials should work on the login page</li>
          </ol>
          
          <div className="mt-4 p-4 bg-amber-50 border border-amber-400 rounded-lg">
            <p className="text-sm text-amber-900">
              <strong>Note:</strong> This is a debugging tool. If login test passes here but fails on the actual login page,
              there might be an issue with the frontend login component or the backend API endpoint.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}