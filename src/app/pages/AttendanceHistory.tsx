import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { attendanceRecords, currentAdmin, employees } from '../../data/mockData';
import { Calendar, Clock, Users, Filter, RefreshCw, Edit3, FileText, X, ChevronDown, Download, Loader2, AlertCircle } from 'lucide-react';
import { attendanceApi, employeeApi, scheduleApi } from '../../services/apiService';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { exportAdminAttendanceToCSV } from '../utils/exportUtils';
import { Calendar as CalendarPicker } from '../components/ui/calendar';
import type { DateRange } from 'react-day-picker';

// Date range filter presets
type DateRangePreset = 'today' | 'yesterday' | 'last_7_days' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'year_to_date' | 'custom';

export function AttendanceHistory() {
  const [attendanceData, setAttendanceData] = useState<any[]>(
    isSupabaseConfigured ? [] : attendanceRecords
  );
  const [teamEmployees, setTeamEmployees] = useState<any[]>([]);
  const [employeeSchedules, setEmployeeSchedules] = useState<Map<string, any>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentAdminData, setCurrentAdminData] = useState<any>(currentAdmin);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Force refresh trigger
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [showEmployeeHistory, setShowEmployeeHistory] = useState(false);

  // Date range filter states (for main list)
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

  // Ref to store the latest loadData function
  const loadDataRef = useRef<((showLoadingIndicator?: boolean) => Promise<void>) | null>(null);

  // Load admin data from localStorage
  const loadAdminData = () => {
    try {
      const profileData = localStorage.getItem('mnemosyne_admin_profile');
      const sessionData = localStorage.getItem('adminSession');
      const currentUser = localStorage.getItem('mnemosyne_current_user');

      let adminData = currentAdmin;

      if (profileData) {
        const profile = JSON.parse(profileData);
        console.log('✅ [AttendanceHistory] Loading from profile:', profile.department);
        adminData = {
          ...currentAdmin,
          name: profile.username || profile.full_name || currentAdmin.name,
          full_name: profile.full_name || currentAdmin.name,
          team: profile.department || currentAdmin.team,
        };
      } else if (sessionData) {
        const session = JSON.parse(sessionData);
        console.log('✅ [AttendanceHistory] Loading from session:', session.department);
        adminData = {
          ...currentAdmin,
          name: session.username || session.full_name || currentAdmin.name,
          full_name: session.full_name || currentAdmin.name,
          team: session.department || currentAdmin.team,
        };
      } else if (currentUser) {
        const user = JSON.parse(currentUser);
        console.log('✅ [AttendanceHistory] Loading from user:', user.department);
        adminData = {
          ...currentAdmin,
          name: user.username || user.full_name || currentAdmin.name,
          full_name: user.full_name || currentAdmin.name,
          team: user.department || currentAdmin.team,
        };
      }

      console.log('📌 [AttendanceHistory] Department:', adminData.team);
      setCurrentAdminData(adminData);
      return adminData;
    } catch (error) {
      console.error('❌ [AttendanceHistory] Error loading admin data:', error);
      return currentAdmin;
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      console.log('🔄 [AttendanceHistory] Storage changed, reloading...');
      loadAdminData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdate', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdate', handleStorageChange);
    };
  }, []);

  // Load employees, schedules, and attendance data from database
  const loadData = useCallback(async (showLoadingIndicator = true) => {
    if (!isSupabaseConfigured) {
      return; // Use mock data
    }

    try {
      if (showLoadingIndicator) {
        setIsRefreshing(true);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔄 FETCHING ATTENDANCE HISTORY FROM DATABASE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Team Leader:', currentAdminData.name);
      console.log('Team:', currentAdminData.team);

      // Step 1: Load all employees - try API first, fallback to direct Supabase query
      let myTeamEmployees: any[] = [];
      
      try {
        const employeeResult = await employeeApi.getAll();
        
        if (employeeResult.success && employeeResult.data) {
          console.log(`✅ Loaded ${employeeResult.data.length} employees from API`);
          
          // Filter to only current admin's team
          myTeamEmployees = employeeResult.data.filter(
            (emp: any) => emp.teams?.name === currentAdminData.team
          );
        }
      } catch (apiError: any) {
        console.warn('⚠️ API not available, querying Supabase directly:', apiError.message);
        
        // Fallback: Query Supabase directly
        if (!supabase) {
          throw new Error('Supabase client not initialized and API unavailable');
        }
        
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('*');
        
        if (employeesError) {
          console.error('❌ Failed to fetch employees from Supabase:', employeesError);
          throw employeesError;
        }
        
        console.log(`✅ Loaded ${employeesData?.length || 0} employees directly from Supabase`);
        
        // Filter to only current admin's team
        myTeamEmployees = (employeesData || []).filter(
          (emp: any) => emp.teams?.name === currentAdminData.team || emp.team === currentAdminData.team
        );
      }
      
      setTeamEmployees(myTeamEmployees);
      console.log(`✅ Filtered to ${myTeamEmployees.length} ${currentAdminData.team} team members`);
      
      // Get employee numbers for team members
      const teamEmployeeNumbers = myTeamEmployees.map((emp: any) => emp.employee_number);
        
      // Step 2: Load schedules - try API first, fallback to direct Supabase query
      try {
        const scheduleResult = await scheduleApi.getAll({});
        
        if (scheduleResult.success && scheduleResult.data) {
          console.log(`✅ Loaded ${scheduleResult.data.length} total schedules from API`);
          
          // Create a map of schedules by employee_number-date key
          const schedulesMap = new Map<string, any>();
          scheduleResult.data.forEach((schedule: any) => {
            if (teamEmployeeNumbers.includes(schedule.employee_number)) {
              const key = `${schedule.employee_number}-${schedule.schedule_date}`;
              schedulesMap.set(key, schedule);
            }
          });
          
          setEmployeeSchedules(schedulesMap);
          console.log(`✅ Mapped ${schedulesMap.size} schedules for team members`);
        }
      } catch (scheduleError: any) {
        console.warn('⚠️ Schedule API not available, querying Supabase directly:', scheduleError.message);
        
        // Fallback: Query Supabase directly
        if (supabase && teamEmployeeNumbers.length > 0) {
          const { data: schedulesData, error: schedulesError } = await supabase
            .from('employee_schedules')
            .select('*')
            .in('employee_number', teamEmployeeNumbers);
          
          if (!schedulesError && schedulesData) {
            console.log(`✅ Loaded ${schedulesData.length} schedules directly from Supabase`);
            
            const schedulesMap = new Map<string, any>();
            schedulesData.forEach((schedule: any) => {
              const key = `${schedule.employee_number}-${schedule.schedule_date}`;
              schedulesMap.set(key, schedule);
            });
            
            setEmployeeSchedules(schedulesMap);
            console.log(`✅ Mapped ${schedulesMap.size} schedules for team members`);
          } else {
            console.warn('⚠️ Failed to fetch schedules, continuing without schedule data');
            setEmployeeSchedules(new Map());
          }
        }
      }
        
        // Step 3: Load attendance records directly from Supabase with leave_requests join
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }

        // Get employee IDs and employee numbers for querying
        const teamEmployeeIds = myTeamEmployees.map((emp: any) => emp.id).filter(Boolean);
        
        if (teamEmployeeIds.length === 0) {
          console.log('ℹ️ Using employee_number for attendance query (no employee IDs available)');
          
          // Fallback: Try using employee_number if id is not available
          if (teamEmployeeNumbers.length > 0) {
            console.log(`📋 Fetching attendance using ${teamEmployeeNumbers.length} employee numbers`);
            
            // Fetch without join - just get attendance records
            const { data: attendanceRecordsData, error: attendanceError } = await supabase
              .from('attendance_records')
              .select('*')
              .in('employee_number', teamEmployeeNumbers)
              .order('date', { ascending: false })
              .limit(1000);
            
            if (attendanceError) {
              console.error('❌ Supabase attendance error:', attendanceError);
              throw new Error(`Failed to fetch attendance records: ${attendanceError.message}`);
            }
            
            // Manually map employee data from myTeamEmployees
            const employeeMap = new Map();
            myTeamEmployees.forEach((emp: any) => {
              employeeMap.set(emp.employee_number, emp);
            });
            
            // Map the data with employee info
            const processedAttendance = (attendanceRecordsData || []).map((record: any) => {
              const employee = employeeMap.get(record.employee_number);
              return {
                ...record,
                employee_number: record.employee_number,
                full_name: employee?.full_name || employee?.name || 'Unknown',
                attendance_date: record.date || new Date(record.created_at).toISOString().split('T')[0]
              };
            });
            
            console.log(`✅ Loaded ${processedAttendance.length} attendance records using employee_number`);
            setAttendanceData(processedAttendance);
            setLastRefreshTime(new Date());
            return;
          } else {
            setAttendanceData([]);
            setLastRefreshTime(new Date());
            return;
          }
        }

        console.log(`📋 Fetching attendance for ${teamEmployeeIds.length} employee IDs`);

        // Fetch attendance records without join - match employee data manually
        const { data: attendanceRecordsData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('*')
          .in('employee_number', teamEmployeeNumbers)
          .order('date', { ascending: false })
          .limit(1000);
        
        if (attendanceError) {
          console.error('❌ Supabase attendance error:', attendanceError);
          throw new Error(`Failed to fetch attendance records: ${attendanceError.message}`);
        }
        
        // Manually map employee data from myTeamEmployees
        const employeeMap = new Map();
        myTeamEmployees.forEach((emp: any) => {
          employeeMap.set(emp.employee_number, emp);
        });
        
        // Map the data to include employee info
        const processedAttendance = (attendanceRecordsData || []).map((record: any) => {
          const employee = employeeMap.get(record.employee_number);
          return {
            ...record,
            employee_number: record.employee_number,
            full_name: employee?.full_name || employee?.name || 'Unknown',
            attendance_date: record.date || new Date(record.created_at).toISOString().split('T')[0]
          };
        });
        
        console.log(`✅ Loaded ${processedAttendance.length} attendance records`);
        setAttendanceData(processedAttendance);
        setLastRefreshTime(new Date());
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error: any) {
      console.error('❌ Error loading attendance history:', error);
      if (showLoadingIndicator) {
        // Provide more specific error message
        const errorMessage = error?.message?.includes('Failed to fetch')
          ? 'Unable to connect to server. Please check your connection and try again.'
          : 'Failed to load attendance history. Please try again.';
        toast.error(errorMessage);
      }
    } finally {
      if (showLoadingIndicator) {
        setIsRefreshing(false);
      }
    }
  }, [currentAdminData.team, currentAdminData.name]); // Include all currentAdminData properties used in the function

  // Store the loadData function in the ref
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  // Initial data load - only when loadData changes (when admin data changes)
  useEffect(() => {
    console.log('🔄 [AttendanceHistory] loadData changed, loading data...');
    loadData();
  }, [loadData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log('🔄 [AttendanceHistory] Auto-refreshing attendance data...');
      loadData(false); // Silent refresh without loading indicator
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [loadData]); // Add loadData to dependencies

  // Listen for attendance update events from QR scanner or other components
  useEffect(() => {
    const handleAttendanceUpdate = (event: any) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📢 [AttendanceHistory] Attendance update event received!');
      console.log('   Event details:', event.detail);
      console.log('   Triggering immediate data refresh...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Show toast notification
      toast.info('Attendance updated! Refreshing history...');
      
      // Call loadData directly instead of using state trigger
      if (loadDataRef.current) {
        loadDataRef.current(true); // Show loading indicator
      } else {
        console.error('⚠️ [AttendanceHistory] loadDataRef.current is null!');
      }
    };

    console.log('✅ [AttendanceHistory] Event listener registered for attendanceUpdated');
    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);

    return () => {
      console.log('🔴 [AttendanceHistory] Event listener removed');
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
    };
  }, []); // Empty deps - use ref to always get latest loadData

  // Manual refresh handler
  const handleManualRefresh = () => {
    console.log('🔄 [AttendanceHistory] Manual refresh triggered');
    toast.info('Refreshing attendance history...');
    loadData(true);
  };

  // Get date range based on preset
  const getDateRange = useCallback((): { startDate: Date; endDate: Date } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let endDate = new Date(today);
    let startDate = new Date(today);

    switch (dateRangePreset) {
      case 'today':
        // Today only
        break;
      
      case 'yesterday':
        startDate.setDate(today.getDate() - 1);
        endDate.setDate(today.getDate() - 1);
        break;
      
      case 'last_7_days':
        startDate.setDate(today.getDate() - 7);
        break;
      
      case 'this_week':
        // Start of current week (Sunday)
        const dayOfWeek = today.getDay();
        startDate.setDate(today.getDate() - dayOfWeek);
        break;
      
      case 'last_week':
        // Start of last week (Sunday)
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        startDate = lastWeekStart;
        endDate.setTime(lastWeekEnd.getTime());
        break;
      
      case 'this_month':
        // Start of current month
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      
      case 'last_month':
        // Start and end of last month
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
      
      case 'year_to_date':
        startDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
        break;
      
      case 'custom':
        if (dateRangeCalendar?.from && dateRangeCalendar?.to) {
          startDate = new Date(dateRangeCalendar.from);
          endDate = new Date(dateRangeCalendar.to);
        } else if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate.setTime(new Date(customEndDate).getTime());
        } else {
          // Default to last 30 days if custom dates not set
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
    const labels: Record<string, string> = {
      'today': 'Today',
      'yesterday': 'Yesterday',
      'last_7_days': 'Last 7 Days',
      'this_week': 'This Week',
      'last_week': 'Last Week',
      'this_month': 'This Month',
      'last_month': 'Last Month',
      'last_30_days': 'Last 30 Days',
      'last_90_days': 'Last 90 Days',
      'year_to_date': 'Year to Date',
    };

    if (labels[dateRangePreset]) return labels[dateRangePreset];

    if (dateRangePreset === 'custom') {
      const { startDate, endDate } = getDateRange();
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
      // Get all attendance records for export (without date filter)
      const allRecords = attendanceData.map((record: any) => {
        const employeeNum = record.employee_number;
        const employeeData = teamEmployees.find((emp: any) => emp.employee_number === employeeNum);
        const date = record.attendance_date || record.date || new Date(record.timestamp || record.created_at).toISOString().split('T')[0];
        
        return {
          employeeId: employeeNum,
          employeeName: employeeData?.full_name || 'Unknown',
          date: date,
          timeIn: record.check_in_time ? new Date(`2000-01-01T${record.check_in_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
          timeOut: record.check_out_time ? new Date(`2000-01-01T${record.check_out_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
          status: record.attendance_status?.toLowerCase() || 'present',
          isCorrected: record.is_correction || false,
          isPaidLeave: record.attendance_status?.toLowerCase() === 'paid_leave',
          leaveInfo: (record.leave_type || record.leave_reason) ? {
            leaveType: record.leave_type,
            reason: record.leave_reason
          } : null
        };
      }).filter((record: any) => {
        // Only include records for team members
        const employeeData = teamEmployees.find((emp: any) => emp.employee_number === record.employeeId);
        return employeeData !== undefined;
      });

      exportAdminAttendanceToCSV(
        allRecords,
        currentAdminData.team
      );
      toast.success(`Exported ${allRecords.length} attendance records`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export records');
    }
  };

  const handleExportFiltered = () => {
    try {
      const { startDate, endDate } = getDateRange();
      exportAdminAttendanceToCSV(
        teamAttendanceRecords,
        currentAdminData.team,
        { startDate, endDate }
      );
      toast.success(`Exported ${teamAttendanceRecords.length} records`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export records');
    }
  };

  // Process attendance status based on schedule
  const getAttendanceStatus = (employeeNum: string, date: string, timeIn: string | null, timeOut: string | null) => {
    const scheduleKey = `${employeeNum}-${date}`;
    const schedule = employeeSchedules.get(scheduleKey);

    // If no schedule exists, check if timeIn exists
    if (!schedule) {
      return timeIn ? 'present' : null; // null means no status (blank)
    }

    // If it's a day off
    if (schedule.is_day_off) {
      return 'day off';
    }

    // If no time in on a scheduled workday
    if (!timeIn) {
      return 'absent';
    }

    // Check if late by comparing time in with scheduled start
    if (schedule.shift_start && timeIn) {
      const scheduledTime = new Date(`${date}T${schedule.shift_start}`);
      const actualTime = new Date(`${date}T${timeIn}`);
      
      if (actualTime > scheduledTime) {
        return 'late';
      }
    }

    return 'present';
  };

  // Filter attendance records to only show employees from the admin's team
  const teamAttendanceRecords = useMemo(() => {
    if (isSupabaseConfigured) {
      // Create a map of employee_number to employee data for quick lookup
      const employeeMap = new Map(
        teamEmployees.map(emp => [emp.employee_number, emp])
      );

      // Get date range for filtering
      const { startDate, endDate } = getDateRange();

      // Create a map to track attendance by employee and date
      const attendanceMap = new Map<string, any>();
      
      attendanceData.forEach((record: any) => {
        const employeeNum = record.employee_number;
        // Use attendance_date field from the new schema
        const date = record.attendance_date || record.date || new Date(record.timestamp || record.created_at).toISOString().split('T')[0];
        
        // FILTER: Skip records outside the selected date range
        const recordDate = new Date(date);
        recordDate.setHours(0, 0, 0, 0);
        if (recordDate < startDate || recordDate > endDate) {
          return; // Skip this record
        }
        
        const key = `${employeeNum}-${date}`;
        
        // Debug logging for corrected records
        if (record.is_correction) {
          console.log('📋 [AttendanceHistory] Processing corrected record:', {
            employee: employeeNum,
            type: record.type,
            correctionDate: record.date,
            timestamp: record.timestamp,
            created_at: record.created_at,
            finalDate: date
          });
        }
        
        // Look up employee data from our map
        const employeeData = employeeMap.get(employeeNum);
        
        if (!attendanceMap.has(key)) {
          attendanceMap.set(key, {
            employee_number: employeeNum,
            employee_name: employeeData?.full_name || 'Unknown',
            date: date,
            timeIn: null,
            timeOut: null,
            isCorrected: false,
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
          
          // Debug: Log the parsed time for corrected records
          if (record.is_correction) {
            console.log('⏰ [AttendanceHistory] Parsing TIME IN for corrected record:', {
              raw_time: record.check_in_time,
              parsed_timeObj: timeInObj.toISOString(),
              hours: timeInObj.getHours(),
              minutes: timeInObj.getMinutes(),
              formatted: timeInObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            });
          }
          
          entry.timeIn = timeInObj.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
          // Store the actual time for status calculation
          entry.timeInFull = record.check_in_time;
          // Mark if this was a corrected time-in
          if (record.is_correction) {
            entry.isCorrected = true;
          }
        }
        
        if (record.check_out_time) {
          const timeOutObj = new Date(`2000-01-01T${record.check_out_time}`);
          
          // Debug: Log the parsed time for corrected records
          if (record.is_correction) {
            console.log('⏰ [AttendanceHistory] Parsing TIME OUT for corrected record:', {
              raw_time: record.check_out_time,
              parsed_timeObj: timeOutObj.toISOString(),
              hours: timeOutObj.getHours(),
              minutes: timeOutObj.getMinutes(),
              formatted: timeOutObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            });
          }
          
          entry.timeOut = timeOutObj.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
          // Mark if this was a corrected time-out
          if (record.is_correction) {
            entry.isCorrected = true;
          }
        }
      });

      // Add all team members for each day in the date range
      teamEmployees.forEach((employee: any) => {
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const key = `${employee.employee_number}-${dateStr}`;
          
          if (!attendanceMap.has(key)) {
            attendanceMap.set(key, {
              employee_number: employee.employee_number,
              employee_name: employee.full_name,
              date: dateStr,
              timeIn: null,
              timeOut: null,
              timeInFull: null,
              leaveInfo: null,
            });
          }
        }
      });

      // Convert map to array and calculate status for display
      const records = Array.from(attendanceMap.values()).map((entry) => {
        // If it's a paid leave record, keep the status as paid_leave
        const status = entry.status === 'paid_leave' 
          ? 'paid_leave' 
          : getAttendanceStatus(
              entry.employee_number, 
              entry.date, 
              entry.timeInFull, 
              entry.timeOut
            );
        
        return {
          id: `${entry.employee_number}-${entry.date}`,
          employeeId: entry.employee_number,
          employeeName: entry.employee_name,
          date: entry.date,
          timeIn: entry.timeIn || '-',
          timeOut: entry.timeOut || '-',
          status: status,
          isCorrected: entry.isCorrected || false,
          isPaidLeave: entry.isPaidLeave || false,
          leaveInfo: entry.leaveInfo,
        };
      })
      // FILTER: Only show records with actual work schedules (exclude "No Schedule" and "Day Off")
      .filter(record => record.status !== null && record.status !== 'day off');

      // Sort by date (newest first) and then by employee name
      records.sort((a, b) => {
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.employeeName.localeCompare(b.employeeName);
      });

      return records;
    } else {
      // Mock data - filter by team
      const teamEmployeeIds = employees
        .filter(employee => employee.team === currentAdmin.team)
        .map(employee => employee.id);
      
      return attendanceRecords.filter(record => 
        teamEmployeeIds.includes(record.employeeId)
      );
    }
  }, [attendanceData, teamEmployees, employeeSchedules, getDateRange]);

  // Get team member count
  const teamMemberCount = useMemo(() => {
    if (isSupabaseConfigured) {
      return teamEmployees.length;
    }
    return employees.filter(employee => employee.team === currentAdmin.team).length;
  }, [teamEmployees]);

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
      case 'last_7_days':
        startDate.setDate(today.getDate() - 7);
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
      case 'year_to_date':
        startDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
        break;
      case 'custom':
        if (modalDateRangeCalendar?.from && modalDateRangeCalendar?.to) {
          startDate = new Date(modalDateRangeCalendar.from);
          endDate = new Date(modalDateRangeCalendar.to);
        } else if (modalCustomStartDate && modalCustomEndDate) {
          startDate = new Date(modalCustomStartDate);
          endDate.setTime(new Date(modalCustomEndDate).getTime());
        }
        break;
      default:
        startDate.setDate(today.getDate() - 30);
    }

    return { startDate, endDate };
  }, [modalDateRangePreset, modalCustomStartDate, modalCustomEndDate]);

  // Get label for modal date range
  const getModalDateRangeLabel = useCallback((): string => {
    const labels: Record<string, string> = {
      'today': 'Today',
      'yesterday': 'Yesterday',
      'last_7_days': 'Last 7 Days',
      'this_week': 'This Week',
      'last_week': 'Last Week',
      'this_month': 'This Month',
      'last_month': 'Last Month',
      'last_30_days': 'Last 30 Days',
      'year_to_date': 'Year to Date',
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

  // Get selected employee records with modal date filter
  const selectedEmployeeRecords = useMemo(() => {
    if (!selectedEmployee) return [];
    const allRecords = teamAttendanceRecords.filter(r => r.employeeId === selectedEmployee.employee_number);

    // Apply modal date filter
    const { startDate, endDate } = getModalDateRange();
    return allRecords.filter(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }, [selectedEmployee, teamAttendanceRecords, getModalDateRange]);

  // Export single employee attendance
  const handleExportEmployeeAttendance = () => {
    if (!selectedEmployee) return;

    try {
      const employeeRecords = selectedEmployeeRecords.map((record) => ({
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        date: record.date,
        timeIn: record.timeIn,
        timeOut: record.timeOut,
        status: record.status,
        isCorrected: record.isCorrected || false,
        isPaidLeave: record.isPaidLeave || false,
        leaveInfo: record.leaveInfo || null
      }));

      const { startDate, endDate } = getModalDateRange();
      exportAdminAttendanceToCSV(
        employeeRecords,
        `${selectedEmployee.full_name} - ${currentAdminData.team}`,
        { startDate, endDate }
      );
      toast.success(`Exported ${employeeRecords.length} records for ${selectedEmployee.full_name}`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export records');
    }
  };

  if (isRefreshing && teamEmployees.length === 0) {
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
            <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Attendance History</h1>
            <p className="text-sm text-[#6B7280]">Click on any employee to view their complete attendance history</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sync attendance data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        {/* Quick Presets */}
        {[
          { value: 'today', label: 'Today' },
        ].map((preset) => (
          <button
            key={preset.value}
            onClick={() => {
              setDateRangePreset(preset.value as DateRangePreset);
              setDateRangeCalendar(undefined);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dateRangePreset === preset.value
                ? 'bg-[#0B3060] text-white'
                : 'bg-white text-[#1F2937] border border-gray-300 hover:border-[#0B3060]'
            }`}
          >
            {preset.label}
          </button>
        ))}

        {/* Custom Date Range */}
        <div className="relative">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              dateRangePreset === 'custom'
                ? 'bg-[#0B3060] text-white'
                : 'bg-white text-[#1F2937] border border-gray-300 hover:border-[#0B3060]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>
              {dateRangePreset === 'custom' && dateRangeCalendar?.from && dateRangeCalendar?.to
                ? `${dateRangeCalendar.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dateRangeCalendar.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Custom Range'}
            </span>
          </button>

          {/* Calendar Modal */}
          {showDateFilter && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-[100]"
                onClick={() => setShowDateFilter(false)}
              />
              <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.3)] z-[101] max-w-5xl w-full mx-4 overflow-hidden border border-gray-200">
                {/* Minimal Header */}
                <div className="relative px-8 py-6 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-[#0B3060]">Choose Date Range</h3>
                      <p className="text-sm text-[#6B7280] mt-0.5">Select start and end dates</p>
                    </div>
                    <button
                      onClick={() => setShowDateFilter(false)}
                      className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-[#6B7280]" />
                    </button>
                  </div>
                </div>

                <div className="flex">
                  {/* Left Side - Calendar */}
                  <div className="flex-1 p-8 bg-white">
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
                      className="rounded-md"
                    />
                  </div>

                  {/* Right Side - Selection Summary */}
                  <div className="w-80 bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] p-8 flex flex-col">
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-[#F7B34C]" />
                        <h4 className="text-lg font-bold text-white">Selected Period</h4>
                      </div>
                      <div className="h-px bg-white/20"></div>
                    </div>

                    {dateRangeCalendar?.from || dateRangeCalendar?.to ? (
                      <div className="flex-1 space-y-6">
                        {/* Start Date */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">Start Date</p>
                          {dateRangeCalendar?.from ? (
                            <div>
                              <p className="text-3xl font-bold text-white">
                                {dateRangeCalendar.from.getDate()}
                              </p>
                              <p className="text-sm text-white/90 mt-1">
                                {dateRangeCalendar.from.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                          ) : (
                            <p className="text-white/50 text-sm">Not selected</p>
                          )}
                        </div>

                        {/* Arrow Indicator */}
                        <div className="flex justify-center">
                          <div className="w-12 h-12 rounded-full bg-[#F7B34C] flex items-center justify-center shadow-lg">
                            <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-[#0B3060]"></div>
                          </div>
                        </div>

                        {/* End Date */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">End Date</p>
                          {dateRangeCalendar?.to ? (
                            <div>
                              <p className="text-3xl font-bold text-white">
                                {dateRangeCalendar.to.getDate()}
                              </p>
                              <p className="text-sm text-white/90 mt-1">
                                {dateRangeCalendar.to.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                          ) : (
                            <p className="text-white/50 text-sm">Not selected</p>
                          )}
                        </div>

                        {/* Duration Display */}
                        {dateRangeCalendar?.from && dateRangeCalendar?.to && (
                          <div className="bg-[#F7B34C] rounded-2xl p-5 shadow-lg mt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-semibold text-[#0B3060] uppercase tracking-wider mb-1">Duration</p>
                                <p className="text-2xl font-bold text-[#0B3060]">
                                  {Math.ceil((dateRangeCalendar.to.getTime() - dateRangeCalendar.from.getTime()) / (1000 * 60 * 60 * 24)) + 1}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-[#0B3060]">Days</p>
                                <Clock className="w-8 h-8 text-[#0B3060] mt-1 ml-auto" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <Calendar className="w-16 h-16 text-white/30 mx-auto mb-4" />
                          <p className="text-white/70 text-sm">Select dates from calendar</p>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3 mt-auto pt-6">
                      <button
                        onClick={handleApplyDateFilter}
                        disabled={!dateRangeCalendar?.from || !dateRangeCalendar?.to}
                        className="w-full px-6 py-4 text-base font-bold text-[#0B3060] bg-[#F7B34C] rounded-xl hover:bg-[#f5a623] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                      >
                        Apply Selection
                      </button>
                      <button
                        onClick={() => {
                          setDateRangeCalendar(undefined);
                          setShowDateFilter(false);
                        }}
                        className="w-full px-6 py-3 text-sm font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Records Count */}
        <div className="ml-auto text-sm text-[#6B7280]">
          <span className="font-medium text-[#0B3060]">{teamAttendanceRecords.length}</span> records
        </div>
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
              {teamEmployees.map((employee) => {
                const employeeRecords = teamAttendanceRecords.filter(r => r.employeeId === employee.employee_number);
                const presentCount = employeeRecords.filter(r => r.status === 'present').length;
                const paidLeaveCount = employeeRecords.filter(r => r.status === 'paid_leave').length;
                const absentCount = employeeRecords.filter(r => r.status === 'absent').length;

                return (
                  <tr
                    key={employee.employee_number}
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
                          <p className="font-bold text-[#1F2937]">{employee.full_name}</p>
                          <p className="text-xs text-[#6B7280]">{employee.employee_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-[#1F2937]">{currentAdminData.team}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#6B7280]">{employee.position || 'Employee'}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 p-4" onClick={() => setShowEmployeeHistory(false)}>
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
                    <span>{selectedEmployee.employee_number}</span>
                    <span>•</span>
                    <span>{currentAdminData.team}</span>
                    <span>•</span>
                    <span>{selectedEmployee.position || 'Employee'}</span>
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
            <div className="px-6 py-4 bg-white border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowModalDateFilter(!showModalDateFilter)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-[#0B3060]" />
                    <span className="text-sm font-medium text-[#1F2937]">{getModalDateRangeLabel()}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showModalDateFilter ? 'rotate-180' : ''}`} />
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
                <span className="text-sm text-[#6B7280]">
                  Showing <span className="font-semibold text-[#0B3060]">{selectedEmployeeRecords.length}</span> records
                </span>
              </div>

              <button
                onClick={handleExportEmployeeAttendance}
                disabled={selectedEmployeeRecords.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#1a4a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export ({selectedEmployeeRecords.length})
              </button>
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
                            {record.isCorrected && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                                title="This time was corrected by admin approval"
                              >
                                <Edit3 className="w-3 h-3" />
                                Corrected
                              </span>
                            )}
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
              )}
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