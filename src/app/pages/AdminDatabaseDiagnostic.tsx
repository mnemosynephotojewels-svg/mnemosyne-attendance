import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Database, Search, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { toast } from 'sonner';

interface AdminRecord {
  id: string;
  admin_number: string;
  full_name: string;
  department: string;
  position?: string;
  email: string;
  created_at: string;
}

export function AdminDatabaseDiagnostic() {
  const [isChecking, setIsChecking] = useState(false);
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [searchNumber, setSearchNumber] = useState('');
  const [searchResult, setSearchResult] = useState<AdminRecord | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const checkAllAdmins = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase is not configured');
      return;
    }

    setIsChecking(true);
    try {
      console.log('🔍 Fetching all admins from database...');
      const { data, error } = await supabase
        .from('admins')
        .select('id, admin_number, full_name, department, position, email, created_at')
        .order('admin_number', { ascending: true });

      if (error) {
        console.error('❌ Error fetching admins:', error);
        toast.error(`Database error: ${error.message}`);
        return;
      }

      console.log(`✅ Found ${data?.length || 0} admin(s)`);
      setAdmins(data || []);
      
      if (data && data.length > 0) {
        toast.success(`Found ${data.length} admin account(s) in database`);
      } else {
        toast.warning('No admin accounts found in database');
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      toast.error('Failed to fetch admins: ' + error.message);
    } finally {
      setIsChecking(false);
    }
  };

  const searchAdmin = async () => {
    if (!searchNumber.trim()) {
      toast.error('Please enter an admin number');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase is not configured');
      return;
    }

    setSearchError(null);
    setSearchResult(null);
    
    try {
      console.log('🔍 Searching for admin:', searchNumber);
      const { data, error } = await supabase
        .from('admins')
        .select('id, admin_number, full_name, department, position, email, created_at')
        .eq('admin_number', searchNumber.trim())
        .maybeSingle();

      if (error) {
        console.error('❌ Search error:', error);
        setSearchError(error.message);
        toast.error(`Search error: ${error.message}`);
        return;
      }

      if (!data) {
        console.log('⚠️ Admin not found:', searchNumber);
        setSearchError('Admin not found in database');
        toast.warning(`Admin ${searchNumber} not found in database`);
        return;
      }

      console.log('✅ Admin found:', data);
      setSearchResult(data);
      toast.success(`Found: ${data.full_name}`);
    } catch (error: any) {
      console.error('❌ Error:', error);
      setSearchError(error.message);
      toast.error('Search failed: ' + error.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Database className="w-8 h-8 text-[#0B3060]" />
        <div>
          <h1 className="text-3xl font-bold text-[#1F2937]">Admin Database Diagnostic</h1>
          <p className="text-sm text-[#6B7280]">Check if admin accounts exist in the database</p>
        </div>
      </div>

      {/* Search Admin */}
      <Card>
        <h2 className="text-xl font-semibold text-[#1F2937] mb-4">Search Admin by Number</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchAdmin()}
              placeholder="Enter admin number (e.g., ADM-001)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]"
            />
            <button
              onClick={searchAdmin}
              className="px-6 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-medium flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>

          {/* Search Result */}
          {searchResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 mb-3">✅ Admin Found in Database!</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-green-700 font-medium">Admin Number:</p>
                      <p className="text-green-900 font-mono">{searchResult.admin_number}</p>
                    </div>
                    <div>
                      <p className="text-green-700 font-medium">Full Name:</p>
                      <p className="text-green-900">{searchResult.full_name}</p>
                    </div>
                    <div>
                      <p className="text-green-700 font-medium">Department:</p>
                      <p className="text-green-900">{searchResult.department}</p>
                    </div>
                    <div>
                      <p className="text-green-700 font-medium">Position:</p>
                      <p className="text-green-900">{searchResult.position || 'Team Leader'}</p>
                    </div>
                    <div>
                      <p className="text-green-700 font-medium">Email:</p>
                      <p className="text-green-900">{searchResult.email}</p>
                    </div>
                    <div>
                      <p className="text-green-700 font-medium">Database ID:</p>
                      <p className="text-green-900 font-mono text-xs">{searchResult.id}</p>
                    </div>
                  </div>
                  <div className="mt-4 bg-white rounded-lg p-3 border border-green-300">
                    <p className="text-xs text-green-800">
                      ✅ This admin can scan their QR code in Kiosk Mode successfully
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Error */}
          {searchError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">❌ Admin Not Found</h3>
                  <p className="text-sm text-red-800 mb-3">
                    Admin number <strong>{searchNumber}</strong> does not exist in the database.
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-red-300">
                    <p className="text-xs text-red-900 font-semibold mb-2">To fix this:</p>
                    <ol className="text-xs text-red-800 list-decimal list-inside space-y-1">
                      <li>Go to Super Admin → Register New Admin</li>
                      <li>Register this admin with admin number: {searchNumber}</li>
                      <li>Once registered, they can scan their QR code in Kiosk Mode</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* All Admins List */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#1F2937]">All Admin Accounts in Database</h2>
          <button
            onClick={checkAllAdmins}
            disabled={isChecking}
            className="px-4 py-2 bg-[#F7B34C] text-white rounded-lg hover:bg-[#f5a82d] transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check All Admins'}
          </button>
        </div>

        {admins.length > 0 ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                ✅ Found <strong>{admins.length}</strong> admin account(s) in the database
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admin Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Full Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-sm text-[#0B3060] font-semibold">
                          {admin.admin_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{admin.full_name}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{admin.department}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{admin.position || 'Team Leader'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          In Database
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No admin accounts checked yet</p>
            <button
              onClick={checkAllAdmins}
              className="px-6 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-medium"
            >
              Check Database Now
            </button>
          </div>
        )}
      </Card>

      {/* Instructions */}
      <Card>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#0B3060] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[#0B3060] mb-2">Common Issues:</h3>
              <ul className="text-sm text-[#1F2937] space-y-2 list-disc list-inside">
                <li>
                  <strong>Admin not found in database:</strong> The admin needs to be registered via Super Admin → Register New Admin
                </li>
                <li>
                  <strong>Wrong admin_number:</strong> Make sure the admin_number in the QR code matches the database exactly
                </li>
                <li>
                  <strong>Kiosk can't find admin:</strong> Use this diagnostic tool to verify the admin exists before scanning QR code
                </li>
                <li>
                  <strong>Admin registered but still not found:</strong> Check the browser console logs when scanning QR code for detailed error messages
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
