/**
 * EXAMPLE: EMPLOYEE LEAVE REQUEST FORM
 * Demonstrates how to use the LeaveManagementService to submit leave requests
 * with real-time balance checking and paid/unpaid warnings
 */

import React, { useState, useEffect } from 'react';
import { LeaveManagementService } from '../../services/leaveManagementService';
import { toast } from 'sonner';
import { Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function EmployeeLeaveRequestForm() {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [leaveType, setLeaveType] = useState<'sick_leave' | 'vacation_leave' | 'emergency_leave' | 'personal_leave'>('vacation_leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [eligibilityInfo, setEligibilityInfo] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [businessDays, setBusinessDays] = useState(0);

  // Load employee info from session
  useEffect(() => {
    const employeeData = localStorage.getItem('mnemosyne_employee_session');
    if (employeeData) {
      const employee = JSON.parse(employeeData);
      setEmployeeNumber(employee.employee_number);
      loadBalance(employee.employee_number);
    }
  }, []);

  // Load employee's current balance
  const loadBalance = async (empNumber: string) => {
    const result = await LeaveManagementService.getEmployeeBalance(empNumber);
    if (result.success) {
      setCurrentBalance(result.balance || 0);
    }
  };

  // Calculate days and check eligibility when dates change
  useEffect(() => {
    if (startDate && endDate && employeeNumber) {
      const days = LeaveManagementService.calculateBusinessDays(startDate, endDate);
      setBusinessDays(days);

      if (days > 0) {
        checkEligibility(days);
      }
    }
  }, [startDate, endDate, employeeNumber]);

  const checkEligibility = async (requestedDays: number) => {
    const result = await LeaveManagementService.canSubmitLeave(employeeNumber, requestedDays);
    setEligibilityInfo(result);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate || !reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (businessDays <= 0) {
      toast.error('Please select valid dates (at least one business day)');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await LeaveManagementService.submitLeaveRequest({
        employee_number: employeeNumber,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason
      });

      if (result.success) {
        toast.success('Leave request submitted successfully!');
        
        // Show warning if applicable
        if (result.warning) {
          toast.warning(result.warning, { duration: 5000 });
        }

        // Reset form
        setStartDate('');
        setEndDate('');
        setReason('');
        setEligibilityInfo(null);
        
        // Reload balance
        loadBalance(employeeNumber);
      } else {
        toast.error(result.error || 'Failed to submit leave request');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error('An error occurred while submitting your request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#0B3060] mb-2">Request Leave</h2>
        <div className="flex items-center gap-2 p-3 bg-[#F7F9FB] rounded-lg">
          <CheckCircle className="w-5 h-5 text-[#10B981]" />
          <div>
            <p className="text-sm text-[#6B7280]">Your Paid Leave Balance</p>
            <p className="text-2xl font-bold text-[#0B3060]">{currentBalance} days</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Leave Type */}
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-2">
            Leave Type
          </label>
          <select
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
          >
            <option value="vacation_leave">Vacation Leave</option>
            <option value="sick_leave">Sick Leave</option>
            <option value="emergency_leave">Emergency Leave</option>
            <option value="personal_leave">Personal Leave</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Business Days Calculation */}
        {businessDays > 0 && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-900">
              <strong>{businessDays}</strong> business day{businessDays !== 1 ? 's' : ''} selected
              (weekends excluded)
            </p>
          </div>
        )}

        {/* Eligibility Warning/Info */}
        {eligibilityInfo && (
          <div className={`p-4 rounded-lg ${
            eligibilityInfo.will_be_paid 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              {eligibilityInfo.will_be_paid ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  eligibilityInfo.will_be_paid ? 'text-green-900' : 'text-amber-900'
                }`}>
                  {eligibilityInfo.message}
                </p>
                
                {eligibilityInfo.unpaid_days > 0 && (
                  <div className="mt-2 text-sm text-amber-800">
                    <p className="font-semibold">Breakdown:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {eligibilityInfo.paid_days > 0 && (
                        <li>✅ {eligibilityInfo.paid_days} day{eligibilityInfo.paid_days !== 1 ? 's' : ''} - Paid Leave</li>
                      )}
                      <li>⚠️ {eligibilityInfo.unpaid_days} day{eligibilityInfo.unpaid_days !== 1 ? 's' : ''} - Unpaid (Absent)</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-2">
            Reason for Leave
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Please provide details about your leave request..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || businessDays <= 0}
          className="w-full px-6 py-3 bg-[#0B3060] text-white font-semibold rounded-lg hover:bg-[#1a4a8a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 animate-spin" />
              Submitting...
            </span>
          ) : (
            'Submit Leave Request'
          )}
        </button>
      </form>
    </div>
  );
}

export default EmployeeLeaveRequestForm;
