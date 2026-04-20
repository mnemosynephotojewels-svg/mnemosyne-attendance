import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, Clock, Users, ChevronDown, Loader2, AlertCircle, FileText, X, Download } from 'lucide-react';
import { attendanceApi } from '../../services/apiService';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { exportSuperAdminAttendanceToExcel } from '../utils/exportUtils';
import { EmployeeAttendanceModal } from '../components/EmployeeAttendanceModal';
import { Calendar as CalendarPicker } from '../components/ui/calendar';
import type { DateRange } from 'react-day-picker';

interface TeamGroup {
  teamId: string;
  teamName: string;
}

// Date range filter presets
type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'custom';

export function SuperAdminAttendance() {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [teamEmployees, setTeamEmployees] = useState<any[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'flat' | 'employee_list'>('employee_list');
  
  // Employee selection for detailed view
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [showEmployeeHistory, setShowEmployeeHistory] = useState(false);
  
  // Date range filter states
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('last_30_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRangeCalendar, setDateRangeCalendar] = useState<DateRange | undefined>(undefined);

  // Load all data
  const loadData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 FETCHING ATTENDANCE DATA (SUPER ADMIN)');
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

      // Fetch all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(`
          id,
          employee_number,
          full_name,
          email,
          position,
          team_id,
          status,
          profile_picture_url
        `)
        .eq('status', 'active')
        .order('full_name');

      if (employeesError) {
        throw new Error(`Failed to fetch employees: ${employeesError.message}`);
      }

      console.log('✅ Employees fetched:', employeesData?.length || 0);

      // Fetch all admins (team leaders)
      const { data: adminsData, error: adminsError } = await supabase
        .from('admins')
        .select(`
          id,
          admin_number,
          full_name,
          email,
          department,
          status,
          profile_picture_url
        `)
        .eq('status', 'active')
        .order('full_name');

      if (adminsError) {
        console.error('⚠️ Error fetching admins:', adminsError.message);
      }

      console.log('✅ Admins fetched:', adminsData?.length || 0);

      // Create a map of teams
      const teamsMap = new Map(teamsData.map(team => [team.id, team.name]));

      // Add team name to employees and mark as 'employee' type
      const enrichedEmployees = employeesData.map((emp: any) => ({
        ...emp,
        user_number: emp.employee_number,
        team_name: teamsMap.get(emp.team_id) || 'Unassigned',
        user_type: 'Employee',
        role_badge: '👤'
      }));

      // Add team name to admins and mark as 'admin' type
      // Note: Admins use department (string) not team_id (UUID)
      const enrichedAdmins = (adminsData || []).map((admin: any) => ({
        ...admin,
        user_number: admin.admin_number,
        team_id: null, // Admins don't have team_id, they have department
        team_name: admin.department || 'Unassigned',
        user_type: 'Team Leader',
        role_badge: '👔'
      }));

      // Combine both employees and admins into one unified list
      const allUsers = [...enrichedEmployees, ...enrichedAdmins];
      console.log(`📊 Total users (employees + admins): ${allUsers.length}`);

      setTeamEmployees(enrichedEmployees);
      setTeamLeaders(enrichedAdmins);

      // Set team groups - count both employees and admins
      const teamsWithMembers = teamsData.filter(team => 
        allUsers.some(user => user.team_id === team.id)
      );

      const groups: TeamGroup[] = teamsWithMembers.map(team => {
        const teamMembers = allUsers.filter(user => user.team_id === team.id);
        const employeeCount = teamMembers.filter(u => u.user_type === 'Employee').length;
        const adminCount = teamMembers.filter(u => u.user_type === 'Team Leader').length;
        
        return {
          teamId: team.id,
          teamName: `${team.name} (${employeeCount} employees${adminCount > 0 ? ` + ${adminCount} leader${adminCount > 1 ? 's' : ''}` : ''})`
        };
      });

      // Add "All Departments" option at the beginning
      const totalEmployees = allUsers.filter(u => u.user_type === 'Employee').length;
      const totalAdmins = allUsers.filter(u => u.user_type === 'Team Leader').length;
      
      groups.unshift({ 
        teamId: 'all', 
        teamName: `All Departments (${totalEmployees} employees${totalAdmins > 0 ? ` + ${totalAdmins} leader${totalAdmins > 1 ? 's' : ''}` : ''})`
      });

      setTeamGroups(groups);

      // Fetch attendance records directly from Supabase
      const { data: attendanceRecordsData, error: attendanceRecordsError } = await supabase
        .from('attendance_records')
        .select('*')
        .order('date', { ascending: false })
        .limit(5000);

      if (attendanceRecordsError) {
        throw new Error(`Failed to fetch attendance records: ${attendanceRecordsError.message}`);
      }

      console.log(`✅ Loaded ${attendanceRecordsData?.length || 0} attendance records with leave info`);
      setAttendanceData(attendanceRecordsData || []);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error: any) {
      console.error('❌ Error loading attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log('🔄 [SuperAdminAttendance] Auto-refreshing attendance data...');
      loadData();
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  // Manual refresh handler
  const handleManualRefresh = () => {
    console.log('🔄 [SuperAdminAttendance] Manual refresh triggered');
    toast.info('Refreshing attendance data...');
    loadData();
  };

  // Get date range based on preset
  const getDateRange = useCallback((): { startDate: Date; endDate: Date } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let endDate = new Date(today);
    let startDate = new Date(today);

    switch (dateRangePreset) {
      case 'today':
        break;
      
      case 'yesterday':
        startDate.setDate(today.getDate() - 1);
        endDate.setDate(today.getDate() - 1);
        break;
      
      case 'this_week':
        const dayOfWeek = today.getDay();
        startDate.setDate(today.getDate() - dayOfWeek);
        break;
      
      case 'last_week':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        startDate = lastWeekStart;
        endDate.setTime(lastWeekEnd.getTime());
        break;
      
      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      
      case 'last_month':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = lastMonthStart;
        endDate.setTime(lastMonthEnd.getTime());
        break;
      
      case 'last_30_days':
        startDate.setDate(today.getDate() - 30);
        break;
      
      case 'last_90_days':
        startDate.setDate(today.getDate() - 90);
        break;
      
      case 'custom':
        if (dateRangeCalendar?.from && dateRangeCalendar?.to) {
          startDate = new Date(dateRangeCalendar.from);
          endDate = new Date(dateRangeCalendar.to);
        } else if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          startDate.setDate(today.getDate() - 30);
        }
        break;
      
      default:
        startDate.setDate(today.getDate() - 30);
    }

    return { startDate, endDate };
  }, [dateRangePreset, customStartDate, customEndDate]);

  // Get label for current date range
  const getDateRangeLabel = useCallback((): string => {
    const { startDate, endDate } = getDateRange();
    
    if (dateRangePreset === 'today') return 'Today';
    if (dateRangePreset === 'yesterday') return 'Yesterday';
    if (dateRangePreset === 'this_week') return 'This Week';
    if (dateRangePreset === 'last_week') return 'Last Week';
    if (dateRangePreset === 'this_month') return 'This Month';
    if (dateRangePreset === 'last_month') return 'Last Month';
    if (dateRangePreset === 'last_30_days') return 'Last 30 Days';
    if (dateRangePreset === 'last_90_days') return 'Last 90 Days';
    
    if (dateRangePreset === 'custom') {
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    
    return 'Select Range';
  }, [dateRangePreset, getDateRange]);

  // Apply date filter
  const handleApplyDateFilter = () => {
    if (dateRangePreset === 'custom') {
      if (dateRangeCalendar?.from && dateRangeCalendar?.to) {
        // Calendar selection is valid
      } else if (!customStartDate || !customEndDate) {
        toast.error('Please select both start and end dates');
        return;
      }
    }
    setShowDateFilter(false);
    toast.success(`Filtered to: ${getDateRangeLabel()}`);
  };

  // Clear date filter
  const handleClearDateFilter = () => {
    setDateRangePreset('last_30_days');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowDateFilter(false);
    toast.info('Date filter cleared');
  };

  // Export attendance records
  const handleExportAll = () => {
    try {
      // Get all attendance for the selected team
      const allRecords = attendanceData.map((record: any) => {
        // Find user data for this record
        const allUsers = [...teamEmployees, ...teamLeaders];
        const userData = allUsers.find(u => u.user_number === record.employee_number);
        const date = record.attendance_date || new Date(record.created_at || record.timestamp).toISOString().split('T')[0];
        
        return {
          employeeId: record.employee_number,
          employeeName: userData?.full_name || 'Unknown',
          teamName: userData?.team_name || 'Unknown',
          date: date,
          timeIn: record.check_in_time ? new Date(`2000-01-01T${record.check_in_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
          timeOut: record.check_out_time ? new Date(`2000-01-01T${record.check_out_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
          status: record.attendance_status?.toLowerCase() || 'present',
          isPaidLeave: record.attendance_status?.toLowerCase() === 'paid_leave',
          leaveInfo: (record.leave_type || record.leave_reason) ? {
            leaveType: record.leave_type,
            reason: record.leave_reason
          } : null
        };
      });

      // Filter by selected team if not 'all'
      const selectedTeamName = teamGroups.find(g => g.teamId === selectedTeamId)?.teamName.split(' (')[0];
      const filteredRecords = selectedTeamId === 'all' 
        ? allRecords
        : allRecords.filter(r => r.teamName === selectedTeamName);

      exportSuperAdminAttendanceToExcel(
        filteredRecords,
        selectedTeamId === 'all' ? 'All_Departments' : selectedTeamName || 'Team'
      );
      toast.success(`Exported ${filteredRecords.length} attendance records`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export records');
    }
  };

  const handleExportFiltered = () => {
    try {
      const { startDate, endDate } = getDateRange();
      const selectedTeamName = teamGroups.find(g => g.teamId === selectedTeamId)?.teamName.split(' (')[0];
      
      exportSuperAdminAttendanceToExcel(
        filteredAttendanceRecords,
        selectedTeamId === 'all' ? 'All_Departments' : selectedTeamName || 'Team',
        { startDate, endDate }
      );
      toast.success(`Exported ${filteredAttendanceRecords.length} records`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export records');
    }
  };

  // Filter attendance records based on selected team
  const filteredAttendanceRecords = useMemo(() => {
    // Combine employees and team leaders for filtering
    const allUsers = [...teamEmployees, ...teamLeaders];
    
    // Get the selected team name to match against department
    const selectedTeamName = teamGroups.find(g => g.teamId === selectedTeamId)?.teamName.split(' (')[0];
    
    // Filter users by selected team
    const filteredUsers = selectedTeamId === 'all' 
      ? allUsers 
      : allUsers.filter(user => {
          // For employees: match by team_id
          if (user.user_type === 'Employee') {
            return user.team_id === selectedTeamId;
          }
          // For team leaders: match by department name (team_name)
          if (user.user_type === 'Team Leader') {
            return user.team_name === selectedTeamName;
          }
          return false;
        });

    // Create a map of user_number to user data for quick lookup
    const userMap = new Map(
      allUsers.map(user => [user.user_number, user])
    );

    // Create a map to track attendance by user and date
    const attendanceMap = new Map<string, any>();
    
    attendanceData.forEach((record: any) => {
      const userNum = record.employee_number;
      const date = record.attendance_date || new Date(record.created_at || record.timestamp).toISOString().split('T')[0];
      const key = `${userNum}-${date}`;
      
      // Look up user data from our map
      const userData = userMap.get(userNum);
      
      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, {
          employee_number: userNum,
          employee_name: userData?.full_name || 'Unknown',
          employee_team: userData?.team_name || 'Unknown',
          user_type: userData?.user_type || 'Employee',
          role_badge: userData?.role_badge || '👤',
          date: date,
          timeIn: null,
          timeOut: null,
          leaveInfo: null,
        });
      }
      
      const entry = attendanceMap.get(key);
      const status = record.attendance_status?.toLowerCase() || 'present';
      
      // Handle different attendance types
      if (status === 'paid_leave' || status === 'absent') {
        // For leave records, show 8-hour standard time
        entry.timeIn = '08:00 AM';
        entry.timeOut = '05:00 PM';
        entry.status = status;
        entry.isPaidLeave = status === 'paid_leave';

        // Include leave request information if stored directly in attendance record
        if (record.leave_type || record.leave_reason) {
          entry.leaveInfo = {
            leaveType: record.leave_type,
            reason: record.leave_reason,
            startDate: record.leave_start_date,
            endDate: record.leave_end_date
          };
        }
      } else if (record.check_in_time) {
        // For regular attendance records
        const timeInObj = new Date(`2000-01-01T${record.check_in_time}`);
        entry.timeIn = timeInObj.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
      
      if (record.check_out_time) {
        const timeOutObj = new Date(`2000-01-01T${record.check_out_time}`);
        entry.timeOut = timeOutObj.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
    });

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Add all filtered users (employees + leaders) who haven't checked in today
    filteredUsers.forEach((user: any) => {
      const key = `${user.user_number}-${today}`;
      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, {
          employee_number: user.user_number,
          employee_name: user.full_name,
          employee_team: user.team_name,
          user_type: user.user_type,
          role_badge: user.role_badge,
          date: today,
          timeIn: null,
          timeOut: null,
          leaveInfo: null,
        });
      }
    });

    // Filter attendance by selected team users (employees + leaders)
    const teamUserNumbers = filteredUsers.map(user => user.user_number);
    const filteredAttendance = Array.from(attendanceMap.values()).filter(entry =>
      teamUserNumbers.includes(entry.employee_number)
    );

    // Convert map to array and format for display
    const records = filteredAttendance.map((entry, index) => ({
      id: `${entry.employee_number}-${entry.date}`,
      employeeId: entry.employee_number,
      employeeName: entry.employee_name,
      employeeTeam: entry.employee_team,
      userType: entry.user_type,
      roleBadge: entry.role_badge,
      date: entry.date,
      timeIn: entry.timeIn || '-',
      timeOut: entry.timeOut || '-',
      status: entry.status || (entry.timeIn && entry.timeIn !== '-' ? 'present' : 'absent'),
      isPaidLeave: entry.isPaidLeave || false,
      leaveInfo: entry.leaveInfo,
    }));

    // Sort by date (newest first) and then by employee name
    records.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.employeeName.localeCompare(b.employeeName);
    });

    // Apply date range filter
    const { startDate, endDate } = getDateRange();
    console.log('🔍 [SuperAdminAttendance] Filtering with date range:', {
      preset: dateRangePreset,
      startDate: startDate.toLocaleDateString(),
      endDate: endDate.toLocaleDateString(),
      totalRecordsBeforeFilter: records.length
    });
    
    const dateFilteredRecords = records.filter(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate >= startDate && recordDate <= endDate;
    });

    console.log(`✅ [SuperAdminAttendance] Filtered to ${dateFilteredRecords.length} records`);
    return dateFilteredRecords;
  }, [attendanceData, teamEmployees, teamLeaders, selectedTeamId, teamGroups, getDateRange]);

  // Group records by department
  const recordsByDepartment = useMemo(() => {
    const deptMap = new Map<string, any[]>();
    
    filteredAttendanceRecords.forEach(record => {
      const dept = record.employeeTeam;
      if (!deptMap.has(dept)) {
        deptMap.set(dept, []);
      }
      deptMap.get(dept)!.push(record);
    });

    return Array.from(deptMap.entries()).map(([dept, records]) => ({
      department: dept,
      records: records
    }));
  }, [filteredAttendanceRecords]);

  // Get unique employees from filtered team
  const teamMembers = useMemo(() => {
    const allUsers = [...teamEmployees, ...teamLeaders];
    const selectedTeamName = teamGroups.find(g => g.teamId === selectedTeamId)?.teamName.split(' (')[0];
    
    const filteredUsers = selectedTeamId === 'all' 
      ? allUsers 
      : allUsers.filter(user => {
          if (user.user_type === 'Employee') {
            return user.team_id === selectedTeamId;
          }
          if (user.user_type === 'Team Leader') {
            return user.team_name === selectedTeamName;
          }
          return false;
        });

    // Sort by name
    return filteredUsers.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [teamEmployees, teamLeaders, selectedTeamId, teamGroups]);

  // Get attendance records for selected employee
  const selectedEmployeeRecords = useMemo(() => {
    if (!selectedEmployee) return [];

    const records = filteredAttendanceRecords.filter(
      record => record.employeeId === selectedEmployee.user_number
    );

    return records;
  }, [selectedEmployee, filteredAttendanceRecords]);

  // Handle employee click to view their history
  const handleEmployeeClick = (employee: any) => {
    setSelectedEmployee(employee);
    setShowEmployeeHistory(true);
  };

  const closeEmployeeHistory = () => {
    setShowEmployeeHistory(false);
    setSelectedEmployee(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#0B3060] animate-spin mx-auto mb-4" />
          <p className="text-[#6B7280] font-semibold">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  const selectedTeam = teamGroups.find(g => g.teamId === selectedTeamId) || teamGroups[0];
  const selectedTeamName = selectedTeam?.teamName.split(' (')[0];
  
  // Calculate total members (employees + team leaders) for selected team
  const totalMembers = selectedTeamId === 'all' 
    ? teamEmployees.length + teamLeaders.length
    : teamEmployees.filter(emp => emp.team_id === selectedTeamId).length + 
      teamLeaders.filter(leader => leader.team_name === selectedTeamName).length;

  // Get clean team name without employee count for display
  const cleanTeamName = selectedTeamName || 'All Departments';

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-[#0B3060]" />
          <div>
            <h1 className="text-[#1F2937] text-2xl font-bold">Attendance History</h1>
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
              <p className="font-bold text-xl">{cleanTeamName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-sm text-white/80 mb-1">Departments</p>
              <p className="font-bold text-3xl">{recordsByDepartment.length}</p>
            </div>
            <div className="h-12 w-px bg-white/30"></div>
            <div className="text-center">
              <p className="text-sm text-white/80 mb-1">Total Records</p>
              <p className="font-bold text-3xl">{filteredAttendanceRecords.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Control Bar */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Department & Date Range Filters */}
          <div className="flex items-center gap-3">
            {/* Department Selector */}
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

            {/* Date Range Filter */}
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-[#0B3060]" />
              <span className="text-sm font-medium text-[#1F2937]">{getDateRangeLabel()}</span>
              <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${showDateFilter ? 'rotate-180' : ''}`} />
            </button>
            
            {dateRangePreset !== 'last_30_days' && (
              <button
                onClick={handleClearDateFilter}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>

          {/* Center: View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                viewMode === 'grouped'
                  ? 'bg-[#0B3060] text-white shadow-md'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              Grouped
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                viewMode === 'flat'
                  ? 'bg-[#0B3060] text-white shadow-md'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setViewMode('employee_list')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                viewMode === 'employee_list'
                  ? 'bg-[#0B3060] text-white shadow-md'
                  : 'text-[#6B7280] hover:text-[#1F2937]'
              }`}
            >
              Employee List
            </button>
          </div>

          {/* Right: Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAll}
              disabled={attendanceData.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#0B3060] text-[#0B3060] rounded-lg hover:bg-[#0B3060] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Export All
            </button>
            <button
              onClick={handleExportFiltered}
              disabled={filteredAttendanceRecords.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0B3060] text-white rounded-lg hover:bg-[#1a4a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-md"
            >
              <Download className="w-4 h-4" />
              Export ({filteredAttendanceRecords.length})
            </button>
          </div>
        </div>

        {/* Date Filter Modal */}
        <div className="relative">

          {showDateFilter && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/20 z-[100]"
                onClick={() => setShowDateFilter(false)}
              />
              {/* Calendar Modal */}
              <div className="fixed inset-0 flex items-center justify-center z-[101] p-8">
                <div className="bg-white rounded-xl shadow-2xl border-2 border-[#0B3060] w-auto min-h-[600px]">
                  {/* Header */}
                  <div className="px-6 pt-5 pb-3 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white">
                        <Calendar className="w-5 h-5" />
                        <h3 className="text-lg font-bold">Select Date Range</h3>
                      </div>
                      <button
                        onClick={() => setShowDateFilter(false)}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                    <p className="text-sm text-white/80 mt-1">Choose your attendance date range</p>
                  </div>

                  {/* Calendar Section */}
                  <div className="p-8 bg-white">
                    <CalendarPicker
                      mode="range"
                      selected={dateRangeCalendar}
                      onSelect={(range) => {
                        setDateRangeCalendar(range);
                        setDateRangePreset('custom');
                        if (range?.from) {
                          setCustomStartDate(range.from.toISOString().split('T')[0]);
                        }
                        if (range?.to) {
                          setCustomEndDate(range.to.toISOString().split('T')[0]);
                        }
                      }}
                      numberOfMonths={2}
                      className="rounded-md border-0"
                    />
                  </div>

                  {/* Selected Range Display */}
                  {dateRangeCalendar?.from && dateRangeCalendar?.to && (
                    <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="font-semibold text-[#0B3060]">Selected Range:</span>
                        <span className="text-[#1F2937]">
                          {dateRangeCalendar.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-[#6B7280]">to</span>
                        <span className="text-[#1F2937]">
                          {dateRangeCalendar.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t rounded-b-xl">
                    <button
                      onClick={() => setShowDateFilter(false)}
                      className="flex-1 px-6 py-3 text-sm font-semibold text-[#6B7280] bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyDateFilter}
                      className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-[#0B3060] rounded-lg hover:bg-[#1a4a8a] transition-colors shadow-md hover:shadow-lg"
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Card>
        {filteredAttendanceRecords.length > 0 ? (
          <div className="overflow-x-auto">
            {viewMode === 'grouped' ? (
              /* Grouped View - Simple Department Listing */
              <div>
                {recordsByDepartment.map((deptGroup, index) => (
                  <div key={deptGroup.department}>
                    {/* Department Header */}
                    <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 sticky top-0">
                      <h3 className="font-bold text-[#1F2937] text-lg">
                        {deptGroup.department} <span className="text-sm font-normal text-[#6B7280]">({deptGroup.records.length} records)</span>
                      </h3>
                    </div>
                    
                    {/* Department Records */}
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                            Check In
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                            Check Out
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">
                            Leave Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {deptGroup.records.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#F7B34C] flex items-center justify-center text-[#0B3060] font-semibold text-sm">
                                  {record.employeeName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-[#1F2937]">{record.employeeName}</p>
                                    {record.userType === 'Team Leader' && (
                                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-md">
                                        Leader
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#6B7280]">{record.employeeId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[#6B7280]" />
                                <span className="text-sm text-[#1F2937]">
                                  {new Date(record.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#6B7280]" />
                                <span className="text-sm text-[#1F2937]">
                                  {(record.status === 'paid_leave' || record.status === 'absent') ? '-' : record.timeIn}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-[#1F2937]">
                              {(record.status === 'paid_leave' || record.status === 'absent') ? '-' : (record.timeOut || '-')}
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={record.status} size="sm" />
                            </td>
                            <td className="px-6 py-4">
                              {record.leaveInfo ? (
                                <div className="text-xs space-y-1 max-w-xs">
                                  <p className="font-semibold text-[#0B3060]">
                                    {record.leaveInfo.leaveType === 'sick_leave' ? 'Sick Leave' :
                                     record.leaveInfo.leaveType === 'vacation_leave' ? 'Vacation Leave' :
                                     record.leaveInfo.leaveType === 'emergency_leave' ? 'Emergency Leave' :
                                     record.leaveInfo.leaveType}
                                  </p>
                                  {record.leaveInfo.reason && (
                                    <p className="text-[#6B7280] line-clamp-2">
                                      {record.leaveInfo.reason}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-[#9CA3AF]">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Spacer between departments */}
                    {index < recordsByDepartment.length - 1 && (
                      <div className="h-4 bg-gray-50 border-b border-gray-200"></div>
                    )}
                  </div>
                ))}
              </div>
            ) : viewMode === 'flat' ? (
              /* Flat View - Traditional Table */
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Leave Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredAttendanceRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#F7B34C] flex items-center justify-center text-[#0B3060] font-semibold text-sm">
                            {record.employeeName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-[#1F2937]">{record.employeeName}</p>
                              {record.userType === 'Team Leader' && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-md">
                                  Leader
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#6B7280]">{record.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[#1F2937] font-medium">{record.employeeTeam}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#6B7280]" />
                          <span className="text-sm text-[#1F2937]">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#6B7280]" />
                          <span className="text-sm text-[#1F2937]">
                            {(record.status === 'paid_leave' || record.status === 'absent') ? '-' : record.timeIn}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1F2937]">
                        {(record.status === 'paid_leave' || record.status === 'absent') ? '-' : (record.timeOut || '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={record.status} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        {record.leaveInfo ? (
                          <div className="text-xs space-y-1 max-w-xs">
                            <p className="font-semibold text-[#0B3060]">
                              {record.leaveInfo.leaveType === 'sick_leave' ? 'Sick Leave' :
                               record.leaveInfo.leaveType === 'vacation_leave' ? 'Vacation Leave' :
                               record.leaveInfo.leaveType === 'emergency_leave' ? 'Emergency Leave' :
                               record.leaveInfo.leaveType}
                            </p>
                            {record.leaveInfo.reason && (
                              <p className="text-[#6B7280] line-clamp-2">
                                {record.leaveInfo.reason}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#9CA3AF]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* Employee List View */
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                        Total Records
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {teamMembers.map((employee) => {
                      const employeeRecords = filteredAttendanceRecords.filter(r => r.employeeId === employee.user_number);
                      const presentCount = employeeRecords.filter(r => r.status === 'present').length;
                      const paidLeaveCount = employeeRecords.filter(r => r.status === 'paid_leave').length;
                      const absentCount = employeeRecords.filter(r => r.status === 'absent').length;
                      
                      return (
                        <tr 
                          key={employee.user_number} 
                          className="hover:bg-blue-50 transition-colors cursor-pointer"
                          onClick={() => handleEmployeeClick(employee)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#F7B34C] flex items-center justify-center text-[#0B3060] font-semibold text-sm">
                                {employee.full_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-[#1F2937]">{employee.full_name}</p>
                                  {employee.user_type === 'Team Leader' && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-md">
                                      Leader
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#6B7280]">{employee.user_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-[#1F2937] font-medium">{employee.team_name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-[#6B7280]">{employee.position || employee.user_type}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-sm font-semibold text-green-700">{presentCount}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-sm font-semibold text-blue-700">{paidLeaveCount}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="text-sm font-semibold text-red-700">{absentCount}</span>
                              </div>
                              <span className="text-xs text-[#6B7280] ml-2">({employeeRecords.length} total)</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Records</h3>
            <p className="text-gray-600">
              No attendance records found for {selectedTeamId === 'all' ? 'any team' : selectedTeam?.teamName} yet.
            </p>
          </div>
        )}
      </Card>

      {/* Employee Attendance Modal */}
      <EmployeeAttendanceModal
        isOpen={showEmployeeHistory}
        onClose={closeEmployeeHistory}
        employee={selectedEmployee}
        records={selectedEmployeeRecords}
        dateRangeLabel={getDateRangeLabel()}
      />
    </div>
  );
}