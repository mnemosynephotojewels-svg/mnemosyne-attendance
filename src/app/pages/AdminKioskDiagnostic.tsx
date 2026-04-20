import React, { useState } from 'react';
import { Card } from '../components/Card';
import { AlertCircle, CheckCircle, XCircle, Search, Database, QrCode, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export function AdminKioskDiagnostic() {
  const [adminNumber, setAdminNumber] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    if (!adminNumber) {
      alert('Please enter an admin number (e.g., ADM-001)');
      return;
    }

    setLoading(true);
    setResults(null);

    const diagnosticResults: any = {
      adminNumber,
      timestamp: new Date().toISOString(),
      checks: []
    };

    try {
      // CHECK 1: Look for admin in admins table
      console.log('🔍 Checking admins table for:', adminNumber);
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('admin_number, full_name, department, qr_code, position')
        .eq('admin_number', adminNumber)
        .maybeSingle();

      diagnosticResults.checks.push({
        name: 'Admin Lookup (admins table)',
        status: adminData ? 'PASS' : 'FAIL',
        details: adminData ? `Found: ${adminData.full_name}` : `Not found: ${adminError?.message || 'No matching record'}`,
        data: adminData
      });

      // CHECK 2: Look for admin in admin table (singular)
      console.log('🔍 Checking admin table (singular) for:', adminNumber);
      const { data: adminDataSingular, error: adminErrorSingular } = await supabase
        .from('admin')
        .select('admin_number, full_name, department, qr_code, position')
        .eq('admin_number', adminNumber)
        .maybeSingle();

      diagnosticResults.checks.push({
        name: 'Admin Lookup (admin table - singular)',
        status: adminDataSingular ? 'PASS' : 'INFO',
        details: adminDataSingular ? `Found: ${adminDataSingular.full_name}` : `Not found (this is OK if you use 'admins' table)`,
        data: adminDataSingular
      });

      // CHECK 3: Check if admin has QR code
      const hasQR = adminData?.qr_code;
      diagnosticResults.checks.push({
        name: 'QR Code Check',
        status: hasQR ? 'PASS' : 'FAIL',
        details: hasQR ? 'QR code exists' : 'QR code is missing - run the SQL fix',
        data: hasQR ? JSON.parse(adminData.qr_code) : null
      });

      // CHECK 4: Look for today's schedule
      const today = new Date().toISOString().split('T')[0];
      console.log('🔍 Checking schedules for:', adminNumber, 'on date:', today);
      
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('admin_number', adminNumber)
        .eq('schedule_date', today);

      diagnosticResults.checks.push({
        name: 'Schedule Check (Today)',
        status: scheduleData && scheduleData.length > 0 ? 'PASS' : 'FAIL',
        details: scheduleData && scheduleData.length > 0 
          ? `Schedule found: ${scheduleData[0].shift_start} - ${scheduleData[0].shift_end}`
          : `No schedule for ${today} - run the SQL fix`,
        data: scheduleData?.[0]
      });

      // CHECK 5: Check if schedules table has admin_number column
      const { data: columns, error: columnsError } = await supabase
        .from('schedules')
        .select('admin_number')
        .limit(1);

      diagnosticResults.checks.push({
        name: 'Schedules Table Structure',
        status: !columnsError ? 'PASS' : 'FAIL',
        details: !columnsError 
          ? 'admin_number column exists' 
          : 'admin_number column missing - run STEP 1 of SQL fix',
        data: null
      });

      // CHECK 6: Check recent attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_number', adminNumber)
        .order('created_at', { ascending: false })
        .limit(5);

      diagnosticResults.checks.push({
        name: 'Recent Attendance Records',
        status: 'INFO',
        details: attendanceData 
          ? `Found ${attendanceData.length} recent records`
          : 'No attendance records yet',
        data: attendanceData
      });

      // OVERALL STATUS
      const failedChecks = diagnosticResults.checks.filter((c: any) => c.status === 'FAIL');
      diagnosticResults.overallStatus = failedChecks.length === 0 ? 'READY' : 'NEEDS_FIX';
      diagnosticResults.failedCount = failedChecks.length;

    } catch (error: any) {
      console.error('❌ Diagnostic error:', error);
      diagnosticResults.error = error.message;
    }

    setResults(diagnosticResults);
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1F2937] mb-2 flex items-center gap-3">
          <Database className="w-8 h-8 text-[#0B3060]" />
          Admin Kiosk Diagnostic Tool
        </h1>
        <p className="text-[#6B7280]">
          Check if your admin account is properly set up for Kiosk Mode
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <div className="p-6">
          <label className="block text-sm font-semibold text-[#1F2937] mb-2">
            Enter Admin Number
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={adminNumber}
              onChange={(e) => setAdminNumber(e.target.value.toUpperCase())}
              placeholder="ADM-001"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
            />
            <button
              onClick={runDiagnostic}
              disabled={loading}
              className="px-6 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              {loading ? 'Running...' : 'Run Diagnostic'}
            </button>
          </div>
          <p className="text-xs text-[#6B7280] mt-2">
            💡 Enter the admin_number from your admins table (e.g., ADM-001, ADM-002)
          </p>
        </div>
      </Card>

      {/* Results Section */}
      {results && (
        <>
          {/* Overall Status */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#1F2937] mb-1">Overall Status</h2>
                  <p className="text-sm text-[#6B7280]">
                    Checked at: {new Date(results.timestamp).toLocaleString()}
                  </p>
                </div>
                <div>
                  {results.overallStatus === 'READY' ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-bold">READY FOR KIOSK</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg">
                      <XCircle className="w-5 h-5" />
                      <span className="font-bold">{results.failedCount} ISSUES FOUND</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Detailed Checks */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#1F2937]">Diagnostic Checks</h3>
            
            {results.checks.map((check: any, index: number) => (
              <Card key={index}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {check.status === 'PASS' && (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                      {check.status === 'FAIL' && (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )}
                      {check.status === 'INFO' && (
                        <AlertCircle className="w-6 h-6 text-blue-600" />
                      )}
                    </div>

                    {/* Check Details */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#1F2937] mb-1">{check.name}</h4>
                      <p className={`text-sm mb-2 ${
                        check.status === 'PASS' ? 'text-green-700' :
                        check.status === 'FAIL' ? 'text-red-700' :
                        'text-blue-700'
                      }`}>
                        {check.details}
                      </p>

                      {/* Show data if available */}
                      {check.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-[#6B7280] cursor-pointer hover:text-[#0B3060]">
                            Show raw data
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(check.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        check.status === 'PASS' ? 'bg-green-100 text-green-800' :
                        check.status === 'FAIL' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {check.status}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Fix Instructions */}
          {results.overallStatus === 'NEEDS_FIX' && (
            <Card>
              <div className="p-6 bg-yellow-50">
                <h3 className="text-lg font-bold text-[#1F2937] mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  How to Fix
                </h3>
                <div className="space-y-2 text-sm text-[#1F2937]">
                  <p className="font-semibold">Run this SQL in your Supabase SQL Editor:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-4">
                    <li>Go to Supabase Dashboard → SQL Editor</li>
                    <li>Open the file: <code className="bg-white px-2 py-1 rounded">QUICK_ADMIN_FIX.sql</code></li>
                    <li>Copy and paste all 3 steps into SQL Editor</li>
                    <li>Click "Run" to execute</li>
                    <li>Come back here and click "Run Diagnostic" again</li>
                  </ol>
                  <p className="mt-3 p-3 bg-white rounded border border-yellow-300">
                    📄 The fix file is in your project root: <strong>/QUICK_ADMIN_FIX.sql</strong>
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Success Message */}
          {results.overallStatus === 'READY' && (
            <Card>
              <div className="p-6 bg-green-50">
                <h3 className="text-lg font-bold text-green-800 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  All Checks Passed!
                </h3>
                <p className="text-green-700 mb-4">
                  Your admin account <strong>{adminNumber}</strong> is ready to use Kiosk Mode.
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-green-800 font-semibold">Next Steps:</p>
                  <ol className="list-decimal list-inside text-sm text-green-700 space-y-1 ml-4">
                    <li>Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)</li>
                    <li>Go to Kiosk Mode: <code className="bg-white px-2 py-1 rounded">/kiosk</code></li>
                    <li>Scan your admin QR code</li>
                    <li>Your attendance should be recorded successfully ✅</li>
                  </ol>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
