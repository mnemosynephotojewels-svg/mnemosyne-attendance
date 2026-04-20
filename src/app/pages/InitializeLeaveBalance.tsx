import React, { useState } from 'react';
import { Card } from '../components/Card';
import { RefreshCw, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function InitializeLeaveBalance() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const initializeMyBalance = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      // Get current employee from session
      const employeeNumber = sessionStorage.getItem('employee_number') || 
                            sessionStorage.getItem('admin_number') ||
                            sessionStorage.getItem('super_admin_number');

      if (!employeeNumber) {
        throw new Error('Please login first');
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔄 INITIALIZING LEAVE BALANCE');
      console.log('Employee:', employeeNumber);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const response = await fetch(`${API_BASE_URL}/leave-balance/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_number: employeeNumber,
          balance: 12
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize leave balance');
      }

      console.log('✅ Initialization successful:', data);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setResult(data);
      toast.success('Leave balance initialized to 12 days!');

      // Refresh the page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('❌ Error initializing leave balance:', error);
      toast.error(error.message || 'Failed to initialize leave balance');
      setResult({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <RefreshCw className="w-8 h-8 text-[#0B3060]" />
        <h1 className="text-3xl font-bold text-[#1F2937]">Initialize Leave Balance</h1>
      </div>

      {/* Error Alert */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-900">Leave Balance Error Detected</p>
            <p className="text-xs text-red-700 mt-1">
              Your leave balance is currently 0 days. Click the button below to initialize it to 12 days (annual leave allowance).
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">About Your Leave Balance</p>
            <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>You are entitled to 12 days of paid leave per year</li>
              <li>This is a one-time initialization to fix the error</li>
              <li>Your leave balance will be properly tracked going forward</li>
              <li>When leave is approved, days will be deducted automatically</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Card */}
      {!result && (
        <Card>
          <div className="p-6 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-[#0B3060] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-[#1F2937] mb-2">Fix Leave Balance</h2>
              <p className="text-sm text-[#6B7280]">
                Click the button below to set your leave balance to 12 days
              </p>
            </div>

            <button
              onClick={initializeMyBalance}
              disabled={isLoading}
              className="px-8 py-3 bg-[#0B3060] text-white rounded-lg font-semibold hover:bg-[#152a47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Initialize My Leave Balance
                </>
              )}
            </button>
          </div>
        </Card>
      )}

      {/* Success Result */}
      {result && result.success && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-bold text-[#1F2937]">Success!</h2>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-green-900">
                Your leave balance has been set to 12 days
              </p>
              <p className="text-xs text-green-700 mt-1">
                You can now submit leave requests. The page will refresh automatically...
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-[#6B7280] mb-1">Old Balance</p>
                <p className="text-2xl font-bold text-red-600">0 days</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-[#6B7280] mb-1">New Balance</p>
                <p className="text-2xl font-bold text-green-600">12 days</p>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-[#0B3060] font-semibold hover:underline"
              >
                Refresh Now
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Error Result */}
      {result && !result.success && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-[#1F2937]">Error</h2>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-red-900">
                Failed to initialize leave balance
              </p>
              <p className="text-xs text-red-700 mt-1">
                {result.error || 'Unknown error occurred'}
              </p>
            </div>

            <div className="text-center">
              <button
                onClick={() => setResult(null)}
                className="px-6 py-2 bg-[#0B3060] text-white rounded-lg font-semibold hover:bg-[#152a47] transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Help Text */}
      <div className="text-center text-xs text-[#6B7280]">
        <p>If you continue to experience issues, please contact your HR administrator</p>
      </div>
    </div>
  );
}
