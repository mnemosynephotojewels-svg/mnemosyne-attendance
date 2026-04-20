import React, { useState } from 'react';
import { toast } from 'sonner';
import { scheduleApi } from '../../services/apiService';
import { Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router';

export function ScheduleSaveTest() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [employeeNumber, setEmployeeNumber] = useState('TEST001');

  const testSave = async () => {
    setIsSaving(true);
    setResult(null);

    try {
      console.log('🧪 TESTING SCHEDULE SAVE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const testPayload = {
        employee_number: employeeNumber,
        schedule_date: new Date().toISOString().split('T')[0],
        shift_start: '08:00',
        shift_end: '17:00',
        is_day_off: false,
        user_type: 'employee' as const,
      };

      console.log('📤 Sending test payload:', testPayload);
      console.log('⏱️ Starting save...');

      // Add timeout to prevent hanging
      const savePromise = scheduleApi.upsert(testPayload);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save timeout after 10 seconds')), 10000)
      );

      const response = await Promise.race([savePromise, timeoutPromise]) as any;

      console.log('✅ Save completed! Response received:', response);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setResult({
        save: response,
        savedSuccessfully: response.success,
      });

      if (response.success) {
        toast.success('✅ Save successful! Now try clicking "Test Fetch"');
      } else {
        toast.error('❌ Save failed');
      }
    } catch (error: any) {
      console.error('❌ Save error:', error);
      setResult({ success: false, error: error.message });
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const testFetch = async () => {
    try {
      console.log('🧪 TESTING SCHEDULE FETCH');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const response = await scheduleApi.getAll({
        employee_number: employeeNumber,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
      });

      console.log('✅ Fetch response:', response);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setResult(response);

      if (response.success) {
        toast.success(`✅ Found ${response.schedules?.length || 0} schedule(s)`);
      }
    } catch (error: any) {
      console.error('❌ Fetch error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-[#1F2937] mb-4">Schedule Save/Fetch Test</h1>
        <p className="text-[#6B7280] mb-6">
          This page tests if schedules are being saved to and retrieved from the Supabase database.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-[#1F2937] mb-2">
            Employee Number to Test:
          </label>
          <input
            type="text"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            placeholder="Enter employee number (e.g., EMP001)"
            className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/20 focus:border-[#0B3060]"
          />
        </div>

        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            onClick={testSave}
            disabled={isSaving}
            className="px-6 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              '💾 Test Save'
            )}
          </button>

          <button
            onClick={testFetch}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            🔍 Test Fetch
          </button>

          <button
            onClick={() => navigate('/super-admin/schedule-diagnostic')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            Run Full Diagnostic
          </button>
        </div>

        {result && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-[#1F2937] mb-2">Result:</h3>
            <pre className="text-sm text-[#6B7280] overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-bold text-[#1F2937] mb-3">Test Result:</h3>
          {result ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  result.savedSuccessfully ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {result.savedSuccessfully ? '✅ Save: SUCCESS' : '❌ Save: FAILED'}
                </span>
              </div>
              
              {result.save && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Save Response:</p>
                  <pre className="mt-1 p-3 bg-white rounded border border-gray-200 text-xs overflow-auto max-h-40">
                    {JSON.stringify(result.save, null, 2)}
                  </pre>
                </div>
              )}
              
              {result.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-semibold text-red-800">Error:</p>
                  <p className="text-sm text-red-600 mt-1">{result.error}</p>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-semibold text-blue-800 mb-2">📋 What to check in console:</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Look for "📅 UPSERT SCHEDULE REQUEST"</li>
                  <li>Look for "📤 INSERT payload" or "📤 UPDATE payload"</li>
                  <li><strong>CRITICAL:</strong> Look for "❌ INSERT FAILED" or "❌ UPDATE FAILED"</li>
                  <li>The error will show "Error code", "Error hint", and "Error details"</li>
                  <li>If you see error code "42P01", the schedules table doesn't exist!</li>
                  <li>Check if "✅ Schedule created/updated in Supabase table" appears</li>
                  <li>Look for "🔍 VERIFYING schedule" to see if it's actually in database</li>
                </ul>
              </div>
              
              <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded">
                <p className="text-sm font-bold text-yellow-900 mb-2">⚠️ Common Errors:</p>
                <div className="space-y-2 text-xs text-yellow-800">
                  <div>
                    <strong>Error code 42P01:</strong> The "schedules" table doesn't exist in your database.
                    <br />
                    <span className="text-yellow-700">→ Solution: Go to /super-admin/schedule-diagnostic to get the SQL to create the table</span>
                  </div>
                  <div>
                    <strong>"column does not exist":</strong> The table is missing required columns.
                    <br />
                    <span className="text-yellow-700">→ Solution: Run the SQL from the diagnostic page to recreate the table</span>
                  </div>
                  <div>
                    <strong>"violates constraint":</strong> Duplicate entry or invalid data.
                    <br />
                    <span className="text-yellow-700">→ Solution: Check the console for which constraint failed</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[#6B7280] text-sm">Click the "Test Save" button above to run the test.</p>
          )}
        </div>
      </div>
    </div>
  );
}