/**
 * EXAMPLE: ADMIN LEAVE APPROVAL INTERFACE
 * Demonstrates how admins approve leave requests with automatic paid/unpaid handling
 */

import React, { useState, useEffect } from 'react';
import { LeaveManagementService } from '../../services/leaveManagementService';
import { toast } from 'sonner';
import { Calendar, CheckCircle, XCircle, AlertTriangle, User, FileText, Clock } from 'lucide-react';

interface LeaveRequestWithDetails {
  id: string;
  employee_number: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  is_paid: boolean;
  employee_balance: number;
  created_at: string;
}

export function AdminLeaveApprovalPanel() {
  const [pendingRequests, setPendingRequests] = useState<LeaveRequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    // Load admin info from session
    const adminData = localStorage.getItem('mnemosyne_admin_profile');
    if (adminData) {
      const admin = JSON.parse(adminData);
      setAdminName(admin.username || admin.full_name);
    }

    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    setIsLoading(true);
    try {
      // Get admin's team from localStorage
      const adminData = localStorage.getItem('mnemosyne_admin_profile');
      let team: string | undefined;
      if (adminData) {
        const admin = JSON.parse(adminData);
        team = admin.department;
      }

      const result = await LeaveManagementService.getLeaveRequests({
        status: 'pending',
        team: team
      });

      if (result.success && result.data) {
        // Enrich with employee balance information
        const enrichedRequests = await Promise.all(
          result.data.map(async (request: any) => {
            const balanceResult = await LeaveManagementService.getEmployeeBalance(request.employee_number);
            return {
              ...request,
              employee_name: request.employees?.full_name || 'Unknown',
              employee_balance: balanceResult.balance || 0
            };
          })
        );

        setPendingRequests(enrichedRequests);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load pending requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string, request: LeaveRequestWithDetails) => {
    if (!adminName) {
      toast.error('Admin information not found');
      return;
    }

    // Show confirmation with paid/unpaid info
    const willBePaid = request.employee_balance >= request.total_days;
    const confirmMessage = willBePaid
      ? `Approve ${request.total_days} days of PAID LEAVE for ${request.employee_name}?`
      : `⚠️ Employee has insufficient balance (${request.employee_balance} days). This will be approved as UNPAID LEAVE (Absent). Continue?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setProcessingId(requestId);

    try {
      const result = await LeaveManagementService.approveLeaveRequest(requestId, adminName);

      if (result.success) {
        // Show success message with details
        const message = result.is_paid
          ? `✅ Approved as PAID LEAVE. ${result.days_deducted} days deducted. New balance: ${result.new_balance} days.`
          : `✅ Approved as UNPAID LEAVE (Absent). Employee balance unchanged.`;

        toast.success(message, { duration: 5000 });

        // Reload requests
        loadPendingRequests();
      } else {
        toast.error(result.message || 'Failed to approve request');
      }
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error('An error occurred while approving the request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequestId || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingId(rejectingRequestId);

    try {
      const result = await LeaveManagementService.rejectLeaveRequest(
        rejectingRequestId,
        adminName,
        rejectionReason
      );

      if (result.success) {
        toast.success('Leave request rejected');
        setShowRejectModal(false);
        setRejectingRequestId(null);
        setRejectionReason('');
        loadPendingRequests();
      } else {
        toast.error(result.message || 'Failed to reject request');
      }
    } catch (error: any) {
      console.error('Rejection error:', error);
      toast.error('An error occurred while rejecting the request');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (requestId: string) => {
    setRejectingRequestId(requestId);
    setShowRejectModal(true);
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      sick_leave: 'Sick Leave',
      vacation_leave: 'Vacation Leave',
      emergency_leave: 'Emergency Leave',
      personal_leave: 'Personal Leave'
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Clock className="w-8 h-8 animate-spin text-[#0B3060]" />
        <span className="ml-3 text-[#6B7280]">Loading leave requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0B3060]">Leave Requests</h2>
          <p className="text-sm text-[#6B7280] mt-1">Review and approve team member leave requests</p>
        </div>
        <div className="px-4 py-2 bg-[#F7B34C] text-[#0B3060] rounded-lg font-semibold">
          {pendingRequests.length} Pending
        </div>
      </div>

      {/* Requests List */}
      {pendingRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">No pending leave requests at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => {
            const willBePaid = request.employee_balance >= request.total_days;
            const isProcessing = processingId === request.id;

            return (
              <div key={request.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-[#0B3060]">
                {/* Employee Info */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#F7B34C] flex items-center justify-center text-[#0B3060] font-bold text-lg">
                      {request.employee_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1F2937] text-lg">{request.employee_name}</h3>
                      <p className="text-sm text-[#6B7280]">{request.employee_number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#6B7280]">Submitted</p>
                    <p className="text-sm font-medium text-[#1F2937]">
                      {new Date(request.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Leave Details */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Leave Type</p>
                    <p className="font-medium text-[#1F2937]">{getLeaveTypeLabel(request.leave_type)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Duration</p>
                    <p className="font-medium text-[#1F2937]">{request.total_days} business days</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Start Date</p>
                    <p className="font-medium text-[#1F2937]">
                      {new Date(request.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">End Date</p>
                    <p className="font-medium text-[#1F2937]">
                      {new Date(request.end_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <div className="mb-4">
                  <p className="text-xs text-[#6B7280] mb-2">Reason</p>
                  <p className="text-sm text-[#1F2937] bg-white p-3 rounded border border-gray-200">
                    {request.reason}
                  </p>
                </div>

                {/* Balance Warning/Info */}
                <div className={`p-4 rounded-lg mb-4 ${
                  willBePaid ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {willBePaid ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${
                        willBePaid ? 'text-green-900' : 'text-amber-900'
                      }`}>
                        {willBePaid ? 'Sufficient Balance - Will be PAID LEAVE' : 'Insufficient Balance - Will be UNPAID LEAVE'}
                      </p>
                      <p className={`text-xs mt-1 ${
                        willBePaid ? 'text-green-700' : 'text-amber-700'
                      }`}>
                        Current balance: <strong>{request.employee_balance} days</strong> | 
                        Requesting: <strong>{request.total_days} days</strong>
                        {!willBePaid && ` | Shortage: ${request.total_days - request.employee_balance} days`}
                      </p>
                      {!willBePaid && (
                        <p className="text-xs mt-2 text-amber-800 font-medium">
                          ⚠️ If approved, attendance will be marked as "ABSENT" (unpaid) for these days.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(request.id, request)}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-[#10B981] text-white font-semibold rounded-lg hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {isProcessing ? 'Processing...' : `Approve as ${willBePaid ? 'Paid' : 'Unpaid'}`}
                  </button>
                  <button
                    onClick={() => openRejectModal(request.id)}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-[#EF4444] text-white font-semibold rounded-lg hover:bg-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-[#1F2937] mb-4">Reject Leave Request</h3>
            <p className="text-sm text-[#6B7280] mb-4">
              Please provide a reason for rejecting this leave request:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              placeholder="Enter rejection reason..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B3060] focus:border-transparent mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingRequestId(null);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || !!processingId}
                className="flex-1 px-4 py-2 bg-[#EF4444] text-white font-semibold rounded-lg hover:bg-[#DC2626] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLeaveApprovalPanel;
