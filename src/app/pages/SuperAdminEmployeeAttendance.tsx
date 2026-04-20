import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Calendar, Clock, Users, ChevronDown, Loader2, AlertCircle, FileText, X, Download } from 'lucide-react';
import { attendanceApi } from '../../services/apiService';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { Calendar as CalendarPicker } from '../components/ui/calendar';
import type { DateRange } from 'react-day-picker';

interface TeamGroup {
  teamId: string;
  teamName: string;
}

// Date range filter presets
type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'custom';

export function SuperAdminEmployeeAttendance() {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [teamEmployees, setTeamEmployees] = useState<any[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [showEmployeeHistory, setShowEmployeeHistory] = useState(false);
  
  // Date range filter states
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('last_30_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRangeCalendar, setDateRangeCalendar] = useState<DateRange | undefined>(undefined);

  // Modal date range filter states
  const [modalDateRangePreset, setModalDateRangePreset] = useState<DateRangePreset>('last_30_days');
  const [modalCustomStartDate, setModalCustomStartDate] = useState('');
  const [modalCustomEndDate, setModalCustomEndDate] = useState('');
  const [showModalDateFilter, setShowModalDateFilter] = useState(false);
  const [modalDateRangeCalendar, setModalDateRangeCalendar] = useState<DateRange | undefined>(undefined);

  // Load all data
  const loadData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('📋 FETCHING EMPLOYEE ATTENDANCE DATA');

      // Fetch all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      if (teamsError) throw new Error(`Failed to fetch teams: ${teamsError.message}`);

      // Fetch all employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, employee_number, full_name, email, position, team_id, status')
        .eq('status', 'active')
        .order('full_name');

      if (employeesError) throw new Error(`Failed to fetch employees: ${employeesError.message}`);

      // Fetch all admins
      const { data: adminsData, error: adminsError } = await supabase
        .from('admins')
        .select('id, admin_number, full_name, email, department, status')
        .eq('status', 'active')
        .order('full_name');

      if (adminsError) console.error('⚠️ Error fetching admins:', adminsError.message);

      const teamsMap = new Map(teamsData.map(team => [team.id, team.name]));

      const enrichedEmployees = employeesData.map((emp: any) => ({
        ...emp,
        user_number: emp.employee_number,
        team_name: teamsMap.get(emp.team_id) || 'Unassigned',
        user_type: 'Employee',
        role_badge: '👤'
      }));

      const enrichedAdmins = (adminsData || []).map((admin: any) => ({
        ...admin,
        user_number: admin.admin_number,
        team_id: null,
        team_name: admin.department || 'Unassigned',
        user_type: 'Team Leader',
        role_badge: '👔'
      }));

      const allUsers = [...enrichedEmployees, ...enrichedAdmins];
      setTeamEmployees(enrichedEmployees);
      setTeamLeaders(enrichedAdmins);

      // Set team groups
      const teamsWithMembers = teamsData.filter(team => 
        allUsers.some(user => user.team_id === team.id)
      );

      const groups: TeamGroup[] = teamsWithMembers.map(team => {
        const teamMembers = allUsers.filter(user => user.team_id === team.id);
        return {
          teamId: team.id,
          teamName: `${team.name} (${teamMembers.length} members)`
        };
      });

      groups.unshift({ 
        teamId: 'all', 
        teamName: `All Departments (${allUsers.length} members)`
      });

      setTeamGroups(groups);

      // Fetch attendance records
      const { data: attendanceRecordsData, error: attendanceRecordsError } = await supabase
        .from('attendance_records')
        .select('*')
        .order('date', { ascending: false })
        .limit(5000);

      if (attendanceRecordsError) throw new Error(`Failed to fetch attendance: ${attendanceRecordsError.message}`);

      setAttendanceData(attendanceRecordsData || []);
    } catch (error: any) {
      console.error('❌ Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        startDate.setDate(today.getDate() - today.getDay());
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
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate.setTime(new Date(today.getFullYear(), today.getMonth(), 0).getTime());
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
    
    const labels: Record<string, string> = {
      'today': 'Today',
      'yesterday': 'Yesterday',
      'this_week': 'This Week',
      'last_week': 'Last Week',
      'this_month': 'This Month',
      'last_month': 'Last Month',
      'last_30_days': 'Last 30 Days',
      'last_90_days': 'Last 90 Days',
    };
    
    if (labels[dateRangePreset]) return labels[dateRangePreset];
    
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

  // Get modal date range based on preset
  const getModalDateRange = useCallback((): { startDate: Date; endDate: Date } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let endDate = new Date(today);
    let startDate = new Date(today);

    switch (modalDateRangePreset) {
      case 'today':
        break;
      case 'yesterday':
        startDate.setDate(today.getDate() - 1);
        endDate.setDate(today.getDate() - 1);
        break;
      case 'this_week':
        startDate.setDate(today.getDate() - today.getDay());
        break;
      case 'last_week':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        startDate = lastWeekStart;
        endDate = lastWeekEnd;
        break;
      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last_30_days':
        startDate.setDate(today.getDate() - 30);
        break;
      case 'last_90_days':
        startDate.setDate(today.getDate() - 90);
        break;
      case 'custom':
        if (modalDateRangeCalendar?.from && modalDateRangeCalendar?.to) {
          startDate = new Date(modalDateRangeCalendar.from);
          endDate = new Date(modalDateRangeCalendar.to);
        } else if (modalCustomStartDate && modalCustomEndDate) {
          startDate = new Date(modalCustomStartDate);
          endDate = new Date(modalCustomEndDate);
        }
        break;
      default:
        startDate.setDate(today.getDate() - 30);
    }

    return { startDate, endDate };
  }, [modalDateRangePreset, modalCustomStartDate, modalCustomEndDate, modalDateRangeCalendar]);

  // Get label for modal date range
  const getModalDateRangeLabel = useCallback((): string => {
    const labels: Record<string, string> = {
      'today': 'Today',
      'yesterday': 'Yesterday',
      'this_week': 'This Week',
      'last_week': 'Last Week',
      'this_month': 'This Month',
      'last_month': 'Last Month',
      'last_30_days': 'Last 30 Days',
      'last_90_days': 'Last 90 Days',
    };

    if (labels[modalDateRangePreset]) return labels[modalDateRangePreset];

    if (modalDateRangePreset === 'custom') {
      const { startDate, endDate } = getModalDateRange();
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }

    return 'Select Range';
  }, [modalDateRangePreset, getModalDateRange]);

  // Apply modal date filter
  const handleApplyModalDateFilter = () => {
    if (modalDateRangePreset === 'custom') {
      if (modalDateRangeCalendar?.from && modalDateRangeCalendar?.to) {
        // Calendar selection is valid
      } else if (!modalCustomStartDate || !modalCustomEndDate) {
        toast.error('Please select both start and end dates');
        return;
      }
    }
    setShowModalDateFilter(false);
    toast.success(`Filtered to: ${getModalDateRangeLabel()}`);
  };

  // Filter attendance records
  const filteredAttendanceRecords = useMemo(() => {
    const allUsers = [...teamEmployees, ...teamLeaders];
    const selectedTeamName = teamGroups.find(g => g.teamId === selectedTeamId)?.teamName.split(' (')[0];
    
    const filteredUsers = selectedTeamId === 'all' 
      ? allUsers 
      : allUsers.filter(user => {
          if (user.user_type === 'Employee') return user.team_id === selectedTeamId;
          if (user.user_type === 'Team Leader') return user.team_name === selectedTeamName;
          return false;
        });

    const userMap = new Map(allUsers.map(user => [user.user_number, user]));
    const attendanceMap = new Map<string, any>();
    
    attendanceData.forEach((record: any) => {
      const userNum = record.employee_number;
      const date = record.date || new Date(record.created_at).toISOString().split('T')[0];
      const key = `${userNum}-${date}`;
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
          status: 'absent',
        });
      }
      
      const entry = attendanceMap.get(key);
      const status = record.status?.toLowerCase() || 'present';
      
      if (status === 'paid_leave' || status === 'absent') {
        entry.timeIn = '08:00 AM';
        entry.timeOut = '05:00 PM';
        entry.status = status;
      } else if (record.time_in) {
        entry.timeIn = new Date(`2000-01-01T${record.time_in}`).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        entry.status = 'present';
      }
      
      if (record.time_out) {
        entry.timeOut = new Date(`2000-01-01T${record.time_out}`).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
    });

    const teamUserNumbers = filteredUsers.map(user => user.user_number);
    const filteredAttendance = Array.from(attendanceMap.values()).filter(entry =>
      teamUserNumbers.includes(entry.employee_number)
    );

    const records = filteredAttendance.map((entry) => ({
      id: `${entry.employee_number}-${entry.date}`,
      employeeId: entry.employee_number,
      employeeName: entry.employee_name,
      employeeTeam: entry.employee_team,
      userType: entry.user_type,
      roleBadge: entry.role_badge,
      date: entry.date,
      timeIn: entry.timeIn || '-',
      timeOut: entry.timeOut || '-',
      status: entry.status,
    }));

    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const { startDate, endDate } = getDateRange();
    return records.filter(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }, [attendanceData, teamEmployees, teamLeaders, selectedTeamId, teamGroups, getDateRange]);

  // Get team members
  const teamMembers = useMemo(() => {
    const allUsers = [...teamEmployees, ...teamLeaders];
    const selectedTeamName = teamGroups.find(g => g.teamId === selectedTeamId)?.teamName.split(' (')[0];
    
    const filteredUsers = selectedTeamId === 'all' 
      ? allUsers 
      : allUsers.filter(user => {
          if (user.user_type === 'Employee') return user.team_id === selectedTeamId;
          if (user.user_type === 'Team Leader') return user.team_name === selectedTeamName;
          return false;
        });

    return filteredUsers.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [teamEmployees, teamLeaders, selectedTeamId, teamGroups]);

  // Get selected employee records with modal date filter
  const selectedEmployeeRecords = useMemo(() => {
    if (!selectedEmployee) return [];
    const allRecords = filteredAttendanceRecords.filter(r => r.employeeId === selectedEmployee.user_number);

    // Apply modal date filter
    const { startDate, endDate } = getModalDateRange();
    return allRecords.filter(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }, [selectedEmployee, filteredAttendanceRecords, getModalDateRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-[#0B3060] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Employee Attendance History</h1>
            <p className="text-sm text-[#6B7280]">Click on any employee to view their complete attendance history</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/20 text-[#1F2937] font-medium cursor-pointer hover:bg-gray-50 transition-colors min-w-[250px]"
            >
              {teamGroups.map((team) => (
                <option key={team.teamId} value={team.teamId}>{team.teamName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="w-4 h-4 text-[#0B3060]" />
            <span className="text-sm font-medium text-[#1F2937]">{getDateRangeLabel()}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDateFilter ? 'rotate-180' : ''}`} />
          </button>

          {showDateFilter && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/20 z-[100]"
                onClick={() => setShowDateFilter(false)}
              />
              {/* Calendar Dropdown */}
              <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-auto bg-white rounded-xl shadow-2xl border-2 border-[#0B3060] z-[101] max-w-[95vw] max-h-[90vh] overflow-auto">
                {/* Header */}
                <div className="px-6 pt-5 pb-3 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] sticky top-0 z-10">
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
                <div className="p-6 bg-white">
                  <div className="flex justify-center">
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
                <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t sticky bottom-0">
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
            </>
          )}
        </div>
        <span className="text-sm text-[#6B7280]">
          Showing <span className="font-semibold text-[#0B3060]">{filteredAttendanceRecords.length}</span> records
        </span>
      </div>

      {/* Employee List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase">Team</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase">Position</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase">
                  Records ({getDateRangeLabel()})
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#6B7280] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {teamMembers.map((employee) => {
                const employeeRecords = filteredAttendanceRecords.filter(r => r.employeeId === employee.user_number);
                const presentCount = employeeRecords.filter(r => r.status === 'present').length;
                const paidLeaveCount = employeeRecords.filter(r => r.status === 'paid_leave').length;
                const absentCount = employeeRecords.filter(r => r.status === 'absent').length;
                
                return (
                  <tr 
                    key={employee.user_number} 
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setShowEmployeeHistory(true);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F7B34C] to-[#f5a623] flex items-center justify-center text-[#0B3060] font-bold shadow-md">
                          {employee.full_name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[#1F2937]">{employee.full_name}</p>
                            <span className="text-lg">{employee.role_badge}</span>
                          </div>
                          <p className="text-xs text-[#6B7280]">{employee.user_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-[#1F2937]">{employee.team_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#6B7280]">{employee.position || employee.user_type}</span>
                    </td>
                    <td className="px-6 py-4">
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
                        <span className="text-xs text-[#6B7280]">({employeeRecords.length} total)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(employee);
                          setShowEmployeeHistory(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#1a4a8a] transition-colors text-sm font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        View History
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Employee History Modal */}
      {showEmployeeHistory && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setShowEmployeeHistory(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-[#F7B34C] flex items-center justify-center text-[#0B3060] font-bold text-lg">
                    {selectedEmployee.full_name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold">{selectedEmployee.full_name}</h2>
                  <div className="flex items-center gap-4 mt-1 text-sm text-white/80">
                    <span>{selectedEmployee.user_number}</span>
                    <span>•</span>
                    <span>{selectedEmployee.team_name}</span>
                    <span>•</span>
                    <span>{selectedEmployee.position || selectedEmployee.user_type}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowEmployeeHistory(false)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Stats */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0B3060]" />
                  <span className="text-sm font-semibold">{getModalDateRangeLabel()}</span>
                </div>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-[#6B7280] uppercase">Total</p>
                    <p className="text-2xl font-bold text-[#0B3060]">{selectedEmployeeRecords.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600 uppercase">Present</p>
                    <p className="text-2xl font-bold text-green-600">
                      {selectedEmployeeRecords.filter(r => r.status === 'present').length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 uppercase">Paid Leave</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedEmployeeRecords.filter(r => r.status === 'paid_leave').length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-red-600 uppercase">Absent</p>
                    <p className="text-2xl font-bold text-red-600">
                      {selectedEmployeeRecords.filter(r => r.status === 'absent').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Filter and Export */}
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[#0B3060]">
                    <Calendar className="w-5 h-5" />
                    <span className="text-sm font-semibold">Date Range:</span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowModalDateFilter(!showModalDateFilter)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#0B3060] rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      <span className="text-sm font-bold text-[#0B3060]">{getModalDateRangeLabel()}</span>
                      <ChevronDown className={`w-4 h-4 text-[#0B3060] transition-transform ${showModalDateFilter ? 'rotate-180' : ''}`} />
                    </button>

                    {showModalDateFilter && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 bg-black/20 z-[200]"
                          onClick={() => setShowModalDateFilter(false)}
                        />
                        {/* Calendar Dropdown */}
                        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-auto bg-white rounded-xl shadow-2xl border-2 border-[#0B3060] z-[201] max-w-[95vw] max-h-[90vh] overflow-auto">
                          {/* Header */}
                          <div className="px-6 pt-5 pb-3 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] sticky top-0 z-10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-white">
                                <Calendar className="w-5 h-5" />
                                <h3 className="text-lg font-bold">Select Date Range</h3>
                              </div>
                              <button
                                onClick={() => setShowModalDateFilter(false)}
                                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                              >
                                <X className="w-5 h-5 text-white" />
                              </button>
                            </div>
                            <p className="text-sm text-white/80 mt-1">Filter {selectedEmployee?.full_name}'s records</p>
                          </div>

                          {/* Calendar Section */}
                          <div className="p-6 bg-white">
                            <div className="flex justify-center">
                              <CalendarPicker
                                mode="range"
                                selected={modalDateRangeCalendar}
                                onSelect={(range) => {
                                  setModalDateRangeCalendar(range);
                                  setModalDateRangePreset('custom');
                                  if (range?.from) {
                                    setModalCustomStartDate(range.from.toISOString().split('T')[0]);
                                  }
                                  if (range?.to) {
                                    setModalCustomEndDate(range.to.toISOString().split('T')[0]);
                                  }
                                }}
                                numberOfMonths={2}
                                className="rounded-md border-0"
                              />
                            </div>
                          </div>

                          {/* Selected Range Display */}
                          {modalDateRangeCalendar?.from && modalDateRangeCalendar?.to && (
                            <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                              <div className="flex items-center justify-center gap-2 text-sm">
                                <span className="font-semibold text-[#0B3060]">Selected Range:</span>
                                <span className="text-[#1F2937]">
                                  {modalDateRangeCalendar.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                <span className="text-[#6B7280]">to</span>
                                <span className="text-[#1F2937]">
                                  {modalDateRangeCalendar.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t sticky bottom-0">
                            <button
                              onClick={() => setShowModalDateFilter(false)}
                              className="flex-1 px-6 py-3 text-sm font-semibold text-[#6B7280] bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleApplyModalDateFilter}
                              className="flex-1 px-6 py-3 text-sm font-semibold text-white bg-[#0B3060] rounded-lg hover:bg-[#1a4a8a] transition-colors shadow-md hover:shadow-lg"
                            >
                              Apply Filter
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#6B7280]">Showing</span>
                    <span className="px-2.5 py-1 bg-[#0B3060] text-white rounded-full text-sm font-bold">
                      {selectedEmployeeRecords.length}
                    </span>
                    <span className="text-sm text-[#6B7280]">records</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Records */}
            <div className="flex-1 overflow-y-auto">
              {selectedEmployeeRecords.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Check In</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Check Out</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedEmployeeRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#6B7280]" />
                            <span className="text-sm font-medium">
                              {new Date(record.date).toLocaleDateString('en-US', {
                                weekday: 'short',
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
                            <span className="text-sm font-medium">
                              {(record.status === 'paid_leave' || record.status === 'absent') ? '-' : record.timeIn}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm">
                            {(record.status === 'paid_leave' || record.status === 'absent') ? '-' : record.timeOut}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={record.status} size="md" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
                  <p className="text-gray-600">No attendance records for {selectedEmployee.full_name} in the selected date range.</p>
                </div>
              )}\
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
              <span className="text-sm text-[#6B7280]">
                Showing {selectedEmployeeRecords.length} record{selectedEmployeeRecords.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setShowEmployeeHistory(false)}
                className="px-6 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#1a4a8a] font-medium"
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
