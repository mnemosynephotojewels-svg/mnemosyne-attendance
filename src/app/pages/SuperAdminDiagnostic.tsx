import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { ArrowLeft, Database, AlertTriangle, CheckCircle, XCircle, Wrench, Loader2, Shield, User } from 'lucide-react';

export function SuperAdminDiagnostic() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const runDiagnostics = async () => {
    setIsChecking(true);
    const results: any = {
      tableExists: false,
      tableAccessible: false,
      recordCount: 0,
      records: [],
      rlsEnabled: null,
      error: null
    };

    try {
      console.log('🔍 Running Super Admin Table Diagnostics...');

      // Test 1: Check if table exists and is accessible
      const { data, error, count } = await supabase
        .from('super_admin')
        .select('*', { count: 'exact' });

      if (error) {
        console.error('❌ Error accessing super_admin table:', error);
        results.error = error.message;
        results.tableExists = !error.message.includes('does not exist');
        results.tableAccessible = false;
      } else {
        console.log('✅ Table exists and is accessible');
        results.tableExists = true;
        results.tableAccessible = true;
        results.recordCount = count || 0;
        results.records = data || [];
        console.log('📊 Found', count, 'records');
        console.log('📋 Records:', data);
      }

      // Test 2: Try to insert a test record to check permissions
      const testInsert = await supabase
        .from('super_admin')
        .insert([{ username: '__test__', password_hash: '__test__', status: 'INACTIVE' }])
        .select();

      if (testInsert.error) {
        console.log('⚠️ Cannot insert (might be RLS restriction):', testInsert.error.message);
        results.rlsEnabled = true;
      } else {
        console.log('✅ Insert successful, deleting test record...');
        await supabase.from('super_admin').delete().eq('username', '__test__');
        results.rlsEnabled = false;
      }

    } catch (err: any) {
      console.error('❌ Diagnostic error:', err);
      results.error = err.message;
    }

    setDiagnostics(results);
    setIsChecking(false);
  };

  const createSuperAdminAccount = async () => {
    setIsFixing(true);
    try {
      console.log('🔧 Creating Super Admin Account...');

      const newSuperAdmin = {
        username: 'superadmin',
        password_hash: 'superadmin12345',
        full_name: 'Super Administrator',
        email: 'superadmin@mnemosyne.com',
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('super_admin')
        .insert([newSuperAdmin])
        .select();

      if (error) {
        console.error('❌ Failed to create super admin:', error);
        toast.error(`Failed: ${error.message}`);
        
        // If error is RLS, show instructions
        if (error.message.includes('policy') || error.message.includes('RLS')) {
          toast.error('⚠️ Row Level Security is blocking the insert. You need to disable RLS or create policies in Supabase dashboard.');
        }
      } else {
        console.log('✅ Super Admin created successfully!', data);
        toast.success('✅ Super Admin account created successfully!');
        setTimeout(() => {
          runDiagnostics(); // Re-run diagnostics
        }, 1000);
      }
    } catch (err: any) {
      console.error('❌ Error:', err);
      toast.error(`Error: ${err.message}`);
    }
    setIsFixing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
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
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0B3060]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Super Admin Diagnostic Tool
                </h1>
                <p className="text-gray-600 text-sm">Diagnose and fix Super Admin table issues</p>
              </div>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Issue Detected</p>
                  <p>The super_admin table is not returning any accounts. This tool will help diagnose and fix the issue.</p>
                </div>
              </div>
            </div>

            <button
              onClick={runDiagnostics}
              disabled={isChecking}
              className="w-full px-6 py-4 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] hover:from-[#1a4a8a] hover:to-[#0B3060] text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  Run Diagnostics
                </>
              )}
            </button>
          </div>
        </div>

        {/* Diagnostic Results */}
        {diagnostics && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Diagnostic Results</h2>
              
              <div className="space-y-3">
                {/* Table Exists */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {diagnostics.tableExists ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-semibold text-gray-900">Table Exists</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {diagnostics.tableExists ? 'Yes' : 'No'}
                  </span>
                </div>

                {/* Table Accessible */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {diagnostics.tableAccessible ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-semibold text-gray-900">Table Accessible</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {diagnostics.tableAccessible ? 'Yes' : 'No'}
                  </span>
                </div>

                {/* Record Count */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {diagnostics.recordCount > 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="font-semibold text-gray-900">Super Admin Accounts</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {diagnostics.recordCount} found
                  </span>
                </div>

                {/* RLS Status */}
                {diagnostics.rlsEnabled !== null && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">Row Level Security</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {diagnostics.rlsEnabled ? 'Enabled (May block inserts)' : 'Disabled'}
                    </span>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {diagnostics.error && (
                <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-sm text-red-800 font-mono">{diagnostics.error}</p>
                </div>
              )}
            </div>

            {/* Existing Records */}
            {diagnostics.records && diagnostics.records.length > 0 && (
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Existing Super Admin Accounts</h2>
                <div className="space-y-3">
                  {diagnostics.records.map((record: any, idx: number) => (
                    <div key={idx} className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Username:</span>
                          <span className="ml-2 font-bold text-purple-900">{record.username}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Password:</span>
                          <span className="ml-2 font-mono text-purple-900">{record.password_hash}</span>
                        </div>
                        {record.full_name && (
                          <div className="col-span-2">
                            <span className="text-gray-600">Name:</span>
                            <span className="ml-2 text-gray-900">{record.full_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fix Options */}
            {diagnostics.tableAccessible && diagnostics.recordCount === 0 && (
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Fix</h2>
                <p className="text-gray-600 mb-4">
                  The table exists but has no records. Click below to create a default super admin account.
                </p>
                
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-4">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Default Super Admin Account
                  </h3>
                  <div className="space-y-1 text-sm text-purple-800">
                    <p><span className="font-semibold">Username:</span> superadmin</p>
                    <p><span className="font-semibold">Password:</span> superadmin12345</p>
                    <p><span className="font-semibold">Email:</span> superadmin@mnemosyne.com</p>
                  </div>
                </div>

                <button
                  onClick={createSuperAdminAccount}
                  disabled={isFixing}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isFixing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <Wrench className="w-5 h-5" />
                      Create Super Admin Account
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Manual Instructions */}
            {!diagnostics.tableAccessible && (
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
                <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  Manual Fix Required
                </h2>
                <div className="space-y-3 text-sm text-gray-700">
                  <p>The super_admin table cannot be accessed. Please follow these steps:</p>
                  <ol className="list-decimal list-inside space-y-2 ml-2">
                    <li>Go to your Supabase Dashboard</li>
                    <li>Navigate to Table Editor</li>
                    <li>Check if the "super_admin" table exists</li>
                    <li>If it doesn't exist, create it with these columns:
                      <ul className="list-disc list-inside ml-6 mt-2">
                        <li>id (int8, primary key)</li>
                        <li>username (text)</li>
                        <li>password_hash (text)</li>
                        <li>full_name (text)</li>
                        <li>email (text)</li>
                        <li>status (text)</li>
                        <li>created_at (timestamptz)</li>
                      </ul>
                    </li>
                    <li>If RLS is enabled, disable it or create policies that allow SELECT and INSERT</li>
                    <li>Manually insert a super admin record using the SQL Editor:
                      <pre className="bg-gray-900 text-green-400 p-3 rounded-lg mt-2 overflow-x-auto font-mono text-xs">
{`INSERT INTO super_admin (username, password_hash, full_name, email, status, created_at)
VALUES ('superadmin', 'superadmin12345', 'Super Administrator', 'superadmin@mnemosyne.com', 'ACTIVE', NOW());`}
                      </pre>
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
