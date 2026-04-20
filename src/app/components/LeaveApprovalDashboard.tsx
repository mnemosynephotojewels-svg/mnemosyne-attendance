/**
 * 🎯 LEAVE APPROVAL SYSTEM - VISUAL TEST DASHBOARD
 * 
 * This component provides a real-time visual dashboard showing
 * the current state of the leave approval system with live metrics.
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Activity
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SystemMetrics {
  totalEmployees: number;
  employeesWithBalance: number;
  avgBalance: number;
  pendingRequests: number;
  approvedToday: number;
  paidLeaveRecordsToday: number;
  totalPaidLeaveDays: number;
  totalUnpaidLeaveDays: number;
  employeesWithZeroBalance: number;
  recentApprovals: Array<{
    employee_name: string;
    days: number;
    approved_at: string;
  }>;
}

export function LeaveApprovalDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get employee metrics
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, employee_number, full_name, paid_leave_balance')
        .eq('status', 'active');

      if (empError) throw empError;

      const totalEmployees = employees?.length || 0;
      const employeesWithBalance = employees?.filter(e => e.paid_leave_balance !== null).length || 0;
      const avgBalance = employees
        ?.reduce((sum, e) => sum + (e.paid_leave_balance || 0), 0) / (employeesWithBalance || 1) || 0;
      const employeesWithZeroBalance = employees?.filter(e => e.paid_leave_balance === 0).length || 0;

      // Get leave request metrics
      const { data: leaveRequests, error: lrError } = await supabase
        .from('leave_requests')
        .select('id, employee_number, status, start_date, end_date, reviewed_at')
        .order('created_at', { ascending: false });

      if (lrError) throw lrError;

      const pendingRequests = leaveRequests?.filter(lr => lr.status === 'pending').length || 0;
      const today = new Date().toISOString().split('T')[0];
      const approvedToday = leaveRequests?.filter(lr => 
        lr.status === 'approved' && 
        lr.reviewed_at && 
        lr.reviewed_at.split('T')[0] === today
      ).length || 0;

      // Get attendance record metrics
      const { data: attendanceRecords, error: arError } = await supabase
        .from('attendance_records')
        .select('id, status, date, leave_request_id, employee_number')
        .not('leave_request_id', 'is', null);

      if (arError) throw arError;

      const paidLeaveRecordsToday = attendanceRecords?.filter(ar => 
        ar.status === 'PAID_LEAVE' && 
        ar.date === today
      ).length || 0;
      
      const totalPaidLeaveDays = attendanceRecords?.filter(ar => ar.status === 'PAID_LEAVE').length || 0;
      const totalUnpaidLeaveDays = attendanceRecords?.filter(ar => 
        ar.status === 'ABSENT' && 
        ar.leave_request_id
      ).length || 0;

      // Get recent approvals (last 5)
      const recentApprovals = leaveRequests
        ?.filter(lr => lr.status === 'approved' && lr.reviewed_at)
        .sort((a, b) => new Date(b.reviewed_at!).getTime() - new Date(a.reviewed_at!).getTime())
        .slice(0, 5)
        .map(lr => {
          const start = new Date(lr.start_date);
          const end = new Date(lr.end_date);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          // Find employee name
          const employee = employees?.find(e => e.employee_number === lr.employee_number);
          
          return {
            employee_name: employee?.full_name || lr.employee_number,
            days,
            approved_at: lr.reviewed_at!
          };
        }) || [];

      setMetrics({
        totalEmployees,
        employeesWithBalance,
        avgBalance,
        pendingRequests,
        approvedToday,
        paidLeaveRecordsToday,
        totalPaidLeaveDays,
        totalUnpaidLeaveDays,
        employeesWithZeroBalance,
        recentApprovals
      });

      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const MetricCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    subtitle 
  }: { 
    title: string; 
    value: number | string; 
    icon: any; 
    color: string; 
    subtitle?: string;
  }) => (
    <div className={`bg-white rounded-xl shadow-md border-2 ${color} p-6 hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-lg ${color.replace('border', 'bg').replace('200', '100')}`}>
          <Icon className={`w-6 h-6 ${color.replace('border-', 'text-').replace('-200', '-600')}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
      <div className="text-sm font-semibold text-gray-600">{title}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-2">{subtitle}</div>
      )}
    </div>
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border-2 border-red-200 p-8">
            <div className="flex items-center gap-4 text-red-600">
              <XCircle className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Failed to Load Dashboard</h2>
                <p className="text-sm text-red-500 mt-2">{error}</p>
              </div>
            </div>
            <button
              onClick={loadMetrics}
              className="mt-6 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4d8f] p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">📊 Leave Approval System Dashboard</h1>
                <p className="text-blue-100">Real-time monitoring of leave balances and approvals</p>
              </div>
              <button
                onClick={loadMetrics}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="font-semibold">Refresh</span>
              </button>
            </div>
            <div className="mt-4 text-sm text-blue-200">
              Last updated: {lastRefresh.toLocaleString()}
            </div>
          </div>
        </div>

        {isLoading && !metrics ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Activity className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
            <p className="text-gray-600">Loading system metrics...</p>
          </div>
        ) : metrics && (
          <>
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Total Employees"
                value={metrics.totalEmployees}
                icon={Users}
                color="border-blue-200"
                subtitle={`${metrics.employeesWithBalance} with balance initialized`}
              />
              <MetricCard
                title="Avg Leave Balance"
                value={`${metrics.avgBalance.toFixed(1)} days`}
                icon={TrendingUp}
                color="border-green-200"
                subtitle="Across all active employees"
              />
              <MetricCard
                title="Pending Requests"
                value={metrics.pendingRequests}
                icon={Clock}
                color="border-yellow-200"
                subtitle="Awaiting admin approval"
              />
              <MetricCard
                title="Approved Today"
                value={metrics.approvedToday}
                icon={CheckCircle2}
                color="border-green-200"
                subtitle={`${metrics.paidLeaveRecordsToday} on paid leave today`}
              />
            </div>

            {/* System Health Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Leave Usage Statistics */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Leave Usage Statistics
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600">Paid Leave Days Used</div>
                      <div className="text-2xl font-bold text-green-700">{metrics.totalPaidLeaveDays}</div>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600">Unpaid Leave Days (Absent)</div>
                      <div className="text-2xl font-bold text-orange-700">{metrics.totalUnpaidLeaveDays}</div>
                    </div>
                    <XCircle className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600">Employees with 0 Balance</div>
                      <div className="text-2xl font-bold text-red-700">{metrics.employeesWithZeroBalance}</div>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Recent Approvals */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-green-600" />
                  Recent Approvals
                </h2>
                {metrics.recentApprovals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No recent approvals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {metrics.recentApprovals.map((approval, index) => (
                      <div 
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">{approval.employee_name}</div>
                            <div className="text-sm text-gray-600">
                              {approval.days} day{approval.days !== 1 ? 's' : ''} approved
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 text-right">
                            {new Date(approval.approved_at).toLocaleDateString()}
                            <br />
                            {new Date(approval.approved_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">System Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-800">Database Connected</div>
                    <div className="text-xs text-green-600">All tables accessible</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-800">Balance Column Active</div>
                    <div className="text-xs text-green-600">paid_leave_balance working</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-800">Approvals Working</div>
                    <div className="text-xs text-green-600">{metrics.approvedToday} processed today</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900 mb-2">About This Dashboard</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    This dashboard provides real-time monitoring of your leave approval system. 
                    Metrics are automatically refreshed every 30 seconds to ensure you always have 
                    up-to-date information.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                    <div>✅ Real-time metrics</div>
                    <div>✅ Auto-refresh every 30s</div>
                    <div>✅ Recent activity tracking</div>
                    <div>✅ System health monitoring</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LeaveApprovalDashboard;