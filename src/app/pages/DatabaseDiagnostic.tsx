import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { Database, CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

export function DatabaseDiagnostic() {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostic = async () => {
    setIsChecking(true);
    const diagnosticResults: any = {
      timestamp: new Date().toISOString(),
      tables: {},
      rlsStatus: {},
      sampleData: {}
    };

    try {
      console.log('🔍 Starting Database Diagnostic...');

      // Check employees table
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 CHECKING EMPLOYEES TABLE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('employee_number, full_name, email, password')
        .limit(5);

      diagnosticResults.tables.employees = {
        exists: !employeesError,
        error: employeesError?.message || null,
        count: employeesData?.length || 0,
        sample: employeesData || []
      };

      console.log('Employees table:');
      console.log('- Exists:', !employeesError);
      console.log('- Count:', employeesData?.length || 0);
      console.log('- Error:', employeesError?.message || 'None');
      console.log('- Sample data:', employeesData);

      // Check admins table
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 CHECKING ADMINS TABLE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const { data: adminsData, error: adminsError } = await supabase
        .from('admins')
        .select('admin_number, full_name, email, password')
        .limit(5);

      diagnosticResults.tables.admins = {
        exists: !adminsError,
        error: adminsError?.message || null,
        count: adminsData?.length || 0,
        sample: adminsData || []
      };

      console.log('Admins table:');
      console.log('- Exists:', !adminsError);
      console.log('- Count:', adminsData?.length || 0);
      console.log('- Error:', adminsError?.message || 'None');
      console.log('- Sample data:', adminsData);

      // Check super_admin table
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 CHECKING SUPER_ADMIN TABLE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const { data: superAdminData, error: superAdminError } = await supabase
        .from('super_admin')
        .select('username, full_name, email, password')
        .limit(5);

      diagnosticResults.tables.super_admin = {
        exists: !superAdminError,
        error: superAdminError?.message || null,
        count: superAdminData?.length || 0,
        sample: superAdminData || []
      };

      console.log('Super Admin table:');
      console.log('- Exists:', !superAdminError);
      console.log('- Count:', superAdminData?.length || 0);
      console.log('- Error:', superAdminError?.message || 'None');
      console.log('- Sample data:', superAdminData);

      // Test a specific login attempt
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🧪 TESTING LOGIN QUERY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (employeesData && employeesData.length > 0) {
        const testEmployee = employeesData[0];
        console.log('Testing login with first employee:', testEmployee.employee_number);
        
        const { data: testData, error: testError } = await supabase
          .from('employees')
          .select('*')
          .eq('employee_number', testEmployee.employee_number)
          .eq('password', testEmployee.password)
          .maybeSingle();

        console.log('Test query result:');
        console.log('- Success:', !!testData);
        console.log('- Error:', testError?.message || 'None');
        console.log('- Data:', testData);

        diagnosticResults.loginTest = {
          testUsername: testEmployee.employee_number,
          success: !!testData,
          error: testError?.message || null
        };
      }

      console.log('\n✅ Diagnostic Complete!');
      setResults(diagnosticResults);
      toast.success('Diagnostic complete! Check console for details.');

    } catch (error: any) {
      console.error('❌ Diagnostic Error:', error);
      toast.error(`Error: ${error.message}`);
      diagnosticResults.fatalError = error.message;
      setResults(diagnosticResults);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-[#F7B34C]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B3060]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Database Diagnostic Tool
              </h1>
              <p className="text-gray-600 text-sm">Test database connection and table access</p>
            </div>
          </div>

          {/* Run Diagnostic Button */}
          <div className="mb-8">
            <button
              onClick={runDiagnostic}
              disabled={isChecking}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running Diagnostic...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Run Diagnostic
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-6">
              {/* Tables Status */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Database Tables</h2>
                
                {/* Employees Table */}
                <div className={`border-2 rounded-xl p-4 ${
                  results.tables.employees?.exists 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-start gap-3">
                    {results.tables.employees?.exists ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">Employees Table</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Status: {results.tables.employees?.exists ? 'Accessible' : 'Error'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Records found: {results.tables.employees?.count || 0}
                      </p>
                      {results.tables.employees?.error && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-900 font-mono">
                          Error: {results.tables.employees.error}
                        </div>
                      )}
                      {results.tables.employees?.sample?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Sample Records:</p>
                          <div className="space-y-2">
                            {results.tables.employees.sample.map((emp: any, idx: number) => (
                              <div key={idx} className="bg-white rounded p-2 text-xs">
                                <div className="font-mono">
                                  <span className="font-bold">ID:</span> {emp.employee_number} | 
                                  <span className="font-bold"> Name:</span> {emp.full_name} |
                                  <span className="font-bold"> Password:</span> {emp.password ? '••••••' : 'NULL'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admins Table */}
                <div className={`border-2 rounded-xl p-4 ${
                  results.tables.admins?.exists 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-start gap-3">
                    {results.tables.admins?.exists ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">Admins Table</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Status: {results.tables.admins?.exists ? 'Accessible' : 'Error'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Records found: {results.tables.admins?.count || 0}
                      </p>
                      {results.tables.admins?.error && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-900 font-mono">
                          Error: {results.tables.admins.error}
                        </div>
                      )}
                      {results.tables.admins?.sample?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Sample Records:</p>
                          <div className="space-y-2">
                            {results.tables.admins.sample.map((admin: any, idx: number) => (
                              <div key={idx} className="bg-white rounded p-2 text-xs">
                                <div className="font-mono">
                                  <span className="font-bold">ID:</span> {admin.admin_number} | 
                                  <span className="font-bold"> Name:</span> {admin.full_name} |
                                  <span className="font-bold"> Password:</span> {admin.password ? '••••••' : 'NULL'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Super Admin Table */}
                <div className={`border-2 rounded-xl p-4 ${
                  results.tables.super_admin?.exists 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-start gap-3">
                    {results.tables.super_admin?.exists ? (
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">Super Admin Table</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Status: {results.tables.super_admin?.exists ? 'Accessible' : 'Error'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Records found: {results.tables.super_admin?.count || 0}
                      </p>
                      {results.tables.super_admin?.error && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-900 font-mono">
                          Error: {results.tables.super_admin.error}
                        </div>
                      )}
                      {results.tables.super_admin?.sample?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Sample Records:</p>
                          <div className="space-y-2">
                            {results.tables.super_admin.sample.map((admin: any, idx: number) => (
                              <div key={idx} className="bg-white rounded p-2 text-xs">
                                <div className="font-mono">
                                  <span className="font-bold">Username:</span> {admin.username} | 
                                  <span className="font-bold"> Name:</span> {admin.full_name} |
                                  <span className="font-bold"> Password:</span> {admin.password ? '••••••' : 'NULL'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Login Test Result */}
              {results.loginTest && (
                <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-gray-900">Login Query Test</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Test Username: {results.loginTest.testUsername}
                      </p>
                      <p className="text-sm text-gray-600">
                        Result: {results.loginTest.success ? '✅ Success' : '❌ Failed'}
                      </p>
                      {results.loginTest.error && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-900 font-mono">
                          Error: {results.loginTest.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Console Notice */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-900">
                  <strong>💡 Tip:</strong> Check your browser console (F12) for detailed diagnostic logs.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
