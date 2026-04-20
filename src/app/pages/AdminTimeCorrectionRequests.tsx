import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ClipboardCheck, Check, X, AlertCircle, Calendar, Clock, User, Trash2 } from 'lucide-react';
import { toast } from '../utils/toast';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

interface CorrectionRequest {
  id: string;
  employee_number: string;
  employee_name: string;
  team_name: string;
  correction_date: string;
  correction_time: string;
  correction_type: 'Time In' | 'Time Out';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

export function AdminTimeCorrectionRequests() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<CorrectionRequest | null>(null);

  // Get admin session - FIX: Use localStorage instead of sessionStorage
  const adminSession = JSON.parse(localStorage.getItem('adminSession') || '{}');
  const adminNumber = adminSession?.admin_number;

  useEffect(() => {
    if (adminNumber) {
      fetchRequests();
    }
  }, [adminNumber]);

  const fetchRequests = async () => {
    if (!adminNumber) {
      console.error('No admin number found in session');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/time-corrections/admin/${adminNumber}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setRequests(result.data || []);
      } else {
        console.error('Failed to fetch requests:', result.error);
        toast.error(result.error || 'Failed to load correction requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load correction requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (request: CorrectionRequest) => {
    setSelectedRequest(request);
    setModalType('approve');
    setShowModal(true);
  };

  const handleReject = (request: CorrectionRequest) => {
    setSelectedRequest(request);
    setModalType('reject');
    setRejectionReason('');
    setShowModal(true);
  };

  const confirmAction = async () => {
    if (!selectedRequest) return;

    if (modalType === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/time-corrections/${selectedRequest.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: modalType === 'approve' ? 'approved' : 'rejected',
            reviewed_by: adminNumber,
            rejection_reason: modalType === 'reject' ? rejectionReason : null,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(
          modalType === 'approve'
            ? 'Correction request approved successfully! Attendance record updated.'
            : 'Correction request rejected'
        );
        
        // Refresh the list
        fetchRequests();
        
        // 🆕 Trigger dashboard refresh for attendance update (if approved)
        if (modalType === 'approve') {
          console.log('🔔 [TimeCorrectionRequests] Dispatching attendanceUpdated event');
          console.log('   Employee:', selectedRequest.employee_number);
          console.log('   Date:', selectedRequest.correction_date);
          console.log('   Type:', selectedRequest.correction_type);
          
          const event = new CustomEvent('attendanceUpdated', {
            detail: {
              employee_number: selectedRequest.employee_number,
              date: selectedRequest.correction_date,
              type: selectedRequest.correction_type,
              source: 'time_correction_approval'
            }
          });
          window.dispatchEvent(event);
          
          console.log('✅ [TimeCorrectionRequests] Event dispatched successfully');
        }
        
        // Close modal
        setShowModal(false);
        setSelectedRequest(null);
        setRejectionReason('');
      } else {
        console.error('Failed to update request:', result.error);
        toast.error(result.error || 'Failed to update request');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (request: CorrectionRequest) => {
    setRequestToDelete(request);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;

    setProcessing(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/time-corrections/${requestToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Time correction request deleted successfully');
        
        // Refresh the list
        fetchRequests();
        
        // Close modal
        setShowDeleteModal(false);
        setRequestToDelete(null);
      } else {
        console.error('Failed to delete request:', result.error);
        toast.error(result.error || 'Failed to delete request');
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardCheck}
        title="Time Correction Requests"
        subtitle="Review and manage employee time in/out correction requests from your team"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          onClick={() => setFilter('all')}
          className={`cursor-pointer transition-all hover:shadow-md ${filter === 'all' ? 'ring-2 ring-[#0B3060] bg-blue-50' : ''}`}
        >
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-gray-600 font-medium">Total Requests</p>
              <p className="text-2xl font-bold text-[#0B3060] mt-0.5">{requests.length}</p>
            </div>
            <ClipboardCheck className="w-8 h-8 text-[#0B3060] opacity-40" />
          </div>
        </Card>

        <Card
          onClick={() => setFilter('pending')}
          className={`cursor-pointer transition-all hover:shadow-md ${filter === 'pending' ? 'ring-2 ring-[#CA8A04] bg-yellow-50' : ''}`}
        >
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-gray-600 font-medium">Pending</p>
              <p className="text-2xl font-bold text-[#CA8A04] mt-0.5">{pendingCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-[#CA8A04] opacity-40" />
          </div>
        </Card>

        <Card
          onClick={() => setFilter('approved')}
          className={`cursor-pointer transition-all hover:shadow-md ${filter === 'approved' ? 'ring-2 ring-[#16A34A] bg-green-50' : ''}`}
        >
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-gray-600 font-medium">Approved</p>
              <p className="text-2xl font-bold text-[#16A34A] mt-0.5">{approvedCount}</p>
            </div>
            <Check className="w-8 h-8 text-[#16A34A] opacity-40" />
          </div>
        </Card>

        <Card
          onClick={() => setFilter('rejected')}
          className={`cursor-pointer transition-all hover:shadow-md ${filter === 'rejected' ? 'ring-2 ring-[#DC2626] bg-red-50' : ''}`}
        >
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-gray-600 font-medium">Rejected</p>
              <p className="text-2xl font-bold text-[#DC2626] mt-0.5">{rejectedCount}</p>
            </div>
            <X className="w-8 h-8 text-[#DC2626] opacity-40" />
          </div>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <div className="flex items-center justify-between mb-4 p-5 pb-0">
          <h2 className="text-base font-semibold text-[#1F2937]">
            {filter === 'all' ? 'All Requests' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Requests`}
          </h2>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="text-xs text-[#0B3060] hover:text-[#0B3060]/80 font-medium"
            >
              Show All
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Reason</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium text-[#1F2937]">{request.employee_name}</p>
                          <p className="text-xs text-gray-500">{request.employee_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm text-[#1F2937]">
                        {new Date(request.correction_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm text-[#1F2937]">{request.correction_time}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        request.correction_type === 'Time In'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {request.correction_type}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm text-[#1F2937] truncate max-w-xs" title={request.reason}>
                        {request.reason}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        request.status === 'approved'
                          ? 'bg-[#DCFCE7] text-[#16A34A]'
                          : request.status === 'rejected'
                          ? 'bg-[#FEE2E2] text-[#DC2626]'
                          : 'bg-[#FEF9C3] text-[#CA8A04]'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {request.status === 'pending' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApprove(request)}
                            className="p-2 text-[#16A34A] hover:bg-[#DCFCE7] rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(request)}
                            className="p-2 text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(request)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDelete(request)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {filter === 'all'
                ? 'No correction requests found'
                : `No ${filter} requests found`}
            </p>
          </div>
        )}
      </Card>

      {/* Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {modalType === 'approve' ? (
                  <Check className="w-6 h-6 text-[#16A34A]" />
                ) : (
                  <X className="w-6 h-6 text-[#DC2626]" />
                )}
                <h2 className="text-xl font-semibold text-[#1F2937]">
                  {modalType === 'approve' ? 'Approve Request' : 'Reject Request'}
                </h2>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Employee</p>
                  <p className="text-[#1F2937]">{selectedRequest.employee_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Date</p>
                    <p className="text-[#1F2937]">
                      {new Date(selectedRequest.correction_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Time</p>
                    <p className="text-[#1F2937]">{selectedRequest.correction_time}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Type</p>
                  <p className="text-[#1F2937]">{selectedRequest.correction_type}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Reason</p>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-[#1F2937]">{selectedRequest.reason}</p>
                  </div>
                </div>

                {modalType === 'reject' && (
                  <div>
                    <label className="block text-sm font-medium text-[#1F2937] mb-2">
                      Rejection Reason *
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC2626] min-h-[100px]"
                      placeholder="Please explain why this request is being rejected..."
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  disabled={processing || (modalType === 'reject' && !rejectionReason.trim())}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                    modalType === 'approve'
                      ? 'bg-[#16A34A] hover:bg-[#16A34A]/90'
                      : 'bg-[#DC2626] hover:bg-[#DC2626]/90'
                  }`}
                >
                  {processing ? 'Processing...' : modalType === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && requestToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Trash2 className="w-6 h-6 text-[#DC2626]" />
                <h2 className="text-xl font-semibold text-[#1F2937]">
                  Delete Request
                </h2>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Employee</p>
                  <p className="text-[#1F2937]">{requestToDelete.employee_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Date</p>
                    <p className="text-[#1F2937]">
                      {new Date(requestToDelete.correction_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Time</p>
                    <p className="text-[#1F2937]">{requestToDelete.correction_time}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Type</p>
                  <p className="text-[#1F2937]">{requestToDelete.correction_type}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Reason</p>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-[#1F2937]">{requestToDelete.reason}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setRequestToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={processing}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-[#DC2626] hover:bg-[#DC2626]/90`}
                >
                  {processing ? 'Processing...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}