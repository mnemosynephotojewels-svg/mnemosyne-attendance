import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Calendar, Loader2, AlertCircle, Clock, RotateCw, Umbrella, Briefcase, Home, CheckCircle, XCircle, AlertTriangle, CalendarDays, CalendarCheck, Filter, ChevronLeft, ChevronRight, Sun, Moon, Coffee, X, CalendarRange } from 'lucide-react';
import { useEmployeeSession } from '../hooks/useEmployeeSession';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

interface ScheduleData {
  employee_number: string;
  schedule_date: string;
  shift_start: string | null;
  shift_end: string | null;
  is_day_off: boolean;
  is_paid_leave: boolean;
  is_absent?: boolean;
  updated_at?: string;
}

interface LeaveRequest {
  id: string;
  employee_number: string;
  start_date: string;
  end_date: string;
  total_days: number;
  paid_days?: number;
  unpaid_days?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
}

// Helper function to format time
const formatTime = (time: string | null) => {
  if (!time) return '';
  
  // If time is already in HH:MM format
  if (/^\d{2}:\d{2}$/.test(time)) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  }
  
  return time;
};

// Get day name from date
const getDayName = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// Get short day name
const getShortDayName = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

// Generate dates for the next 14 days
const generateDateRange = () => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dates.push(dateStr);
  }
  
  return dates;
};

