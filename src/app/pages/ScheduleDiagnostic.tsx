import React, { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function ScheduleDiagnostic() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      console.log('🔍 Running diagnostic...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/schedules/diagnostic`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      console.log('Diagnostic result:', data);
      setResult(data);

      if (data.success) {
        toast.success('Diagnostic complete!');
      } else {
        toast.error('Diagnostic failed');
      }
    } catch (error: any) {
      console.error('Error running diagnostic:', error);
      setResult({ success: false, error: error.message });
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-[#1F2937] mb-4">📊 Schedules Table Diagnostic</h1>
        <p className="text-[#6B7280] mb-6">
          This tool checks if the <code className="px-2 py-1 bg-gray-100 rounded text-sm">schedules</code> table exists in your Supabase database and shows its structure.
        </p>

        <button
          onClick={runDiagnostic}
          disabled={isRunning}
          className="px-6 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Running Diagnostic...
            </>
          ) : (
            '🔍 Run Diagnostic'
          )}
        </button>

        {result && (
          <div className="mt-8 space-y-4">
            {/* Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border-2 ${
                result.diagnostic?.supabaseConnected 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {result.diagnostic?.supabaseConnected ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-semibold text-sm">Database Connection</span>
                </div>
                <p className={`text-xs ${
                  result.diagnostic?.supabaseConnected ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.diagnostic?.supabaseConnected ? 'Connected ✓' : 'Failed ✗'}
                </p>
              </div>

              <div className={`p-4 rounded-lg border-2 ${
                result.diagnostic?.tableExists 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {result.diagnostic?.tableExists ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-semibold text-sm">Table Exists</span>
                </div>
                <p className={`text-xs ${
                  result.diagnostic?.tableExists ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.diagnostic?.tableExists ? 'schedules table found ✓' : 'Table not found ✗'}
                </p>
              </div>

              <div className="p-4 rounded-lg border-2 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">Row Count</span>
                </div>
                <p className="text-xs text-blue-700">
                  {result.diagnostic?.rowCount || 0} schedule(s) in database
                </p>
              </div>
            </div>

            {/* Table Structure */}
            {result.diagnostic?.tableStructure && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-bold text-[#1F2937] mb-2">📋 Table Columns:</h3>
                <div className="flex flex-wrap gap-2">
                  {result.diagnostic.tableStructure.map((col: string) => (
                    <span
                      key={col}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Data */}
            {result.diagnostic?.sampleData && result.diagnostic.sampleData.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-bold text-[#1F2937] mb-2">📄 Sample Data:</h3>
                <pre className="text-xs text-[#6B7280] overflow-auto max-h-64 bg-white p-3 rounded border border-gray-200">
                  {JSON.stringify(result.diagnostic.sampleData, null, 2)}
                </pre>
              </div>
            )}

            {/* Errors */}
            {result.diagnostic?.errors && result.diagnostic.errors.length > 0 && (
              <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Errors Detected:
                </h3>
                <div className="space-y-2">
                  {result.diagnostic.errors.map((err: any, idx: number) => (
                    <div key={idx} className="text-sm text-red-700">
                      <span className="font-semibold">{err.test}:</span> {err.error}
                      {err.code && <span className="ml-2 text-xs">(Code: {err.code})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fix Instructions */}
            {result.diagnostic && !result.diagnostic.tableExists && (
              <div className="p-6 bg-yellow-50 rounded-lg border-2 border-yellow-300">
                <h3 className="font-bold text-yellow-900 mb-3 flex items-center gap-2 text-lg">
                  <AlertCircle className="w-6 h-6" />
                  ⚠️ SCHEDULES TABLE NOT FOUND!
                </h3>
                <p className="text-yellow-800 mb-4">
                  The <code className="px-2 py-1 bg-yellow-100 rounded">schedules</code> table does not exist in your Supabase database. This is why schedules are not saving!
                </p>
                <div className="bg-white p-4 rounded border border-yellow-300">
                  <p className="font-semibold text-yellow-900 mb-2">🔧 How to Fix:</p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800">
                    <li>Go to your Supabase Dashboard → SQL Editor</li>
                    <li>Run this SQL command to create the table:</li>
                  </ol>
                  <pre className="mt-3 p-3 bg-gray-800 text-green-400 rounded text-xs overflow-auto">
{`CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT,
  admin_number TEXT,
  schedule_date DATE NOT NULL,
  shift_start TIME,
  shift_end TIME,
  is_day_off BOOLEAN DEFAULT FALSE,
  is_paid_leave BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT schedules_user_date_unique UNIQUE (employee_number, schedule_date),
  CONSTRAINT schedules_admin_date_unique UNIQUE (admin_number, schedule_date)
);

-- Disable RLS to allow all operations
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;`}</pre>
                </div>
              </div>
            )}

            {/* Full Response */}
            <details className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <summary className="font-bold text-[#1F2937] cursor-pointer hover:text-[#0B3060]">
                🔍 Full Diagnostic Response (Click to expand)
              </summary>
              <pre className="mt-3 text-xs text-[#6B7280] overflow-auto max-h-96 bg-white p-3 rounded border border-gray-200">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
