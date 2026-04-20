import { useState } from 'react';
import { Database, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function SettingsDebug() {
  const [isTestingEmployee, setIsTestingEmployee] = useState(false);
  const [isTestingAdmin, setIsTestingAdmin] = useState(false);
  const [isTestingSuperAdmin, setIsTestingSuperAdmin] = useState(false);
  const [employeeResult, setEmployeeResult] = useState<any>(null);
  const [adminResult, setAdminResult] = useState<any>(null);
  const [superAdminResult, setSuperAdminResult] = useState<any>(null);

  const testEmployeeUpdate = async () => {
    setIsTestingEmployee(true);
    setEmployeeResult(null);

    try {
      // Get first employee from localStorage
      const employeeSession = localStorage.getItem('employeeSession');
      if (!employeeSession) {
        throw new Error('No employee session found');
      }

      const employee = JSON.parse(employeeSession);
      const testData = {
        full_name: `${employee.full_name} (Updated ${new Date().toLocaleTimeString()})`,
        email: employee.email,
        password_hash: 'testpassword123', // Test password update
      };

      console.log('Testing employee update:', employee.employee_number, testData);

      const response = await fetch(`${API_BASE_URL}/employees/${employee.employee_number}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();
      
      setEmployeeResult({
        success: response.ok && result.success,
        status: response.status,
        data: result,
      });

      if (response.ok && result.success) {
        toast.success('✅ Employee update saved to database (including password)!');
      } else {
        toast.error('❌ Employee update failed');
      }
    } catch (error) {
      console.error('Employee test error:', error);
      setEmployeeResult({
        success: false,
        error: String(error),
      });
      toast.error('❌ Employee test failed');
    } finally {
      setIsTestingEmployee(false);
    }
  };

  const testAdminUpdate = async () => {
    setIsTestingAdmin(true);
    setAdminResult(null);

    try {
      const adminSession = localStorage.getItem('adminSession');
      if (!adminSession) {
        throw new Error('No admin session found');
      }

      const admin = JSON.parse(adminSession);
      const testData = {
        full_name: `${admin.full_name} (Updated ${new Date().toLocaleTimeString()})`,
        email: admin.email,
        password_hash: 'testpassword456', // Test password update
      };

      console.log('Testing admin update:', admin.admin_number, testData);

      const response = await fetch(`${API_BASE_URL}/admins/${admin.admin_number}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();
      
      setAdminResult({
        success: response.ok && result.success,
        status: response.status,
        data: result,
      });

      if (response.ok && result.success) {
        toast.success('✅ Admin update saved to database (including password)!');
      } else {
        toast.error('❌ Admin update failed');
      }
    } catch (error) {
      console.error('Admin test error:', error);
      setAdminResult({
        success: false,
        error: String(error),
      });
      toast.error('❌ Admin test failed');
    } finally {
      setIsTestingAdmin(false);
    }
  };

  const testSuperAdminUpdate = async () => {
    setIsTestingSuperAdmin(true);
    setSuperAdminResult(null);

    try {
      const superAdminSession = localStorage.getItem('superAdminSession');
      if (!superAdminSession) {
        throw new Error('No super admin session found');
      }

      const superAdmin = JSON.parse(superAdminSession);
      const testData = {
        full_name: `${superAdmin.full_name || superAdmin.username} (Updated ${new Date().toLocaleTimeString()})`,
        email: superAdmin.email,
        password_hash: 'testpassword789', // Test password update
      };

      const identifier = superAdmin.username || superAdmin.id;
      console.log('Testing super admin update:', identifier, testData);

      const response = await fetch(`${API_BASE_URL}/super-admins/${identifier}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();
      
      setSuperAdminResult({
        success: response.ok && result.success,
        status: response.status,
        data: result,
      });

      if (response.ok && result.success) {
        toast.success('✅ Super Admin update saved to database (including password)!');
      } else {
        toast.error('❌ Super Admin update failed');
      }
    } catch (error) {
      console.error('Super Admin test error:', error);
      setSuperAdminResult({
        success: false,
        error: String(error),
      });
      toast.error('❌ Super Admin test failed');
    } finally {
      setIsTestingSuperAdmin(false);
    }
  };

  const testAll = () => {
    const employeeSession = localStorage.getItem('employeeSession');
    const adminSession = localStorage.getItem('adminSession');
    const superAdminSession = localStorage.getItem('superAdminSession');

    if (employeeSession) testEmployeeUpdate();
    if (adminSession) testAdminUpdate();
    if (superAdminSession) testSuperAdminUpdate();

    if (!employeeSession && !adminSession && !superAdminSession) {
      toast.error('No active sessions found. Please login first.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-8 h-8 text-[#0B3060]" />
            <div>
              <h1 className="text-2xl font-bold text-[#0B3060]">Settings Database Test</h1>
              <p className="text-sm text-gray-600">Verify that all user types can save changes to database</p>
            </div>
          </div>

          {/* Test All Button */}
          <div className="mb-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <button
              onClick={testAll}
              disabled={isTestingEmployee || isTestingAdmin || isTestingSuperAdmin}
              className="w-full px-6 py-3 bg-[#0B3060] text-white rounded-lg font-semibold hover:bg-[#1a4a8a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${(isTestingEmployee || isTestingAdmin || isTestingSuperAdmin) ? 'animate-spin' : ''}`} />
              Test All Active Sessions
            </button>
          </div>

          {/* Employee Test */}
          <div className="mb-6 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">👤 Employee Settings</h2>
              <button
                onClick={testEmployeeUpdate}
                disabled={isTestingEmployee}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isTestingEmployee ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Test Update
                  </>
                )}
              </button>
            </div>

            {employeeResult && (
              <div className={`p-4 rounded-lg ${employeeResult.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {employeeResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${employeeResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {employeeResult.success ? 'SUCCESS - Saved to Database!' : 'FAILED'}
                  </span>
                </div>
                <pre className="text-xs bg-white p-3 rounded mt-2 overflow-auto">
                  {JSON.stringify(employeeResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Admin Test */}
          <div className="mb-6 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">👔 Admin Settings</h2>
              <button
                onClick={testAdminUpdate}
                disabled={isTestingAdmin}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isTestingAdmin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Test Update
                  </>
                )}
              </button>
            </div>

            {adminResult && (
              <div className={`p-4 rounded-lg ${adminResult.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {adminResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${adminResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {adminResult.success ? 'SUCCESS - Saved to Database!' : 'FAILED'}
                  </span>
                </div>
                <pre className="text-xs bg-white p-3 rounded mt-2 overflow-auto">
                  {JSON.stringify(adminResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Super Admin Test */}
          <div className="mb-6 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">⭐ Super Admin Settings</h2>
              <button
                onClick={testSuperAdminUpdate}
                disabled={isTestingSuperAdmin}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isTestingSuperAdmin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Test Update
                  </>
                )}
              </button>
            </div>

            {superAdminResult && (
              <div className={`p-4 rounded-lg ${superAdminResult.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {superAdminResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${superAdminResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {superAdminResult.success ? 'SUCCESS - Saved to Database!' : 'FAILED'}
                  </span>
                </div>
                <pre className="text-xs bg-white p-3 rounded mt-2 overflow-auto">
                  {JSON.stringify(superAdminResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📋 How to Use:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Login as any user type (Employee, Admin, or Super Admin)</li>
              <li>Click "Test All Active Sessions" or test individual user types</li>
              <li>Check if the update succeeds (green = saved to database)</li>
              <li>Open the actual Settings page and verify changes persist after refresh</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
