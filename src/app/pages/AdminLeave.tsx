import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Calendar, AlertCircle, FileText, Clock, RefreshCw, Eye, X, Upload, Paperclip, Download, Trash2, ArrowRight, Info, Send, Database } from 'lucide-react';
import { toast } from 'sonner';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { StatusBadge } from '../components/StatusBadge';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { leaveRequestApi } from '../../services/apiService';
import { AdminLeaveDbSetupAlert } from '../components/AdminLeaveDbSetupAlert';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

interface LeaveRequest {
  id: string;
  employeeId?: string;
  adminId?: string;
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

export function AdminLeave() {
  const [leaveBalance, setLeaveBalance] = useState<number>(12);
  const [previousBalance, setPreviousBalance] = useState<number>(12);
  const [balanceJustUpdated, setBalanceJustUpdated] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'sick',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showDatabaseSetupAlert, setShowDatabaseSetupAlert] = useState(false);
  const [isDatabaseConfigured, setIsDatabaseConfigured] = useState<boolean | null>(null);
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(true);
  const [backendDeployed, setBackendDeployed] = useState<boolean | null>(null);
  const [migrationRequired, setMigrationRequired] = useState<boolean>(false);

  // Get admin data from localStorage
  const getAdminData = () => {
    try {
      const profileData = localStorage.getItem('mnemosyne_admin_profile');
      const sessionData = localStorage.getItem('adminSession');
      
      if (profileData) {
        return JSON.parse(profileData);
      } else if (sessionData) {
        return JSON.parse(sessionData);
      }
      return null;
    } catch (error) {
      console.error('Error loading admin data:', error);
      return null;
    }
  };

  const adminData = getAdminData();
  const adminNumber = adminData?.admin_number || adminData?.adminNumber;
  const adminName = adminData?.full_name || adminData?.username || 'Admin';
  const department = adminData?.department || 'Department';

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
    if (!selectedFile || !adminNumber) return null;

