import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Calendar, AlertCircle, FileText, Clock, RefreshCw, Eye, X, Upload, Paperclip, Download, Trash2, ArrowRight, Info } from 'lucide-react';
import { toast } from 'sonner';
import { leaveRequestApi } from '../../services/apiService';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { useEmployeeSession } from '../hooks/useEmployeeSession';
import { StatusBadge } from '../components/StatusBadge';
import { DatabaseSetupAlert } from '../components/DatabaseSetupAlert';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
  attachmentFilename?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export function EmployeeLeave() {
  const { employee, isLoading } = useEmployeeSession();
  const [leaveBalance, setLeaveBalance] = useState<number>(12);
  const [previousBalance, setPreviousBalance] = useState<number>(12);
  const [balanceJustUpdated, setBalanceJustUpdated] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTableMissingAlert, setShowTableMissingAlert] = useState(false);
  const [showSchemaCacheAlert, setShowSchemaCacheAlert] = useState(false);
  const [showDatabaseSetupAlert, setShowDatabaseSetupAlert] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      toast.success(`File selected: ${file.name}`);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile || !employee) return null;

    setIsUploadingFile(true);
    try {
      // Upload directly to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${employee.employee_number}_${Date.now()}.${fileExt}`;
      const filePath = `leave-attachments/${fileName}`;

      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ File upload failed:', error);
        toast.error(`File upload failed: ${error.message}`);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      console.log('✅ File uploaded:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      toast.error('Failed to upload file');
      return null;
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee) {
      toast.error('Please log in to submit leave requests');
      return;
    }

    // Validate employee data
    if (!employee.employee_number) {
      console.error('❌ Missing employee_number:', employee);
      toast.error('Employee number is missing. Please log out and log in again.');
      return;
    }

    if (!employee.full_name) {
      console.error('❌ Missing full_name:', employee);
      toast.error('Employee name is missing. Please log out and log in again.');
      return;
    }

    // Calculate requested days
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const requestedDays = calculateDuration(formData.startDate, formData.endDate);

    // Validate dates
    if (endDate < startDate) {
      toast.error('End date must be after start date');
      return;
    }

    // Check if requested days exceed available balance
    const paidDays = Math.min(requestedDays, leaveBalance);
    const unpaidDays = Math.max(0, requestedDays - leaveBalance);

    // Warn about unpaid leave days
    if (unpaidDays > 0) {
      const confirmed = window.confirm(
        `⚠️ UNPAID LEAVE WARNING\n\n` +
        `You have ${leaveBalance} paid leave day(s) remaining.\n` +
        `You are requesting ${requestedDays} day(s) total.\n\n` +
        `Breakdown:\n` +
        `✅ Paid Leave: ${paidDays} day(s)\n` +
        `❌ Unpaid Leave (Absent): ${unpaidDays} day(s)\n\n` +
        `The ${unpaidDays} unpaid day(s) will be marked as ABSENT and will not be compensated.\n\n` +
        `Do you want to continue?`
      );
      if (!confirmed) return;
    }

    // Warn if using all remaining paid balance
    if (paidDays === leaveBalance && leaveBalance > 0) {
      const confirmed = window.confirm(
        `You are using all ${paidDays} day(s) of your remaining paid leave balance. ` +
        `After approval, you will have 0 paid days remaining. Continue?`
      );
      if (!confirmed) return;
    }
    
    setIsSubmitting(true);

    // Prepare payload (defined here so it's accessible in catch block)
    let payload: any = null;

    if (isSupabaseConfigured) {
      try {
        // Upload file first if there is one
        let attachmentUrl = null;
        if (selectedFile) {
          toast.info('Uploading attachment...');
          attachmentUrl = await uploadFile();
          if (attachmentUrl) {
            toast.success('Attachment uploaded successfully');
          }
        }

        payload = {
          employee_number: employee.employee_number,
          employee_name: employee.full_name,
          leave_type: formData.leaveType,
          start_date: formData.startDate,
          end_date: formData.endDate,
          reason: formData.reason,
          // Note: attachment_url removed - requires database migration
          // See Database Setup page (/setup) Step 5 to enable file attachments
        };

        // Validate payload before sending
        if (!payload.employee_number || !payload.leave_type || !payload.start_date || !payload.end_date || !payload.reason) {
          console.error('❌ Invalid payload - missing required fields:', payload);
          toast.error('Form data is incomplete. Please fill all required fields.');
          setIsSubmitting(false);
          return;
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📤 SUBMITTING LEAVE REQUEST');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Current Employee:', {
          id: employee.employee_number,
          name: employee.full_name,
          email: employee.email,
          position: employee.position,
          team: employee.team,
          team_id: employee.team_id
        });
        console.log('Leave Request Payload:', payload);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const result = await leaveRequestApi.create(payload);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 LEAVE REQUEST RESPONSE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Full Result Object:', result);
        console.log('Result Type:', typeof result);
        console.log('Success:', result?.success);
        console.log('Data:', result?.data);
        console.log('Error:', result?.error);
        console.log('Details:', result?.details);
        console.log('Hint:', result?.hint);
        console.log('Code:', result?.code);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (result.success) {
          toast.success('Leave request submitted successfully!');
          console.log('✅ Leave request saved with ID:', result.data?.id);
          
          // Reset form
          setFormData({
            leaveType: 'annual',
            startDate: '',
            endDate: '',
            reason: '',
          });
          setSelectedFile(null);
          
          // Reload leave requests and balance
          await loadLeaveRequests();
          await loadLeaveBalance();
        } else {
          const errorMsg = result.error || 'Failed to create leave request';
          console.error('❌ Leave request failed:', errorMsg);
          
          // Check if it's a missing column error (attachment_url)
          if (errorMsg.includes('attachment_url') || errorMsg.includes('column')) {
            toast.error('Database missing attachment_url column! Please run the migration.');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('🚨 CRITICAL: attachment_url column is missing!');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('SOLUTION:');
            console.error('1. Go to Database Setup page in your app');
            console.error('2. Find Step 5: "Enable Admin Leave Requests"');
            console.error('3. Copy the migration SQL');
            console.error('4. Run it in Supabase SQL Editor');
            console.error('5. Go to Settings → API → Click "Reload schema cache"');
            console.error('6. Try submitting the leave request again');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            setShowTableMissingAlert(false);
            setShowSchemaCacheAlert(true); // Reuse the schema cache alert
          } else if (errorMsg.includes('schema cache') || errorMsg.includes('PGRST204')) {
            toast.error('Schema cache error! Please reload it in Supabase.');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('🚨 CRITICAL: Schema cache is stale (PGRST204)');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('SOLUTION:');
            console.error('1. Open Supabase Dashboard');
            console.error('2. Go to Settings → API');
            console.error('3. Click "Reload schema cache" button');
            console.error('4. Wait a few seconds');
            console.error('5. Try submitting the leave request again');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            setShowTableMissingAlert(false); // Don't show table missing alert
            setShowSchemaCacheAlert(true); // Show schema cache alert instead
          } else if (errorMsg.includes('leave_requests') || result.hint?.includes('table')) {
            toast.error('Database table missing! Please create the leave_requests table in Supabase.');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('🚨 CRITICAL: leave_requests table does not exist!');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('Please create this table in Supabase Dashboard:');
            console.error('Table Name: leave_requests');
            if (result.details?.table_schema) {
              console.error('Required Columns:', result.details.table_schema.columns);
            }
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            setShowTableMissingAlert(true);
          } else {
            toast.error(`Failed to submit: ${errorMsg}`);
          }
          
          throw new Error(errorMsg);
        }
      } catch (error: any) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ ERROR SUBMITTING LEAVE REQUEST');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Error Type:', typeof error);
        console.error('Error Object:', error);
        console.error('Error Message:', error?.message);
        console.error('Error Name:', error?.name);
        console.error('Error Stack:', error?.stack);
        console.error('Employee attempting to submit:', employee.employee_number);
        console.error('Payload sent:', payload);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Show detailed error message to user
        const errorMessage = error?.message || 'Unknown error occurred';
        toast.error(`Failed to submit leave request: ${errorMessage}`);
      }
    } else {
      // Mock mode
      console.log('📝 Mock mode: Leave request not saved to database');
      toast.success('Leave request submitted successfully! (mock mode)');
      setFormData({
        leaveType: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
      });
      setSelectedFile(null);
    }

    setIsSubmitting(false);
  };

  // Load leave requests on mount and after successful submission
  useEffect(() => {
    loadLeaveRequests();
    loadLeaveBalance();
    
    // Auto-refresh balance every 30 seconds to detect approved leave requests
    const balanceRefreshInterval = setInterval(() => {
      loadLeaveBalance();
    }, 30000); // 30 seconds
    
    return () => clearInterval(balanceRefreshInterval);
  }, [employee]);

  // Load employee's leave balance
  const loadLeaveBalance = async () => {
    if (!employee || !isSupabaseConfigured) return;
    
    setIsRefreshingBalance(true);
    
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💰 FETCHING LEAVE BALANCE VIA API');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Employee:', employee.employee_number, '-', employee.full_name);
      
      // Use the API to get leave balance
      const result = await leaveRequestApi.getBalance(employee.employee_number);
      
      if (!result.success) {
        console.error('❌ Failed to fetch leave balance:', result.error);
        // Fallback to stored balance
        setLeaveBalance(employee.leave_balance || 12);
        return;
      }

      const currentBalance = result.balance;
      
      console.log('📊 Balance Details:');
      console.log('   - Source:', result.source);
      console.log('   - Current Balance:', currentBalance);
      if (result.paid_leave_days_used !== undefined) {
        console.log('   - Days Used:', result.paid_leave_days_used);
        console.log('   - Annual Allowance: 12 days');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Check if balance changed and trigger visual update
      if (currentBalance !== leaveBalance) {
        console.log('🔄 Balance changed from', leaveBalance, 'to', currentBalance);
        setPreviousBalance(leaveBalance);
        setBalanceJustUpdated(true);
        
        // Show toast notification if balance decreased (leave approved)
        if (currentBalance < leaveBalance) {
          const daysUsed = leaveBalance - currentBalance;
          toast.success(`Leave approved! ${daysUsed} day(s) deducted. New balance: ${currentBalance} day(s)`, {
            duration: 5000,
          });
        }
        
        // Reset the highlight after 3 seconds
        setTimeout(() => setBalanceJustUpdated(false), 3000);
      }
      
      setLeaveBalance(currentBalance);
      console.log('✅ Leave balance set to:', currentBalance);
      
      // Update session storage with new balance
      if (employee) {
        const updatedEmployee = { ...employee, leave_balance: currentBalance };
        localStorage.setItem('employeeSession', JSON.stringify(updatedEmployee));
        console.log('💾 Updated session storage with new balance:', currentBalance);
      }
      
    } catch (error) {
      console.error('❌ Error calculating leave balance:', error);
      // Fallback to session or default
      if (employee.leave_balance !== undefined) {
        setLeaveBalance(employee.leave_balance);
      } else {
        setLeaveBalance(12);
      }
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  // Load leave requests for the current employee
  const loadLeaveRequests = async () => {
    if (!employee || !isSupabaseConfigured) return;
    
    setIsLoadingRequests(true);
    try {
      console.log('📥 Loading leave requests for employee:', employee.employee_number);
      const result = await leaveRequestApi.getAll();
      
      if (result.success && result.data) {
        // Filter to show only this employee's requests
        const myRequests = result.data
          .filter((lr: any) => lr.employee_number === employee.employee_number)
          .map((lr: any) => ({
            id: lr.id,
            employeeId: lr.employee_number,
            employeeName: lr.employees?.full_name || employee.full_name,
            leaveType: lr.leave_type,
            startDate: lr.start_date,
            endDate: lr.end_date,
            reason: lr.reason,
            attachmentUrl: lr.attachment_url,
            status: lr.status,
            submittedDate: lr.created_at,
          }))
          .sort((a: any, b: any) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());
        
        setLeaveRequests(myRequests);
        console.log(`✅ Loaded ${myRequests.length} leave request(s)`);
      }
    } catch (error) {
      console.error('❌ Error loading leave requests:', error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleViewDetails = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const closeModal = () => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
  };

  // Cancel/Delete leave request
  const handleCancelRequest = async () => {
    if (!selectedRequest || !isSupabaseConfigured) return;

    // Only allow cancellation for pending requests
    if (selectedRequest.status !== 'pending') {
      toast.error('Only pending leave requests can be cancelled');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel this leave request?\n\n` +
      `Leave Type: ${selectedRequest.leaveType}\n` +
      `Duration: ${new Date(selectedRequest.startDate).toLocaleDateString()} - ${new Date(selectedRequest.endDate).toLocaleDateString()}\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsCancelling(true);
    try {
      console.log('🗑️ Cancelling leave request:', selectedRequest.id);
      const result = await leaveRequestApi.delete(selectedRequest.id);

      if (result.success) {
        toast.success('Leave request cancelled successfully');
        console.log('✅ Leave request cancelled');
        
        // Close modal and reload the list
        closeModal();
        await loadLeaveRequests();
      } else {
        toast.error(result.error || 'Failed to cancel leave request');
        console.error('❌ Failed to cancel leave request:', result.error);
      }
    } catch (error) {
      console.error('❌ Error cancelling leave request:', error);
      toast.error('Failed to cancel leave request. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Calculate leave duration in days
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
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
      {/* Database Setup Alert - Show if paid_leave_balance column is missing */}
      {showDatabaseSetupAlert && (
        <DatabaseSetupAlert onClose={() => setShowDatabaseSetupAlert(false)} />
      )}

      {/* Leave Balance Card - Enhanced Design */}
      <div className="mb-8">
        <Card>
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0B3060] via-[#0d3d7a] to-[#0B3060] p-8 rounded-lg shadow-xl">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F7B34C] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

            <div className="relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Main Balance Display */}
                <div className="lg:col-span-2">
                  <div className="flex items-start gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-[#F7B34C] to-[#d99a3a] rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                        <Calendar className="w-10 h-10 text-white" />
                      </div>
                      {balanceJustUpdated && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                    </div>

                    <div className={`flex-1 transition-all duration-500 ${balanceJustUpdated ? 'scale-105' : 'scale-100'}`}>
                      <p className="text-sm font-semibold text-[#F7B34C] uppercase tracking-wider mb-2">Your Paid Leave Balance</p>
                      <div className="flex items-baseline gap-3 mb-3">
                        <p className={`text-5xl font-bold text-white transition-all duration-500 ${balanceJustUpdated ? 'text-[#F7B34C] drop-shadow-[0_0_20px_rgba(247,179,76,0.5)]' : ''}`}>
                          {leaveBalance}
                        </p>
                        <div>
                          <p className="text-xl font-semibold text-white/90">/ 12</p>
                          <p className="text-xs text-white/70">days remaining</p>
                        </div>
                        {balanceJustUpdated && previousBalance !== leaveBalance && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-[#F7B34C] backdrop-blur-sm animate-pulse border border-[#F7B34C]/30">
                            was {previousBalance}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="h-3 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              leaveBalance > 8 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                              leaveBalance > 4 ? 'bg-gradient-to-r from-[#F7B34C] to-yellow-500' :
                              leaveBalance > 0 ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                              'bg-gradient-to-r from-red-500 to-red-600'
                            }`}
                            style={{ width: `${(leaveBalance / 12) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-white/80">
                            {leaveBalance > 0 ? `${Math.round((leaveBalance / 12) * 100)}% available` : 'Balance depleted'}
                          </p>
                          <p className="text-xs text-white/80 font-semibold">
                            {12 - leaveBalance} days used
                          </p>
                        </div>
                      </div>

                      {/* Status Message */}
                      {leaveBalance > 8 && (
                        <div className="flex items-center gap-2 text-xs text-green-300 font-medium">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          Excellent! You have plenty of leave days available
                        </div>
                      )}
                      {leaveBalance <= 8 && leaveBalance > 4 && (
                        <div className="flex items-center gap-2 text-xs text-yellow-300 font-medium">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                          Good balance - plan your leaves wisely
                        </div>
                      )}
                      {leaveBalance <= 4 && leaveBalance > 0 && (
                        <div className="flex items-center gap-2 text-xs text-orange-300 font-medium">
                          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                          Running low - only {leaveBalance} day(s) remaining
                        </div>
                      )}
                      {leaveBalance === 0 && (
                        <div className="flex items-center gap-2 text-xs text-red-300 font-medium">
                          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                          No paid leave remaining - requests will be unpaid
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="lg:col-span-1 space-y-4">
                  <button
                    onClick={loadLeaveBalance}
                    disabled={isRefreshingBalance}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl"
                    title="Refresh leave balance"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
                    {isRefreshingBalance ? 'Refreshing...' : 'Refresh Balance'}
                  </button>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">Annual Allowance</p>
                      <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-[#F7B34C]" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">12 days</p>
                    <p className="text-xs text-white/60">Per calendar year</p>
                  </div>

                  {/* Debug Buttons - Collapsible */}
                  <details className="group">
                    <summary className="cursor-pointer text-xs text-white/50 hover:text-white/70 transition-colors list-none flex items-center gap-1">
                      <span className="group-open:rotate-90 transition-transform">▶</span>
                      Debug Tools
                    </summary>
                    <div className="mt-2 space-y-2">
                      <button
                        onClick={async () => {
                          if (!employee) return;
                          try {
                            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                            console.log('🔍 DEBUG: FETCHING BALANCE VIA API');
                            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                            const result = await leaveRequestApi.getBalance(employee.employee_number);
                            console.log('API Response:', result);
                            if (result.success) {
                              console.log('✅ Balance:', result.balance);
                              console.log('Source:', result.source);
                              if (result.paid_leave_days_used !== undefined) {
                                console.log('Days Used:', result.paid_leave_days_used);
                              }
                              toast.info(`Balance: ${result.balance} days (${result.source}) - Check console for details`);
                            } else {
                              console.error('❌ Error:', result.error);
                              toast.error(`Failed to fetch balance: ${result.error}`);
                            }
                            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                          } catch (err) {
                            console.error('❌ API call failed:', err);
                            toast.error('Failed to call API');
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                      >
                        🔍 Debug API
                      </button>
                      <button
                        onClick={async () => {
                          if (!employee) return;
                          try {
                            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                            console.log('🧪 CALLING BACKEND DEBUG ENDPOINT');
                            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                            const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-df988758/debug/employee/${employee.employee_number}`, {
                              headers: {
                                'Authorization': `Bearer ${publicAnonKey}`
                              }
                            });
                            const result = await response.json();
                            console.log('📥 Backend Response:', result);
                            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                            if (result.success) {
                              toast.success(`Backend found ${result.leave_info?.paid_leave_records_count || 0} PAID_LEAVE records!`);
                            } else {
                              toast.error(`Backend error: ${result.error}`);
                            }
                          } catch (err) {
                            console.error('❌ Backend call failed:', err);
                            toast.error('Failed to call backend debug endpoint');
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                      >
                        🧪 Backend Test
                      </button>
                    </div>
                  </details>
                </div>
              </div>

              {/* Alert Messages */}
              {leaveBalance <= 3 && leaveBalance > 0 && (
                <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-amber-300" />
                    </div>
                    <p className="text-sm text-amber-200 font-medium">
                      <strong className="text-amber-100">Low Balance Warning:</strong> You only have {leaveBalance} day(s) of paid leave remaining. Plan your leaves carefully.
                    </p>
                  </div>
                </div>
              )}
              {leaveBalance === 0 && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-red-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-red-200 font-medium mb-2">
                        <strong className="text-red-100">Balance Depleted:</strong> You have used all 12 days of your annual paid leave allowance.
                      </p>
                      <p className="text-xs text-red-300">
                        💡 You can still submit leave requests, but additional days will be marked as ABSENT (unpaid) and will not be compensated.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Balance Calculation Info */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <details className="group">
                  <summary className="text-xs text-white/70 font-semibold cursor-pointer hover:text-white/90 flex items-center gap-2 transition-colors">
                    <span>ℹ️ How is this balance calculated?</span>
                    <span className="text-[#F7B34C] group-open:rotate-90 transition-transform">▶</span>
                  </summary>
                  <div className="mt-3 text-xs text-white/80 bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 backdrop-blur-sm">
                    <p>
                      <strong className="text-white">Your balance is calculated in real-time</strong> based on approved paid leave days from your attendance schedule:
                    </p>
                    <ul className="list-disc ml-5 space-y-1 text-white/70">
                      <li>Annual Allowance: <strong className="text-white">12 paid days per year</strong></li>
                      <li>Balance = 12 days - (Approved PAID LEAVE days used)</li>
                      <li>Syncs automatically from your attendance records</li>
                      <li>Updates instantly when admin approves leave requests</li>
                    </ul>
                    <div className="bg-[#F7B34C]/10 border border-[#F7B34C]/30 rounded-lg p-3 mt-3">
                      <p className="font-semibold text-[#F7B34C]">📋 Important Note:</p>
                      <p className="text-white/80 mt-1">After using all 12 paid days, you can still request leave - but additional days will be marked as <span className="font-bold text-red-400">ABSENT</span> (unpaid) and won't be compensated.</p>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Table Missing Alert */}
      {showTableMissingAlert && (
        <div className="mb-6 bg-red-50 border-2 border-red-400 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">
                🚨 Database Table Missing!
              </h3>
              <p className="text-sm text-red-800 mb-4">
                The <code className="bg-red-200 px-2 py-1 rounded">leave_requests</code> table doesn't exist in your Supabase database. 
                Leave requests cannot be saved until you create this table.
              </p>
              
              <div className="bg-white border border-red-200 rounded p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Quick Fix:</p>
                <ol className="text-sm text-gray-700 space-y-2 ml-4 list-decimal">
                  <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">Supabase Dashboard</a></li>
                  <li>Go to <strong>SQL Editor</strong></li>
                  <li>Click <strong>New Query</strong></li>
                  <li>Copy the SQL from your browser console (look for the CREATE TABLE command)</li>
                  <li>Click <strong>Run</strong></li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
                <p className="text-xs text-yellow-800">
                  <strong>💡 Tip:</strong> Check the browser console for the complete SQL CREATE TABLE statement. 
                  See <code className="bg-yellow-200 px-1 rounded">LEAVE_REQUESTS_TABLE_SETUP.md</code> for detailed instructions.
                </p>
              </div>

              <button
                onClick={() => setShowTableMissingAlert(false)}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                I understand, dismiss this alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schema Cache Alert */}
      {showSchemaCacheAlert && (
        <div className="mb-6 bg-red-50 border-2 border-red-400 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">
                🚨 Schema Cache Error!
              </h3>
              <p className="text-sm text-red-800 mb-4">
                The schema cache is stale, preventing the leave request from being saved. 
                Please reload the schema cache in Supabase.
              </p>
              
              <div className="bg-white border border-red-200 rounded p-4 mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">Quick Fix:</p>
                <ol className="text-sm text-gray-700 space-y-2 ml-4 list-decimal">
                  <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">Supabase Dashboard</a></li>
                  <li>Go to <strong>Settings → API</strong></li>
                  <li>Click <strong>Reload schema cache</strong> button</li>
                  <li>Wait a few seconds</li>
                  <li>Try submitting the leave request again</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
                <p className="text-xs text-yellow-800">
                  <strong>💡 Tip:</strong> If the problem persists, ensure your database schema is up-to-date and that the <code className="bg-yellow-200 px-1 rounded">leave_requests</code> table exists.
                </p>
              </div>

              <button
                onClick={() => setShowSchemaCacheAlert(false)}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                I understand, dismiss this alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Form - Enhanced Modern Design */}
      <div className="flex justify-center">
        <div className="w-full max-w-5xl">
          {/* Form Card */}
          <Card>
            <div className="bg-gradient-to-br from-gray-50 to-white p-8 lg:p-10">
              {/* Form Header */}
              <div className="mb-8 pb-6 border-b-2 border-gray-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0B3060] to-[#0d3d7a] rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#0B3060]">Request Leave</h2>
                    <p className="text-sm text-gray-600 mt-1">Fill out the form below to submit your leave request</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Leave Type Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <label className="text-lg font-bold text-[#1F2937]">
                        Leave Type
                      </label>
                      <p className="text-xs text-gray-500">Select the type of leave you're requesting</p>
                    </div>
                  </div>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    className="w-full h-14 px-5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-[#0B3060] bg-white hover:border-[#0B3060] transition-all text-[#1F2937] font-semibold text-base shadow-sm hover:shadow-md"
                    required
                  >
                    <option value="annual">📅 Annual Leave</option>
                    <option value="sick">🏥 Sick Leave</option>
                    <option value="personal">👤 Personal Leave</option>
                    <option value="emergency">🚨 Emergency Leave</option>
                  </select>
                </div>

                {/* Date Range Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <label className="text-lg font-bold text-[#1F2937]">
                        Leave Duration
                      </label>
                      <p className="text-xs text-gray-500">Select your start and end dates</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="relative group">
                      <label className="block text-sm font-bold text-[#1F2937] mb-2 flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center transition-all group-hover:bg-purple-200">
                          <span className="text-purple-600 text-xs font-bold">1</span>
                        </div>
                        Start Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.startDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            const newStartDate = e.target.value;
                            const updates: any = { startDate: newStartDate };

                            // If end date is before new start date, reset end date
                            if (formData.endDate && newStartDate > formData.endDate) {
                              updates.endDate = newStartDate;
                            }

                            setFormData({ ...formData, ...updates });
                          }}
                          className="w-full h-14 px-5 pr-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:border-purple-400 transition-all shadow-sm hover:shadow-md text-gray-800 font-medium cursor-pointer"
                          style={{
                            colorScheme: 'light',
                          }}
                          required
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Calendar className="w-5 h-5 text-purple-400" />
                        </div>
                      </div>
                      {formData.startDate && (
                        <p className="text-xs text-purple-600 mt-2 font-medium flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                          {new Date(formData.startDate + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                    <div className="relative group">
                      <label className="block text-sm font-bold text-[#1F2937] mb-2 flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center transition-all group-hover:bg-purple-200">
                          <span className="text-purple-600 text-xs font-bold">2</span>
                        </div>
                        End Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.endDate}
                          min={formData.startDate || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          disabled={!formData.startDate}
                          className="w-full h-14 px-5 pr-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white hover:border-purple-400 transition-all shadow-sm hover:shadow-md text-gray-800 font-medium cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:hover:border-gray-300"
                          style={{
                            colorScheme: 'light',
                          }}
                          required
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Calendar className="w-5 h-5 text-purple-400" />
                        </div>
                      </div>
                      {!formData.startDate && (
                        <p className="text-xs text-gray-500 mt-2 italic flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Select start date first
                        </p>
                      )}
                      {formData.endDate && (
                        <p className="text-xs text-purple-600 mt-2 font-medium flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                          {new Date(formData.endDate + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Date validation message */}
                  {formData.startDate && formData.endDate && formData.startDate > formData.endDate && (
                    <div className="mt-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl p-4 flex items-center gap-3 shadow-sm">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-800 font-medium">
                        End date must be on or after the start date
                      </p>
                    </div>
                  )}
                  {/* Duration preview */}
                  {formData.startDate && formData.endDate && (() => {
                    const requestedDays = calculateDuration(formData.startDate, formData.endDate);
                    const paidDays = Math.min(requestedDays, leaveBalance);
                    const unpaidDays = Math.max(0, requestedDays - leaveBalance);

                    return (
                      <div className="mt-5 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-blue-600" />
                              </div>
                              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Requested</p>
                            </div>
                            <p className="text-3xl font-bold text-blue-600">
                              {requestedDays}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">day(s) total</p>
                          </div>

                          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Clock className="w-4 h-4 text-purple-600" />
                              </div>
                              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">After Approval</p>
                            </div>
                            <p className="text-3xl font-bold text-purple-600">
                              {Math.max(0, leaveBalance - requestedDays)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">day(s) remaining</p>
                          </div>

                          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-green-600 text-lg">%</span>
                              </div>
                              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Usage</p>
                            </div>
                            <p className="text-3xl font-bold text-green-600">
                              {Math.round(((12 - leaveBalance + requestedDays) / 12) * 100)}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">of annual leave</p>
                          </div>
                        </div>

                        {/* Show breakdown if there are unpaid days */}
                        {unpaidDays > 0 && (
                          <div className="bg-white border-2 border-red-300 rounded-xl p-5 shadow-md">
                            <div className="flex items-start gap-3 mb-4">
                              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-red-900 mb-1">Leave Breakdown</p>
                                <p className="text-xs text-gray-600">Your request includes both paid and unpaid leave days</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                                <div>
                                  <p className="text-2xl font-bold text-green-700">{paidDays}</p>
                                  <p className="text-xs text-gray-600 font-medium">Paid Leave day(s)</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0"></div>
                                <div>
                                  <p className="text-2xl font-bold text-red-700">{unpaidDays}</p>
                                  <p className="text-xs text-gray-600 font-medium">Unpaid (Absent) day(s)</p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-red-50 border border-red-300 rounded-lg p-3">
                              <p className="text-xs text-red-800 font-bold flex items-center gap-2">
                                <span className="text-base">⚠️</span>
                                Warning: {unpaidDays} day(s) will be marked as ABSENT (unpaid)
                              </p>
                              <p className="text-xs text-red-700 mt-1">
                                You only have {leaveBalance} paid day(s) remaining in your annual allowance.
                              </p>
                            </div>
                          </div>
                        )}

                        {unpaidDays === 0 && paidDays > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xl font-bold">✓</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-green-900">All days will be paid leave</p>
                              <p className="text-xs text-green-700 mt-1">You have sufficient balance to cover this request</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

              {/* Reason Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <label className="text-lg font-bold text-[#1F2937]">
                        Reason for Leave
                      </label>
                      <p className="text-xs text-gray-500">Provide a detailed explanation</p>
                    </div>
                  </div>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-[#0B3060] resize-none bg-white hover:border-[#0B3060] transition-all shadow-sm hover:shadow-md"
                    rows={5}
                    placeholder="Please provide a detailed reason for your leave request. Include any relevant information that will help your manager approve this request..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    A clear reason helps expedite the approval process
                  </p>
                </div>

              {/* File Upload Section */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                    <Paperclip className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <label className="text-lg font-bold text-[#1F2937]">
                      Supporting Document
                    </label>
                    <p className="text-xs text-gray-500">Attach medical certificate or other documents (optional)</p>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-[#0B3060] hover:bg-blue-50/30 transition-all bg-white shadow-sm hover:shadow-md">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {selectedFile ? (
                      <div className="flex items-center gap-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl px-6 py-4 shadow-md">
                        <div className="bg-green-500 rounded-xl p-3 shadow-lg">
                          <Paperclip className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-bold text-[#1F2937] text-base">{selectedFile.name}</p>
                          <p className="text-xs text-gray-600 mt-1">{(selectedFile.size / 1024).toFixed(2)} KB • Click to change</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedFile(null);
                            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                          }}
                          className="p-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mb-4 shadow-md">
                          <Upload className="w-8 h-8 text-[#0B3060]" />
                        </div>
                        <p className="font-bold text-[#1F2937] text-base mb-1">
                          Click to upload supporting document
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, DOC, DOCX, or Image (Max 10MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t-2 border-gray-200">
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingFile}
                  className="w-full h-16 bg-gradient-to-r from-[#0B3060] to-[#0d3d7a] hover:from-[#0d3d7a] hover:to-[#0B3060] text-white font-bold text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:scale-[1.02] transform flex items-center justify-center gap-3"
                >
                  {isSubmitting || isUploadingFile ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      {isUploadingFile ? 'Uploading file...' : 'Submitting request...'}
                    </>
                  ) : (
                    <>
                      <Calendar className="w-5 h-5" />
                      Submit Leave Request
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 text-center mt-3 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  Your request will be reviewed by your team admin
                </p>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>

      {/* Leave Requests History */}
      {isSupabaseConfigured && (
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-[#1F2937] mb-1">My Leave History</h2>
              <p className="text-sm text-gray-500">Track and manage all your leave requests</p>
            </div>
            <button
              onClick={loadLeaveRequests}
              disabled={isLoadingRequests}
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#0B3060] text-[#0B3060] font-semibold rounded-lg hover:bg-[#0B3060] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              title="Sync leave requests data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingRequests ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <Card>
            {isLoadingRequests ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="w-16 h-16 border-4 border-[#0B3060] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[#6B7280] font-medium">Loading your leave requests...</p>
              </div>
            ) : leaveRequests.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 p-4">
                {leaveRequests.map((request) => {
                  const duration = calculateDuration(request.startDate, request.endDate);

                  const statusConfig = {
                    pending: {
                      bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
                      border: 'border-yellow-300',
                      badge: 'bg-yellow-500',
                      text: 'text-yellow-700',
                      icon: '⏳'
                    },
                    approved: {
                      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
                      border: 'border-green-300',
                      badge: 'bg-green-500',
                      text: 'text-green-700',
                      icon: '✓'
                    },
                    rejected: {
                      bg: 'bg-gradient-to-br from-red-50 to-pink-50',
                      border: 'border-red-300',
                      badge: 'bg-red-500',
                      text: 'text-red-700',
                      icon: '✗'
                    }
                  };

                  const config = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;

                  return (
                    <div
                      key={request.id}
                      className={`${config.bg} border-2 ${config.border} rounded-2xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden group`}
                      onClick={() => handleViewDetails(request)}
                    >
                      {/* Decorative gradient overlay */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
                      
                      {/* Header Section */}
                      <div className="relative z-10 flex items-start justify-between mb-5">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Leave Type Icon */}
                          <div className={`w-14 h-14 ${config.badge} rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform`}>
                            <span className="text-white text-2xl font-bold">{config.icon}</span>
                          </div>
                          
                          {/* Leave Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-[#1F2937] capitalize">
                                {request.leaveType}
                              </h3>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white ${config.badge} shadow-md`}>
                                {request.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>Submitted {new Date(request.submittedDate || request.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                            </div>
                          </div>
                        </div>

                        {/* Duration Badge */}
                        <div className="bg-white/80 backdrop-blur-sm border-2 border-white rounded-xl px-4 py-3 shadow-md">
                          <p className="text-xs text-gray-600 font-semibold uppercase">Duration</p>
                          <p className="text-2xl font-bold text-[#0B3060]">{duration}</p>
                          <p className="text-xs text-gray-600">day{duration > 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      {/* Date Range Section */}
                      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                              <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Start Date</p>
                              <p className="font-bold text-[#1F2937]">
                                {new Date(request.startDate).toLocaleDateString('en-US', { 
                                  weekday: 'short',
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
                              <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 font-semibold uppercase mb-1">End Date</p>
                              <p className="font-bold text-[#1F2937]">
                                {new Date(request.endDate).toLocaleDateString('en-US', { 
                                  weekday: 'short',
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reason Section */}
                      <div className="relative z-10 mb-5">
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-[#0B3060]" />
                            <p className="text-xs font-bold text-gray-700 uppercase">Reason</p>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {request.reason}
                          </p>
                        </div>
                      </div>

                      {/* Attachment Section */}
                      {request.attachmentUrl && (
                        <div className="relative z-10 mb-5">
                          <a
                            href={request.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-4 hover:border-indigo-400 hover:shadow-md transition-all group/link"
                          >
                            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center shadow-md group-hover/link:scale-110 transition-transform">
                              <Paperclip className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-indigo-600 font-semibold uppercase mb-1">Attachment</p>
                              <p className="text-sm font-bold text-indigo-900 hover:underline">
                                {request.attachmentFilename || 'View Document'}
                              </p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-indigo-600 group-hover/link:translate-x-1 transition-transform" />
                          </a>
                        </div>
                      )}

                      {/* Review Info - Approved/Rejected */}
                      {request.status !== 'pending' && request.reviewedAt && (
                        <div className="relative z-10 bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-gray-700 uppercase mb-1">
                                {request.status === 'approved' ? 'Approved By' : 'Rejected By'}
                              </p>
                              <p className="text-sm font-semibold text-[#1F2937]">
                                {request.reviewedBy || 'Admin'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Review Date</p>
                              <p className="text-sm font-bold text-[#1F2937]">
                                {new Date(request.reviewedAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions Section - Only for Pending */}
                      {request.status === 'pending' && (
                        <div className="relative z-10 mt-5 pt-5 border-t-2 border-white/50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(request);
                            }}
                            className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-5 h-5" />
                            Cancel Request
                          </button>
                        </div>
                      )}

                      {/* Click Hint */}
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                          Click for details
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6 shadow-lg">
                  <Calendar className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-[#1F2937] mb-3">No Leave Requests Yet</h3>
                <p className="text-gray-500 text-center max-w-md mb-6">
                  You haven't submitted any leave requests. Fill out the form above to submit your first leave request.
                </p>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="w-4 h-4 text-[#0B3060]" />
                  <p className="text-sm text-[#0B3060] font-medium">
                    All your requests will appear here once submitted
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0B3060] to-[#0B3060]/90 px-6 py-5 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#F7B34C]" />
                <h2 className="text-xl font-bold text-white">My Leave Request</h2>
              </div>
              <button
                onClick={closeModal}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Leave Details */}
              <div>
                <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Leave Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-medium text-blue-900 uppercase">Leave Type</p>
                    </div>
                    <p className="text-sm font-semibold text-blue-900 capitalize">{selectedRequest.leaveType}</p>
                  </div>

                  <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      <p className="text-xs font-medium text-green-900 uppercase">Duration</p>
                    </div>
                    <p className="text-sm font-semibold text-green-900">
                      {calculateDuration(selectedRequest.startDate, selectedRequest.endDate)} day(s)
                    </p>
                  </div>

                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <p className="text-xs font-medium text-purple-900 uppercase">Start Date</p>
                    </div>
                    <p className="text-sm font-semibold text-purple-900">
                      {new Date(selectedRequest.startDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-orange-600" />
                      <p className="text-xs font-medium text-orange-900 uppercase">End Date</p>
                    </div>
                    <p className="text-sm font-semibold text-orange-900">
                      {new Date(selectedRequest.endDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Reason for Leave</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-[#1F2937] leading-relaxed">{selectedRequest.reason}</p>
                </div>
              </div>

              {/* Attachment */}
              {selectedRequest.attachmentUrl && (
                <div>
                  <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Supporting Document</h3>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 rounded-lg p-3">
                          <Paperclip className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Attachment Uploaded</p>
                          <p className="text-xs text-blue-700">Click to view or download</p>
                        </div>
                      </div>
                      <a
                        href={selectedRequest.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        View
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Status & Submission Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Current Status</h3>
                  <StatusBadge status={selectedRequest.status} size="lg" />
                  {selectedRequest.status === 'pending' && (
                    <p className="text-xs text-[#6B7280] mt-2">
                      ⏳ Your request is awaiting review from your team leader
                    </p>
                  )}
                  {selectedRequest.status === 'approved' && (
                    <p className="text-xs text-green-700 mt-2">
                      ✅ Your leave request has been approved
                    </p>
                  )}
                  {selectedRequest.status === 'rejected' && (
                    <p className="text-xs text-red-700 mt-2">
                      ❌ Your leave request was not approved
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Submitted On</h3>
                  <p className="text-sm text-[#1F2937]">
                    {new Date(selectedRequest.submittedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between gap-3 rounded-b-xl border-t">
              {/* Cancel button - Only shown for pending requests */}
              {selectedRequest.status === 'pending' && (
                <button
                  onClick={handleCancelRequest}
                  disabled={isCancelling}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {isCancelling ? 'Cancelling...' : 'Cancel Request'}
                </button>
              )}
              
              <div className="flex-1"></div>
              
              <button 
                onClick={closeModal}
                className="px-4 py-2 bg-[#0B3060] hover:bg-[#0B3060]/90 text-white rounded-lg text-sm font-medium transition-colors"
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