import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

export function ScheduleQuickFix() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  const SQL_CREATE_TABLE = `-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
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
  
  -- Ensure only one schedule per user per date
  CONSTRAINT schedules_employee_date_unique UNIQUE (employee_number, schedule_date),
  CONSTRAINT schedules_admin_date_unique UNIQUE (admin_number, schedule_date),
  
  -- Ensure either employee_number or admin_number is set, but not both
  CONSTRAINT schedules_user_check CHECK (
    (employee_number IS NOT NULL AND admin_number IS NULL) OR 
    (employee_number IS NULL AND admin_number IS NOT NULL)
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schedules_employee ON schedules(employee_number, schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_admin ON schedules(admin_number, schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(schedule_date);

-- Disable RLS to allow all operations (adjust based on your security needs)
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;`;

  const SQL_DISABLE_RLS = `-- Disable Row Level Security on schedules table
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;`;

  const copySQL = () => {
    navigator.clipboard.writeText(SQL_CREATE_TABLE);
    toast.success('SQL copied to clipboard!');
  };

  const runCheck = async () => {
    setIsChecking(true);
    setCheckResult(null);

    try {
      const response = await fetch(
        `https://${(await import('/utils/supabase/info')).projectId}.supabase.co/functions/v1/make-server-df988758/schedules/diagnostic`,
        {
          headers: {
            'Authorization': `Bearer ${(await import('/utils/supabase/info')).publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      setCheckResult(data);

      if (data.diagnostic?.tableExists) {
        toast.success('Schedules table exists!');
      } else {
        toast.error('Schedules table not found!');
      }
    } catch (error: any) {
      console.error('Error checking table:', error);
      toast.error(`Error: ${error.message}`);
      setCheckResult({ error: error.message });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-md p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#1F2937] mb-2">
            🔧 Schedule Management Quick Fix
          </h1>
          <p className="text-[#6B7280]">
            This tool helps diagnose and fix schedule saving issues.
          </p>
        </div>

        {/* Quick Access to Debug Panel */}
        <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-900 mb-1">
                🔍 Need comprehensive testing?
              </p>
              <p className="text-xs text-purple-700">
                Run our full diagnostic suite to test save, fetch, and verification all at once.
              </p>
            </div>
            <button
              onClick={() => navigate('/super-admin/schedule-debug')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold whitespace-nowrap"
            >
              Run Full Test Suite →
            </button>
          </div>
        </div>

        {/* Step 1: Check if table exists */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#0B3060] text-white flex items-center justify-center font-bold">
              1
            </div>
            <h2 className="text-xl font-bold text-[#1F2937]">Check Table Status</h2>
          </div>
          
          <p className="text-[#6B7280] mb-4 ml-11">
            First, let's check if the <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">schedules</code> table exists in your Supabase database.
          </p>

          <div className="ml-11">
            <button
              onClick={runCheck}
              disabled={isChecking}
              className="px-6 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking...
                </>
              ) : (
                '🔍 Check Table Status'
              )}
            </button>

            {/* Check Results */}
            {checkResult && (
              <div className="mt-4">
                {checkResult.diagnostic?.tableExists ? (
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <span className="font-bold text-green-900">✅ Table Exists!</span>
                    </div>
                    <p className="text-sm text-green-800 ml-8">
                      The schedules table is set up correctly with {checkResult.diagnostic.rowCount || 0} record(s).
                    </p>
                    <p className="text-sm text-green-700 mt-2 ml-8">
                      If you're still experiencing issues, the problem might be with:
                    </p>
                    <ul className="text-sm text-green-700 list-disc list-inside ml-12 mt-1 space-y-1">
                      <li>Row Level Security (RLS) policies blocking operations</li>
                      <li>Network connectivity issues</li>
                      <li>Browser console errors (check developer tools)</li>
                    </ul>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                      <span className="font-bold text-red-900">❌ Table Not Found!</span>
                    </div>
                    <p className="text-sm text-red-800 ml-8">
                      The schedules table does not exist in your database. This is why schedules are not saving.
                    </p>
                    <p className="text-sm text-red-700 mt-2 ml-8 font-semibold">
                      → Proceed to Step 2 below to create the table.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Create the table */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#0B3060] text-white flex items-center justify-center font-bold">
              2
            </div>
            <h2 className="text-xl font-bold text-[#1F2937]">Create Schedules Table</h2>
          </div>
          
          <p className="text-[#6B7280] mb-4 ml-11">
            If the table doesn't exist, follow these steps to create it in your Supabase database:
          </p>

          <ol className="space-y-4 ml-11 text-[#1F2937]">
            <li className="flex gap-3">
              <span className="font-bold text-[#0B3060] min-w-[24px]">1.</span>
              <div className="flex-1">
                <p className="mb-2">Open your Supabase Dashboard:</p>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Supabase Dashboard
                </a>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="font-bold text-[#0B3060] min-w-[24px]">2.</span>
              <p className="flex-1">
                Navigate to <strong>SQL Editor</strong> in the left sidebar
              </p>
            </li>

            <li className="flex gap-3">
              <span className="font-bold text-[#0B3060] min-w-[24px]">3.</span>
              <div className="flex-1">
                <p className="mb-2">Click <strong>New Query</strong> and paste this SQL:</p>
                <div className="relative">
                  <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-xs overflow-auto max-h-96 font-mono">
{SQL_CREATE_TABLE}
                  </pre>
                  <button
                    onClick={copySQL}
                    className="absolute top-2 right-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy SQL
                  </button>
                </div>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="font-bold text-[#0B3060] min-w-[24px]">4.</span>
              <p className="flex-1">
                Click <strong>Run</strong> (or press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Ctrl+Enter</kbd>)
              </p>
            </li>

            <li className="flex gap-3">
              <span className="font-bold text-[#0B3060] min-w-[24px]">5.</span>
              <p className="flex-1">
                Wait for the success message: <span className="text-green-600 font-semibold">"Success. No rows returned"</span>
              </p>
            </li>

            <li className="flex gap-3">
              <span className="font-bold text-[#0B3060] min-w-[24px]">6.</span>
              <div className="flex-1">
                <p className="mb-2">Come back here and click this button to verify:</p>
                <button
                  onClick={runCheck}
                  disabled={isChecking}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    '✅ Verify Table Created'
                  )}
                </button>
              </div>
            </li>
          </ol>
        </div>

        {/* Step 3: Test */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#0B3060] text-white flex items-center justify-center font-bold">
              3
            </div>
            <h2 className="text-xl font-bold text-[#1F2937]">Test Schedule Saving</h2>
          </div>
          
          <p className="text-[#6B7280] mb-4 ml-11">
            After creating the table, test if schedule saving works:
          </p>

          <div className="ml-11 space-y-3">
            <button
              onClick={() => navigate('/super-admin/schedule')}
              className="px-6 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-semibold flex items-center gap-2"
            >
              Go to Schedule Management
            </button>

            <p className="text-sm text-[#6B7280]">
              Or run a simple test:
            </p>

            <button
              onClick={() => navigate('/super-admin/schedule-test')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              🧪 Run Save/Fetch Test
            </button>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-3">📖 Additional Help</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>
              <strong>Still having issues?</strong> Check the browser console (F12) for detailed error messages.
            </p>
            <p>
              <strong>Need more diagnostics?</strong>{' '}
              <button
                onClick={() => navigate('/super-admin/schedule-diagnostic')}
                className="text-blue-600 hover:text-blue-800 underline font-semibold"
              >
                Run Full Diagnostic
              </button>
            </p>
            <p>
              <strong>Common error codes:</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><code className="px-2 py-0.5 bg-blue-100 rounded">42P01</code> - Table doesn't exist</li>
              <li><code className="px-2 py-0.5 bg-blue-100 rounded">42703</code> - Column doesn't exist</li>
              <li><code className="px-2 py-0.5 bg-blue-100 rounded">23505</code> - Duplicate key (schedule already exists for that date)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}