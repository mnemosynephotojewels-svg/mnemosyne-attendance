import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, FileText, RefreshCw, AlertCircle, Shield, Trash2, Users, X, User, Briefcase, Clock, Mail, Phone, Paperclip, Download, CheckCircle, XCircle, Eye } from 'lucide-react';
import { leaveRequestApi, employeeApi, adminApi } from '../../services/apiService';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { currentAdmin } from '../../data/mockData';
import { FixLeaveRequestsUserType } from '../components/FixLeaveRequestsUserType';

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeTeam?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
}

export function LeaveRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [currentAdminData, setCurrentAdminData] = useState<any>(currentAdmin);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [employeeBalances, setEmployeeBalances] = useState<{ [key: string]: number }>({});
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean; requestId: string; employeeName: string } | null>(null);

  // Load admin data from localStorage
  const loadAdminData = () => {
    try {
      const profileData = localStorage.getItem('mnemosyne_admin_profile');
      const sessionData = localStorage.getItem('adminSession');
      const currentUser = localStorage.getItem('mnemosyne_current_user');

      let adminData = currentAdmin;

      if (profileData) {
        const profile = JSON.parse(profileData);
        console.log('✅ [LeaveRequests] Loading from profile:', profile.department);
        adminData = {
          ...currentAdmin,
          name: profile.username || profile.full_name || currentAdmin.name,
          team: profile.department || currentAdmin.team,
        };
      } else if (sessionData) {
        const session = JSON.parse(sessionData);
        console.log('✅ [LeaveRequests] Loading from session:', session.department);
        adminData = {
          ...currentAdmin,
          name: session.username || session.full_name || currentAdmin.name,
          team: session.department || currentAdmin.team,
        };
      } else if (currentUser) {
        const user = JSON.parse(currentUser);
        console.log('✅ [LeaveRequests] Loading from user:', user.department);
        adminData = {
          ...currentAdmin,
          name: user.username || user.full_name || currentAdmin.name,
          team: user.department || currentAdmin.team,
        };
      }

      console.log('📌 [LeaveRequests] Department:', adminData.team);
      setCurrentAdminData(adminData);
      return adminData;
    } catch (error) {
      console.error('❌ [LeaveRequests] Error loading admin data:', error);
      return currentAdmin;
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      console.log('🔄 [LeaveRequests] Storage changed, reloading...');
      loadAdminData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdate', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdate', handleStorageChange);
    };
  }, []);

  // Load employees to get team information
  const loadEmployees = async () => {
    if (isSupabaseConfigured) {
      try {
        const result = await employeeApi.getAll();
        if (result.success && result.data) {
          setAllEmployees(result.data);
          console.log('✅ Loaded employees for team filtering:', result.data.length);
        }
      } catch (error: any) {
        console.warn('⚠️ API not available, querying Supabase directly:', error.message);
        
        // Fallback: Query Supabase directly
        if (supabase) {
          const { data: employeesData, error: employeesError } = await supabase
            .from('employees')
            .select('*');
          
          if (!employeesError && employeesData) {
            setAllEmployees(employeesData);
            console.log('✅ Loaded employees directly from Supabase:', employeesData.length);
          } else {
            console.error('❌ Error loading employees from Supabase:', employeesError);
          }
        }
      }
    }
  };

  // Load leave requests from database if Supabase is configured
  const loadLeaveRequests = async () => {
    if (isSupabaseConfigured) {
      try {
        setIsRefreshing(true);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔄 FETCHING LEAVE REQUESTS FROM DATABASE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Team Leader:', currentAdminData.name);
        console.log('Team:', currentAdminData.team);
        
        const result = await leaveRequestApi.getAll();
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 LEAVE REQUESTS RAW RESPONSE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Success:', result.success);
        console.log('Data count:', result.data?.length || 0);
        console.log('Full data:', JSON.stringify(result.data, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (result.success && result.data) {
          console.log(`✅ Found ${result.data.length} leave request(s)`);
          
          // Map database data to LeaveRequest format
          const mappedRequests = result.data.map((lr: any) => {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📋 Mapping leave request:', lr.id);
            console.log('  - User Type:', lr.user_type);
            console.log('  - Employee Number:', lr.employee_number);
            console.log('  - Admin Number:', lr.admin_number);
            console.log('  - Employee Data:', lr.employees);
            console.log('  - Admin Data:', lr.admin_info);
            console.log('  - Employee Team ID:', lr.employees?.team_id);
            console.log('  - Employee Team Object:', lr.employees?.teams);
            console.log('  - Employee Team Name:', lr.employees?.teams?.name || 'Unknown');
            console.log('  - Admin Department:', lr.admin_info?.department || 'Unknown');
            console.log('  - Leave Type:', lr.leave_type);
            console.log('  - Status:', lr.status);
            console.log('  - Start Date:', lr.start_date);
            console.log('  - End Date:', lr.end_date);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Determine if this is an admin or employee leave request
            let employeeName = 'Unknown User';
            let employeeTeam = 'Unknown Team';
            let employeeId = '';
            
            if (lr.user_type === 'admin' || lr.admin_number) {
              // Admin leave request - check admin_info first, then admin_number
              if (lr.admin_info) {
                employeeName = lr.admin_info.full_name || 'Unknown Admin';
                employeeTeam = lr.admin_info.department || 'Unknown Department';
                employeeId = lr.admin_number;
                console.log(`✅ Admin leave request: ${employeeName} (${employeeTeam})`);
              } else {
                // Admin data not enriched yet - show admin_number as fallback
                console.warn(`⚠️ Admin leave request ${lr.id} missing admin_info - data may still be loading`);
                employeeName = `Admin ${lr.admin_number || 'Unknown'}`;
                employeeTeam = 'Admin Department';
                employeeId = lr.admin_number || 'Unknown';
              }
            } else if (lr.employees) {
              // Employee leave request
              employeeName = lr.employees.full_name || 'Unknown Employee';
              employeeTeam = lr.employees.teams?.name || 'Unknown Team';
              employeeId = lr.employee_number;
              console.log(`✅ Employee leave request: ${employeeName} (${employeeTeam})`);
            } else {
              // Fallback for data integrity issues
              console.warn(`⚠️ Leave request ${lr.id} is missing both employee and admin data`);
              employeeId = lr.employee_number || lr.admin_number || 'Unknown';
            }
            
            return {
              id: lr.id,
              employeeId: employeeId,
              employeeName: employeeName,
              employeeTeam: employeeTeam,
              leaveType: lr.leave_type,
              startDate: lr.start_date,
              endDate: lr.end_date,
              reason: lr.reason,
              attachmentUrl: lr.attachment_url,
              status: lr.status,
              submittedDate: lr.created_at,
            };
          });
          
          // Filter by admin's team - TEAM-BASED ACCESS CONTROL (Case-insensitive)
          const teamLeaveRequests = mappedRequests.filter(req => {
            const reqTeam = (req.employeeTeam || '').toLowerCase().trim();
            const adminTeam = (currentAdminData.team || '').toLowerCase().trim();
            const isMatch = reqTeam === adminTeam;
            
            console.log(`  🔍 Filtering: Employee Team "${req.employeeTeam}" (${reqTeam}) ${isMatch ? '✅ MATCH' : '❌ NO MATCH'} Admin Team "${currentAdminData.team}" (${adminTeam})`);
            
            return isMatch;
          });
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ TEAM-FILTERED LEAVE REQUESTS');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('Admin Team (raw):', currentAdminData.team);
          console.log('Admin Team (normalized):', (currentAdminData.team || '').toLowerCase().trim());
          console.log('Total requests:', mappedRequests.length);
          console.log('Team requests (' + currentAdminData.team + '):', teamLeaveRequests.length);
          console.log('All request teams:', mappedRequests.map(r => r.employeeTeam));
          console.log('Filtered requests:', teamLeaveRequests);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          setLeaveRequests(teamLeaveRequests);
          toast.success(`Loaded ${teamLeaveRequests.length} leave request(s) for ${currentAdminData.team} team`);
        } else {
          console.warn('⚠️  No leave requests data returned');
          console.warn('Result:', result);
          setLeaveRequests([]);
          toast.info('No leave requests found in database');
        }
      } catch (error) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('❌ ERROR LOADING LEAVE REQUESTS');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Error:', error);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        toast.error('Failed to load leave requests');
        setLeaveRequests([]);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Load leave requests when admin data changes
  useEffect(() => {
    if (currentAdminData.team && currentAdminData.team !== 'Human Resources') {
      console.log('🔄 Admin team loaded, fetching leave requests for:', currentAdminData.team);
      loadLeaveRequests();
    }
  }, [currentAdminData.team]);

  // Handle refresh
  const handleRefresh = () => {
    const adminData = loadAdminData();
    setTimeout(() => {
      loadLeaveRequests();
    }, 100);
  };

  const handleApprove = async (id: string) => {
    setIsLoading(true);
    
    if (isSupabaseConfigured) {
      try {
        // Find the leave request to get employee details
        const leaveRequest = leaveRequests.find(req => req.id === id);
        if (!leaveRequest) {
          toast.error('Leave request not found');
          setIsLoading(false);
          return;
        }

        // Get current balance before approval
        const currentBalance = employeeBalances[leaveRequest.employeeId] ?? 12;
        const durationDays = calculateDuration(leaveRequest.startDate, leaveRequest.endDate);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ APPROVING LEAVE REQUEST');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Leave Request ID:', id);
        console.log('Employee:', leaveRequest.employeeId, '-', leaveRequest.employeeName);
        console.log('Start Date:', leaveRequest.startDate);
        console.log('End Date:', leaveRequest.endDate);
        console.log('Duration:', durationDays, 'day(s)');
        console.log('Current Balance BEFORE approval:', currentBalance, 'day(s)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🌐 CALLING BACKEND API...');
        console.log('Endpoint: PUT /leave-requests/' + id + '/status');
        console.log('Payload:', { status: 'approved', reviewed_by: currentAdminData.name || 'Admin' });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Use the API to update the leave request status
        const result = await leaveRequestApi.updateStatus(id, {
          status: 'approved',
          reviewed_by: currentAdminData.name || 'Admin'
        });

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 BACKEND RESPONSE RECEIVED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (result.success) {
          console.log('✅ Backend approval successful');
          console.log('Backend response:', result);
          
          // Update local state
          setLeaveRequests(prev => prev.map(req => 
            req.id === id ? { ...req, status: 'approved' as const } : req
          ));

          // Calculate expected new balance
          const paidDays = result.paid_records_created || Math.min(durationDays, currentBalance);
          const expectedNewBalance = Math.max(0, currentBalance - paidDays);

          console.log('📊 LEAVE APPROVAL BREAKDOWN:');
          console.log('   - Previous Balance:', currentBalance, 'day(s)');
          console.log('   - Days Requested:', durationDays, 'day(s)');
          console.log('   - Paid Leave Days Created:', paidDays, 'day(s)');
          console.log('   - Unpaid Days (Absent):', result.unpaid_records_created || 0, 'day(s)');
          console.log('   - Expected New Balance:', expectedNewBalance, 'day(s)');

          // Wait for database to propagate
          console.log('⏳ Waiting 1.5 seconds for database to sync...');
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Force reload balance from database
          console.log('🔄 Force reloading balance from database...');
          await loadEmployeeBalance(leaveRequest.employeeId);

          // Get the actual new balance after refresh
          const actualNewBalance = employeeBalances[leaveRequest.employeeId] ?? expectedNewBalance;

          console.log('   - Actual New Balance (after refresh):', actualNewBalance, 'day(s)');
          
          // Double-check: if balance didn't update, try one more time
          if (actualNewBalance === currentBalance && paidDays > 0) {
            console.warn('⚠️ Balance did not update! Trying again...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await loadEmployeeBalance(leaveRequest.employeeId);
            const retryBalance = employeeBalances[leaveRequest.employeeId] ?? expectedNewBalance;
            console.log('   - Retry Balance:', retryBalance, 'day(s)');
          }
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          // Show detailed success message
          if (result.unpaid_records_created > 0) {
            toast.success(
              `✅ Leave approved for ${leaveRequest.employeeName}!\n📊 ${result.paid_records_created} day(s) PAID LEAVE\n⚠️ ${result.unpaid_records_created} day(s) ABSENT (unpaid)\n💰 New balance: ${actualNewBalance} days\n📅 Paid leave days added to employee's schedule!`,
              { duration: 6000 }
            );
          } else {
            toast.success(
              `✅ Leave approved for ${leaveRequest.employeeName}!\n📊 ${paidDays} day(s) deducted from paid leave\n💰 Previous: ${currentBalance} days → New: ${actualNewBalance} days\n📅 Added to employee's "My Schedule" tab!`,
              { duration: 5000 }
            );
          }

          // Force update the balance in state immediately
          setEmployeeBalances(prev => ({ 
            ...prev, 
            [leaveRequest.employeeId]: actualNewBalance 
          }));

          // If modal is still open, refresh it
          if (selectedRequest && selectedRequest.employeeId === leaveRequest.employeeId) {
            setTimeout(() => {
              loadEmployeeBalance(leaveRequest.employeeId);
            }, 500);
          }

        } else {
          throw new Error(result.error || 'Failed to approve leave request');
        }

      } catch (error) {
        console.error('❌ Error approving leave request:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to approve leave request');
      }
    } else {
      // Mock mode
      setLeaveRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status: 'approved' as const } : req
      ));
      toast.success('Leave request approved (mock mode)');
    }
    
    setIsLoading(false);
  };

  const handleReject = async (id: string) => {
    setIsLoading(true);
    
    if (isSupabaseConfigured) {
      try {
        await leaveRequestApi.updateStatus(id, {
          status: 'rejected',
          reviewed_by: currentAdminData.name || 'Admin'
        });
        
        // Update local state
        setLeaveRequests(prev => prev.map(req => 
          req.id === id ? { ...req, status: 'rejected' as const } : req
        ));
        
        toast.success('Leave request rejected');
        console.log('✅ Leave request rejected and saved to database');
      } catch (error) {
        console.error('❌ Error rejecting leave request:', error);
        toast.error('Failed to reject leave request');
      }
    } else {
      // Mock mode
      setLeaveRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status: 'rejected' as const } : req
      ));
      toast.success('Leave request rejected (mock mode)');
    }
    
    setIsLoading(false);
  };

  const handleDelete = async (id: string, employeeName: string) => {
    // Show confirmation dialog instead of browser confirm
    setDeleteConfirmation({ show: true, requestId: id, employeeName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    const { requestId, employeeName } = deleteConfirmation;
    setDeleteConfirmation(null);
    setIsLoading(true);
    
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('leave_requests')
          .delete()
          .eq('id', requestId);

        if (error) {
          console.error('❌ Error deleting leave request:', error);
          toast.error('Failed to delete leave request');
          setIsLoading(false);
          return;
        }

        setLeaveRequests(prev => prev.filter(req => req.id !== requestId));
        toast.success(`Leave request from ${employeeName} has been deleted`);
        console.log('✅ Leave request deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting leave request:', error);
        toast.error('Failed to delete leave request');
      }
    } else {
      setLeaveRequests(prev => prev.filter(req => req.id !== requestId));
      toast.success(`Leave request from ${employeeName} has been deleted (mock mode)`);
    }
    
    setIsLoading(false);
  };

  const handleRowClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
    setIsLoading(false);
    loadEmployeeBalance(request.employeeId);
  };

  // Load employee's paid leave balance
  const loadEmployeeBalance = async (employeeNumber: string) => {
    if (!isSupabaseConfigured) return;
    
    setIsLoadingBalance(true);
    
    try {
      console.log('💰 Loading paid leave balance for employee:', employeeNumber);
      
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, employee_number, paid_leave_balance')
        .eq('employee_number', employeeNumber)
        .single();

      if (employeeError || !employeeData) {
        console.error('Error fetching employee data:', employeeError);
        setEmployeeBalances(prev => ({ ...prev, [employeeNumber]: 12 }));
        return;
      }

      console.log('Employee ID:', employeeData.id);
      
      let currentBalance = 12;
      
      console.log('📊 Calculating balance from attendance records (real-time)...');
      
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_number', employeeNumber)
        .eq('status', 'PAID_LEAVE');

      if (!attendanceError && attendanceData) {
        const paidLeaveDaysUsed = attendanceData.length;
        currentBalance = Math.max(0, 12 - paidLeaveDaysUsed);
        console.log('📊 Calculated from attendance:');
        console.log('   - Annual Allowance: 12 days');
        console.log('   - Days Used (PAID_LEAVE records):', paidLeaveDaysUsed);
        console.log('   - Current Balance:', currentBalance);
        console.log('   - PAID_LEAVE dates:', attendanceData.map(a => a.date).join(', '));
      } else {
        console.error('Error fetching attendance data:', attendanceError);
        if (employeeData.paid_leave_balance !== undefined && employeeData.paid_leave_balance !== null) {
          currentBalance = employeeData.paid_leave_balance;
          console.log('⚠️ Using fallback paid_leave_balance from DB:', currentBalance);
        }
      }
      
      setEmployeeBalances(prev => ({ ...prev, [employeeNumber]: currentBalance }));
      console.log('✅ Leave balance set to:', currentBalance);
      
    } catch (error) {
      console.error('❌ Error calculating employee leave balance:', error);
      setEmployeeBalances(prev => ({ ...prev, [employeeNumber]: 12 }));
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const closeModal = () => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
    setIsLoading(false);
  };

  const handleApproveFromModal = async () => {
    if (selectedRequest) {
      await handleApprove(selectedRequest.id);
      setSelectedRequest({ ...selectedRequest, status: 'approved' });
    }
  };

  const handleRejectFromModal = async () => {
    if (selectedRequest) {
      await handleReject(selectedRequest.id);
      setSelectedRequest({ ...selectedRequest, status: 'rejected' });
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

  // Filter requests by status
  const filteredRequests = leaveRequests.filter(req => {
    if (filterStatus === 'all') return true;
    return req.status === filterStatus;
  });

  // Count by status
  const pendingCount = leaveRequests.filter(r => r.status === 'pending').length;
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B3060] via-[#0d3d7a] to-[#0B3060] p-8 rounded-2xl shadow-xl">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F7B34C] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#F7B34C] to-[#d99a3a] rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Team Leave Requests</h1>
                <p className="text-white/80 text-lg">Review and approve leave requests from your team members</p>
              </div>
            </div>
            {isSupabaseConfigured && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>

          {/* Team Info */}
          <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#F7B34C]" />
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase font-semibold">Team Leader</p>
              <p className="font-bold text-white">{currentAdminData.name} • {currentAdminData.team} Team</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fix Leave Requests User Type Alert */}
      <FixLeaveRequestsUserType onComplete={handleRefresh} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => setFilterStatus('all')}
          className={`p-6 rounded-xl border-2 transition-all ${
            filterStatus === 'all'
              ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-500 shadow-lg'
              : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-600">All Requests</p>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{leaveRequests.length}</p>
        </button>

        <button
          onClick={() => setFilterStatus('pending')}
          className={`p-6 rounded-xl border-2 transition-all ${
            filterStatus === 'pending'
              ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-500 shadow-lg'
              : 'bg-white border-gray-200 hover:border-yellow-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-600">Pending</p>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-yellow-900">{pendingCount}</p>
        </button>

        <button
          onClick={() => setFilterStatus('approved')}
          className={`p-6 rounded-xl border-2 transition-all ${
            filterStatus === 'approved'
              ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-500 shadow-lg'
              : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-600">Approved</p>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{approvedCount}</p>
        </button>

        <button
          onClick={() => setFilterStatus('rejected')}
          className={`p-6 rounded-xl border-2 transition-all ${
            filterStatus === 'rejected'
              ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-500 shadow-lg'
              : 'bg-white border-gray-200 hover:border-red-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-600">Rejected</p>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900">{rejectedCount}</p>
        </button>
      </div>

      {/* Team Filter Info Banner */}
      {isSupabaseConfigured && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Team-Based Access Control Active</p>
              <p className="text-xs text-blue-700 mt-1">
                Showing only leave requests from <strong>{currentAdminData.team}</strong> team members
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Leave Requests List */}
      <Card>
        {isRefreshing ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-[#0B3060] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[#6B7280] font-medium">Loading leave requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-[#1F2937] mb-3">
              {filterStatus === 'all' ? 'No Leave Requests' : `No ${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Requests`}
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              {filterStatus === 'all' 
                ? 'There are no leave requests from your team members yet.'
                : `There are no ${filterStatus} leave requests at this time.`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Leave Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date Range</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(request)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] flex items-center justify-center text-white font-bold text-sm shadow">
                          {request.employeeName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{request.employeeName}</p>
                          <p className="text-xs text-gray-500">{request.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {request.leaveType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {calculateDuration(request.startDate, request.endDate)} day(s)
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {new Date(request.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-gray-500">
                        to {new Date(request.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={request.status} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(request);
                          }}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-[#0B3060] rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(request.id);
                              }}
                              disabled={isLoading}
                              className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors disabled:opacity-50 font-medium text-xs"
                              title="Approve"
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(request.id);
                              }}
                              disabled={isLoading}
                              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50 font-medium text-xs"
                              title="Reject"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(request.id, request.employeeName);
                          }}
                          disabled={isLoading}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] px-6 py-5 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-[#F7B34C]" />
                <h2 className="text-xl font-bold text-white">Leave Request Details</h2>
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
              {/* Employee Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Employee Information</h3>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#F7B34C] to-[#d99a3a] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      {selectedRequest.employeeName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg text-[#1F2937]">{selectedRequest.employeeName}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-[#6B7280] flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {selectedRequest.employeeId}
                        </p>
                        <p className="text-sm text-[#6B7280] flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {selectedRequest.employeeTeam}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Paid Leave Balance Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl px-5 py-4 min-w-[280px] border-2 border-blue-200 shadow-md relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadEmployeeBalance(selectedRequest.employeeId);
                        toast.info('Refreshing balance...');
                      }}
                      disabled={isLoadingBalance}
                      className="absolute top-3 right-3 p-1.5 bg-white hover:bg-blue-50 rounded-lg transition-colors shadow-sm border border-blue-200 disabled:opacity-50"
                      title="Refresh balance"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                    </button>
                    
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-md">
                        <Calendar className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Paid Leave Balance</p>
                        {isLoadingBalance ? (
                          <p className="text-3xl font-bold text-blue-900 mb-1">...</p>
                        ) : (
                          <p className="text-3xl font-bold text-blue-900 mb-1">
                            {employeeBalances[selectedRequest.employeeId] ?? 12} days
                          </p>
                        )}
                        <p className="text-xs text-blue-700">
                          {isLoadingBalance ? (
                            <span className="animate-pulse">Loading...</span>
                          ) : (
                            `${employeeBalances[selectedRequest.employeeId] ?? 12} day(s) remaining`
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
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
                          <p className="text-sm font-semibold text-blue-900">Attachment Provided</p>
                          <p className="text-xs text-blue-700">Employee submitted a supporting document</p>
                        </div>
                      </div>
                      <a
                        href={selectedRequest.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        View Document
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Status</h3>
                <StatusBadge status={selectedRequest.status} size="lg" />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between gap-3 rounded-b-2xl border-t">
              <button 
                onClick={closeModal}
                className="px-6 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-3">
                  <button 
                    onClick={handleRejectFromModal}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shadow-md hover:shadow-lg"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button 
                    onClick={handleApproveFromModal}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shadow-md hover:shadow-lg"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/20 p-4" onClick={() => setDeleteConfirmation(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-[fadeIn_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Delete Leave Request</h2>
              </div>
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Do you want to delete this request?</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  You are about to permanently delete the leave request from <span className="font-semibold text-gray-900">{deleteConfirmation.employeeName}</span>. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-center gap-3 rounded-b-2xl border-t">
              <button 
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
              >
                No, Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-md"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}