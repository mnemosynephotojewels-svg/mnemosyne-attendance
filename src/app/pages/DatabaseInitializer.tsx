import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle, XCircle, Loader2, ArrowLeft, Database, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Logo } from '../components/Logo';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function DatabaseInitializer() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    checkDatabase();
  }, []);

  const checkDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/debug/accounts`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      const data = await response.json();
      console.log('Database status:', data);
      setStatus(data);
    } catch (error) {
      console.error('Error checking database:', error);
      toast.error('Failed to check database');
      setStatus({ error: 'Connection failed' });
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    setCreating(true);
    try {
      console.log('Creating sample data...');
      
      const response = await fetch(`${API_BASE_URL}/debug/create-sample-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      const result = await response.json();
      console.log('Create sample data result:', result);

      if (result.success) {
        toast.success('✅ Sample data created successfully!');
        setTimeout(() => checkDatabase(), 1000);
      } else {
        toast.error(`❌ ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating sample data:', error);
      toast.error('Failed to create sample data');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#F7B34C] animate-spin mx-auto mb-4" />
          <p className="text-white">Checking database...</p>
        </div>
      </div>
    );
  }

  const hasAccounts = status?.success && status.data?.totalAccounts > 0;
  const hasErrors = status?.errors && (status.errors.employees || status.errors.admins || status.errors.superAdmins);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        <div className="flex items-center gap-4 mb-8">
          <Logo className="text-4xl" />
          <div>
            <h1 className="text-3xl font-bold text-white">Database Status</h1>
            <p className="text-[#F7B34C]">Check your database accounts</p>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 mb-6">
          <h3 className="text-white font-bold mb-2">🔍 Debug Information:</h3>
          <div className="text-white/60 text-sm space-y-1 font-mono">
            <div>API URL: {API_BASE_URL}</div>
            <div>Has Supabase Key: {publicAnonKey ? 'Yes ✅' : 'No ❌'}</div>
            <div>Status loaded: {status ? 'Yes ✅' : 'No ❌'}</div>
            {status?.debug && (
              <>
                <div>Supabase URL: {status.debug.supabaseUrl}</div>
                <div>Has Service Role Key: {status.debug.hasServiceRoleKey ? 'Yes ✅' : 'No ❌'}</div>
                <div>Timestamp: {status.debug.timestamp}</div>
              </>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8 mb-6">
          {hasAccounts ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <h2 className="text-2xl font-bold text-green-400">Database is Ready!</h2>
                  <p className="text-white/60">Found {status.data.totalAccounts} accounts in your database</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-400">{status.data.employees.length}</div>
                  <div className="text-white/60 text-sm">Employees</div>
                </div>
                <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-400">{status.data.admins.length}</div>
                  <div className="text-white/60 text-sm">Admins</div>
                </div>
                <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-400">{status.data.superAdmins.length}</div>
                  <div className="text-white/60 text-sm">Super Admins</div>
                </div>
              </div>

              <button
                onClick={() => navigate('/direct-login')}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-xl"
              >
                <CheckCircle className="w-5 h-5" />
                Go to One-Click Login →
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <XCircle className="w-8 h-8 text-red-400" />
                <div>
                  <h2 className="text-2xl font-bold text-red-400">Cannot Access Database</h2>
                  <p className="text-white/60">There might be accounts, but we can't read them</p>
                </div>
              </div>

              {hasErrors && (
                <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4 mb-6">
                  <h3 className="text-red-400 font-bold mb-3">Database Errors:</h3>
                  <div className="space-y-2 text-sm">
                    {status.errors.employees && (
                      <div className="bg-black/20 p-3 rounded">
                        <div className="text-red-300 font-semibold">Employees Table:</div>
                        <div className="text-white/60">{status.errors.employees.message}</div>
                        {status.errors.employees.hint && (
                          <div className="text-white/40 text-xs mt-1">Hint: {status.errors.employees.hint}</div>
                        )}
                        <div className="text-white/40 text-xs">Code: {status.errors.employees.code}</div>
                      </div>
                    )}
                    {status.errors.admins && (
                      <div className="bg-black/20 p-3 rounded">
                        <div className="text-red-300 font-semibold">Admins Table:</div>
                        <div className="text-white/60">{status.errors.admins.message}</div>
                        {status.errors.admins.hint && (
                          <div className="text-white/40 text-xs mt-1">Hint: {status.errors.admins.hint}</div>
                        )}
                        <div className="text-white/40 text-xs">Code: {status.errors.admins.code}</div>
                      </div>
                    )}
                    {status.errors.superAdmins && (
                      <div className="bg-black/20 p-3 rounded">
                        <div className="text-red-300 font-semibold">Super Admin Table:</div>
                        <div className="text-white/60">{status.errors.superAdmins.message}</div>
                        {status.errors.superAdmins.hint && (
                          <div className="text-white/40 text-xs mt-1">Hint: {status.errors.superAdmins.hint}</div>
                        )}
                        <div className="text-white/40 text-xs">Code: {status.errors.superAdmins.code}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={checkDatabase}
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      Refresh - Check Again
                    </>
                  )}
                </button>

                <button
                  onClick={createSampleData}
                  disabled={creating}
                  className="w-full px-6 py-4 bg-gradient-to-r from-[#F7B34C] to-[#e5a23b] hover:from-[#e5a23b] hover:to-[#d49330] text-[#0B3060] rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Sample Data...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create Sample Data (If Empty)
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Raw Data Preview */}
        {status?.data && (
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 mb-6">
            <h3 className="text-white font-bold mb-3">📊 Raw Data (First 3 from each table):</h3>
            <div className="space-y-4">
              {/* Employees */}
              {status.data.employees.length > 0 && (
                <div>
                  <h4 className="text-blue-400 font-semibold mb-2">Employees:</h4>
                  <div className="bg-black/20 p-3 rounded text-xs font-mono text-white/80 overflow-x-auto">
                    <pre>{JSON.stringify(status.data.employees.slice(0, 3), null, 2)}</pre>
                  </div>
                </div>
              )}
              
              {/* Admins */}
              {status.data.admins.length > 0 && (
                <div>
                  <h4 className="text-yellow-400 font-semibold mb-2">Admins:</h4>
                  <div className="bg-black/20 p-3 rounded text-xs font-mono text-white/80 overflow-x-auto">
                    <pre>{JSON.stringify(status.data.admins.slice(0, 3), null, 2)}</pre>
                  </div>
                </div>
              )}
              
              {/* Super Admins */}
              {status.data.superAdmins.length > 0 && (
                <div>
                  <h4 className="text-red-400 font-semibold mb-2">Super Admins:</h4>
                  <div className="bg-black/20 p-3 rounded text-xs font-mono text-white/80 overflow-x-auto">
                    <pre>{JSON.stringify(status.data.superAdmins.slice(0, 3), null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}