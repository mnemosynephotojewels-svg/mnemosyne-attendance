import React, { useState } from 'react';
import { Card } from '../components/Card';
import { TestTube, CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

export function KioskAdminTest() {
  const [adminNumber, setAdminNumber] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const runTests = async () => {
    if (!adminNumber.trim()) {
      toast.error('Please enter an admin number');
      return;
    }

    setIsTesting(true);
    setTestResults([]);
    const results: any[] = [];

    try {
      // Test 1: Check Supabase configuration
      results.push({
        test: 'Supabase Configuration',
        status: isSupabaseConfigured ? 'pass' : 'fail',
        message: isSupabaseConfigured ? 'Supabase is configured' : 'Supabase is not configured',
        data: { projectId, hasSupabase: !!supabase }
      });

      if (!isSupabaseConfigured || !supabase) {
        setTestResults(results);
        setIsTesting(false);
        return;
      }

      // Test 2: Query admins table
      results.push({ test: 'Querying admins table...', status: 'running', message: 'In progress' });
      setTestResults([...results]);

      const { data: adminsData, error: adminsError } = await supabase
        .from('admins')
        .select('*')
        .eq('admin_number', adminNumber.trim())
        .maybeSingle();

      results[results.length - 1] = {
        test: 'Query admins table',
        status: adminsError ? 'fail' : (adminsData ? 'pass' : 'warn'),
        message: adminsError 
          ? `Error: ${adminsError.message}` 
          : adminsData 
            ? `Found: ${adminsData.full_name}` 
            : 'Not found in admins table',
        data: adminsData,
        error: adminsError
      };
      setTestResults([...results]);

      // Test 3: Query admin table (singular)
      results.push({ test: 'Querying admin table...', status: 'running', message: 'In progress' });
      setTestResults([...results]);

      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .select('*')
        .eq('admin_number', adminNumber.trim())
        .maybeSingle();

      results[results.length - 1] = {
        test: 'Query admin table (singular)',
        status: adminError ? 'fail' : (adminData ? 'pass' : 'warn'),
        message: adminError 
          ? `Error: ${adminError.message}` 
          : adminData 
            ? `Found: ${adminData.full_name}` 
            : 'Not found in admin table',
        data: adminData,
        error: adminError
      };
      setTestResults([...results]);

      // Test 4: Query server API
      results.push({ test: 'Querying server API...', status: 'running', message: 'In progress' });
      setTestResults([...results]);

      try {
        const apiResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-df988758/admins?search=${adminNumber.trim()}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }
        );

        const apiResult = await apiResponse.json();

        results[results.length - 1] = {
          test: 'Query server API',
          status: apiResponse.ok && apiResult.success && apiResult.data?.length > 0 ? 'pass' : 'warn',
          message: apiResponse.ok 
            ? (apiResult.success && apiResult.data?.length > 0 
                ? `Found: ${apiResult.data[0].full_name}` 
                : 'Not found via server API')
            : `HTTP ${apiResponse.status}`,
          data: apiResult.data,
          rawResponse: apiResult
        };
      } catch (apiError: any) {
        results[results.length - 1] = {
          test: 'Query server API',
          status: 'fail',
          message: `Error: ${apiError.message}`,
          error: apiError
        };
      }
      setTestResults([...results]);

      // Test 5: Generate QR code data
      results.push({ test: 'Generating QR code data...', status: 'running', message: 'In progress' });
      setTestResults([...results]);

      const foundAdmin = adminsData || adminData || (results[3].data && results[3].data[0]);
      
      if (foundAdmin) {
        const qrData = JSON.stringify({
          type: 'admin',
          id: foundAdmin.admin_number,
          name: foundAdmin.full_name,
          department: foundAdmin.department
        });

        results[results.length - 1] = {
          test: 'Generate QR code data',
          status: 'pass',
          message: 'QR code data generated successfully',
          data: qrData
        };
      } else {
        results[results.length - 1] = {
          test: 'Generate QR code data',
          status: 'fail',
          message: 'Cannot generate QR code - admin not found in any source'
        };
      }
      setTestResults([...results]);

      // Test 6: Parse QR code data
      if (foundAdmin) {
        results.push({ test: 'Parsing QR code data...', status: 'running', message: 'In progress' });
        setTestResults([...results]);

        try {
          const qrData = JSON.stringify({
            type: 'admin',
            id: foundAdmin.admin_number,
            name: foundAdmin.full_name,
            department: foundAdmin.department
          });

          const parsed = JSON.parse(qrData);
          const isValid = parsed.type === 'admin' && parsed.id === adminNumber.trim();

          results[results.length - 1] = {
            test: 'Parse QR code data',
            status: isValid ? 'pass' : 'fail',
            message: isValid ? 'QR code parsed and validated' : 'QR code validation failed',
            data: parsed
          };
        } catch (parseError: any) {
          results[results.length - 1] = {
            test: 'Parse QR code data',
            status: 'fail',
            message: `Parse error: ${parseError.message}`,
            error: parseError
          };
        }
        setTestResults([...results]);
      }

      // Summary
      const passCount = results.filter(r => r.status === 'pass').length;
      const failCount = results.filter(r => r.status === 'fail').length;
      const warnCount = results.filter(r => r.status === 'warn').length;

      if (failCount === 0 && passCount > 0) {
        toast.success(`All tests passed! Admin ${adminNumber} is ready for kiosk use.`);
      } else if (failCount > 0) {
        toast.error(`${failCount} test(s) failed. Check results for details.`);
      } else {
        toast.warning(`${warnCount} test(s) have warnings. Admin may not be fully registered.`);
      }

    } catch (error: any) {
      console.error('Test error:', error);
      toast.error('Test failed: ' + error.message);
      results.push({
        test: 'Test execution',
        status: 'fail',
        message: error.message,
        error
      });
      setTestResults(results);
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warn':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'running':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <TestTube className="w-8 h-8 text-[#0B3060]" />
        <div>
          <h1 className="text-3xl font-bold text-[#1F2937]">Kiosk Admin Test Tool</h1>
          <p className="text-sm text-[#6B7280]">
            Test if an admin can successfully scan their QR code in kiosk mode
          </p>
        </div>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-[#1F2937] mb-4">Run Diagnostic Tests</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={adminNumber}
              onChange={(e) => setAdminNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && runTests()}
              placeholder="Enter admin number (e.g., ADM-001)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]"
            />
            <button
              onClick={runTests}
              disabled={isTesting}
              className="px-6 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isTesting ? <Loader className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              {isTesting ? 'Testing...' : 'Run Tests'}
            </button>
          </div>
        </div>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold text-[#1F2937] mb-4">Test Results</h2>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div key={index} className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}>
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#1F2937]">{result.test}</h3>
                    <p className="text-sm text-[#6B7280] mt-1">{result.message}</p>
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-[#0B3060] cursor-pointer hover:underline">
                          View data
                        </summary>
                        <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto border border-gray-300">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                    {result.error && (
                      <details className="mt-2">
                        <summary className="text-xs text-red-600 cursor-pointer hover:underline">
                          View error
                        </summary>
                        <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto border border-red-300 text-red-800">
                          {JSON.stringify(result.error, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#0B3060] mb-2">What this tool tests:</h3>
          <ul className="text-sm text-[#1F2937] space-y-1 list-disc list-inside">
            <li>Supabase connection and configuration</li>
            <li>Admin existence in Supabase "admins" table</li>
            <li>Admin existence in Supabase "admin" table (fallback)</li>
            <li>Admin lookup via server API (KV store + Supabase)</li>
            <li>QR code data generation and validation</li>
            <li>QR code parsing (simulates kiosk scan)</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
