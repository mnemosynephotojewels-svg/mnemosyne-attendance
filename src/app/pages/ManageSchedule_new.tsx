import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, X, Users, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { currentAdmin } from '../../data/mockData';
import { getAllEmployees } from '../../services/employeeService';
import { scheduleApi } from '../../services/apiService';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { SchedulesTableSetupBanner } from '../components/SchedulesTableSetupBanner';
import { SchedulesTableErrorBanner } from '../components/SchedulesTableErrorBanner';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

// Date range filter presets
type DateRangePreset = 'today' | 'this_week' | 'next_week' | 'this_month' | 'next_month' | 'next_14_days' | 'next_30_days' | 'custom';

// Generate dates based on range
const generateDates = (startDate: Date, numDays: number) => {
  const dates = [];
  
  for (let i = 0; i < numDays; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }
  
  return dates;
};

// Helper function to generate initials from name
const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Helper function to generate color from employee ID
const getColorFromId = (id: string) => {
  const colors = [
    '#0B3060', '#6366F1', '#8B5CF6', '#EC4899', 
    '#14B8A6', '#F59E0B', '#EF4444', '#3B82F6',
    '#10B981', '#F97316', '#8B5CF6', '#06B6D4'
  ];
  
  // Use the numeric part of the ID to select a color
  const numericPart = id.replace(/\D/g, '');
  const index = parseInt(numericPart) % colors.length;
  return colors[index];
};

interface ScheduleModalProps {
  date: Date;
  employee: any;
  currentSchedule: any;
  onSave: (schedule: any) => void;
  onClose: () => void;
  setSupabaseError: (error: string | null) => void;
}

