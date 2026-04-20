import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, AlertTriangle, Wrench } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabase = createClient(supabaseUrl, publicAnonKey);

interface SchemaCheckResult {
  table: string;
  exists: boolean;
  columns?: string[];
  error?: string;
}

export function DatabaseSchemaFixer() {
  const [checking, setChecking] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [results, setResults] = useState<SchemaCheckResult[]>([]);
  const [fixResult, setFixResult] = useState<string | null>(null);

  const checkSchema = async () => {
    setChecking(true);
    setResults([]);
    
    const tables = ['employees', 'admins', 'super_admin'];
    const checks: SchemaCheckResult[] = [];

    for (const table of tables) {
      try {
        // Try to get one row to see what columns exist
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          checks.push({
            table,
            exists: false,
            error: error.message
          });
        } else {
          const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
          checks.push({
            table,
            exists: true,
            columns
          });
        }
      } catch (err: any) {
        checks.push({
          table,
          exists: false,
          error: err.message
        });
      }
    }

    setResults(checks);
    setChecking(false);
  };

  const fixSchema = async () => {
    setFixing(true);
    setFixResult(null);

    try {
      // Get the Supabase SQL Editor URL
      const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectId}/sql/new`;
      
      setFixResult(`
Please run these SQL commands in your Supabase SQL Editor:

1. Go to: ${sqlEditorUrl}

2. Run this SQL:

-- Add missing columns to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_number TEXT;

-- Add missing columns to admins table  
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS admin_id TEXT;

-- Add missing columns to super_admin table
ALTER TABLE super_admin ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE super_admin ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update existing data if needed
-- If you have an 'id' column that should be 'employee_number':
-- UPDATE employees SET employee_number = id WHERE employee_number IS NULL;

-- If you have an 'id' column that should be 'admin_id':
-- UPDATE admins SET admin_id = id WHERE admin_id IS NULL;

3. After running the SQL, click "Check Schema" again to verify.
      `);
    } catch (err: any) {
      setFixResult(`Error: ${err.message}`);
    }

    setFixing(false);
  };

  const expectedSchema = {
    employees: ['employee_number', 'password', 'full_name', 'email', 'position', 'team', 'phone_number', 'paid_leave_balance'],
    admins: ['admin_id', 'password', 'full_name', 'email', 'team', 'role'],
    super_admin: ['id', 'username', 'password', 'full_name', 'email']
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[#0B3060] rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Database Schema Checker</h1>
              <p className="text-gray-600">Check and fix your database column names</p>
            </div>
          </div>

          {/* Check Button */}
          <div className="mb-8">
            <button
              onClick={checkSchema}
              disabled={checking}
              className="bg-[#0B3060] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[#0d4080] transition-colors disabled:opacity-50 flex items-center gap-3"
            >
              {checking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking Schema...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Check Schema
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-6 mb-8">
              {results.map((result) => (
                <div key={result.table} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 capitalize">{result.table} Table</h3>
                    {result.exists ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>

                  {result.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-red-800">{result.error}</p>
                    </div>
                  )}

                  {result.columns && (
                    <>
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Current Columns:</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.columns.map((col) => (
                            <span key={col} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Expected Columns:</h4>
                        <div className="flex flex-wrap gap-2">
                          {expectedSchema[result.table as keyof typeof expectedSchema]?.map((col) => {
                            const exists = result.columns?.includes(col);
                            return (
                              <span 
                                key={col} 
                                className={`px-3 py-1 rounded-full text-sm ${
                                  exists 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {col} {exists ? '✓' : '✗'}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Check for missing columns */}
                      {(() => {
                        const expected = expectedSchema[result.table as keyof typeof expectedSchema] || [];
                        const missing = expected.filter(col => !result.columns?.includes(col));
                        
                        if (missing.length > 0) {
                          return (
                            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-semibold text-yellow-900">Missing Columns:</p>
                                  <p className="text-sm text-yellow-800">{missing.join(', ')}</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Fix Button */}
          {results.length > 0 && results.some(r => {
            const expected = expectedSchema[r.table as keyof typeof expectedSchema] || [];
            const missing = expected.filter(col => !r.columns?.includes(col));
            return missing.length > 0;
          }) && (
            <div className="mb-8">
              <button
                onClick={fixSchema}
                disabled={fixing}
                className="bg-[#F7B34C] text-[#0B3060] px-8 py-4 rounded-xl font-semibold hover:bg-[#f5a829] transition-colors disabled:opacity-50 flex items-center gap-3"
              >
                {fixing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Fix...
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5" />
                    Show SQL Fix
                  </>
                )}
              </button>
            </div>
          )}

          {/* Fix Instructions */}
          {fixResult && (
            <div className="bg-gray-900 text-green-400 rounded-xl p-6 font-mono text-sm whitespace-pre-wrap">
              {fixResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