export function EmployeeSchedule() {
  const { employee, isLoading: sessionLoading } = useEmployeeSession();
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'work' | 'leave' | 'off'>('all');
  
  // Date range filter states
  const [dateRangePreset, setDateRangePreset] = useState<'7days' | '14days' | '30days' | 'custom'>('14days');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  useEffect(() => {
    if (employee) {
      fetchSchedule();
      fetchLeaveRequests();
    }
  }, [employee]);

  const fetchSchedule = async () => {
    if (!employee) return;

    setIsLoading(true);
    setError('');

    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📅 FETCHING EMPLOYEE SCHEDULE & ATTENDANCE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Employee Number:', employee.employee_number);

      if (!isSupabaseConfigured) {
        console.log('⚠️  Using mock schedule (Supabase not configured)');
        
        // Generate mock schedule
        const mockSchedules = generateDateRange().map(date => ({
          employee_number: employee.employee_number,
          schedule_date: date,
          shift_start: getDayName(date) === 'Saturday' || getDayName(date) === 'Sunday' ? null : '08:00',
          shift_end: getDayName(date) === 'Saturday' || getDayName(date) === 'Sunday' ? null : '17:00',
          is_day_off: getDayName(date) === 'Saturday' || getDayName(date) === 'Sunday',
          is_paid_leave: false,
        }));
        
        setSchedules(mockSchedules);
        setAttendanceRecords([]);
        setIsLoading(false);
        return;
      }

      // Fetch from API
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 14);
      
      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Fetch schedules
      const scheduleUrl = `${API_BASE_URL}/schedules?employee_number=${employee.employee_number}&start_date=${startDateStr}&end_date=${endDateStr}`;
      console.log('🌐 Fetching schedules from:', scheduleUrl);

      const scheduleResponse = await fetch(scheduleUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Fetch attendance records (includes approved leaves)
      const attendanceUrl = `${API_BASE_URL}/attendance/records?employee_number=${employee.employee_number}&start_date=${startDateStr}&end_date=${endDateStr}`;
      console.log('🌐 Fetching attendance from:', attendanceUrl);

      const attendanceResponse = await fetch(attendanceUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Schedule response status:', scheduleResponse.status);
      console.log('📡 Attendance response status:', attendanceResponse.status);

      const scheduleResult = await scheduleResponse.json();
      const attendanceResult = await attendanceResponse.json();

      if (!scheduleResponse.ok || !scheduleResult.success) {
        console.error('❌ Failed to fetch schedule:', scheduleResult.error);
        
        if (scheduleResponse.status === 403) {
          setError('Authentication failed. Please try logging out and logging back in.');
        } else {
          setError(scheduleResult.error || 'Failed to fetch schedule');
        }
        
        setSchedules([]);
        setAttendanceRecords([]);
        return;
      }

      console.log('✅ Schedule fetched:', scheduleResult.schedules.length, 'entries');
      
      if (attendanceResult.success) {
        console.log('✅ Attendance fetched:', attendanceResult.data.length, 'records');
        setAttendanceRecords(attendanceResult.data || []);
      } else {
        console.warn('⚠️  Failed to fetch attendance, continuing without it');
        setAttendanceRecords([]);
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Merge schedules with attendance records
      const allScheduleDates = new Set<string>();
      const combinedSchedules: ScheduleData[] = [];

      scheduleResult.schedules.forEach((schedule: ScheduleData) => {
        allScheduleDates.add(schedule.schedule_date);
        combinedSchedules.push(schedule);
      });

      attendanceResult.data?.forEach((attendance: any) => {
        if ((attendance.status === 'PAID_LEAVE' || attendance.status === 'ABSENT') && 
            attendance.leave_request_id && 
            !allScheduleDates.has(attendance.date)) {
          
          combinedSchedules.push({
            employee_number: employee.employee_number,
            schedule_date: attendance.date,
            shift_start: null,
            shift_end: null,
            is_day_off: false,
            is_paid_leave: attendance.status === 'PAID_LEAVE',
            is_absent: attendance.status === 'ABSENT',
            updated_at: attendance.updated_at
          });
        }
      });

      combinedSchedules.sort((a, b) => 
        new Date(a.schedule_date).getTime() - new Date(b.schedule_date).getTime()
      );

      if (combinedSchedules.length === 0) {
        console.log('ℹ️  No schedules or approved leaves found');
        setSchedules([]);
      } else {
        console.log('✅ Displaying', combinedSchedules.length, 'schedule entries');
        setSchedules(combinedSchedules);
      }

    } catch (error) {
      console.error('❌ Unexpected error fetching schedule:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setError('Network error: Unable to connect to the server.');
      } else {
        setError('An unexpected error occurred while fetching schedule.');
      }
      
      setSchedules([]);
      setAttendanceRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    if (!employee) return;

    try {
      console.log('📅 FETCHING EMPLOYEE LEAVE REQUESTS');

      if (!isSupabaseConfigured || !supabase) {
        console.log('⚠️  Using mock leave requests (Supabase not configured)');
        setLeaveRequests([]);
        return;
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_number', employee.employee_number)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase error fetching leave requests:', error);
        setLeaveRequests([]);
        return;
      }

      console.log('✅ Leave requests fetched:', data?.length || 0, 'entries');
      setLeaveRequests(data || []);

    } catch (error) {
      console.error('❌ Unexpected error fetching leave requests:', error);
      setLeaveRequests([]);
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#0B3060] animate-spin" />
      </div>
    );
  }

  // Calculate statistics
  const paidLeaveDays = schedules.filter(s => s.is_paid_leave === true);
  const hasPaidLeave = paidLeaveDays.length > 0;
  const workDays = schedules.filter(s => s.shift_start && s.shift_end && !s.is_paid_leave && !s.is_day_off);
  const dayOffs = schedules.filter(s => s.is_day_off && !s.is_paid_leave);
  const absentDays = schedules.filter(s => s.is_absent);

  // Filter schedules based on selected filter
  const filteredSchedules = schedules.filter(schedule => {
    if (filterType === 'all') return true;
    if (filterType === 'work') return schedule.shift_start && schedule.shift_end && !schedule.is_paid_leave && !schedule.is_day_off;
    if (filterType === 'leave') return schedule.is_paid_leave;
    if (filterType === 'off') return schedule.is_day_off || !schedule.shift_start;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[#0B3060] to-[#152a47] rounded-2xl flex items-center justify-center shadow-lg">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937]">My Schedule</h1>
            <p className="text-sm text-gray-600 mt-1">
              {employee?.full_name} • Next 14 days
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh button */}
          <button
            onClick={fetchSchedule}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#152a47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      {schedules.length > 0 && !isLoading && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-[#0B3060] text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            All Days ({schedules.length})
          </button>
          <button
            onClick={() => setFilterType('work')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              filterType === 'work'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Work Days ({workDays.length})
          </button>
          <button
            onClick={() => setFilterType('leave')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              filterType === 'leave'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Paid Leave ({paidLeaveDays.length})
          </button>
          <button
            onClick={() => setFilterType('off')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              filterType === 'off'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Days Off ({dayOffs.length})
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-semibold">Error Loading Schedule</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {schedules.length === 0 && !isLoading && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-6 text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Calendar className="w-12 h-12 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-900 mb-2">No Schedule Set Yet</p>
            <p className="text-sm text-blue-700 max-w-md">
              Your team leader hasn't created your work schedule yet. Please contact your admin or wait for them to set up your schedule.
            </p>
          </div>
        </div>
      )}

      {/* Unified Schedule & Leave Table */}
      {filteredSchedules.length > 0 && (
        <Card>
          <div className="p-4 bg-gradient-to-r from-[#0B3060] to-[#152a47] rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarDays className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-lg font-bold text-white">Work Schedule & Approved Leaves</h2>
                  <p className="text-xs text-blue-100 mt-0.5">
                    All schedules and approved leave requests in one view
                  </p>
                </div>
              </div>
              <div className="text-white text-sm font-semibold bg-white bg-opacity-20 px-3 py-1.5 rounded-lg">
                {filteredSchedules.length} {filteredSchedules.length === 1 ? 'day' : 'days'}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left p-4 text-sm font-bold text-[#1F2937] uppercase tracking-wide">Date</th>
                  <th className="text-left p-4 text-sm font-bold text-[#1F2937] uppercase tracking-wide">Day</th>
                  <th className="text-left p-4 text-sm font-bold text-[#1F2937] uppercase tracking-wide">Time / Leave</th>
                  <th className="text-left p-4 text-sm font-bold text-[#1F2937] uppercase tracking-wide">Type</th>
                  <th className="text-left p-4 text-sm font-bold text-[#1F2937] uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map((schedule, index) => {
                  const dayName = getDayName(schedule.schedule_date);
                  const isToday = schedule.schedule_date === new Date().toISOString().split('T')[0];
                  const hasShift = schedule.shift_start && schedule.shift_end;
                  const isDayOff = schedule.is_day_off || !hasShift;
                  const isPaidLeave = schedule.is_paid_leave === true;
                  
                  const associatedLeave = leaveRequests.find(leave => {
                    const startDate = new Date(leave.start_date + 'T00:00:00');
                    const endDate = new Date(leave.end_date + 'T00:00:00');
                    const currentDate = new Date(schedule.schedule_date + 'T00:00:00');
                    return leave.status === 'approved' && 
                           currentDate >= startDate && 
                           currentDate <= endDate;
                  });

                  // Calculate if this is ongoing leave
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isOngoingLeave = associatedLeave && 
                    new Date(associatedLeave.start_date + 'T00:00:00') <= today && 
                    new Date(associatedLeave.end_date + 'T00:00:00') >= today;

                  // If there's an approved leave, treat this as a leave day (not work day)
                  const isLeaveDay = isPaidLeave || associatedLeave;

                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-all duration-200 ${
                        isToday ? 'bg-blue-50 border-l-4 border-l-blue-500' : 
                        isLeaveDay && isOngoingLeave ? 'bg-purple-50 border-l-4 border-l-purple-500' :
                        isLeaveDay ? 'bg-purple-50 bg-opacity-50' : ''
                      }`}
                    >
                      {/* Date Column */}
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">
                            {new Date(schedule.schedule_date + 'T00:00:00').toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric'
                            })}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(schedule.schedule_date + 'T00:00:00').getFullYear()}
                          </span>
                          {isToday && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-[#0B3060] text-white text-xs rounded-full font-bold w-fit">
                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                              Today
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Day Column */}
                      <td className="p-4">
                        <span className="text-sm font-semibold text-gray-700">{dayName}</span>
                      </td>

                      {/* Time / Leave Column - if there's approved leave, show ONLY leave */}
                      <td className="p-4">
                        {isLeaveDay ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <Umbrella className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-purple-700">Paid Leave</div>
                                <div className="text-xs text-gray-600">8 hours credited</div>
                              </div>
                            </div>
                          </div>
                        ) : isDayOff ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-300 rounded-lg flex items-center justify-center">
                              <Home className="w-5 h-5 text-gray-600" />
                            </div>
                            <span className="text-sm text-gray-500 font-medium">No Shift</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                              <Clock className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">
                                {formatTime(schedule.shift_start)} - {formatTime(schedule.shift_end)}
                              </div>
                              <div className="text-xs text-gray-600">Work Shift</div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Type/Status Column - if there's approved leave, show ONLY leave badge */}
                      <td className="p-4">
                        {isLeaveDay ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-2 border-purple-300 shadow-sm">
                              <Umbrella className="w-3.5 h-3.5" />
                              PAID LEAVE
                            </span>
                            {isOngoingLeave && (
                              <div className="flex items-center gap-1 text-xs font-semibold text-purple-700">
                                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                                Active Now
                              </div>
                            )}
                          </div>
                        ) : isDayOff ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border-2 border-red-200">
                            <Home className="w-3.5 h-3.5" />
                            {schedule.is_day_off ? 'DAY OFF' : 'NOT SCHEDULED'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border-2 border-green-300">
                            <Briefcase className="w-3.5 h-3.5" />
                            WORK DAY
                          </span>
                        )}
                      </td>

                      {/* Details Column */}
                      <td className="p-4">
                        {associatedLeave ? (
                          <div className="space-y-2 max-w-sm">
                            <div className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-xs font-bold text-gray-900">
                                  {associatedLeave.total_days}-day Leave Period
                                </div>
                                <div className="text-xs text-gray-600">
                                  {new Date(associatedLeave.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(associatedLeave.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-2 bg-white rounded-lg border border-gray-200">
                              <p className="text-xs text-gray-700 line-clamp-2" title={associatedLeave.reason}>
                                <span className="font-semibold text-gray-900">Reason:</span> {associatedLeave.reason}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1 text-green-700 font-semibold">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                {associatedLeave.paid_days || associatedLeave.total_days} paid ({(associatedLeave.paid_days || associatedLeave.total_days) * 8}h)
                              </span>
                              {associatedLeave.unpaid_days && associatedLeave.unpaid_days > 0 && (
                                <span className="flex items-center gap-1 text-red-700 font-semibold">
                                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                  {associatedLeave.unpaid_days} unpaid
                                </span>
                              )}
                            </div>
                            
                            {associatedLeave.approved_by && (
                              <div className="text-xs text-gray-500 italic flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Approved by {associatedLeave.approved_by}
                              </div>
                            )}
                          </div>
                        ) : hasShift ? (
                          <div className="text-xs text-gray-500">
                            Regular work schedule
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Summary */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-green-500 rounded"></span>
                  Work Days: <strong className="text-gray-900">{workDays.length}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-purple-500 rounded"></span>
                  Paid Leave: <strong className="text-purple-700">{paidLeaveDays.length}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-red-400 rounded"></span>
                  Days Off: <strong className="text-gray-900">{dayOffs.length}</strong>
                </span>
              </div>
              <div className="font-semibold text-gray-900">
                Total: {filteredSchedules.length} days
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Note: Approved leaves are now shown in the unified table above */}
      {false && leaveRequests.filter(l => l.status === 'approved').length > 0 && !isLoading && (
        <Card>
          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Approved Leave Requests
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {leaveRequests.filter(l => l.status === 'approved').length} {leaveRequests.filter(l => l.status === 'approved').length === 1 ? 'request' : 'requests'} • 
                    <span className="ml-1 font-semibold text-green-700">
                      {leaveRequests.filter(l => l.status === 'approved').reduce((sum, leave) => sum + (leave.paid_days || leave.total_days), 0)} paid days total
                    </span>
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-green-200">
                <CalendarCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-900">All Approved</span>
              </div>
            </div>

            <div className="space-y-4">
              {leaveRequests
                .filter(leave => leave.status === 'approved')
                .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                .map((leave) => {
                  const startDate = new Date(leave.start_date + 'T00:00:00');
                  const endDate = new Date(leave.end_date + 'T00:00:00');
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const isOngoing = startDate <= today && endDate >= today;
                  const isUpcoming = startDate > today;
                  const isPast = endDate < today;

                  const daysUntil = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const daysSince = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <div 
                      key={leave.id}
                      className={`relative overflow-hidden rounded-xl border-2 transition-all hover:shadow-lg ${
                        isOngoing 
                          ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-400 shadow-md' 
                          : isUpcoming
                          ? 'bg-white border-blue-300 hover:border-blue-400'
                          : 'bg-white border-gray-200 opacity-90'
                      }`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        isOngoing ? 'bg-gradient-to-b from-purple-500 to-indigo-600' :
                        isUpcoming ? 'bg-gradient-to-b from-blue-500 to-cyan-600' :
                        'bg-gray-300'
                      }`} />

                      <div className="p-5 pl-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className={`relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center shadow-lg ${
                              isOngoing 
                                ? 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white' 
                                : isUpcoming
                                ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white'
                                : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                            }`}>
                              <div className="text-xs font-bold uppercase tracking-wide opacity-90">
                                {startDate.toLocaleDateString('en-US', { month: 'short' })}
                              </div>
                              <div className="text-3xl font-extrabold leading-none">
                                {startDate.getDate()}
                              </div>
                              {startDate.getFullYear() !== new Date().getFullYear() && (
                                <div className="text-xs opacity-90 font-medium">
                                  {startDate.getFullYear()}
                                </div>
                              )}
                              
                              {leave.total_days > 1 && (
                                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white text-gray-800 px-2 py-0.5 rounded-full text-xs font-bold shadow-md border-2 border-current">
                                  {leave.total_days}d
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h4 className="text-lg font-bold text-gray-900">
                                    {leave.total_days === 1 
                                      ? startDate.toLocaleDateString('en-US', { 
                                          weekday: 'long', 
                                          month: 'long', 
                                          day: 'numeric',
                                          year: 'numeric'
                                        })
                                      : `${startDate.toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric' 
                                        })} - ${endDate.toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}`
                                    }
                                  </h4>
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                  {isOngoing && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-full font-bold shadow-md">
                                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                      On Leave Now
                                    </span>
                                  )}
                                  {isUpcoming && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-full font-bold shadow-sm">
                                      <CalendarDays className="w-3 h-3" />
                                      {daysUntil === 0 ? 'Starts Today' : daysUntil === 1 ? 'Starts Tomorrow' : `In ${daysUntil} days`}
                                    </span>
                                  )}
                                  {isPast && (
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-semibold">
                                      Completed • {daysSince} {daysSince === 1 ? 'day' : 'days'} ago
                                    </span>
                                  )}
                                </div>

                                <div className="mb-3 p-3 bg-white bg-opacity-70 rounded-lg border border-gray-200">
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    <span className="font-semibold text-gray-900">Reason:</span> {leave.reason}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-green-700 font-medium">Paid Days</div>
                                  <div className="text-lg font-bold text-green-900">
                                    {leave.paid_days || leave.total_days}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Clock className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-blue-700 font-medium">Hours Paid</div>
                                  <div className="text-lg font-bold text-blue-900">
                                    {(leave.paid_days || leave.total_days) * 8}h
                                  </div>
                                </div>
                              </div>

                              {(leave.unpaid_days && leave.unpaid_days > 0) ? (
                                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                                  <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <XCircle className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-red-700 font-medium">Unpaid Days</div>
                                    <div className="text-lg font-bold text-red-900">
                                      {leave.unpaid_days}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Umbrella className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-purple-700 font-medium">Total Days</div>
                                    <div className="text-lg font-bold text-purple-900">
                                      {leave.total_days}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {leave.approved_at && (
                              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  </div>
                                  <span>
                                    Approved on {new Date(leave.approved_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                    {leave.approved_by && (
                                      <span className="ml-1 font-semibold text-gray-800">
                                        by {leave.approved_by}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                {isOngoing && (
                                  <div className="flex items-center gap-1 text-xs font-semibold text-purple-700">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                    Active Leave Period
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </Card>
      )}

      {/* Pending & Rejected Leave Requests */}
      {(leaveRequests.filter(l => l.status === 'pending' || l.status === 'rejected').length > 0) && !isLoading && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Other Leave Requests
            </h3>
            
            <div className="space-y-3">
              {leaveRequests
                .filter(leave => leave.status === 'pending' || leave.status === 'rejected')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((leave) => {
                  const startDate = new Date(leave.start_date + 'T00:00:00');
                  const endDate = new Date(leave.end_date + 'T00:00:00');
                  const isPending = leave.status === 'pending';

                  return (
                    <div 
                      key={leave.id}
                      className={`p-4 rounded-lg border-2 ${
                        isPending 
                          ? 'bg-yellow-50 border-yellow-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {isPending ? (
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                              <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                              <XCircle className="w-5 h-5 text-red-600" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-base font-bold text-gray-900">
                              {leave.total_days === 1 
                                ? startDate.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                : `${startDate.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })} - ${endDate.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}`
                              } ({leave.total_days} {leave.total_days === 1 ? 'day' : 'days'})
                            </h4>
                            {isPending ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                                ⏳ Pending
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                                ❌ Rejected
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{leave.reason}</p>
                          
                          {leave.status === 'rejected' && leave.rejection_reason && (
                            <div className="mt-2 pt-2 border-t border-red-200">
                              <p className="text-xs text-red-700">
                                <span className="font-semibold">Rejection reason:</span> {leave.rejection_reason}
                              </p>
                            </div>
                          )}

                          <div className="text-xs text-gray-500 mt-2">
                            Requested on {new Date(leave.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}