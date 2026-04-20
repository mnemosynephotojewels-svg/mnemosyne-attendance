import { useState } from 'react';
import { Card } from '../components/Card';
import { AlertCircle, CheckCircle, Database, RefreshCw, Users, Key } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export default function AdminDebug() {
  const [adminsData, setAdminsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      console.log('📋 Fetching admins from:', `${API_BASE_URL}/admin/list-all`);
      
      const response = await fetch(`${API_BASE_URL}/admin/list-all`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      // Get raw text first for debugging
      const rawText = await response.text();
      console.log('Raw response:', rawText.substring(0, 200));
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Full response text:', rawText);
        setAdminsData({ 
          success: false, 
          error: `Server returned invalid JSON. Response: ${rawText.substring(0, 100)}` 
        });
        setIsLoading(false);
        return;
      }
      
      setAdminsData(data);
      console.log('Admin list results:', data);
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      setAdminsData({ success: false, error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Admin Account Debugger</h1>
        <p className="text-[#6B7280]">
          View all admin accounts in the database with their login credentials
        </p>
      </div>

      {/* Action Button */}
      <div className="mb-8">
        <button
          onClick={fetchAdmins}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-[#0B3060] hover:bg-[#0B3060]/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Users className={`w-5 h-5 ${isLoading ? 'animate-pulse' : ''}`} />
          {isLoading ? 'Loading...' : 'List All Admins'}
        </button>
      </div>

      {/* Admin List Results */}
      {adminsData && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            {adminsData.success ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
            <h2 className="text-xl font-bold text-[#1F2937]">
              Admin Accounts ({adminsData.count || 0})
            </h2>
          </div>

          {adminsData.success && adminsData.admins && adminsData.admins.length > 0 ? (
            <div className="space-y-6">
              {adminsData.admins.map((admin: any, index: number) => (
                <div key={admin.id || index} className="border-2 border-[#0B3060] rounded-lg p-6 bg-gray-50">
                  {/* Admin Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#1F2937] mb-1">
                        {admin.full_name}
                      </h3>
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
                    <div className="text-right">
                      <p className="text-sm text-[#6B7280]">Admin Number</p>
                      <p className="text-lg font-mono font-bold text-[#0B3060]">{admin.admin_number}</p>
                    </div>
                  </div>

                  {/* Login Credentials Section */}
                  <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-5 mb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Key className="w-5 h-5 text-amber-700" />
                      <h4 className="font-bold text-amber-900">🔑 LOGIN CREDENTIALS</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Username */}
                      <div>
                        <p className="text-xs text-amber-800 font-semibold mb-2">USERNAME</p>
                        <div className="bg-white px-4 py-3 rounded-lg border-2 border-amber-300">
                          <p className="text-sm font-mono font-bold text-[#0B3060] break-all">
                            {admin.username || 'NOT SET'}
                          </p>
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <p className="text-xs text-amber-800 font-semibold mb-2">PASSWORD</p>
                        <div className="bg-white px-4 py-3 rounded-lg border-2 border-amber-300">
                          <p className="text-sm font-mono font-bold text-[#0B3060] break-all">
                            {admin.password_hash || 'NOT SET'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 bg-amber-100 border border-amber-300 rounded-lg p-3">
                      <p className="text-xs text-amber-900">
                        <strong>💡 How to login:</strong> Use either <code className="bg-white px-2 py-0.5 rounded font-mono">{admin.username}</code> or <code className="bg-white px-2 py-0.5 rounded font-mono">{admin.admin_number}</code> as username, with password <code className="bg-white px-2 py-0.5 rounded font-mono">{admin.password_hash}</code>
                      </p>
                    </div>
                  </div>

                  {/* Admin Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-[#6B7280] mb-1">Email</p>
                      <p className="text-sm font-medium text-[#1F2937] break-all">{admin.email}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-[#6B7280] mb-1">Team</p>
                      <p className="text-sm font-medium text-[#1F2937]">
                        {admin.teams?.name || admin.team_id || 'No team assigned'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#6B7280] mb-1">Team ID</p>
                      <p className="text-sm font-mono font-medium text-[#1F2937]">
                        {admin.team_id || 'NULL'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : adminsData.success && adminsData.count === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-[#1F2937] font-semibold mb-1">
                No admin accounts found
              </p>
              <p className="text-sm text-[#6B7280]">
                Register an admin account first in /super-admin/register-admin
              </p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-900 font-medium">Error loading admins:</p>
              <p className="text-sm text-red-700 mt-2">
                {adminsData.error || 'Unknown error'}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50 border border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 mb-2">How to Debug Admin Login Issues</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Click <strong>"List All Admins"</strong> to see all admin accounts in the database</li>
              <li>Each admin card shows the <strong>exact credentials</strong> stored in the database</li>
              <li>Copy the username and password exactly as shown (including case)</li>
              <li>Go to <strong>/admin/login</strong> and paste the credentials</li>
              <li>If login still fails, check the browser console for detailed error logs</li>
              <li>Make sure the admin's <strong>status is "active"</strong> (shown as a green badge)</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}