    setIsUploadingFile(true);
    try {
      // Upload directly to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${adminNumber}_${Date.now()}.${fileExt}`;
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
    
    if (!adminNumber || !adminName) {
      toast.error('Please log in to submit leave requests');
      return;
    }

    // CRITICAL: Check if database is configured before allowing submission
    if (isDatabaseConfigured === false) {
      toast.error('Database setup required! Please run the SQL migration first.', {
        duration: 8000,
        action: {
          label: 'View Setup Guide',
          onClick: () => setShowDatabaseSetupAlert(true)
        }
      });
      setShowDatabaseSetupAlert(true);
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
          admin_number: adminNumber,
          full_name: adminName,
          leave_type: formData.leaveType,
          start_date: formData.startDate,
          end_date: formData.endDate,
          reason: formData.reason,
          attachment_url: attachmentUrl,
          attachment_filename: selectedFile?.name || null
        };

        // Validate payload before sending
        if (!payload.admin_number || !payload.leave_type || !payload.start_date || !payload.end_date || !payload.reason) {
          console.error('❌ Invalid payload - missing required fields:', payload);
          toast.error('Form data is incomplete. Please fill all required fields.');
          setIsSubmitting(false);
          return;
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📤 SUBMITTING ADMIN LEAVE REQUEST');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Admin:', { admin_number: adminNumber, name: adminName, department });
        console.log('Leave Request Payload:', payload);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const response = await fetch(`${API_BASE_URL}/leave-requests/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 LEAVE REQUEST RESPONSE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Response Status:', response.status, response.statusText);
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
          toast.success('Leave request submitted successfully! Super Admin will review it.');
          console.log('✅ Leave request saved with ID:', result.data?.id);
          
          // Reset form
          setFormData({
            leaveType: 'sick',
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
          
          // Check for specific error types
          if (errorMsg.includes('employee_number') && errorMsg.includes('not-null')) {
            console.error('🔴 DATABASE SETUP REQUIRED: employee_number column must allow NULL values for admin leave requests');
            toast.error('Database setup required! Click to view instructions.', {
              duration: 10000,
              action: {
                label: 'Setup Guide',
                onClick: () => setShowDatabaseSetupAlert(true)
              }
            });
            setShowDatabaseSetupAlert(true);
          } else if (errorMsg.includes('attachment_url') || errorMsg.includes('column')) {
            toast.error('Database missing attachment_url column! Please run the migration (Database Setup - Step 5).');
          } else if (errorMsg.includes('admin_number') && !errorMsg.includes('not-null')) {
            toast.error('Database missing admin_number column! Please run the migration (Database Setup - Step 5).');
          } else {
            toast.error(`Failed to submit: ${errorMsg}`);
          }
          
          throw new Error(errorMsg);
        }
      } catch (error: any) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ ERROR SUBMITTING ADMIN LEAVE REQUEST');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Error Type:', typeof error);
        console.error('Error Object:', error);
        console.error('Error Message:', error?.message);
        console.error('Error Name:', error?.name);
        console.error('Error Stack:', error?.stack);
        console.error('Admin attempting to submit:', adminNumber);
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
        leaveType: 'sick',
        startDate: '',
        endDate: '',
        reason: '',
      });
      setSelectedFile(null);
    }

    setIsSubmitting(false);
  };

  // Load leave requests on mount
  useEffect(() => {
    if (adminNumber) {
      loadLeaveRequests();
      loadLeaveBalance();
      checkDatabaseConfiguration();

      // Auto-refresh balance and requests every 10 seconds (reduced from 30s for better responsiveness)
      const refreshInterval = setInterval(() => {
        loadLeaveBalance();
        loadLeaveRequests();
      }, 10000);

      return () => clearInterval(refreshInterval);
    }
  }, [adminNumber]);

  // Watch for approved/rejected leave requests and refresh balance
  useEffect(() => {
    if (!adminNumber || leaveRequests.length === 0) return;

    // Check if any requests were recently approved or rejected
    const hasApprovedOrRejected = leaveRequests.some(
      req => req.status === 'approved' || req.status === 'rejected'
    );

    if (hasApprovedOrRejected) {
      console.log('🔄 Detected approved/rejected leave request(s), refreshing balance...');
      loadLeaveBalance();
    }
  }, [leaveRequests]);

  // Check if database is properly configured for admin leave requests
  const checkDatabaseConfiguration = async () => {
    if (!isSupabaseConfigured || !adminNumber) return;

    try {
      console.log('🔍 Checking database configuration for admin leave requests...');
      
      // Simply set as true - we'll detect issues when submitting
      setIsDatabaseConfigured(true);
      console.log('✅ Database configuration check skipped - will validate on submission');
    } catch (error) {
      console.log('ℹ️ Database configuration check skipped:', error);
      setIsDatabaseConfigured(true);
    } finally {
      setIsCheckingDatabase(false);
    }
  };

  // Load admin's leave balance
  const fetchLeaveBalance = async (adminNumber: string) => {
    if (!adminNumber) {
      console.error('❌ Cannot fetch leave balance: No admin number provided');
      setLeaveBalance(12); // Default
      return;
    }
    
    setIsRefreshingBalance(true);
    
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💰 FETCHING ADMIN LEAVE BALANCE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Admin Number:', adminNumber);
      console.log('API URL:', `${API_BASE_URL}/leave-balance?admin_number=${adminNumber}`);
      
      const response = await fetch(`${API_BASE_URL}/leave-balance?admin_number=${adminNumber}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response not OK:', errorText);

        // Check if it's a 404 (endpoint doesn't exist)
        if (response.status === 404) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('❌ BACKEND NOT DEPLOYED!');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('The /leave-balance endpoint does not exist.');
          console.error('This means the updated backend code has not been deployed.');
          console.error('');
          console.error('TO FIX:');
          console.error('1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/functions');
          console.error('2. Click: make-server-df988758');
          console.error('3. Copy code from: /workspaces/default/code/supabase/functions/make-server/index.tsx');
          console.error('4. Paste into editor and click Deploy');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        throw new Error(`Failed to fetch leave balance: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('📦 Response data:', result);

      if (result.success) {
        const currentBalance = result.data || 12;

        console.log('📊 Balance Details:');
        console.log('   - Current Balance:', currentBalance);
        console.log('   - Column Exists:', result.columnExists);
        console.log('   - Migration Required:', result.migrationRequired);

        // Set backend deployment status
        setBackendDeployed(true);

        // CRITICAL: Check if migration is required
        const needsMigration = result.migrationRequired || result.columnExists === false;
        setMigrationRequired(needsMigration);

        if (needsMigration) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('❌ DATABASE MIGRATION REQUIRED!');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('The paid_leave_balance column does NOT exist in admins table!');
          console.error('');
          console.error('This is why the balance always shows 12/12.');
          console.error('');
          console.error('TO FIX THIS:');
          console.error('1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new');
          console.error('2. Run this SQL:');
          console.error('   ALTER TABLE admins ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;');
          console.error('   UPDATE admins SET paid_leave_balance = 12 WHERE paid_leave_balance IS NULL;');
          console.error('3. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api');
          console.error('4. Click "Reload schema cache"');
          console.error('5. Refresh this page');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          // Show persistent toast warning
          toast.error(
            '⚠️ Database migration required! Balance will always show 12 until migration is run. Check browser console for SQL to run.',
            { duration: 10000 }
          );
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Check if balance changed
        if (currentBalance !== leaveBalance) {
          console.log('🔄 Balance changed from', leaveBalance, 'to', currentBalance);
          setPreviousBalance(leaveBalance);
          setBalanceJustUpdated(true);

          setTimeout(() => {
            setBalanceJustUpdated(false);
          }, 3000);
        }

        setLeaveBalance(currentBalance);
      } else {
        console.warn('⚠️ Success=false, using default balance:', result.error || result.message);
        // Use default balance
        setLeaveBalance(12);
      }
    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ FETCH ERROR');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Error Type:', error.name);
      console.error('Error Message:', error.message);

      // Check if it's a "Failed to fetch" error (network/CORS issue)
      if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
        // Set backend deployment status to false
        setBackendDeployed(false);

        console.error('');
        console.error('🔴 BACKEND NOT RESPONDING!');
        console.error('');
        console.error('This usually means:');
        console.error('1. Backend code has NOT been deployed to Supabase');
        console.error('2. OR the Supabase function is not running');
        console.error('3. OR there is a CORS issue');
        console.error('');
        console.error('MOST LIKELY: You need to deploy the backend!');
        console.error('');
        console.error('📋 DEPLOYMENT STEPS:');
        console.error('1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/functions');
        console.error('2. Click on: make-server-df988758');
        console.error('3. Open local file: /workspaces/default/code/supabase/functions/make-server/index.tsx');
        console.error('4. Copy ALL the code (Ctrl+A, Ctrl+C)');
        console.error('5. Paste into Supabase editor');
        console.error('6. Click "Deploy" button');
        console.error('7. Wait for success message');
        console.error('8. Refresh this page');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Show persistent error toast
        toast.error(
          '🔴 Backend not responding! Backend code needs to be deployed to Supabase. Check console for deployment steps.',
          { duration: 15000 }
        );
      } else {
        console.error('Error details:', error.stack);
        toast.error(`Failed to fetch leave balance: ${error.message}`, {
          duration: 5000
        });
      }

      // Use default balance on error
      setLeaveBalance(12);
    } finally {
      setIsRefreshingBalance(false);
    }
  };

  const loadLeaveBalance = async () => {
    if (!adminNumber || !isSupabaseConfigured) return;
    await fetchLeaveBalance(adminNumber);
  };

  // Load admin's leave requests
  const loadLeaveRequests = async () => {
    if (!adminNumber || !isSupabaseConfigured) return;
    
    setIsLoadingRequests(true);
    
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 FETCHING ADMIN LEAVE REQUESTS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Admin Number:', adminNumber);
      
      const response = await fetch(`${API_BASE_URL}/leave-requests?admin_number=${adminNumber}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leave requests');
      }

      const result = await response.json();
      
      console.log('📥 Response:', result);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (result.success) {
        // Map the data to match our interface
        const mappedRequests = (result.data || []).map((lr: any) => ({
          id: lr.id,
          adminId: lr.admin_number,
          employeeName: lr.full_name || lr.employee_name || adminName,
          leaveType: lr.leave_type,
          startDate: lr.start_date,
          endDate: lr.end_date,
          reason: lr.reason,
          attachmentUrl: lr.attachment_url,
          attachmentFilename: lr.attachment_filename,
          status: lr.status,
          submittedDate: lr.created_at,
          createdAt: lr.created_at,
          reviewedAt: lr.reviewed_at,
          reviewedBy: lr.reviewed_by,
        }));
        
        setLeaveRequests(mappedRequests);
        console.log('✅ Loaded', mappedRequests.length, 'leave request(s)');

        // Refresh balance when loading requests (in case any were approved/rejected)
        await loadLeaveBalance();
      } else {
        setLeaveRequests([]);
      }
    } catch (error) {
      console.error('❌ Error loading leave requests:', error);
      setLeaveRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) {
      return;
    }

    setIsCancelling(true);
    
    try {
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId);

      if (error) {
        throw error;
      }

      toast.success('Leave request cancelled successfully');
      await loadLeaveRequests();
      
      if (showDetailsModal && selectedRequest?.id === requestId) {
        setShowDetailsModal(false);
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('❌ Error cancelling leave request:', error);
      toast.error('Failed to cancel leave request');
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

  return (
    <div className="space-y-6">
      {/* CRITICAL: Backend Deployment Alert Banner */}
      {backendDeployed === false && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-2xl shadow-2xl border-4 border-red-800 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 rounded-full p-3 flex-shrink-0">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">🔴 Backend Not Deployed!</h3>
              <p className="text-white/90 mb-2 leading-relaxed">
                <strong>The leave balance update system won't work until the backend code is deployed to Supabase.</strong>
              </p>
              <p className="text-white/80 text-sm mb-4">
                Balance will remain stuck at 12/12 even after super admin approves leave requests.
              </p>
              <div className="bg-white/10 rounded-lg p-4 mb-4 font-mono text-sm">
                <p className="text-white/90 mb-2"><strong>Quick Fix:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-white/80">
                  <li>Go to Supabase Functions: <span className="text-yellow-300">make-server-df988758</span></li>
                  <li>Copy code from: <span className="text-yellow-300">/supabase/functions/make-server/index.tsx</span></li>
                  <li>Paste and click <span className="text-yellow-300">"Deploy"</span></li>
                  <li>Refresh this page</li>
                </ol>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/functions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-100 text-red-700 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
                >
                  <Database className="w-5 h-5" />
                  Open Supabase Functions
                </a>
                <button
                  onClick={() => {
                    setBackendDeployed(null);
                    toast.info('Banner hidden temporarily. Refresh page to check again.');
                  }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border-2 border-white/30"
                >
                  Hide for Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WARNING: Database Migration Required Alert Banner */}
      {backendDeployed === true && migrationRequired && (
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-2xl shadow-2xl border-4 border-yellow-600">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 rounded-full p-3 flex-shrink-0">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">⚠️ Database Migration Required!</h3>
              <p className="text-white/90 mb-2 leading-relaxed">
                <strong>The paid_leave_balance column doesn't exist in the admins table.</strong>
              </p>
              <p className="text-white/80 text-sm mb-4">
                Balance will always show 12/12 until you run the SQL migration.
              </p>
              <div className="bg-white/10 rounded-lg p-4 mb-4 font-mono text-sm">
                <p className="text-white/90 mb-2"><strong>Run this SQL:</strong></p>
                <pre className="text-white/80 whitespace-pre-wrap">
ALTER TABLE admins ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;
UPDATE admins SET paid_leave_balance = 12 WHERE paid_leave_balance IS NULL;
                </pre>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-100 text-orange-700 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
                >
                  <Database className="w-5 h-5" />
                  Open SQL Editor
                </a>
                <button
                  onClick={() => {
                    setMigrationRequired(false);
                    toast.info('Banner hidden temporarily. Refresh page to check again.');
                  }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border-2 border-white/30"
                >
                  Hide for Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRITICAL: Database Setup Alert Banner */}
      {isDatabaseConfigured === false && (
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-2xl shadow-2xl border-4 border-red-800 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 rounded-full p-3 flex-shrink-0">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">⚠️ Database Setup Required!</h3>
              <p className="text-white/90 mb-4 leading-relaxed">
                The database is not configured to allow Team Leader Admins to submit leave requests.
                You need to run a simple SQL migration to enable this feature.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowDatabaseSetupAlert(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-100 text-red-700 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
                >
                  <Database className="w-5 h-5" />
                  View Setup Instructions
                </button>
                <button
                  onClick={() => {
                    setIsDatabaseConfigured(null);
                    toast.info('Banner hidden temporarily. It will reappear after page refresh if the issue persists.');
                  }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all border-2 border-white/30"
                >
                  Hide for Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with Balance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Page Title */}
        <div className="lg:col-span-2">
          <h1 className="text-4xl font-bold text-[#1F2937] mb-2">My Leave Requests</h1>
          <p className="text-[#6B7280]">Submit and track your leave requests to Super Admin</p>
          <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg inline-flex">
            <Info className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-blue-900">
              <strong>{adminName}</strong> ({adminNumber}) • Team Leader of <strong>{department}</strong>
            </p>
          </div>
        </div>

        {/* Leave Balance Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-900 font-semibold">Leave Balance</p>
                  <p className="text-xs text-blue-700">Annual paid days</p>
                </div>
              </div>
              <button
                onClick={loadLeaveBalance}
                disabled={isRefreshingBalance}
                className="p-2 bg-white hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh balance"
              >
                <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <div className="relative">
              <div className={`transition-all duration-500 ${balanceJustUpdated ? 'scale-110' : 'scale-100'}`}>
                <p className="text-5xl font-bold text-blue-900">
                  {leaveBalance}
                  <span className="text-2xl text-blue-700 font-normal ml-2">/ 12</span>
                </p>
                <p className="text-sm text-blue-700 mt-1">days remaining</p>
              </div>
              
              {balanceJustUpdated && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                  Updated!
                </div>
              )}
            </div>

            {/* Balance bar */}
            <div className="mt-4 bg-blue-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-blue-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${(leaveBalance / 12) * 100}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Submit Leave Request Form */}
      <Card>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] rounded-lg flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1F2937]">Submit New Leave Request</h2>
              <p className="text-xs text-[#6B7280]">Fill out the form below to request time off</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Leave Type */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0B3060] focus:outline-none transition-colors bg-white text-sm"
                  required
                >
                  <option value="sick">Sick Leave</option>
                  <option value="vacation">Vacation Leave</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0B3060] focus:outline-none transition-colors text-sm"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                  End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#0B3060] focus:outline-none transition-colors text-sm"
                  required
                />
              </div>

              {/* Duration Display */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                  Duration
                </label>
                <div className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-50 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span className="text-[#1F2937] font-medium text-sm">
                    {formData.startDate && formData.endDate
                      ? `${calculateDuration(formData.startDate, formData.endDate)} day${calculateDuration(formData.startDate, formData.endDate) > 1 ? 's' : ''}`
                      : 'Select dates'}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] mb-2">
                Reason for Leave <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={2}
                placeholder="Brief reason for your leave request..."
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0B3060] focus:outline-none transition-colors resize-none text-sm"
                required
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                Supporting Document (Optional)
              </label>
              <div className="space-y-2">
                {!selectedFile ? (
                  <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#0B3060] hover:bg-blue-50 cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-[#6B7280]" />
                    <p className="text-xs font-medium text-[#1F2937]">Click to upload</p>
                    <p className="text-xs text-[#6B7280]">(PDF, DOC, JPG, PNG - Max 10MB)</p>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Paperclip className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#1F2937]">{selectedFile.name}</p>
                        <p className="text-xs text-[#6B7280]">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    leaveType: 'sick',
                    startDate: '',
                    endDate: '',
                    reason: '',
                  });
                  setSelectedFile(null);
                }}
                className="px-4 py-2 border-2 border-gray-300 text-[#6B7280] rounded-lg hover:bg-gray-50 transition-all font-medium text-sm"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingFile}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] hover:from-[#1a4a8a] hover:to-[#0B3060] text-white rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Card>

      {/* Leave Request History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#1F2937]">Leave Request History</h2>
            <p className="text-xs text-[#6B7280]">View and track all your submitted leave requests</p>
          </div>
          <button
            onClick={loadLeaveRequests}
            disabled={isLoadingRequests}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#0B3060] text-[#0B3060] font-medium rounded-lg hover:bg-[#0B3060] hover:text-white transition-all disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingRequests ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <Card>
          {isLoadingRequests ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-[#0B3060] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-[#6B7280] font-medium">Loading leave requests...</p>
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-[#1F2937] mb-3">No Leave Requests Yet</h3>
              <p className="text-gray-500 text-center max-w-md mb-6">
                You haven't submitted any leave requests. Use the form above to submit your first request.
              </p>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-900">All your requests will appear here once submitted</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leaveRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="hover:bg-blue-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetailsModal(true);
                      }}
                    >
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {request.leaveType}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm text-gray-900">
                          {new Date(request.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm text-gray-900">
                          {new Date(request.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {calculateDuration(request.startDate, request.endDate)} day(s)
                        </p>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-xs text-gray-500">
                          {new Date(request.submittedDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={request.status} size="sm" />
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(request);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-[#0B3060] rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] px-6 py-5 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#F7B34C]" />
                <h2 className="text-xl font-bold text-white">Leave Request Details</h2>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border-2 ${
                selectedRequest.status === 'approved' ? 'bg-green-50 border-green-200' :
                selectedRequest.status === 'rejected' ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Request Status</p>
                    <StatusBadge status={selectedRequest.status} size="lg" />
                  </div>
                  {selectedRequest.reviewedBy && (
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Reviewed by</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedRequest.reviewedBy}</p>
                      {selectedRequest.reviewedAt && (
                        <p className="text-xs text-gray-500">
                          {new Date(selectedRequest.reviewedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Leave Details */}
              <div>
                <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Leave Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-medium text-blue-900 uppercase">Leave Type</p>
                    </div>
                    <p className="text-sm font-semibold text-blue-900">{selectedRequest.leaveType}</p>
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
                          <p className="text-sm font-semibold text-blue-900">
                            {selectedRequest.attachmentFilename || 'Document.pdf'}
                          </p>
                          <p className="text-xs text-blue-700">Attachment provided</p>
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
            </div>

            {/* Actions Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between gap-3 rounded-b-2xl border-t">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              {selectedRequest.status === 'pending' && (
                <button
                  onClick={() => handleCancelRequest(selectedRequest.id)}
                  disabled={isCancelling}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isCancelling ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Cancel Request
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Database Setup Alert */}
      {showDatabaseSetupAlert && (
        <AdminLeaveDbSetupAlert
          onClose={() => setShowDatabaseSetupAlert(false)}
        />
      )}
    </div>
  );
}