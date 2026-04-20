import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, FileText, AlertCircle, Trash2, ChevronDown, Users, Loader2, Paperclip, Download, X, User, Clock, Shield, UserCheck, Filter } from 'lucide-react';
import { leaveRequestApi } from '../../services/apiService';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { FixLeaveRequestsUserType } from '../components/FixLeaveRequestsUserType';

interface LeaveRequest {
  id: string;
  employeeId?: string;
  adminId?: string;
  employeeName: string;
  employeeTeam?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
  attachmentFilename?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
  userType: 'employee' | 'admin';
  userRole?: string;
  userDepartment?: string;
}

interface TeamGroup {
  teamId: string;
  teamName: string;
}

export function SuperAdminLeaveRequests() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ show: boolean; requestId: string; employeeName: string } | null>(null);

  // Load all data
  const loadData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 FETCHING LEAVE REQUESTS (SUPER ADMIN)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Fetch all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      if (teamsError) {
        throw new Error(`Failed to fetch teams: ${teamsError.message}`);
      }

      console.log('✅ Teams fetched:', teamsData?.length || 0);

      // Fetch leave requests
      const result = await leaveRequestApi.getAll();
      
      if (result.success && result.data) {
        console.log(`✅ Found ${result.data.length} leave request(s)`);
        
        // Map leave requests with employee and admin data (already enriched by backend)
        const mappedRequests = result.data.map((lr: any) => {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📋 Mapping leave request:', lr.id);
          console.log('  - User Type:', lr.user_type);
          console.log('  - Employee Number:', lr.employee_number);
          console.log('  - Admin Number:', lr.admin_number);
          console.log('  - Employee Data:', lr.employees);
          console.log('  - Admin Data:', lr.admin_info);
          
          // Determine if this is an admin or employee leave request
          let employeeName = 'Unknown User';
          let employeeTeam = 'Unknown Team';
          let employeeId = '';
          let userType: 'employee' | 'admin' = 'employee';
          let userRole = '';
          let userDepartment = '';
          
          if (lr.user_type === 'admin' || lr.admin_number) {
            // Admin leave request - check admin_info first, then admin_number
            if (lr.admin_info) {
              employeeName = lr.admin_info.full_name || 'Unknown Admin';
              employeeTeam = lr.admin_info.department || 'Unknown Department';
              employeeId = lr.admin_number;
              userType = 'admin';
              userRole = lr.admin_info.role || 'Admin';
              userDepartment = lr.admin_info.department || '';
              console.log(`✅ Admin leave request: ${employeeName} (${employeeTeam})`);
            } else {
              // Admin data not enriched yet - show admin_number as fallback
              console.warn(`⚠️ Admin leave request ${lr.id} missing admin_info - data may still be loading`);
              employeeName = `Admin ${lr.admin_number || 'Unknown'}`;
              employeeTeam = 'Admin Department';
              employeeId = lr.admin_number || 'Unknown';
              userType = 'admin';
              userRole = 'Admin';
            }
          } else if (lr.employees) {
            // Employee leave request (data from JOIN)
            employeeName = lr.employees.full_name || 'Unknown Employee';
            employeeTeam = lr.employees.teams?.name || 'Unknown Team';
            employeeId = lr.employee_number;
            userType = 'employee';
            console.log(`✅ Employee leave request: ${employeeName} (${employeeTeam})`);
          } else {
            // Fallback for data integrity issues
            console.warn(`⚠️ Leave request ${lr.id} is missing both employee and admin data`);
            employeeId = lr.employee_number || lr.admin_number || 'Unknown';
            userType = lr.user_type || 'employee';
          }
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          return {
            id: lr.id,
            ...(userType === 'admin' ? { adminId: employeeId } : { employeeId: employeeId }),
            employeeName: employeeName,
            employeeTeam: employeeTeam,
            leaveType: lr.leave_type,
            startDate: lr.start_date,
            endDate: lr.end_date,
            reason: lr.reason,
            attachmentUrl: lr.attachment_url,
            attachmentFilename: lr.attachment_filename,
            status: lr.status,
            submittedDate: lr.created_at,
            userType: userType,
            userRole: userRole,
            userDepartment: userDepartment,
          };
        });
        
        setLeaveRequests(mappedRequests);
        console.log('✅ Leave requests loaded and mapped');

        // Set team groups - only include teams that have leave requests
        const teamsWithLeaveRequests = teamsData.filter(team => 
          mappedRequests.some(req => req.employeeTeam === team.name)
        );

        const groups: TeamGroup[] = teamsWithLeaveRequests.map(team => {
          const requestCount = mappedRequests.filter(req => req.employeeTeam === team.name).length;
          return {
            teamId: team.id,
            teamName: `${team.name} (${requestCount} ${requestCount === 1 ? 'request' : 'requests'})`
          };
        });

        // Add "All Departments" option at the beginning
        groups.unshift({ 
          teamId: 'all', 
          teamName: `All Departments (${mappedRequests.length} ${mappedRequests.length === 1 ? 'request' : 'requests'})` 
        });

        setTeamGroups(groups);
      } else {
        console.warn('⚠️ No leave requests data returned');
        setLeaveRequests([]);
        
        // Set only "All Departments" when no requests exist
        setTeamGroups([{ teamId: 'all', teamName: 'All Departments (0 requests)' }]);
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error: any) {
      console.error('❌ Error loading leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter leave requests based on selected team
  const filteredLeaveRequests = selectedTeamId === 'all' 
    ? leaveRequests 
    : leaveRequests.filter(req => {
        // Find the team by matching team ID
        const team = teamGroups.find(t => t.teamId === selectedTeamId);
        // Extract clean team name without the count
        const cleanTeamName = team?.teamName.split(' (')[0];
        return req.employeeTeam === cleanTeamName;
      });

  const handleApprove = async (id: string) => {
    if (isSupabaseConfigured) {
      try {
        // Find the leave request to get employee details and dates
        const leaveRequest = leaveRequests.find(req => req.id === id);
        if (!leaveRequest) {
          toast.error('Leave request not found');
          return;
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ APPROVING LEAVE REQUEST (SUPER ADMIN)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Leave Request ID:', id);
        console.log('User Type:', leaveRequest.userType);
        console.log('Employee/Admin:', leaveRequest.employeeId || leaveRequest.adminId, '-', leaveRequest.employeeName);
        console.log('Start Date:', leaveRequest.startDate);
        console.log('End Date:', leaveRequest.endDate);

        // Use the backend API to approve the leave request
        // The backend will handle all the logic including:
        // - Creating attendance records
        // - Updating leave balance
        // - Updating leave request status
        const result = await leaveRequestApi.updateStatus(id, {
          status: 'approved',
          reviewed_by: 'Super Admin'
        });

        if (result.success) {
          console.log('✅ Leave request approved successfully');
          console.log('Backend response:', result);

          // Calculate leave duration
          const leaveDays = calculateDuration(leaveRequest.startDate, leaveRequest.endDate);

          // Update local state
          setLeaveRequests(prev => prev.map(req => 
            req.id === id ? { ...req, status: 'approved' as const } : req
          ));

          // Show success message with details from backend
          const paidDays = result.paid_records_created || 0;
          const unpaidDays = result.unpaid_records_created || 0;

          if (unpaidDays > 0) {
            toast.success(
              `Leave approved! ${paidDays} day(s) as PAID LEAVE, ${unpaidDays} day(s) as ABSENT (no paid leave remaining)`,
              { duration: 6000 }
            );
          } else {
            toast.success(`Leave approved! ${paidDays} day(s) of paid leave granted`);
          }

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ LEAVE APPROVAL COMPLETE');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        } else {
          throw new Error(result.error || 'Failed to approve leave request');
        }

      } catch (error) {
        console.error('❌ Error approving leave request:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to approve leave request');
      }
    }
  };

  const handleReject = async (id: string) => {
    if (isSupabaseConfigured) {
      try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('❌ REJECTING LEAVE REQUEST (SUPER ADMIN)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Leave Request ID:', id);

        // Update leave request status in database
        const { error: updateError } = await supabase
          .from('leave_requests')
          .update({
            status: 'rejected',
            reviewed_by: 'Super Admin',
            reviewed_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error('Error updating leave request:', updateError);
          throw new Error('Failed to update leave request status');
        }

        console.log('✅ Leave request rejected successfully');
        
        // Update local state
        setLeaveRequests(prev => prev.map(req => 
          req.id === id ? { ...req, status: 'rejected' as const } : req
        ));
        
        toast.success('Leave request rejected');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } catch (error) {
        console.error('❌ Error rejecting leave request:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to reject leave request');
      }
    }
  };

  const handleDelete = async (id: string, employeeName: string) => {
    // Show confirmation dialog instead of browser confirm
    setDeleteConfirmation({ show: true, requestId: id, employeeName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    const { requestId, employeeName } = deleteConfirmation;
    setDeleteConfirmation(null);

    if (isSupabaseConfigured) {
      try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🗑️ DELETING LEAVE REQUEST (SUPER ADMIN)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Leave Request ID:', requestId);
        console.log('Employee Name:', employeeName);

        // Find the leave request to check if it has been approved
        const leaveRequest = leaveRequests.find(req => req.id === requestId);
        
        if (leaveRequest?.status === 'approved') {
          // If approved, also delete associated attendance records
          console.log('⚠️  Leave request was approved, deleting associated attendance records...');
          
          const { error: attendanceDeleteError } = await supabase
            .from('attendance_records')
            .delete()
            .eq('leave_request_id', requestId);

          if (attendanceDeleteError) {
            console.error('Error deleting attendance records:', attendanceDeleteError);
            // Continue anyway as we want to delete the leave request
          } else {
            console.log('✅ Associated attendance records deleted');
          }
        }

        // Delete the leave request
        const { error: deleteError } = await supabase
          .from('leave_requests')
          .delete()
          .eq('id', requestId);

        if (deleteError) {
          console.error('Error deleting leave request:', deleteError);
          throw new Error('Failed to delete leave request');
        }

        console.log('✅ Leave request deleted successfully');

        // Remove from local state
        setLeaveRequests(prev => prev.filter(req => req.id !== requestId));
        
        toast.success('Leave request deleted successfully');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } catch (error) {
        console.error('❌ Error deleting leave request:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to delete leave request');
      }
    }
  };

  const handleRowClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const closeModal = () => {
    setShowDetailsModal(false);
    setSelectedRequest(null);
  };

  const handleApproveFromModal = async () => {
    if (selectedRequest) {
      await handleApprove(selectedRequest.id);
      // Update the selected request status
      setSelectedRequest({ ...selectedRequest, status: 'approved' });
    }
  };

  const handleRejectFromModal = async () => {
    if (selectedRequest) {
      await handleReject(selectedRequest.id);
      // Update the selected request status
      setSelectedRequest({ ...selectedRequest, status: 'rejected' });
    }
  };

  // Calculate leave duration in days
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    return diffDays;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#0B3060] animate-spin mx-auto mb-4" />
          <p className="text-[#6B7280] font-semibold">Loading leave requests...</p>
        </div>
      </div>
    );
  }

  const selectedTeam = teamGroups.find(g => g.teamId === selectedTeamId);

  return (
    <div>
      {/* Fix Leave Requests User Type Alert */}
      <FixLeaveRequestsUserType onComplete={loadData} />

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-[#0B3060]" />
          <div>
            <h1 className="text-[#1F2937] text-2xl font-bold">Leave Requests</h1>
            <p className="text-[#6B7280]">Super Administrator</p>
          </div>
        </div>
      </div>

      {/* Statistics Banner */}
      <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-xl p-6 mb-6 shadow-md">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-white/80">Viewing Department</p>
              <p className="font-bold text-xl">
                {selectedTeamId === 'all' ? 'All Departments' : selectedTeam?.teamName.split(' (')[0]}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-sm text-white/80 mb-1">Pending</p>
              <p className="font-bold text-3xl">
                {filteredLeaveRequests.filter(r => r.status === 'pending').length}
              </p>
            </div>
            <div className="h-12 w-px bg-white/30"></div>
            <div className="text-center">
              <p className="text-sm text-white/80 mb-1">Approved</p>
              <p className="font-bold text-3xl">
                {filteredLeaveRequests.filter(r => r.status === 'approved').length}
              </p>
            </div>
            <div className="h-12 w-px bg-white/30"></div>
            <div className="text-center">
              <p className="text-sm text-white/80 mb-1">Rejected</p>
              <p className="font-bold text-3xl">
                {filteredLeaveRequests.filter(r => r.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
        <div className="flex items-center justify-between">
          {/* Left: Department Filter */}
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-[#6B7280]" />
            <div className="relative">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="appearance-none px-4 py-2.5 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/20 focus:border-[#0B3060] text-[#1F2937] font-medium cursor-pointer hover:bg-gray-50 transition-colors min-w-[250px] text-sm"
              >
                {teamGroups.map((team) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.teamName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280] pointer-events-none" />
            </div>
          </div>

          {/* Right: Request Count Badge */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 rounded-lg border border-blue-200">
            <FileText className="w-4 h-4 text-[#0B3060]" />
            <span className="font-semibold text-[#0B3060] text-sm">
              {filteredLeaveRequests.length} {filteredLeaveRequests.length === 1 ? 'Request' : 'Requests'}
            </span>
          </div>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                  Leave Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredLeaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No leave requests found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {selectedTeamId === 'all' 
                        ? 'Leave requests from all teams will appear here' 
                        : `Leave requests from ${selectedTeam?.teamName.split(' (')[0]} will appear here`}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeaveRequests.map((request) => {
                  const duration = calculateDuration(request.startDate, request.endDate);
                  
                  return (
                    <tr 
                      key={request.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(request)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                            request.userType === 'admin' 
                              ? 'bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] text-white' 
                              : 'bg-[#F7B34C] text-[#0B3060]'
                          }`}>
                            {request.employeeName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-[#1F2937]">{request.employeeName}</p>
                              {request.userType === 'admin' && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-md">
                                  Leader
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#6B7280]">
                              {request.employeeId || request.adminId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#1F2937] font-medium">{request.employeeTeam}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            request.leaveType === 'Sick Leave' ? 'bg-red-500' :
                            request.leaveType === 'Vacation Leave' ? 'bg-blue-500' :
                            request.leaveType === 'Emergency Leave' ? 'bg-orange-500' :
                            'bg-gray-500'
                          }`}></div>
                          <span className="text-sm text-[#1F2937]">{request.leaveType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-[#6B7280]" />
                          <span className="text-sm font-semibold text-[#1F2937]">
                            {duration} {duration === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1.5 text-[#1F2937]">
                            <Calendar className="w-4 h-4 text-[#6B7280]" />
                            <span>
                              {new Date(request.startDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[#6B7280] mt-0.5">
                            <span className="ml-5 text-xs">to</span>
                            <span className="text-xs">
                              {new Date(request.endDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={request.status} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {request.status === 'pending' && (
                            <>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(request.id);
                                }}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors shadow-sm"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(request.id);
                                }}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm"
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
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete leave request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0B3060] to-[#0B3060]/90 px-6 py-5 flex items-center justify-between rounded-t-xl">
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
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Employee Information</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#F7B34C] flex items-center justify-center text-[#0B3060] font-bold text-xl">
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

              {/* Status & Submission Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Status</h3>
                  <StatusBadge status={selectedRequest.status} size="lg" />
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

            {/* Actions Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-xl border-t">
              <button 
                onClick={closeModal}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button 
                    onClick={handleRejectFromModal}
                    className="px-4 py-2 bg-[#DC2626] text-white rounded-lg text-sm font-medium hover:bg-[#DC2626]/90 transition-colors"
                  >
                    Reject Request
                  </button>
                  <button 
                    onClick={handleApproveFromModal}
                    className="px-4 py-2 bg-[#16A34A] text-white rounded-lg text-sm font-medium hover:bg-[#16A34A]/90 transition-colors"
                  >
                    Approve Request
                  </button>
                </>
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