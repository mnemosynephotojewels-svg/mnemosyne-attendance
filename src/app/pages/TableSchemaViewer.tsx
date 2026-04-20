import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { Database, Loader2, RefreshCw, CheckCircle } from 'lucide-react';

export function TableSchemaViewer() {
  const [isChecking, setIsChecking] = useState(false);
  const [schemas, setSchemas] = useState<any>(null);

  const discoverSchema = async () => {
    setIsChecking(true);
    try {
      console.log('🔍 Discovering actual database schema...');

      const results: any = {
        employees: null,
        admins: null,
        super_admin: null
      };

      // Get actual data from each table to see what columns exist
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 EMPLOYEES TABLE - Discovering Columns');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .limit(1);

      if (!empError && empData && empData.length > 0) {
        const columns = Object.keys(empData[0]);
        results.employees = {
          success: true,
          columns: columns,
          sampleRecord: empData[0]
        };
        console.log('✅ Employees table columns:', columns);
        console.log('Sample record:', empData[0]);
      } else if (empError) {
        results.employees = {
          success: false,
          error: empError.message
        };
        console.log('❌ Error:', empError.message);
      } else {
        results.employees = {
          success: false,
          error: 'No records found'
        };
        console.log('⚠️ No records found in employees table');
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 ADMINS TABLE - Discovering Columns');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .limit(1);

      if (!adminError && adminData && adminData.length > 0) {
        const columns = Object.keys(adminData[0]);
        results.admins = {
          success: true,
          columns: columns,
          sampleRecord: adminData[0]
        };
        console.log('✅ Admins table columns:', columns);
        console.log('Sample record:', adminData[0]);
      } else if (adminError) {
        results.admins = {
          success: false,
          error: adminError.message
        };
        console.log('❌ Error:', adminError.message);
      } else {
        results.admins = {
          success: false,
          error: 'No records found'
        };
        console.log('⚠️ No records found in admins table');
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 SUPER_ADMIN TABLE - Discovering Columns');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const { data: superData, error: superError } = await supabase
        .from('super_admin')
        .select('*')
        .limit(1);

      if (!superError && superData && superData.length > 0) {
        const columns = Object.keys(superData[0]);
        results.super_admin = {
          success: true,
          columns: columns,
          sampleRecord: superData[0]
        };
        console.log('✅ Super Admin table columns:', columns);
        console.log('Sample record:', superData[0]);
      } else if (superError) {
        results.super_admin = {
          success: false,
          error: superError.message
        };
        console.log('❌ Error:', superError.message);
      } else {
        results.super_admin = {
          success: false,
          error: 'No records found'
        };
        console.log('⚠️ No records found in super_admin table');
      }

      console.log('\n✅ Schema discovery complete!');
      setSchemas(results);
      toast.success('Schema discovered! Check results below.');

    } catch (error: any) {
      console.error('❌ Fatal error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsChecking(false);
    }
  };

  const findPasswordColumn = (columns: string[]) => {
    const passwordVariants = ['password', 'hashed_password', 'pwd', 'pass', 'user_password', 'hash'];
    return columns.find(col => passwordVariants.some(variant => col.toLowerCase().includes(variant))) || 'NOT_FOUND';
  };

  const findUsernameColumn = (columns: string[], tableName: string) => {
    if (tableName === 'employees') {
      return columns.find(col => col.includes('employee_number') || col.includes('emp_id') || col.includes('employee_id')) || 'NOT_FOUND';
    }
    if (tableName === 'admins') {
      return columns.find(col => col.includes('admin_number') || col.includes('admin_id') || col.includes('username')) || 'NOT_FOUND';
    }
    if (tableName === 'super_admin') {
      return columns.find(col => col.includes('username') || col.includes('user_name') || col.includes('id')) || 'NOT_FOUND';
    }
    return 'NOT_FOUND';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-[#F7B34C]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0B3060]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Database Schema Viewer
              </h1>
              <p className="text-gray-600 text-sm">Discover actual column names in your database</p>
            </div>
          </div>

          {/* Run Button */}
          <div className="mb-8">
            <button
              onClick={discoverSchema}
              disabled={isChecking}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Discovering Schema...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Discover Database Schema
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {schemas && (
            <div className="space-y-6">
              {/* Employees Table */}
              {schemas.employees && (
                <div className={`border-2 rounded-xl p-6 ${
                  schemas.employees.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">👤 Employees Table</h2>
                  
                  {schemas.employees.success ? (
                    <>
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <h3 className="font-bold text-sm text-gray-700 mb-2">Available Columns:</h3>
                        <div className="flex flex-wrap gap-2">
                          {schemas.employees.columns.map((col: string) => (
                            <span key={col} className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm font-mono">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-bold text-sm text-yellow-900 mb-2">🔍 Detected Login Columns:</h3>
                        <div className="space-y-1 text-sm">
                          <p><strong>Username Column:</strong> <code className="bg-yellow-100 px-2 py-1 rounded font-mono">{findUsernameColumn(schemas.employees.columns, 'employees')}</code></p>
                          <p><strong>Password Column:</strong> <code className="bg-yellow-100 px-2 py-1 rounded font-mono">{findPasswordColumn(schemas.employees.columns)}</code></p>
                        </div>
                      </div>

                      <details className="mt-4">
                        <summary className="cursor-pointer font-semibold text-sm text-gray-700 hover:text-gray-900">
                          View Sample Record (Click to expand)
                        </summary>
                        <pre className="mt-2 bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(schemas.employees.sampleRecord, null, 2)}
                        </pre>
                      </details>
                    </>
                  ) : (
                    <div className="text-red-900">
                      <p className="font-semibold">Error: {schemas.employees.error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Admins Table */}
              {schemas.admins && (
                <div className={`border-2 rounded-xl p-6 ${
                  schemas.admins.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">👔 Admins Table</h2>
                  
                  {schemas.admins.success ? (
                    <>
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <h3 className="font-bold text-sm text-gray-700 mb-2">Available Columns:</h3>
                        <div className="flex flex-wrap gap-2">
                          {schemas.admins.columns.map((col: string) => (
                            <span key={col} className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm font-mono">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-bold text-sm text-yellow-900 mb-2">🔍 Detected Login Columns:</h3>
                        <div className="space-y-1 text-sm">
                          <p><strong>Username Column:</strong> <code className="bg-yellow-100 px-2 py-1 rounded font-mono">{findUsernameColumn(schemas.admins.columns, 'admins')}</code></p>
                          <p><strong>Password Column:</strong> <code className="bg-yellow-100 px-2 py-1 rounded font-mono">{findPasswordColumn(schemas.admins.columns)}</code></p>
                        </div>
                      </div>

                      <details className="mt-4">
                        <summary className="cursor-pointer font-semibold text-sm text-gray-700 hover:text-gray-900">
                          View Sample Record (Click to expand)
                        </summary>
                        <pre className="mt-2 bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(schemas.admins.sampleRecord, null, 2)}
                        </pre>
                      </details>
                    </>
                  ) : (
                    <div className="text-red-900">
                      <p className="font-semibold">Error: {schemas.admins.error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Super Admin Table */}
              {schemas.super_admin && (
                <div className={`border-2 rounded-xl p-6 ${
                  schemas.super_admin.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">👑 Super Admin Table</h2>
                  
                  {schemas.super_admin.success ? (
                    <>
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <h3 className="font-bold text-sm text-gray-700 mb-2">Available Columns:</h3>
                        <div className="flex flex-wrap gap-2">
                          {schemas.super_admin.columns.map((col: string) => (
                            <span key={col} className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm font-mono">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-bold text-sm text-yellow-900 mb-2">🔍 Detected Login Columns:</h3>
                        <div className="space-y-1 text-sm">
                          <p><strong>Username Column:</strong> <code className="bg-yellow-100 px-2 py-1 rounded font-mono">{findUsernameColumn(schemas.super_admin.columns, 'super_admin')}</code></p>
                          <p><strong>Password Column:</strong> <code className="bg-yellow-100 px-2 py-1 rounded font-mono">{findPasswordColumn(schemas.super_admin.columns)}</code></p>
                        </div>
                      </div>

                      <details className="mt-4">
                        <summary className="cursor-pointer font-semibold text-sm text-gray-700 hover:text-gray-900">
                          View Sample Record (Click to expand)
                        </summary>
                        <pre className="mt-2 bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(schemas.super_admin.sampleRecord, null, 2)}
                        </pre>
                      </details>
                    </>
                  ) : (
                    <div className="text-red-900">
                      <p className="font-semibold">Error: {schemas.super_admin.error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-blue-900 mb-2">📋 Next Steps</h3>
                    <ol className="text-sm text-blue-900 space-y-2 list-decimal list-inside">
                      <li>Check the "Detected Login Columns" for each table above</li>
                      <li>Share these column names with me</li>
                      <li>I'll update the login code to use the correct column names</li>
                      <li>Your login will work perfectly! 🎉</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
