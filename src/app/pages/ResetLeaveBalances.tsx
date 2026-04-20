import React, { useState } from 'react';
import { Card } from '../components/Card';
import { RefreshCw, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function ResetLeaveBalances() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [specificEmployee, setSpecificEmployee] = useState('');
  const [customBalance, setCustomBalance] = useState('12');

  const resetAllBalances = async () => {
    if (!confirm('Are you sure you want to reset leave balance for all employees with 0 or NULL balance to 12 days?')) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔄 RESETTING ALL LEAVE BALANCES');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const response = await fetch(`${API_BASE_URL}/leave-balance/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          balance: parseInt(customBalance) || 12
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset leave balances');
      }

      console.log('✅ Reset successful:', data);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setResult(data);
      toast.success(data.message);

    } catch (error: any) {
      console.error('❌ Error resetting leave balances:', error);
      toast.error(error.message || 'Failed to reset leave balances');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSpecificEmployee = async () => {
    if (!specificEmployee.trim()) {
      toast.error('Please enter an employee number');
      return;
    }

    if (!confirm(`Are you sure you want to reset leave balance for ${specificEmployee} to ${customBalance} days?`)) {
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🔄 RESETTING LEAVE BALANCE FOR ${specificEmployee}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const response = await fetch(`${API_BASE_URL}/leave-balance/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_number: specificEmployee.trim(),
          balance: parseInt(customBalance) || 12
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset leave balance');
      }

      console.log('✅ Reset successful:', data);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setResult(data);
      toast.success(data.message);
      setSpecificEmployee(''); // Clear input after success

    } catch (error: any) {
      console.error('❌ Error resetting leave balance:', error);
      toast.error(error.message || 'Failed to reset leave balance');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#0B3060]" />
          <div>
            <h1 className="text-[#1F2937] text-2xl font-bold">Reset Leave Balances</h1>
            <p className="text-[#6B7280]">Manage employee leave balance allocations</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reset All Employees */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-[#0B3060]/10 rounded-lg">
                <RefreshCw className="w-6 h-6 text-[#0B3060]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1F2937]">Reset All Employees</h2>
                <p className="text-xs text-[#6B7280]">Bulk reset for employees with 0 or NULL balance</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1F2937] mb-2">
                  Leave Balance (days/year)
                </label>
                <input
                  type="number"
                  value={customBalance}
                  onChange={(e) => setCustomBalance(e.target.value)}
                  min="0"
                  max="365"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/20 focus:border-[#0B3060] transition-all"
                  placeholder="12"
                />
                <p className="text-xs text-[#6B7280] mt-1.5">
                  This will be applied to all employees with 0 or NULL balance
                </p>
              </div>

              <button
                onClick={resetAllBalances}
                disabled={isLoading}
                className="w-full px-6 py-3 bg-[#0B3060] text-white rounded-lg font-semibold hover:bg-[#0B3060]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Reset All Employees
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* Reset Specific Employee */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-[#F7B34C]/20 rounded-lg">
                <RefreshCw className="w-6 h-6 text-[#F7B34C]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1F2937]">Reset Specific Employee</h2>
                <p className="text-xs text-[#6B7280]">Reset balance for a single employee</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1F2937] mb-2">
                  Employee Number
                </label>
                <input
                  type="text"
                  value={specificEmployee}
                  onChange={(e) => setSpecificEmployee(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/20 focus:border-[#0B3060] transition-all"
                  placeholder="EMP-1054"
                />
                <p className="text-xs text-[#6B7280] mt-1.5">
                  Enter the employee number (e.g., EMP-1054)
                </p>
              </div>

              <button
                onClick={resetSpecificEmployee}
                disabled={isLoading || !specificEmployee.trim()}
                className="w-full px-6 py-3 bg-[#F7B34C] text-[#0B3060] rounded-lg font-semibold hover:bg-[#F7B34C]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Reset This Employee
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Result Display */}
      {result && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1F2937]">Reset Complete</h2>
                <p className="text-sm text-[#6B7280]">Leave balances have been updated successfully</p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-green-900">{result.message}</p>
              {result.updated_count !== undefined && (
                <p className="text-xs text-green-700 mt-1">
                  Updated {result.updated_count} employee(s)
                  {result.total_found && ` out of ${result.total_found} found`}
                </p>
              )}
            </div>

            {result.updates && result.updates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#1F2937]">Updated Employees:</h3>
                <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase">Employee</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase">Name</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase">Old Balance</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase">New Balance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {result.updates.map((update: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-[#1F2937]">{update.employee_number}</td>
                          <td className="px-4 py-3 text-[#1F2937]">{update.name}</td>
                          <td className="px-4 py-3">
                            <span className="text-red-600 font-medium">{update.old_balance ?? 0} days</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-green-600 font-semibold">{update.new_balance} days</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}