function ScheduleModal({ date, employee, currentSchedule, onSave, onClose, setSupabaseError }: ScheduleModalProps) {
  const [scheduleType, setScheduleType] = useState(currentSchedule?.type || 'working');
  const [startTime, setStartTime] = useState(currentSchedule?.start || '08:00');
  const [endTime, setEndTime] = useState(currentSchedule?.end || '17:00');
  const [gracePeriod, setGracePeriod] = useState(currentSchedule?.gracePeriod || 30);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    // Determine if this is an admin or employee schedule (outside try-catch for error logging)
    const isAdminSchedule = employee.isAdmin === true;
    const userNumber = employee.id;
    const userType = isAdminSchedule ? 'admin' : 'employee';

    try {
      let scheduleData = null;

      console.log('💾 Saving schedule for:', {
        name: employee.name,
        id: userNumber,
        userType: userType,
        isAdmin: isAdminSchedule,
        date: date.toISOString().split('T')[0]
      });

      // IMPORTANT: Validate that we have the user number for all schedules
      if (!userNumber) {
        console.error('❌ CRITICAL: user number is missing!', {
          employee,
          isAdmin: isAdminSchedule,
          adminProfile: JSON.parse(localStorage.getItem('mnemosyne_admin_profile') || '{}'),
          adminSession: JSON.parse(localStorage.getItem('adminSession') || '{}')
        });
        throw new Error(`${isAdminSchedule ? 'Admin' : 'Employee'} number is missing. Please log out and log in again.`);
      }
      
      if (scheduleType === 'working') {
        scheduleData = { type: 'working', start: startTime, end: endTime, gracePeriod };
        
        // Save to database if configured
        if (isSupabaseConfigured) {
          const payload: any = {
            schedule_date: date.toISOString().split('T')[0],
            shift_start: startTime,
            shift_end: endTime,
            is_day_off: false,
            grace_period: gracePeriod,
            user_type: userType,
          };
          
          // Add the correct identifier based on user type
          if (isAdminSchedule) {
            payload.admin_number = userNumber;
          } else {
            payload.employee_number = userNumber;
          }
          
          console.log('📤 Sending upsert payload:', payload);
          const result = await scheduleApi.upsert(payload);
          
          // Check for Supabase errors
          if (result.supabase_error || result.table_fix_required) {
            setSupabaseError(result.supabase_error);
          }
        }
      } else if (scheduleType === 'off') {
        scheduleData = { type: 'off' };
        
        // Save to database if configured
        if (isSupabaseConfigured) {
          const payload: any = {
            schedule_date: date.toISOString().split('T')[0],
            shift_start: null,
            shift_end: null,
            is_day_off: true,
            user_type: userType,
          };
          
          // Add the correct identifier based on user type
          if (isAdminSchedule) {
            payload.admin_number = userNumber;
          } else {
            payload.employee_number = userNumber;
          }
          
          console.log('📤 Sending upsert payload:', payload);
          const result2 = await scheduleApi.upsert(payload);
          
          // Check for Supabase errors
          if (result2.supabase_error || result2.table_fix_required) {
            setSupabaseError(result2.supabase_error);
          }
        }
      } else if (scheduleType === 'none') {
        // Clear schedule - set to null
        scheduleData = null;
        
        // Delete from database if configured
        if (isSupabaseConfigured) {
          try {
            const payload: any = {
              schedule_date: date.toISOString().split('T')[0],
              shift_start: null,
              shift_end: null,
              is_day_off: false, // Not a day off, just no schedule
              user_type: userType,
            };
            
            // Add the correct identifier based on user type
            if (isAdminSchedule) {
              payload.admin_number = userNumber;
            } else {
              payload.employee_number = userNumber;
            }
            
            console.log('📤 Sending clear schedule payload:', payload);
            await scheduleApi.upsert(payload);
          } catch (error) {
            console.error('Error clearing schedule:', error);
            // Don't throw, we still want to update the UI
          }
        }
      }
      
      onSave(scheduleData);
      toast.success(scheduleType === 'none' ? 'Schedule cleared successfully' : 'Schedule updated successfully');
      onClose();
    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ ERROR SAVING SCHEDULE');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Error message:', error?.message);
      console.error('Error object:', error);
      console.error('Employee ID:', userNumber);
      console.error('Employee Type:', userType);
      console.error('Is Admin Schedule:', isAdminSchedule);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Show detailed error message
      const errorMsg = error?.message || 'Failed to save schedule to database';
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#1F2937]">Edit Schedule</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Employee Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: employee.color }}
            >
              {employee.initials}
            </div>
            <div>
              <p className="font-bold text-[#1F2937]">{employee.name}</p>
              <p className="text-sm text-[#6B7280]">{formatDate(date)}</p>
            </div>
          </div>
        </div>

        {/* Schedule Type */}
        <div className="space-y-3 mb-6">
          <label className="block text-sm font-semibold text-[#1F2937] mb-3">
            Schedule Type
          </label>
          
          <div className="space-y-2">
            <button
              onClick={() => setScheduleType('working')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                scheduleType === 'working'
                  ? 'border-[#0B3060] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  scheduleType === 'working' ? 'border-[#0B3060]' : 'border-gray-400'
                }`}>
                  {scheduleType === 'working' && (
                    <div className="w-3 h-3 rounded-full bg-[#0B3060]"></div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[#1F2937]">Working Shift</p>
                  <p className="text-xs text-[#6B7280]">Set shift hours</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setScheduleType('off')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                scheduleType === 'off'
                  ? 'border-[#0B3060] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  scheduleType === 'off' ? 'border-[#0B3060]' : 'border-gray-400'
                }`}>
                  {scheduleType === 'off' && (
                    <div className="w-3 h-3 rounded-full bg-[#0B3060]"></div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[#1F2937]">Day Off</p>
                  <p className="text-xs text-[#6B7280]">Mark as off day</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setScheduleType('none')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                scheduleType === 'none'
                  ? 'border-[#0B3060] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  scheduleType === 'none' ? 'border-[#0B3060]' : 'border-gray-400'
                }`}>
                  {scheduleType === 'none' && (
                    <div className="w-3 h-3 rounded-full bg-[#0B3060]"></div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[#1F2937]">No Schedule</p>
                  <p className="text-xs text-[#6B7280]">Clear this day</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Shift Times (only for working) */}
        {scheduleType === 'working' && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-[#0B3060]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] mb-2">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-[#0B3060]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] mb-2">
                Grace Period (minutes)
              </label>
              <input
                type="number"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(parseInt(e.target.value))}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-[#0B3060]"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Schedule'
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function ManageSchedule() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [scheduleData, setScheduleData] = useState<any>({});
  const [dates, setDates] = useState<Date[]>(generateDates(new Date(), 14));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    date: Date | null;
    employee: any | null;
  }>({ isOpen: false, date: null, employee: null });
  const [currentAdminData, setCurrentAdminData] = useState<any>(currentAdmin);

  // Date range filter states
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('next_14_days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Department filter for super admins
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showDepartmentFilter, setShowDepartmentFilter] = useState(false);

  // Diagnostic helper
  const runDiagnostic = () => {
    console.clear();
    console.log('🔍 SCHEDULE DIAGNOSTIC REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Current Admin:', currentAdminData.name);
    console.log('Is Super Admin:', currentAdminData.isSuperAdmin);
    console.log('Department:', currentAdminData.team);
    console.log('Total Employees Shown:', filteredEmployees.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check each date
    let totalSchedules = 0;
    let workingCount = 0;
    let dayOffCount = 0;
    let paidLeaveCount = 0;

    dates.forEach(date => {
      const dateKey = date.toISOString().split('T')[0];
      const dateSchedules = scheduleData[dateKey];

      if (dateSchedules) {
        const scheduleCount = Object.keys(dateSchedules).length;
        totalSchedules += scheduleCount;

        console.log(`\n📅 ${dateKey}: ${scheduleCount} schedules`);

        Object.entries(dateSchedules).forEach(([empId, schedule]: [string, any]) => {
          const emp = filteredEmployees.find(e => e.id === empId);
          const empName = emp?.name || empId;

          if (schedule.type === 'working') {
            workingCount++;
            console.log(`  ✅ ${empName}: WORKING ${schedule.start} - ${schedule.end}`);
          } else if (schedule.type === 'off') {
            dayOffCount++;
            console.log(`  🚫 ${empName}: DAY OFF`);
          } else if (schedule.type === 'paid_leave') {
            paidLeaveCount++;
            console.log(`  🏖️  ${empName}: PAID LEAVE`);
          } else {
            console.warn(`  ⚠️  ${empName}: UNKNOWN TYPE -`, schedule);
          }
        });
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TOTALS:');
    console.log(`  Total schedules: ${totalSchedules}`);
    console.log(`  Working: ${workingCount}`);
    console.log(`  Day off: ${dayOffCount}`);
    console.log(`  Paid leave: ${paidLeaveCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    toast.success('Diagnostic report printed to console (F12)');
  };

  // Get today's date in local timezone (YYYY-MM-DD format)
  const today = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  // Get date range based on preset
  const getDateRange = (): { startDate: Date; endDate: Date; numDays: number } => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    let startDate = new Date(todayDate);
    let endDate = new Date(todayDate);

    switch (dateRangePreset) {
      case 'today':
        // Today only
        return { startDate, endDate, numDays: 1 };
      
      case 'this_week':
        // Start of current week (Sunday) to end of week (Saturday)
        const dayOfWeek = todayDate.getDay();
        startDate.setDate(todayDate.getDate() - dayOfWeek);
        endDate.setDate(startDate.getDate() + 6);
        return { startDate, endDate, numDays: 7 };
      
      case 'next_week':
        // Start of next week (Sunday) to end of next week (Saturday)
        const currentDay = todayDate.getDay();
        const daysUntilNextSunday = 7 - currentDay;
        startDate.setDate(todayDate.getDate() + daysUntilNextSunday);
        endDate.setDate(startDate.getDate() + 6);
        return { startDate, endDate, numDays: 7 };
      
      case 'this_month':
        // Start and end of current month
        startDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
        endDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
        const daysInMonth = endDate.getDate();
        return { startDate, endDate, numDays: daysInMonth };
      
      case 'next_month':
        // Start and end of next month
        startDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);
        endDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + 2, 0);
        const daysInNextMonth = endDate.getDate();
        return { startDate, endDate, numDays: daysInNextMonth };
      
      case 'next_14_days':
        endDate.setDate(todayDate.getDate() + 13);
        return { startDate, endDate, numDays: 14 };
      
      case 'next_30_days':
        endDate.setDate(todayDate.getDate() + 29);
        return { startDate, endDate, numDays: 30 };
      
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          return { startDate, endDate, numDays: diffDays };
        } else {
          // Default to next 14 days if custom dates not set
          endDate.setDate(todayDate.getDate() + 13);
          return { startDate, endDate, numDays: 14 };
        }
      
      default:
        endDate.setDate(todayDate.getDate() + 13);
        return { startDate, endDate, numDays: 14 };
    }
  };

  // Get label for current date range
  const getDateRangeLabel = (): string => {
    const { startDate, endDate } = getDateRange();
    
    if (dateRangePreset === 'today') return 'Today';
    if (dateRangePreset === 'this_week') return 'This Week';
    if (dateRangePreset === 'next_week') return 'Next Week';
    if (dateRangePreset === 'this_month') return 'This Month';
    if (dateRangePreset === 'next_month') return 'Next Month';
    if (dateRangePreset === 'next_14_days') return 'Next 14 Days';
    if (dateRangePreset === 'next_30_days') return 'Next 30 Days';
    
    if (dateRangePreset === 'custom') {
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    
    return 'Select Range';
  };

  // Apply date filter
  const handleApplyDateFilter = () => {
    if (dateRangePreset === 'custom' && (!customStartDate || !customEndDate)) {
      toast.error('Please select both start and end dates');
      return;
    }
    
    const { startDate, numDays } = getDateRange();
    const newDates = generateDates(startDate, numDays);
    setDates(newDates);
    setShowDateFilter(false);
    toast.success(`Schedule showing: ${getDateRangeLabel()}`);
  };

  // Update dates when preset changes (non-custom presets)
  useEffect(() => {
    if (dateRangePreset !== 'custom') {
      const { startDate, numDays } = getDateRange();
      const newDates = generateDates(startDate, numDays);
      setDates(newDates);
    }
  }, [dateRangePreset]);

  // Load admin data from localStorage
  const loadAdminData = () => {
    try {
      const profileData = localStorage.getItem('mnemosyne_admin_profile');
      const sessionData = localStorage.getItem('adminSession');
      const currentUser = localStorage.getItem('mnemosyne_current_user');

      let adminData = currentAdmin;

      if (profileData) {
        const profile = JSON.parse(profileData);
        console.log('✅ [ManageSchedule] Loading from profile:', profile.department);
        adminData = {
          ...currentAdmin,
          name: profile.username || profile.full_name || currentAdmin.name,
          team: profile.department || currentAdmin.team,
          role: profile.role || 'admin', // Track role (admin or super-admin)
          isSuperAdmin: profile.role === 'super-admin' || profile.role === 'super_admin',
        };
      } else if (sessionData) {
        const session = JSON.parse(sessionData);
        console.log('✅ [ManageSchedule] Loading from session:', session.department);
        adminData = {
          ...currentAdmin,
          name: session.username || session.full_name || currentAdmin.name,
          team: session.department || currentAdmin.team,
          role: session.role || 'admin',
          isSuperAdmin: session.role === 'super-admin' || session.role === 'super_admin',
        };
      } else if (currentUser) {
        const user = JSON.parse(currentUser);
        console.log('✅ [ManageSchedule] Loading from user:', user.department);
        adminData = {
          ...currentAdmin,
          name: user.username || user.full_name || currentAdmin.name,
          team: user.department || currentAdmin.team,
          role: user.role || 'admin',
          isSuperAdmin: user.role === 'super-admin' || user.role === 'super_admin',
        };
      }

      console.log('📌 [ManageSchedule] Department:', adminData.team);
      console.log('📌 [ManageSchedule] Role:', adminData.role);
      console.log('📌 [ManageSchedule] Is Super Admin:', adminData.isSuperAdmin);
      setCurrentAdminData(adminData);
      return adminData;
    } catch (error) {
      console.error('❌ [ManageSchedule] Error loading admin data:', error);
      return currentAdmin;
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      console.log('🔄 [ManageSchedule] Storage changed, reloading...');
      loadAdminData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdate', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdate', handleStorageChange);
    };
  }, []);

  // Fetch employees and schedules
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 FETCHING TEAM SCHEDULE DATA');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Current Admin:', currentAdminData.name);
        console.log('Admin Role:', currentAdminData.role);
        console.log('Is Super Admin:', currentAdminData.isSuperAdmin);
        console.log('Admin Team:', currentAdminData.team);

        // Fetch all employees
        const allEmployees = await getAllEmployees();
        console.log('Total Employees Fetched:', allEmployees.length);

        // Filter by current admin's department (unless super admin)
        let teamEmployees;

        if (currentAdminData.isSuperAdmin) {
          // Super admins see ALL employees from ALL departments
          console.log('🌟 SUPER ADMIN: Showing all employees from all departments');
          teamEmployees = allEmployees;
        } else {
          // Regular admins see only their department
          teamEmployees = allEmployees.filter(emp => {
            const empDepartment = emp.department || emp.teams?.name || emp.team;
            const matches = empDepartment === currentAdminData.team;

            console.log(`🔍 [ManageSchedule] Employee: ${emp.name}`);
            console.log(`   Department: "${empDepartment}"`);
            console.log(`   Admin Department: "${currentAdminData.team}"`);
            console.log(`   Match: ${matches ? '✅' : '❌'}`);

            return matches;
          });
        }

        console.log(`✅ Team Members to display:`, teamEmployees.length);
        
        // Get admin profile from localStorage
        let adminProfile = null;
        try {
          let profileData = localStorage.getItem('mnemosyne_admin_profile');
          
          // FIX: If profile doesn't exist, create it from adminSession
          if (!profileData) {
            console.log('⚠️ [ManageSchedule] Admin profile not found, creating from session...');
            const sessionData = localStorage.getItem('adminSession');
            if (sessionData) {
              const session = JSON.parse(sessionData);
              localStorage.setItem('mnemosyne_admin_profile', sessionData);
              profileData = sessionData;
              console.log('✅ [ManageSchedule] Admin profile created from session');
            }
          }
          
          if (profileData) {
            adminProfile = JSON.parse(profileData);
            console.log('👤 Found admin profile:', adminProfile.full_name);
            console.log('   Admin Number:', adminProfile.admin_number);
            console.log('   Department:', adminProfile.department);
          } else {
            console.log('⚠️ [ManageSchedule] No admin profile found in localStorage');
          }
        } catch (error) {
          console.error('Error loading admin profile:', error);
        }
        
        // Add the admin to the list
        let allTeamMembers = [...teamEmployees];
        if (adminProfile) {
          const isSuperAdmin = adminProfile.role === 'super-admin' || adminProfile.role === 'super_admin';
          const adminAsMember = {
            id: adminProfile.admin_number || adminProfile.username,
            name: adminProfile.full_name || adminProfile.username,
            position: isSuperAdmin ? 'Super Administrator' : 'Team Leader',
            department: adminProfile.department || 'Management',
            team: adminProfile.department || 'Management',
            email: adminProfile.email,
            isAdmin: true, // Flag to identify admin
            isSuperAdmin: isSuperAdmin,
          };

          // Add admin at the beginning of the list
          allTeamMembers.unshift(adminAsMember);
          console.log('✅ Added admin to schedule:', adminAsMember.name, `(${adminAsMember.position})`);
        }
        
        if (allTeamMembers.length === 0) {
          console.log('⚠️ No team members found for this team');
        } else {
          console.log('All Team Members (including admin):', allTeamMembers.map(e => e.name).join(', '));
        }
        
        // Add color and initials to all members
        const enrichedMembers = allTeamMembers.map(emp => ({
          ...emp,
          initials: getInitials(emp.name),
          color: emp.isSuperAdmin
            ? '#8B5CF6' // Purple for super admin
            : emp.isAdmin
            ? '#F7B34C' // Gold for regular admin
            : getColorFromId(emp.id), // Generated color for employees
        }));
        
        setEmployees(enrichedMembers);
        
        // Fetch schedules if Supabase is configured
        if (isSupabaseConfigured && enrichedMembers.length > 0) {
          const startDate = dates[0].toISOString().split('T')[0];
          const endDate = dates[dates.length - 1].toISOString().split('T')[0];
          
          console.log('Fetching schedules from', startDate, 'to', endDate);
          console.log('Team Members to fetch schedules for:', enrichedMembers.map(e => `${e.name} (${e.id}, ${e.isAdmin ? 'admin' : 'employee'})`).join(', '));
          
          const scheduleResponse = await scheduleApi.getAll({
            start_date: startDate,
            end_date: endDate,
          });

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📥 SCHEDULE DATA RECEIVED FROM SERVER');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('Total schedules:', scheduleResponse?.schedules?.length || 0);

          if (scheduleResponse?.schedules && scheduleResponse.schedules.length > 0) {
            console.log('First 3 schedules (sample):');
            scheduleResponse.schedules.slice(0, 3).forEach((s: any, idx: number) => {
              console.log(`  ${idx + 1}.`, {
                date: s.schedule_date,
                emp: s.employee_number,
                admin: s.admin_number,
                shift_start: s.shift_start,
                shift_end: s.shift_end,
                is_day_off: s.is_day_off,
                is_paid_leave: s.is_paid_leave,
              });
            });
          }
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          // Transform schedule data to our format
          const schedules: any = {};
          
          if (scheduleResponse?.schedules) {
            scheduleResponse.schedules.forEach((schedule: any) => {
              // Check if schedule belongs to any team member
              // Match by employee_number OR admin_number
              const matchingMember = enrichedMembers.find(emp =>
                emp.id === schedule.employee_number || emp.id === schedule.admin_number
              );

              if (matchingMember) {
                const userNumber = schedule.employee_number || schedule.admin_number;
                const dateKey = schedule.schedule_date;

                if (!schedules[dateKey]) {
                  schedules[dateKey] = {};
                }

                // IMPORTANT: Determine schedule type with proper validation
                // Priority: 1. Paid Leave, 2. Day Off, 3. Working (must have shift times)

                if (schedule.is_paid_leave === true) {
                  // Paid leave schedule entry created by leave approval
                  console.log(`📋 [${dateKey}] ${matchingMember.name}: PAID LEAVE`);
                  schedules[dateKey][matchingMember.id] = { type: 'paid_leave', hours: 8 };

                } else if (schedule.is_day_off === true) {
                  // Explicit day off
                  console.log(`📋 [${dateKey}] ${matchingMember.name}: DAY OFF`);
                  schedules[dateKey][matchingMember.id] = { type: 'off' };

                } else if (schedule.shift_start && schedule.shift_end) {
                  // Working schedule - MUST have both shift_start and shift_end
                  console.log(`📋 [${dateKey}] ${matchingMember.name}: WORKING ${schedule.shift_start} - ${schedule.shift_end}`);
                  schedules[dateKey][matchingMember.id] = {
                    type: 'working',
                    start: schedule.shift_start,
                    end: schedule.shift_end,
                    gracePeriod: schedule.grace_period || 30,
                  };

                } else {
                  // Invalid schedule: no shift times and not marked as day off
                  console.warn(`⚠️ [${dateKey}] ${matchingMember.name}: INVALID SCHEDULE DATA - treating as day off`);
                  console.warn('   Schedule data:', {
                    is_day_off: schedule.is_day_off,
                    is_paid_leave: schedule.is_paid_leave,
                    shift_start: schedule.shift_start,
                    shift_end: schedule.shift_end,
                  });
                  // Treat as day off by default to avoid showing broken schedules
                  schedules[dateKey][matchingMember.id] = { type: 'off' };
                }
              }
            });
          }
          
          setScheduleData(schedules);

          // Calculate summary statistics
          let totalSchedules = 0;
          let workingSchedules = 0;
          let dayOffSchedules = 0;
          let paidLeaveSchedules = 0;
          let invalidSchedules = 0;

          Object.values(schedules).forEach((dateSchedules: any) => {
            Object.values(dateSchedules).forEach((schedule: any) => {
              totalSchedules++;
              if (schedule.type === 'working') workingSchedules++;
              else if (schedule.type === 'off') dayOffSchedules++;
              else if (schedule.type === 'paid_leave') paidLeaveSchedules++;
              else invalidSchedules++;
            });
          });

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📊 SCHEDULE SUMMARY');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`Total dates with schedules: ${Object.keys(schedules).length}`);
          console.log(`Total schedules loaded: ${totalSchedules}`);
          console.log(`  ✅ Working schedules: ${workingSchedules}`);
          console.log(`  🚫 Day off schedules: ${dayOffSchedules}`);
          console.log(`  🏖️  Paid leave schedules: ${paidLeaveSchedules}`);
          if (invalidSchedules > 0) {
            console.warn(`  ⚠️  Invalid schedules: ${invalidSchedules}`);
          }
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          // AUTO-CLEANUP: Delete corrupted schedules automatically
          if (scheduleResponse?.schedules && scheduleResponse.schedules.length > 0) {
            const corruptedSchedules: Array<{ id: string; date: string }> = [];

            scheduleResponse.schedules.forEach((schedule: any) => {
              const isCorrupted =
                !schedule.shift_start &&
                !schedule.shift_end &&
                !schedule.is_day_off &&
                !schedule.is_paid_leave;

              if (isCorrupted) {
                const userNumber = schedule.employee_number || schedule.admin_number;
                if (userNumber) {
                  corruptedSchedules.push({
                    id: userNumber,
                    date: schedule.schedule_date
                  });
                }
              }
            });

            if (corruptedSchedules.length > 0) {
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('🧹 AUTO-CLEANUP: Found', corruptedSchedules.length, 'corrupted schedules');
              console.log('   Deleting automatically...');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

              // Delete corrupted schedules in background
              Promise.all(
                corruptedSchedules.map(({ id, date }) =>
                  fetch(`${API_BASE_URL}/schedules/${id}/${date}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${publicAnonKey}`,
                    }
                  })
                  .then(r => r.json())
                  .then(result => {
                    if (result.success) {
                      console.log(`  ✅ Deleted corrupted schedule: ${id} on ${date}`);
                    } else {
                      console.log(`  ⚠️ Could not delete: ${id} on ${date}`);
                    }
                  })
                  .catch(err => {
                    console.log(`  ❌ Error deleting ${id} ${date}:`, err.message);
                  })
                )
              ).then(() => {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ AUTO-CLEANUP COMPLETE');
                console.log('   Deleted', corruptedSchedules.length, 'corrupted schedules');
                console.log('   Refreshing page in 2 seconds...');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

                // Refresh page to show clean data
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              });
            }
          }
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
      } catch (err: any) {
        console.error('Error fetching schedule data:', err);
        setError(err.message || 'Failed to load schedule data');
        toast.error('Failed to load schedule data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dates, currentAdminData]);

  const formatDateHeader = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const isToday = (date: Date) => {
    // Convert date to local YYYY-MM-DD format for comparison
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const localDateStr = `${year}-${month}-${day}`;
    return localDateStr === today;
  };

  const handleCellClick = (date: Date, employee: any) => {
    setModalState({ isOpen: true, date, employee });
  };

  const handleSaveSchedule = (schedule: any) => {
    if (!modalState.date || !modalState.employee) return;

    const dateKey = modalState.date.toISOString().split('T')[0];
    setScheduleData(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [modalState.employee!.id]: schedule
      }
    }));
  };

  const getSchedule = (date: Date, employeeId: string) => {
    const dateKey = date.toISOString().split('T')[0];
    return scheduleData[dateKey]?.[employeeId];
  };

  // Get unique departments from employees (for super admin filter)
  const departments = React.useMemo(() => {
    if (!currentAdminData.isSuperAdmin) return [];

    const depts = new Set<string>();
    employees.forEach(emp => {
      if (!emp.isAdmin && !emp.isSuperAdmin) { // Exclude admins from department list
        const dept = emp.department || emp.team || 'Unassigned';
        depts.add(dept);
      }
    });
    return Array.from(depts).sort();
  }, [employees, currentAdminData.isSuperAdmin]);

  // Filter employees by selected department (for super admin)
  const filteredEmployees = React.useMemo(() => {
    if (!currentAdminData.isSuperAdmin || selectedDepartment === 'all') {
      return employees;
    }

    return employees.filter(emp => {
      // Always show admins/super admins
      if (emp.isAdmin || emp.isSuperAdmin) return true;

      // Filter regular employees by department
      const empDept = emp.department || emp.team || 'Unassigned';
      return empDept === selectedDepartment;
    });
  }, [employees, selectedDepartment, currentAdminData.isSuperAdmin]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#0B3060] animate-spin mx-auto mb-4" />
          <p className="text-[#6B7280] font-semibold">
            Loading {currentAdminData.isSuperAdmin ? 'all company' : `${currentAdminData.team} team`} schedules...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#1F2937] mb-2">Failed to Load Schedules</h3>
          <p className="text-[#6B7280] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No employees state
  if (employees.length === 0) {
    return (
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-[#0B3060]" />
          <div>
            <h1 className="text-[#1F2937] text-2xl font-bold">
              {currentAdminData.isSuperAdmin ? 'Manage Company Schedule' : 'Manage Team Schedule'}
            </h1>
            <p className="text-[#6B7280]">
              {currentAdminData.isSuperAdmin ? 'All Departments' : `${currentAdminData.team} Team`}
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#1F2937] mb-2">
            {currentAdminData.isSuperAdmin ? 'No Employees Found' : 'No Team Members Found'}
          </h3>
          <p className="text-[#6B7280] mb-6">
            {currentAdminData.isSuperAdmin
              ? 'There are no employees registered in the system yet.'
              : `There are no employees registered under the ${currentAdminData.team} team yet.`}
          </p>
          <button
            onClick={() => window.location.href = '/admin/register'}
            className="px-6 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-semibold"
          >
            Register New Employee
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-[#0B3060]" />
          <div>
            <h1 className="text-[#1F2937] text-2xl font-bold">
              {currentAdminData.isSuperAdmin ? 'Manage Company Schedule' : 'Manage Team Schedule'}
            </h1>
            <p className="text-[#6B7280]">
              {currentAdminData.isSuperAdmin ? 'All Departments' : `${currentAdminData.team} Team`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <Users className="w-5 h-5 text-[#0B3060]" />
            <span className="font-semibold text-[#0B3060]">
              {filteredEmployees.length}
              {currentAdminData.isSuperAdmin && selectedDepartment !== 'all' && ` of ${employees.length}`}
              {' '}
              {currentAdminData.isSuperAdmin ? 'Employees' : 'Members'}
            </span>
          </div>

          {/* Diagnostic Button */}
          <button
            onClick={runDiagnostic}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition-colors font-medium text-sm flex items-center gap-2"
            title="Run diagnostic and print schedule report to console"
          >
            <AlertCircle className="w-4 h-4" />
            Check Schedules
          </button>

          {/* Clear Corrupted Schedules Button */}
          <button
            onClick={async () => {
              if (!confirm('This will delete all corrupted schedules (schedules with null shift times). Continue?')) {
                return;
              }

              console.log('🧹 Clearing corrupted schedules...');

              let deletedCount = 0;

              // Find all corrupted schedules
              for (const [dateKey, dateSchedules] of Object.entries(scheduleData)) {
                for (const [empId, schedule] of Object.entries(dateSchedules as any)) {
                  const sched = schedule as any;

                  // Check if schedule is corrupted (no shift times but not marked as day off)
                  if (!sched.shift_start && !sched.shift_end && sched.type !== 'off' && sched.type !== 'paid_leave') {
                    console.log(`🗑️ Deleting corrupted schedule: ${empId} on ${dateKey}`);

                    try {
                      const response = await fetch(
                        `${API_BASE_URL}/schedules/${empId}/${dateKey}`,
                        {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${publicAnonKey}`,
                          }
                        }
                      );

                      if (response.ok) {
                        console.log(`✅ Deleted ${empId} ${dateKey}`);
                        deletedCount++;
                      } else {
                        console.error(`❌ Failed to delete ${empId} ${dateKey}`);
                      }
                    } catch (error) {
                      console.error(`❌ Error deleting ${empId} ${dateKey}:`, error);
                    }
                  }
                }
              }

              if (deletedCount > 0) {
                toast.success(`Deleted ${deletedCount} corrupted schedule(s). Refreshing page...`);
                setTimeout(() => window.location.reload(), 1500);
              } else {
                toast.info('No corrupted schedules found!');
              }
            }}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-300 transition-colors font-medium text-sm flex items-center gap-2"
            title="Delete all corrupted schedules (null shift times)"
          >
            <X className="w-4 h-4" />
            Clear Corrupted
          </button>
        </div>
      </div>

      {/* Setup Banner */}
      <SchedulesTableSetupBanner />

      {/* Error Banner - shows if there are column errors */}
      <SchedulesTableErrorBanner
        error={supabaseError || undefined}
        onDismiss={() => setSupabaseError(null)}
      />

      {/* Warning: Check Browser Console */}
      {supabaseError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                ⚠️ Schedules Not Saving to Database
              </h4>
              <p className="text-sm text-yellow-700 mb-2">
                Your schedules are only being saved to the KV store (temporary storage).
                Check the browser console (F12) for "INVALID SCHEDULE DATA" warnings to see which schedules have problems.
              </p>
              <p className="text-xs text-yellow-600">
                <strong>Action Required:</strong> You MUST run the SQL fix in Supabase to enable proper database storage.
                Click the red banner above for instructions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div className="flex gap-3">
        {/* Date Range Filter */}
        <div className="relative">
        <button
          onClick={() => setShowDateFilter(!showDateFilter)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-[#0B3060] rounded-lg hover:bg-blue-50 transition-colors font-medium text-[#0B3060]"
        >
          <Calendar className="w-5 h-5" />
          <span>{getDateRangeLabel()}</span>
          <span className="px-2 py-0.5 bg-[#0B3060] text-white rounded-full text-xs font-semibold">
            {dates.length} days
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showDateFilter ? 'rotate-180' : ''}`} />
        </button>

        {/* Date Filter Dropdown */}
        {showDateFilter && (
          <div className="absolute top-full left-0 mt-2 w-[420px] bg-white rounded-lg shadow-xl border-2 border-gray-200 z-50">
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm font-bold text-[#1F2937] mb-3">Quick Select</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'today', label: 'Today' },
                    { value: 'this_week', label: 'This Week' },
                    { value: 'next_week', label: 'Next Week' },
                    { value: 'this_month', label: 'This Month' },
                    { value: 'next_month', label: 'Next Month' },
                    { value: 'next_14_days', label: 'Next 14 Days' },
                    { value: 'next_30_days', label: 'Next 30 Days' },
                  ].map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setDateRangePreset(preset.value as DateRangePreset)}
                      className={`px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                        dateRangePreset === preset.value
                          ? 'bg-[#0B3060] text-white shadow-md'
                          : 'bg-gray-100 text-[#1F2937] hover:bg-gray-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-bold text-[#1F2937] mb-3">Custom Range</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#6B7280] mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        setCustomStartDate(e.target.value);
                        setDateRangePreset('custom');
                      }}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0B3060] focus:border-[#0B3060]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6B7280] mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        setCustomEndDate(e.target.value);
                        setDateRangePreset('custom');
                      }}
                      min={customStartDate}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0B3060] focus:border-[#0B3060]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDateFilter(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-[#6B7280] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyDateFilter}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#0B3060] rounded-lg hover:bg-[#1a4a8a] transition-colors"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Department Filter (Super Admin Only) */}
        {currentAdminData.isSuperAdmin && departments.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowDepartmentFilter(!showDepartmentFilter)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium text-purple-600"
            >
              <Users className="w-5 h-5" />
              <span>{selectedDepartment === 'all' ? 'All Departments' : selectedDepartment}</span>
              <span className="px-2 py-0.5 bg-purple-600 text-white rounded-full text-xs font-semibold">
                {selectedDepartment === 'all' ? departments.length : '1'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDepartmentFilter ? 'rotate-180' : ''}`} />
            </button>

            {/* Department Filter Dropdown */}
            {showDepartmentFilter && (
              <div className="absolute top-full left-0 mt-2 w-[300px] bg-white rounded-lg shadow-xl border-2 border-gray-200 z-50 max-h-96 overflow-y-auto">
                <div className="p-3 space-y-1">
                  <button
                    onClick={() => {
                      setSelectedDepartment('all');
                      setShowDepartmentFilter(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-sm font-medium rounded-lg transition-all ${
                      selectedDepartment === 'all'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-[#1F2937] hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>All Departments</span>
                      <span className="text-xs opacity-75">{employees.length} total</span>
                    </div>
                  </button>

                  {departments.map((dept) => {
                    const deptCount = employees.filter(e =>
                      !e.isAdmin && !e.isSuperAdmin && (e.department === dept || e.team === dept)
                    ).length;

                    return (
                      <button
                        key={dept}
                        onClick={() => {
                          setSelectedDepartment(dept);
                          setShowDepartmentFilter(false);
                        }}
                        className={`w-full px-3 py-2.5 text-left text-sm font-medium rounded-lg transition-all ${
                          selectedDepartment === dept
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-gray-100 text-[#1F2937] hover:bg-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{dept}</span>
                          <span className="text-xs opacity-75">{deptCount} employees</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Department Summary (Super Admin Only) */}
      {currentAdminData.isSuperAdmin && selectedDepartment === 'all' && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Department Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {departments.map((dept) => {
              const deptCount = employees.filter(e =>
                !e.isAdmin && !e.isSuperAdmin && (e.department === dept || e.team === dept)
              ).length;

              return (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className="bg-white hover:bg-purple-50 border border-gray-200 hover:border-purple-400 rounded-lg p-3 text-left transition-all"
                >
                  <p className="text-xs font-medium text-gray-600 truncate">{dept}</p>
                  <p className="text-lg font-bold text-gray-900">{deptCount}</p>
                  <p className="text-xs text-gray-500">employees</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule Grid Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Grid Container with Scroll */}
        <div className="overflow-auto max-h-[calc(100vh-250px)]">
          <div className="min-w-max">
            {/* Grid Table */}
            <table className="w-full border-collapse">
              {/* Header Row - Sticky Top */}
              <thead className="sticky top-0 z-20">
                <tr>
                  {/* Corner Cell */}
                  <th className="sticky left-0 z-30 bg-white border-b-2 border-r-2 border-gray-200">
                    <div className="w-40 h-20 flex items-center justify-center">
                      <span className="text-sm font-bold text-[#6B7280]">Date / Employee</span>
                    </div>
                  </th>
                  
                  {/* Employee Headers */}
                  {filteredEmployees.map((employee) => {
                    const empDept = employee.department || employee.team || 'Unassigned';
                    return (
                      <th
                        key={employee.id}
                        className="bg-white border-b-2 border-gray-200"
                        style={{ minWidth: '220px', maxWidth: '220px' }}
                      >
                        <div className="px-4 py-3 flex flex-col items-center gap-2">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${
                              employee.isSuperAdmin
                                ? 'ring-2 ring-purple-500 ring-offset-2'
                                : employee.isAdmin
                                ? 'ring-2 ring-[#F7B34C] ring-offset-2'
                                : ''
                            }`}
                            style={{ backgroundColor: employee.isSuperAdmin ? '#8B5CF6' : employee.color }}
                          >
                            {employee.initials}
                          </div>
                          <div className="text-center w-full">
                            <p className="font-bold text-[#1F2937] text-sm">{employee.name}</p>

                            {/* Department Badge (for employees, not admins) */}
                            {currentAdminData.isSuperAdmin && !employee.isAdmin && !employee.isSuperAdmin && (
                              <p className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full mb-1 truncate">
                                {empDept}
                              </p>
                            )}

                            {/* Position Badge */}
                            <p className={`text-xs font-semibold ${
                              employee.isSuperAdmin
                                ? 'text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full'
                                : employee.isAdmin
                                ? 'text-[#F7B34C] bg-[#F7B34C]/10 px-2 py-0.5 rounded-full'
                                : 'text-[#6B7280]'
                            }`}>
                              {employee.isSuperAdmin
                                ? '👑 Super Administrator'
                                : employee.isAdmin
                                ? '👔 Team Leader'
                                : employee.position || 'Full Time'}
                            </p>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Body Rows */}
              <tbody>
                {dates.map((date, dateIndex) => (
                  <tr key={dateIndex}>
                    {/* Date Cell - Sticky Left */}
                    <td className={`sticky left-0 z-10 border-r-2 border-b border-gray-200 ${
                      isToday(date) ? 'bg-blue-50' : 'bg-white'
                    }`} style={{ boxShadow: '2px 0 4px rgba(0,0,0,0.05)' }}>
                      <div className="w-40 px-4 py-4">
                        <p className={`font-bold ${isToday(date) ? 'text-[#0B3060]' : 'text-[#1F2937]'}`}>
                          {formatDateHeader(date)}
                        </p>
                        {isToday(date) && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-[#0B3060] text-white text-xs rounded-full font-semibold">
                            Today
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Schedule Cells */}
                    {filteredEmployees.map((employee) => {
                      const schedule = getSchedule(date, employee.id);

                      return (
                        <td
                          key={employee.id}
                          className="border-b border-gray-100 bg-white"
                          style={{ minWidth: '220px', maxWidth: '220px' }}
                        >
                          <div className="p-3">
                            {/* Empty Cell */}
                            {!schedule && (
                              <button
                                onClick={() => handleCellClick(date, employee)}
                                className="group w-full h-16 border-2 border-dashed border-gray-200 rounded-lg hover:border-[#0B3060] hover:bg-blue-50 transition-all flex items-center justify-center"
                              >
                                <Plus className="w-6 h-6 text-gray-300 group-hover:text-[#0B3060] transition-colors" />
                              </button>
                            )}

                            {/* Working Shift Cell */}
                            {schedule?.type === 'working' && (
                              <button
                                onClick={() => handleCellClick(date, employee)}
                                className="w-full px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all"
                              >
                                <div className="flex items-center gap-2 justify-center">
                                  <Clock className="w-4 h-4 text-indigo-600" />
                                  <span className="font-semibold text-indigo-700 text-sm">
                                    {schedule.start} - {schedule.end}
                                  </span>
                                </div>
                              </button>
                            )}

                            {/* Day Off Cell */}
                            {schedule?.type === 'off' && (
                              <button
                                onClick={() => handleCellClick(date, employee)}
                                className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-all"
                              >
                                <span className="font-semibold text-gray-600 text-sm">OFF</span>
                              </button>
                            )}

                            {/* Paid Leave Cell */}
                            {schedule?.type === 'paid_leave' && (
                              <button
                                onClick={() => handleCellClick(date, employee)}
                                className="w-full px-4 py-3 bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg hover:shadow-md transition-all"
                              >
                                <div className="text-center">
                                  <div className="text-sm font-bold text-yellow-900 mb-1">Paid Leave</div>
                                  <div className="text-xs text-yellow-600">8 Hours</div>
                                </div>
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {modalState.isOpen && modalState.date && modalState.employee && (
        <ScheduleModal
          date={modalState.date}
          employee={modalState.employee}
          currentSchedule={getSchedule(modalState.date, modalState.employee.id)}
          onSave={handleSaveSchedule}
          onClose={() => setModalState({ isOpen: false, date: null, employee: null })}
          setSupabaseError={setSupabaseError}
        />
      )}
    </div>
  );
}