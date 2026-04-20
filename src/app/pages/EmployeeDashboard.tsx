import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, User, Mail, Briefcase, Users as UsersIcon, IdCard, Calendar, RefreshCw } from 'lucide-react';
import { Card } from '../components/Card';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { useEmployeeSession } from '../hooks/useEmployeeSession';
import { leaveRequestApi } from '../../services/apiService';
import { toast } from 'sonner';

export function EmployeeDashboard() {
  const { employee, isLoading } = useEmployeeSession();
  const [leaveBalance, setLeaveBalance] = useState<number>(12);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Load leave balance when component mounts
  useEffect(() => {
    if (employee) {
      loadLeaveBalance();
    }
  }, [employee]);

  const loadLeaveBalance = async () => {
    if (!employee) return;
    
    setIsLoadingBalance(true);
    try {
      console.log('📊 Fetching leave balance for:', employee.employee_number);
      
      // Use the API to get leave balance
      const result = await leaveRequestApi.getBalance(employee.employee_number);
      
      if (result.success) {
        console.log('✅ Leave balance loaded:', result.balance);
        console.log('Source:', result.source);
        if (result.paid_leave_days_used !== undefined) {
          console.log('Days used:', result.paid_leave_days_used);
        }
        setLeaveBalance(result.balance);
      } else {
        console.error('❌ Failed to load leave balance:', result.error);
        toast.error('Failed to load leave balance');
        setLeaveBalance(12); // Default fallback
      }
    } catch (error: any) {
      console.error('❌ Error loading leave balance:', error);
      toast.error('Error loading leave balance');
      setLeaveBalance(12); // Default fallback
    } finally {
      setIsLoadingBalance(false);
    }
  };

  if (isLoading || !employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#6B7280]">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#1F2937] mb-8">
        Welcome back, {employee.full_name.split(' ')[0]}
      </h1>

      {/* Paid Leave Balance - Prominent Card */}
      <div className="mb-6">
        <Card>
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Paid Leave Balance</p>
                  <div className="flex items-center gap-2">
                    <p className="text-4xl font-bold text-blue-900">
                      {isLoadingBalance ? '...' : leaveBalance} 
                      <span className="text-lg font-normal text-blue-700 ml-2">days</span>
                    </p>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    {leaveBalance > 0 
                      ? `You have ${leaveBalance} day(s) of paid leave remaining` 
                      : 'You have used all your paid leave days'}
                  </p>
                </div>
              </div>
              <div className="flex flex-row md:flex-col items-center md:items-end gap-3 w-full md:w-auto">
                <button
                  onClick={loadLeaveBalance}
                  disabled={isLoadingBalance}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  title="Refresh leave balance"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                  {isLoadingBalance ? 'Refreshing...' : 'Refresh Balance'}
                </button>
                <div className="text-right">
                  <p className="text-xs font-medium text-blue-900 uppercase mb-1">Annual Allowance</p>
                  <p className="text-2xl font-bold text-blue-900">12 days</p>
                  <p className="text-xs text-blue-700 mt-0.5">Per year</p>
                </div>
              </div>
            </div>
            {leaveBalance <= 3 && leaveBalance > 0 && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 font-medium">
                  ⚠️ Low balance warning: You only have {leaveBalance} day(s) of paid leave remaining
                </p>
              </div>
            )}
            {leaveBalance === 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-800 font-medium">
                  ⚠️ No paid leave remaining: Additional leave requests will be unpaid
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Card */}
        <Card title="Your Attendance QR Code" icon={<Clock className="w-5 h-5 text-[#6B7280]" />}>
          <div className="flex flex-col items-center">
            <div className="bg-white border-4 border-[#0B3060] rounded-2xl p-6 mb-4 shadow-lg">
              <QRCodeGenerator 
                value={employee.employee_number} 
                size={220} 
                showDownload={true}
                employeeName={employee.full_name}
              />
            </div>
            <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white px-6 py-2 rounded-full font-medium">
              ID: {employee.employee_number}
            </div>
            <p className="text-sm text-[#6B7280] mt-4 text-center">
              Show this QR code at the kiosk to record your attendance
            </p>
          </div>
        </Card>

        {/* Status and Profile Column */}
        <div className="space-y-6">
          {/* Today's Status */}
          <Card title="Today's Status" icon={<Clock className="w-5 h-5 text-[#6B7280]" />}>
            <div className="flex flex-col items-center py-4">
              <div className="w-20 h-20 bg-[#DCFCE7] rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-[#16A34A]" />
              </div>
              <h3 className="text-2xl font-bold text-[#1F2937] mb-1">Ready to Clock In</h3>
              <p className="text-[#6B7280]">
                Scan your QR code at the kiosk
              </p>
            </div>
          </Card>

          {/* Profile Info */}
          <Card title="Profile Info" icon={<User className="w-5 h-5 text-[#6B7280]" />}>
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <IdCard className="w-5 h-5 text-[#6B7280]" />
                <div>
                  <p className="text-xs text-[#6B7280]">Employee ID</p>
                  <p className="text-sm font-semibold text-[#1F2937]">{employee.employee_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <Briefcase className="w-5 h-5 text-[#6B7280]" />
                <div>
                  <p className="text-xs text-[#6B7280]">Position</p>
                  <p className="text-sm font-semibold text-[#1F2937]">{employee.position}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <UsersIcon className="w-5 h-5 text-[#6B7280]" />
                <div>
                  <p className="text-xs text-[#6B7280]">Team</p>
                  <p className="text-sm font-semibold text-[#1F2937]">{employee.team}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#6B7280]" />
                <div>
                  <p className="text-xs text-[#6B7280]">Email</p>
                  <p className="text-sm font-semibold text-[#1F2937]">{employee.email}</p>
                </div>
              </div>
              {employee.phone_number && (
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <User className="w-5 h-5 text-[#6B7280]" />
                  <div>
                    <p className="text-xs text-[#6B7280]">Phone</p>
                    <p className="text-sm font-semibold text-[#1F2937]">{employee.phone_number}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}