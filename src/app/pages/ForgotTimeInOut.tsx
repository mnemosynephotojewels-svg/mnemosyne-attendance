import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { MessageSquare, Clock, Calendar as CalendarIcon, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '../utils/toast';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface CorrectionRequest {
  id: string;
  correction_date: string;
  correction_time: string;
  correction_type: 'Time In' | 'Time Out';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export function ForgotTimeInOut() {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    type: 'Time In',
    reason: ''
  });

  const [pastRequests, setPastRequests] = useState<CorrectionRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Get employee session - FIX: Use localStorage instead of sessionStorage
  const employeeSession = JSON.parse(localStorage.getItem('employeeSession') || '{}');
  const employeeNumber = employeeSession?.employee_number;

  // Fetch past requests on component mount
  useEffect(() => {
    if (employeeNumber) {
      fetchPastRequests();
    }
  }, [employeeNumber]);

  const fetchPastRequests = async () => {
    if (!employeeNumber) {
      console.error('No employee number found in session');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch from server API instead of direct Supabase query
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/time-corrections?employee_number=${employeeNumber}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch time correction requests');
      }

      const result = await response.json();
      
      if (result.success) {
        setPastRequests(result.data || []);
      } else {
        console.error('Failed to fetch requests:', result.error);
        toast.error(result.error || 'Failed to load past requests');
      }
    } catch (error) {
      console.error('Error fetching past requests:', error);
      toast.error('Failed to load past requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeNumber) {
      toast.error('Employee session not found. Please log in again.');
      return;
    }

    if (!formData.date || !formData.time || !formData.reason.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);

    try {
      console.log('📤 Submitting time correction request...');
      console.log('Employee:', employeeNumber);
      console.log('Date:', formData.date);
      console.log('Time:', formData.time);
      console.log('Type:', formData.type);
      console.log('Reason:', formData.reason);

      // Get employee details to find admin_team
      const empResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/employees/${employeeNumber}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!empResponse.ok) {
        throw new Error('Failed to fetch employee details');
      }

      const empResult = await empResponse.json();
      const employeeData = empResult.success ? empResult.data : null;
      const adminTeam = employeeData?.department || '';

      // Submit to server API instead of direct Supabase insert
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/time-corrections/create`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            employee_number: employeeNumber,
            correction_date: formData.date,
            correction_time: formData.time,
            correction_type: formData.type,
            reason: formData.reason,
            admin_team: adminTeam,
            date: formData.date,
            time: formData.time,
            type: formData.type
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit time correction request');
      }

      const result = await response.json();
      console.log('Response:', result);

      if (result.success) {
        toast.success('Correction request submitted successfully! Your team admin will review it.');
        
        // Reset form
        setFormData({ date: '', time: '', type: 'Time In', reason: '' });
        
        // Refresh the list of past requests
        fetchPastRequests();
      } else {
        console.error('Failed to submit request:', result.error);
        toast.error(result.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error(`Failed to submit request: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (request: CorrectionRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setSelectedRequest(null);
    setShowDetailsModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-[15px]">
        <h2 className="text-lg font-semibold text-[#1F2937] mb-6">Submit Correction Request</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#1F2937] mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1F2937] mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Actual Time
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-2">Type</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="Time In"
                  checked={formData.type === 'Time In'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Time In' | 'Time Out' })}
                  className="w-4 h-4 text-[#0B3060]"
                />
                <span className="text-sm text-[#1F2937]">Time In</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="Time Out"
                  checked={formData.type === 'Time Out'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Time In' | 'Time Out' })}
                  className="w-4 h-4 text-[#0B3060]"
                />
                <span className="text-sm text-[#1F2937]">Time Out</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-2">
              Reason / Message to Admin
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] min-h-[120px]"
              placeholder="Please explain why you missed the time in/out..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full md:w-auto px-8 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
          >
            {submitting ? (
              <>
                <LoadingSpinner />
                <span>Submitting...</span>
              </>
            ) : (
              'Send Message to Admin'
            )}
          </button>
        </form>
      </Card>

      <Card className="p-[15px]">
        <h2 className="text-lg font-semibold text-[#1F2937] mb-6">Past Correction Requests</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4 text-sm font-semibold text-[#1F2937]">Request ID</th>
                <th className="text-left p-4 text-sm font-semibold text-[#1F2937]">Date</th>
                <th className="text-left p-4 text-sm font-semibold text-[#1F2937]">Time</th>
                <th className="text-left p-4 text-sm font-semibold text-[#1F2937]">Type</th>
                <th className="text-left p-4 text-sm font-semibold text-[#1F2937]">Status</th>
                <th className="text-left p-4 text-sm font-semibold text-[#1F2937]">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : pastRequests.length > 0 ? (
                pastRequests.map((request) => (
                  <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 text-sm text-[#1F2937] font-medium">{request.id}</td>
                    <td className="p-4 text-sm text-[#1F2937]">
                      {new Date(request.correction_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td className="p-4 text-sm text-[#1F2937]">{request.correction_time}</td>
                    <td className="p-4 text-sm text-[#1F2937]">{request.correction_type}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        request.status === 'approved' 
                          ? 'bg-[#DCFCE7] text-[#16A34A]'
                          : request.status === 'rejected'
                          ? 'bg-[#FEE2E2] text-[#DC2626]'
                          : 'bg-[#FEF9C3] text-[#CA8A04]'
                      }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleViewDetails(request)}
                        className="text-sm text-[#0B3060] hover:text-[#0B3060]/80 font-medium underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    No past requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#1F2937]">Request Details</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <MessageSquare className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Request ID</p>
                    <p className="text-[#1F2937] font-semibold">{selectedRequest.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      selectedRequest.status === 'approved' 
                        ? 'bg-[#DCFCE7] text-[#16A34A]'
                        : selectedRequest.status === 'rejected'
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : 'bg-[#FEF9C3] text-[#CA8A04]'
                    }`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Date</p>
                    <p className="text-[#1F2937]">
                      {new Date(selectedRequest.correction_date).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Time</p>
                    <p className="text-[#1F2937] font-semibold">{selectedRequest.correction_time}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Type</p>
                  <p className="text-[#1F2937]">{selectedRequest.correction_type}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Your Reason</p>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-[#1F2937]">{selectedRequest.reason}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Submitted</p>
                  <p className="text-sm text-gray-600">{selectedRequest.created_at}</p>
                </div>

                {/* Prominent Rejection Reason Display */}
                {selectedRequest.rejection_reason && (
                  <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-700 mb-2">Admin's Rejection Reason:</p>
                        <p className="text-sm text-red-900 leading-relaxed">{selectedRequest.rejection_reason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="mt-6 w-full px-8 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-medium"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}