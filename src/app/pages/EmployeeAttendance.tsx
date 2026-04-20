import React from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { attendanceRecords, currentEmployee } from '../../data/mockData';
import { Calendar, RefreshCw, AlertCircle, ChevronDown, X, Download, Clock } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { attendanceApi, scheduleApi } from '../../services/apiService';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { useEmployeeSession } from '../hooks/useEmployeeSession';
import { toast } from 'sonner';
import { exportEmployeeAttendanceToCSV } from '../utils/exportUtils';

// Date range filter presets
type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'custom';

export function EmployeeAttendance() {
  const { employee, isLoading: isLoadingSession } = useEmployeeSession();
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [scheduleData, setScheduleData] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  
  // Date range filter states
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('last_30_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Load attendance records and schedules from database
  const loadAttendance = async () => {
    if (!employee || !isSupabaseConfigured) {
      console.log('⚠️ Skipping attendance load: employee or Supabase not configured');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📥 Loading attendance for employee:', employee.employee_number);
      
      // Initialize scheduleMap outside the if block so it's accessible throughout
      const scheduleMap = new Map();
      
      // Load schedules for this employee
      const scheduleResult = await scheduleApi.getAll({
        employee_number: employee.employee_number
      });
      
      if (scheduleResult.success && scheduleResult.data) {
        scheduleResult.data.forEach((schedule: any) => {
          scheduleMap.set(schedule.schedule_date, schedule);
        });
        setScheduleData(scheduleMap);
        console.log(`✅ Loaded ${scheduleResult.data.length} schedule(s)`);
      }
      
      // Load attendance records
      const result = await attendanceApi.getRecords({
        employee_number: employee.employee_number
      });

      console.log('📊 Attendance API response:', result);

      if (result.success && result.data) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 ATTENDANCE HISTORY - RECORDS RECEIVED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Raw attendance data:', result.data);
        console.log('📊 Total attendance records received:', result.data.length);
        
        // Check for duplicate records (same date, same employee)
        const dateCount = new Map();
        result.data.forEach((record: any) => {
          const date = record.date || new Date(record.timestamp || record.created_at).toISOString().split('T')[0];
          dateCount.set(date, (dateCount.get(date) || 0) + 1);
        });
        
        const duplicateDates = Array.from(dateCount.entries()).filter(([_, count]) => count > 1);
        if (duplicateDates.length > 0) {
          console.warn('⚠️ DUPLICATE RECORDS DETECTED:', duplicateDates);
          console.warn('   These dates have multiple records:', duplicateDates.map(([date, count]) => `${date} (${count} records)`).join(', '));
        }
        
        // Log sample records with time_in/time_out
        const recordsWithTimeIn = result.data.filter((r: any) => r.time_in);
        const recordsWithTimeOut = result.data.filter((r: any) => r.time_out);
        console.log('📊 Records with time_in:', recordsWithTimeIn.length);
        console.log('📊 Records with time_out:', recordsWithTimeOut.length);
        
        if (recordsWithTimeIn.length > 0) {
          console.log('📊 Sample TIME IN record:', {
            id: recordsWithTimeIn[0].id,
            employee_number: recordsWithTimeIn[0].employee_number,
            date: recordsWithTimeIn[0].date,
            time_in: recordsWithTimeIn[0].time_in,
            time_out: recordsWithTimeIn[0].time_out,
            status: recordsWithTimeIn[0].status,
            type: recordsWithTimeIn[0].type
          });
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Check for PAID_LEAVE records
        const paidLeaveRecords = result.data.filter((r: any) => 
          r.status === 'PAID_LEAVE' || r.status === 'paid_leave' || 
          r.type === 'PAID_LEAVE' || r.type === 'paid_leave'
        );
        console.log('📊 PAID_LEAVE records found:', paidLeaveRecords.length);
        if (paidLeaveRecords.length > 0) {
          console.log('📊 Sample PAID_LEAVE record:', paidLeaveRecords[0]);
        }
        
        // Group attendance by date
        const attendanceByDate = new Map();
        
        result.data.forEach((record: any) => {
          // CRITICAL: Normalize date to YYYY-MM-DD format to prevent duplicates
          let rawDate = record.date || new Date(record.timestamp || record.created_at).toISOString().split('T')[0];
          
          // Extra normalization - ensure it's always YYYY-MM-DD
          const normalizedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
          
          console.log('🔍 Processing record:', {
            id: record.id,
            normalizedDate: normalizedDate,
            raw_date: record.date,
            time_in: record.time_in,
            time_out: record.time_out,
            already_in_map: attendanceByDate.has(normalizedDate)
          });
          
          // Create or get entry for this date
          if (!attendanceByDate.has(normalizedDate)) {
            attendanceByDate.set(normalizedDate, {
              id: record.id,
              date: normalizedDate,
              checkIn: null,
              checkOut: null,
              checkInTime: null, // Store raw time for calculation
              checkOutTime: null, // Store raw time for calculation
              status: record.status || 'present',
            });
            console.log('  ✅ Created new entry for date:', normalizedDate);
          } else {
            console.log('  ♻️ Merging with existing entry for date:', normalizedDate);
          }
          
          const entry = attendanceByDate.get(normalizedDate);
          
          // CRITICAL FIX: Process time_in and time_out from the SAME record
          // Database stores both in one row, not separate rows
          
          // Process TIME IN (if exists in this record)
          if (record.time_in) {
            const timeIn = record.time_in;
            entry.checkInTime = timeIn; // Store raw time
            
            // Handle both full timestamp and HH:MM:SS format
            let timeInDate: Date;
            if (timeIn.includes('T') || timeIn.includes('Z') || timeIn.length > 10) {
              timeInDate = new Date(timeIn);
            } else {
              // It's HH:MM:SS format
              timeInDate = new Date(`2000-01-01T${timeIn}`);
            }
            
            entry.checkIn = timeInDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            
            console.log(`✅ [TIME IN] ${normalizedDate}: ${entry.checkIn} (raw: ${timeIn})`);
          }
          
          // Process TIME OUT (if exists in this record)
          if (record.time_out) {
            const timeOut = record.time_out;
            entry.checkOutTime = timeOut; // Store raw time
            
            // Handle both full timestamp and HH:MM:SS format
            let timeOutDate: Date;
            if (timeOut.includes('T') || timeOut.includes('Z') || timeOut.length > 10) {
              timeOutDate = new Date(timeOut);
            } else {
              // It's HH:MM:SS format
              timeOutDate = new Date(`2000-01-01T${timeOut}`);
            }
            
            entry.checkOut = timeOutDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            
            console.log(`✅ [TIME OUT] ${normalizedDate}: ${entry.checkOut} (raw: ${timeOut})`);
          }
          
          // Check for PAID_LEAVE - this is created when leave requests are approved
          if (record.type === 'PAID_LEAVE' || record.status === 'PAID_LEAVE' || record.status === 'paid_leave') {
            // Handle PAID_LEAVE records - show as paid leave
            entry.checkIn = 'Paid Leave';
            entry.checkOut = 'Paid Leave';
            entry.checkInTime = '08:00:00';
            entry.checkOutTime = '17:00:00';
            entry.status = 'paid_leave';
            entry.isPaidLeave = true;
            
            console.log('💼 [EmployeeAttendance] Processing PAID_LEAVE record:', {
              date: normalizedDate,
              recordType: record.type,
              recordStatus: record.status,
              leave_request_id: record.leave_request_id
            });
          }
          
          // Check for ABSENT records (should not appear for approved leaves)
          if (record.type === 'ABSENT' || record.status === 'ABSENT' || record.status === 'absent') {
            // Handle ABSENT records (unpaid leave)
            entry.checkIn = '--';
            entry.checkOut = '--';
            entry.checkInTime = null;
            entry.checkOutTime = null;
            entry.status = 'absent';
            entry.isAbsent = true;
            
            console.log('❌ [EmployeeAttendance] Processing ABSENT record:', {
              date: normalizedDate,
              leave_request_id: record.leave_request_id
            });
          }
          
          // Update status if provided (but don't override paid_leave or absent)
          if (record.status && !entry.isPaidLeave && !entry.isAbsent) {
            entry.status = record.status;
          }
        });

        // Calculate status based on hours worked
        const calculateStatus = (checkInTime: string | null, checkOutTime: string | null): string => {
          if (!checkInTime || !checkOutTime) {
            return 'present'; // Default if missing times
          }

          try {
            // Parse times (format: HH:MM:SS or HH:MM)
            const [inHours, inMinutes] = checkInTime.split(':').map(Number);
            const [outHours, outMinutes] = checkOutTime.split(':').map(Number);

            // Calculate total minutes worked
            const checkInMinutes = inHours * 60 + inMinutes;
            const checkOutMinutes = outHours * 60 + outMinutes;
            
            let totalMinutes = checkOutMinutes - checkInMinutes;
            
            // Handle overnight shifts
            if (totalMinutes < 0) {
              totalMinutes += 24 * 60;
            }

            // Convert to hours
            const hoursWorked = totalMinutes / 60;

            // Determine status based on hours worked
            if (hoursWorked < 8) {
              return 'early-out';
            } else if (hoursWorked >= 8 && hoursWorked <= 8.25) { // Allow 15 min grace period for "on time"
              return 'on-time';
            } else {
              return 'overtime';
            }
          } catch (error) {
            console.error('Error calculating hours worked:', error);
            return 'present';
          }
        };

        // Convert to array and filter out records without work schedules
        const myRecords = Array.from(attendanceByDate.values())
          .map((record: any) => {
            // Don't recalculate status if it's already paid_leave, absent, ON_TIME, or LATE
            if (record.status === 'paid_leave' || record.status === 'absent' || record.status === 'ON_TIME' || record.status === 'LATE') {
              return record;
            }
            
            // Calculate status based on time worked only if no status is set
            if (record.checkInTime && record.checkOutTime) {
              record.status = calculateStatus(record.checkInTime, record.checkOutTime);
            }
            return record;
          })
          .filter((record: any) => {
            const schedule = scheduleMap.get(record.date);
            // Show paid leave and absent records regardless of schedule
            if (record.status === 'paid_leave' || record.status === 'absent') {
              return true;
            }
            // Only show records with actual work schedules (exclude no schedule and day off)
            if (!schedule) {
              return record.checkIn !== null; // Show if there's actual attendance
            }
            return !schedule.is_day_off; // Exclude day off records
          })
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // CRITICAL: Final deduplication step - ensure absolutely no duplicate dates
        const uniqueRecordsByDate = new Map();
        myRecords.forEach((record: any) => {
          const dateKey = record.date; // Use the date as the unique key
          if (!uniqueRecordsByDate.has(dateKey)) {
            uniqueRecordsByDate.set(dateKey, record);
          } else {
            console.warn('⚠️ Duplicate date found and removed:', dateKey, 'keeping first occurrence');
          }
        });
        
        const finalRecords = Array.from(uniqueRecordsByDate.values())
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        console.log('📊 Before deduplication:', myRecords.length, 'records');
        console.log('📊 After deduplication:', finalRecords.length, 'records');
        
        setAttendanceData(finalRecords);
        console.log(`✅ Loaded ${finalRecords.length} attendance record(s) (filtered and deduplicated)`);
      } else {
        console.warn('⚠️ Attendance API returned no data or was unsuccessful:', result);
        setAttendanceData([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading attendance:', error);
      const errorMessage = error?.message || 'Failed to load attendance records';
      toast.error(errorMessage, {
        description: 'Check console for details'
      });
      setAttendanceData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadAttendance();
  }, [employee]);

  // Get date range based on preset
  const getDateRange = useCallback((): { startDate: Date; endDate: Date } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
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
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate.setTime(new Date(customEndDate).getTime());
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
    if (dateRangePreset === 'custom' && (!customStartDate || !customEndDate)) {
      toast.error('Please select both start and end dates');
      return;
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
  const handleExportFiltered = () => {
    try {
      const { startDate, endDate } = getDateRange();
      exportEmployeeAttendanceToCSV(
        filteredAttendanceData,
        employee?.full_name || 'Employee',
        { startDate, endDate }
      );
      toast.success(`Exported ${filteredAttendanceData.length} records`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export records');
    }
  };

  // Filter attendance data based on date range
  const filteredAttendanceData = useMemo(() => {
    const { startDate, endDate } = getDateRange();
    
    const filtered = attendanceData.filter((record) => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate >= startDate && recordDate <= endDate;
    });
    
    return filtered;
  }, [attendanceData, dateRangePreset, customStartDate, customEndDate, getDateRange]);

  // Calculate yearly leave balance (all time, not just filtered)
  const yearlyLeaveStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearlyData = attendanceData.filter(record => {
      const recordYear = new Date(record.date).getFullYear();
      return recordYear === currentYear;
    });

    let paidLeaveUsed = 0;

    console.log('📊 [YearlyLeaveStats] Calculating leave balance for year:', currentYear);
    console.log('📊 [YearlyLeaveStats] Total records this year:', yearlyData.length);

    yearlyData.forEach(record => {
      const status = record.status?.toLowerCase();
      console.log('   - Record:', {
        date: record.date,
        status: record.status,
        statusLower: status,
        isPaidLeave: record.isPaidLeave
      });
      
      // All approved leave counts as paid leave
      if (status === 'paid_leave' || record.isPaidLeave) {
        paidLeaveUsed++;
        console.log('     ✅ Counted as paid leave');
      }
    });

    const totalLeaveAllowance = 12;
    const remainingPaidLeave = Math.max(0, totalLeaveAllowance - paidLeaveUsed);

    console.log('📊 [YearlyLeaveStats] Summary:', {
      paidLeaveUsed,
      remainingPaidLeave,
      totalLeaveAllowance
    });

    return {
      paidLeaveUsed,
      remainingPaidLeave,
      totalLeaveAllowance
    };
  }, [attendanceData]);

  if (isLoadingSession || !employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#6B7280]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Gradient Background */}
      <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-2xl p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">My Attendance History</h1>
            <p className="text-sm text-white/80 mt-1">Track your attendance records and work hours</p>
          </div>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 rounded-lg p-4 flex items-start gap-3 shadow-sm">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-yellow-900">Demo Mode</p>
            <p className="text-xs text-yellow-700 mt-1">
              Connect to Supabase to view your real attendance records
            </p>
          </div>
        </div>
      )}

      {/* Date Range Filter and Actions - Enhanced */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-xl p-4 shadow-md border border-gray-100">
        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-semibold">{getDateRangeLabel()}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDateFilter ? 'rotate-180' : ''}`} />
          </button>
          
          {dateRangePreset !== 'last_30_days' && (
            <button
              onClick={handleClearDateFilter}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200"
            >
              <X className="w-4 h-4" />
              Clear Filter
            </button>
          )}

          {/* Date Filter Dropdown - Enhanced */}
          {showDateFilter && (
            <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-sm font-bold text-[#1F2937] mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#0B3060]" />
                    Quick Select
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'today', label: 'Today' },
                      { value: 'yesterday', label: 'Yesterday' },
                      { value: 'this_week', label: 'This Week' },
                      { value: 'last_week', label: 'Last Week' },
                      { value: 'this_month', label: 'This Month' },
                      { value: 'last_month', label: 'Last Month' },
                      { value: 'last_30_days', label: 'Last 30 Days' },
                      { value: 'last_90_days', label: 'Last 90 Days' },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setDateRangePreset(preset.value as DateRangePreset)}
                        className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                          dateRangePreset === preset.value
                            ? 'bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white shadow-md transform scale-105'
                            : 'bg-gray-50 text-[#1F2937] hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-5">
                  <p className="text-sm font-bold text-[#1F2937] mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#0B3060]" />
                    Custom Range
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7280] mb-2">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => {
                          setCustomStartDate(e.target.value);
                          setDateRangePreset('custom');
                        }}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B3060] focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7280] mb-2">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => {
                          setCustomEndDate(e.target.value);
                          setDateRangePreset('custom');
                        }}
                        min={customStartDate}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0B3060] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-5 border-t border-gray-200">
                  <button
                    onClick={() => setShowDateFilter(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyDateFilter}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-xl hover:shadow-lg transition-all transform hover:scale-105"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
          
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">
              Showing <span className="font-bold text-[#0B3060]">{filteredAttendanceData.length}</span> records
            </span>
          </div>

          <button
            onClick={handleExportFiltered}
            disabled={filteredAttendanceData.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-105 text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Attendance Table - Enhanced Design */}
      <Card className="overflow-hidden border-0 shadow-lg">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-full animate-pulse"></div>
              <RefreshCw className="w-8 h-8 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin" />
            </div>
            <p className="text-[#0B3060] font-semibold mt-4">Loading attendance records...</p>
            <p className="text-sm text-gray-500 mt-1">Please wait</p>
          </div>
        ) : filteredAttendanceData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <th className="px-6 py-5 text-left text-xs font-bold text-[#0B3060] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-[#0B3060] uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-[#0B3060] uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="px-6 py-5 text-left text-xs font-bold text-[#0B3060] uppercase tracking-wider">
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      {isSupabaseConfigured && (
                        <button
                          onClick={loadAttendance}
                          disabled={isLoading}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#0B3060] text-xs font-bold hover:bg-blue-50 rounded-lg transition-all shadow-sm border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Refresh attendance data"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredAttendanceData.map((record, index) => (
                  <tr 
                    key={record.date} 
                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Calendar className="w-5 h-5 text-[#0B3060]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1F2937]">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-[#6B7280] font-medium">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'long'
                            })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm text-[#1F2937] font-semibold">
                          {record.checkIn || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-4 h-4 text-red-600" />
                        </div>
                        <span className="text-sm text-[#1F2937] font-semibold">
                          {record.checkOut || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <StatusBadge status={record.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-80 bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <AlertCircle className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-[#1F2937] font-bold text-lg mb-2">No attendance records found</p>
            <p className="text-sm text-[#6B7280] mb-6">Try adjusting your date filter or check back later</p>
            {dateRangePreset !== 'last_30_days' && (
              <button
                onClick={handleClearDateFilter}
                className="px-6 py-3 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                Clear Filter & Show All
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}