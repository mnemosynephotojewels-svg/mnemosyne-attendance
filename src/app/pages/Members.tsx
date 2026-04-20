import React, { useState, useEffect } from 'react';
import { getAllEmployees } from '../../services/employeeService';
import { Employee, currentAdmin } from '../../data/mockData';
import {
  ChevronRight,
  Search,
  ArrowLeft,
  Users,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Hash,
  QrCode,
  Download,
  RefreshCw,
  Key,
  Eye,
  EyeOff,
  UserCircle,
  X
} from 'lucide-react';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { useAdminSession } from '../hooks/useAdminSession';
import { EmployeeAttendanceModal } from '../components/EmployeeAttendanceModal';
import { exportEmployeeAttendanceWithHoursToCSV } from '../utils/exportUtils';
import { Calendar as CalendarPicker } from '../components/ui/calendar';
import type { DateRange } from 'react-day-picker';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function Members() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentAdminData, setCurrentAdminData] = useState<any>(currentAdmin);

  // Modal states for clickable employee attendance
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState<any | null>(null);
  const [modalAttendanceRecords, setModalAttendanceRecords] = useState<any[]>([]);

  // Export filter states
  const [showExportFilter, setShowExportFilter] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  // Attendance history date filter states
  const [showAttendanceDateFilter, setShowAttendanceDateFilter] = useState(false);
  const [attendanceDateRange, setAttendanceDateRange] = useState<DateRange | undefined>(undefined);
  const [attendanceFilterPreset, setAttendanceFilterPreset] = useState<'all' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'this_week' | 'this_month' | 'last_month' | 'year_to_date' | 'custom'>('all');

  // Load admin data from localStorage
  const loadAdminData = () => {
    try {
      const profileData = localStorage.getItem('mnemosyne_admin_profile');
      const sessionData = localStorage.getItem('adminSession');
      const currentUser = localStorage.getItem('mnemosyne_current_user');

      let adminData = currentAdmin; // Fallback to mock data

      if (profileData) {
        const profile = JSON.parse(profileData);
        console.log('✅ [Members] Loading admin data from profile storage:', profile);
        console.log('📋 [Members] Department from profile:', profile.department);
        adminData = {
          ...currentAdmin,
          name: profile.username || profile.full_name || currentAdmin.name,
          full_name: profile.full_name || currentAdmin.name,
          email: profile.email || currentAdmin.email,
          phone_number: profile.phone_number || currentAdmin.phone_number,
          position: profile.position || currentAdmin.position,
          team: profile.department || currentAdmin.team, // Use department field
          profile_picture_url: profile.profile_picture_url,
        };
      } else if (sessionData) {
        const session = JSON.parse(sessionData);
        console.log('✅ [Members] Loading admin data from session:', session);
        console.log('📋 [Members] Department from session:', session.department);
        adminData = {
          ...currentAdmin,
          name: session.username || session.full_name || currentAdmin.name,
          full_name: session.full_name || currentAdmin.name,
          email: session.email || currentAdmin.email,
          phone_number: session.phone_number || currentAdmin.phone_number,
          position: session.role || currentAdmin.position,
          team: session.department || currentAdmin.team, // Use department field
          profile_picture_url: session.profile_picture_url,
        };
      } else if (currentUser) {
        const user = JSON.parse(currentUser);
        console.log('✅ [Members] Loading admin data from current user:', user);
        console.log('📋 [Members] Department from current user:', user.department);
        adminData = {
          ...currentAdmin,
          name: user.username || user.full_name || currentAdmin.name,
          full_name: user.full_name || currentAdmin.name,
          email: user.email || currentAdmin.email,
          phone_number: user.phone_number || currentAdmin.phone_number,
          position: user.position || currentAdmin.position,
          team: user.department || currentAdmin.team, // Use department field
          profile_picture_url: user.profile_picture_url,
        };
      }

      console.log('📊 [Members] Final Admin Data:', adminData);
      console.log('📌 [Members] Department that will be displayed:', adminData.team);
      
      setCurrentAdminData(adminData);
      return adminData;
    } catch (error) {
      console.error('❌ [Members] Error loading admin data:', error);
      return currentAdmin;
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('🔄 [Members] Storage changed, reloading admin data...');
      loadAdminData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdate', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdate', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [currentAdminData.team]); // Re-fetch when admin data changes

  // Fetch employee attendance when an employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeAttendance(selectedEmployee);
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const adminData = currentAdminData; // Use the loaded admin data
      console.log('🔍 [Members] Fetching employees for department:', adminData.team);

      if (!isSupabaseConfigured) {
        // Use mock data
        const data = await getAllEmployees();
        setEmployees(data);
        setIsLoading(false);
        return;
      }

      let result: any = null;
      
      try {
        // Try API first
        const response = await fetch(`${API_BASE_URL}/employees`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch employees from API');
        }

        result = await response.json();
      } catch (apiError: any) {
        console.warn('⚠️ [Members] API not available, querying Supabase directly:', apiError.message);
        
        // Fallback: Query Supabase directly
        if (supabase) {
          const { data: employeesData, error: employeesError } = await supabase
            .from('employees')
            .select('*');
          
          if (!employeesError && employeesData) {
            console.log(`✅ [Members] Fetched ${employeesData.length} employees directly from Supabase`);
            result = { success: true, data: employeesData };
          } else {
            throw new Error('Failed to fetch employees from both API and Supabase');
          }
        } else {
          throw apiError;
        }
      }

      if (result.success && result.data) {
        console.log(`✅ [Members] Fetched ${result.data.length} total employees`);
        
        // Filter by admin's department
        const allEmployees = result.data;
        const filtered = allEmployees.filter((emp: any) => {
          const employeeDepartment = emp.department || emp.teams?.name || emp.team;
          const matches = employeeDepartment === adminData.team;
          
          console.log(`🔍 [Members] Checking employee: ${emp.full_name}`);
          console.log(`   Employee department: "${employeeDepartment}"`);
          console.log(`   Admin department: "${adminData.team}"`);
          console.log(`   Match: ${matches ? '✅ YES' : '❌ NO'}`);
          
          return matches;
        });
        
        console.log(`✅ [Members] Filtered to ${filtered.length} employees in ${adminData.team} department`);
        setEmployees(filtered);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('❌ [Members] Error fetching employees:', error);
      toast.error('Failed to load employees');
      // Fallback to mock data
      const data = await getAllEmployees();
      setEmployees(data);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployeeAttendance = async (employeeNumber: string | null) => {
    if (!employeeNumber) {
      console.error('❌ Employee number is null or undefined');
      toast.error('Invalid employee number');
      setEmployeeAttendance([]);
      setIsLoadingAttendance(false);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      console.warn('⚠️ Supabase not configured, using mock data');
      setEmployeeAttendance([]);
      return;
    }

    try {
      setIsLoadingAttendance(true);
      console.log('📊 [Admin] Fetching attendance for employee:', employeeNumber);

      // First, get the employee's internal ID from the employee_number
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_number', employeeNumber)
        .maybeSingle();

      if (employeeError || !employeeData) {
        console.error('❌ Employee not found:', employeeNumber, employeeError);
        toast.error(`Employee ${employeeNumber} not found in database`);
        setEmployeeAttendance([]);
        setIsLoadingAttendance(false);
        return;
      }

      const employeeId = employeeData.id;
      console.log('✅ Found employee ID:', employeeId);

      // Fetch attendance records using employee_number
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_number', employeeNumber)
        .order('date', { ascending: false })
        .limit(100);

      if (attendanceError) {
        console.error('❌ Error fetching attendance:', attendanceError);
        console.error('   Error code:', attendanceError.code);
        console.error('   Error message:', attendanceError.message);
        console.error('   Error details:', attendanceError.details);
        console.error('   Error hint:', attendanceError.hint);

        const errorMessage = attendanceError.message || attendanceError.details || 'Failed to fetch attendance records';
        toast.error(`Database error: ${errorMessage}`);
        setEmployeeAttendance([]);
        setIsLoadingAttendance(false);
        return;
      }

      console.log(`📊 Found ${attendanceData?.length || 0} attendance records for ${employeeNumber}`);

      if (!attendanceData || attendanceData.length === 0) {
        console.log(`ℹ️ No attendance records found for ${employeeNumber}`);
        toast.info('No attendance records found for this employee');
        setEmployeeAttendance([]);
        setIsLoadingAttendance(false);
        return;
      }

      if (attendanceData && attendanceData.length > 0) {
        // Helper function to calculate hours worked
        const calculateHours = (timeIn: string, timeOut: string): number => {
          if (timeIn === '-' || timeOut === '-') return 0;

          try {
            const timeInDate = new Date(`2000-01-01 ${timeIn}`);
            const timeOutDate = new Date(`2000-01-01 ${timeOut}`);

            if (isNaN(timeInDate.getTime()) || isNaN(timeOutDate.getTime())) return 0;

            const diffMs = timeOutDate.getTime() - timeInDate.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            return diffHours > 0 ? diffHours : 0;
          } catch (error) {
            return 0;
          }
        };

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 [Admin] RAW ATTENDANCE DATA RECEIVED');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Total records:', attendanceData.length);
        
        // Check for duplicate dates in raw data
        const dateCount = new Map();
        attendanceData.forEach((record: any) => {
          const rawDate = record.date || record.attendance_date;
          // Normalize date to YYYY-MM-DD
          const normalizedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
          dateCount.set(normalizedDate, (dateCount.get(normalizedDate) || 0) + 1);
        });
        
        const duplicateDates = Array.from(dateCount.entries()).filter(([_, count]) => count > 1);
        if (duplicateDates.length > 0) {
          console.warn('⚠️ DUPLICATE DATES DETECTED IN RAW DATA:', duplicateDates);
          duplicateDates.forEach(([date, count]) => {
            console.warn(`   📅 ${date}: ${count} records`);
          });
        }

        // CRITICAL: Group attendance by normalized date to prevent duplicates
        const attendanceByDate = new Map();

        attendanceData.forEach((record: any) => {
          // Handle different date field names
          const rawDate = record.date || record.attendance_date;
          
          // CRITICAL: Normalize date to YYYY-MM-DD format
          const normalizedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
          
          console.log('🔍 Processing record:', {
            id: record.id,
            normalizedDate: normalizedDate,
            raw_date: rawDate,
            already_in_map: attendanceByDate.has(normalizedDate)
          });

          // Create or get entry for this date
          if (!attendanceByDate.has(normalizedDate)) {
            attendanceByDate.set(normalizedDate, record);
            console.log('  ✅ Created new entry for date:', normalizedDate);
          } else {
            console.log('  ♻️ Skipping duplicate for date:', normalizedDate);
            // Optionally merge data if needed, but for now we keep the first record
          }
        });

        console.log('📊 Before deduplication:', attendanceData.length, 'records');
        console.log('📊 After deduplication:', attendanceByDate.size, 'records');

        // Process attendance records from deduplicated map
        const attendanceArray = Array.from(attendanceByDate.values()).map((record: any, index: number) => {
          // Handle different date field names
          const rawDate = record.date || record.attendance_date;
          const date = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
          
          // Handle different status field names
          const status = (record.status || record.attendance_status || 'present')?.toLowerCase();

          // Determine time display based on status
          let timeIn = '-';
          let timeOut = '-';
          let leaveInfo = null;

          if (status === 'paid_leave' || status === 'absent') {
            // For leave records, show 8-hour standard time
            timeIn = '08:00 AM';
            timeOut = '05:00 PM';

            // Include leave request information if stored directly in record
            if (record.leave_type || record.leave_reason) {
              leaveInfo = {
                leaveType: record.leave_type,
                reason: record.leave_reason,
                startDate: record.leave_start_date,
                endDate: record.leave_end_date
              };
            }
          } else {
            // Handle different time in field names
            const timeInValue = record.time_in || record.check_in_time;
            if (timeInValue) {
              try {
                // Try parsing as full timestamp first (e.g., "2024-04-15T08:30:00")
                let timeInDate = new Date(timeInValue);
                
                // If that doesn't work, try parsing as time only (e.g., "08:30:00")
                if (isNaN(timeInDate.getTime())) {
                  timeInDate = new Date(`2000-01-01T${timeInValue}`);
                }
                
                // If valid, format the time
                if (!isNaN(timeInDate.getTime())) {
                  timeIn = timeInDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                }
              } catch (error) {
                console.error('Error parsing time_in:', timeInValue, error);
                timeIn = '-';
              }
            }
          }

          // Handle different time out field names
          const timeOutValue = record.time_out || record.check_out_time;
          if (timeOutValue) {
            try {
              // Try parsing as full timestamp first (e.g., "2024-04-15T17:30:00")
              let timeOutDate = new Date(timeOutValue);
              
              // If that doesn't work, try parsing as time only (e.g., "17:30:00")
              if (isNaN(timeOutDate.getTime())) {
                timeOutDate = new Date(`2000-01-01T${timeOutValue}`);
              }
              
              // If valid, format the time
              if (!isNaN(timeOutDate.getTime())) {
                timeOut = timeOutDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
              }
            } catch (error) {
              console.error('Error parsing time_out:', timeOutValue, error);
              timeOut = '-';
            }
          }

          // Calculate hours worked
          const hoursWorked = calculateHours(timeIn, timeOut);

          return {
            id: record.id || index.toString(),
            date: date,
            timeIn,
            timeOut,
            status,
            leaveInfo,
            hoursWorked
          };
        });

        // Sort by date descending
        attendanceArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        console.log(`✅ Loaded ${attendanceArray.length} attendance records`);
        setEmployeeAttendance(attendanceArray);
        toast.success(`Loaded ${attendanceArray.length} attendance records`);
      } else {
        console.log('ℹ️ Query successful but returned no data');
        setEmployeeAttendance([]);
        toast.info('No attendance records found');
      }
    } catch (error) {
      console.error('❌ Error fetching attendance:', error);
      setEmployeeAttendance([]);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  // Get filtered attendance records based on date range
  const getFilteredAttendanceRecords = () => {
    if (attendanceFilterPreset === 'all') {
      return employeeAttendance;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = new Date(today);
    let endDate = new Date(today);

    if (attendanceFilterPreset === 'last_7_days') {
      startDate.setDate(today.getDate() - 7);
    } else if (attendanceFilterPreset === 'last_30_days') {
      startDate.setDate(today.getDate() - 30);
    } else if (attendanceFilterPreset === 'last_90_days') {
      startDate.setDate(today.getDate() - 90);
    } else if (attendanceFilterPreset === 'this_week') {
      // Get start of week (Sunday)
      const day = today.getDay();
      startDate.setDate(today.getDate() - day);
    } else if (attendanceFilterPreset === 'this_month') {
      startDate.setDate(1); // First day of current month
    } else if (attendanceFilterPreset === 'last_month') {
      const lastMonth = new Date(today);
      lastMonth.setMonth(today.getMonth() - 1);
      startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of last month
    } else if (attendanceFilterPreset === 'year_to_date') {
      startDate = new Date(today.getFullYear(), 0, 1); // January 1st of current year
    } else if (attendanceFilterPreset === 'custom' && attendanceDateRange?.from && attendanceDateRange?.to) {
      startDate = new Date(attendanceDateRange.from);
      endDate = new Date(attendanceDateRange.to);
      endDate.setHours(23, 59, 59, 999);
    }

    return employeeAttendance.filter(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate >= startDate && recordDate <= endDate;
    });
  };

  const filteredAttendanceRecords = getFilteredAttendanceRecords();

  // Handle export with date filter
  const handleExportAttendance = () => {
    try {
      let recordsToExport = employeeAttendance;
      let dateRange: { startDate: Date; endDate: Date } | undefined = undefined;

      // Apply date filter if dates are selected
      if (exportStartDate && exportEndDate) {
        const startDate = new Date(exportStartDate);
        const endDate = new Date(exportEndDate);

        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);

        recordsToExport = employeeAttendance.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= startDate && recordDate <= endDate;
        });

        if (recordsToExport.length === 0) {
          toast.error('No records found in the selected date range');
          return;
        }

        dateRange = { startDate, endDate };
      }

      const empData = currentEmployee ? {
        name: currentEmployee.full_name || currentEmployee.name,
        id: currentEmployee.employee_number || currentEmployee.id,
      } : { name: 'Unknown', id: 'Unknown' };

      exportEmployeeAttendanceWithHoursToCSV(
        recordsToExport,
        empData.name,
        empData.id,
        dateRange
      );

      toast.success(`Exported ${recordsToExport.length} records`);
      setShowExportFilter(false);
      setExportStartDate('');
      setExportEndDate('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export records');
    }
  };

  // Handle clicking an employee to show attendance modal
  const handleEmployeeClick = async (employee: any) => {
    const employeeNumber = employee.employee_number || employee.id;
    const employeeName = employee.full_name || employee.name;
    const employeeTeam = employee.teams?.name || employee.team || employee.department;
    const employeePosition = employee.position;
    
    if (!employeeNumber) {
      console.error('❌ Employee number is null or undefined');
      toast.error('Invalid employee data');
      return;
    }
    
    console.log('📊 [Members] Opening attendance modal for:', employeeName);
    
    // Set employee for modal
    setSelectedEmployeeForModal({
      full_name: employeeName,
      user_number: employeeNumber,
      team_name: employeeTeam,
      position: employeePosition,
      user_type: 'Employee'
    });
    
    // Fetch attendance records
    if (!isSupabaseConfigured || !supabase) {
      console.warn('⚠️ Supabase not configured, using mock data');
      setModalAttendanceRecords([]);
      setShowAttendanceModal(true);
      return;
    }

    try {
      console.log('📊 [Members] Fetching attendance for modal:', employeeNumber);

      // First, get the employee's internal ID from the employee_number
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_number', employeeNumber)
        .maybeSingle();

      if (employeeError || !employeeData) {
        console.error('❌ Employee not found:', employeeNumber, employeeError);
        toast.error(`Employee ${employeeNumber} not found in database`);
        setModalAttendanceRecords([]);
        setShowAttendanceModal(true);
        return;
      }

      const employeeId = employeeData.id;
      console.log('✅ Found employee ID:', employeeId);

      // Fetch attendance records using employee_number
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_number', employeeNumber)
        .order('date', { ascending: false })
        .limit(200);

      if (attendanceError) {
        console.error('❌ Error fetching attendance for modal:', attendanceError);
        console.error('   Error code:', attendanceError.code);
        console.error('   Error message:', attendanceError.message);
        console.error('   Error details:', attendanceError.details);

        const errorMessage = attendanceError.message || attendanceError.details || 'Failed to fetch attendance records';
        toast.error(`Database error: ${errorMessage}`);
        setModalAttendanceRecords([]);
        setShowAttendanceModal(true);
        return;
      }

      if (attendanceData && attendanceData.length > 0) {
        const attendanceArray = attendanceData.map((record: any) => {
          // Handle different status field names
          const status = (record.status || record.attendance_status || 'present')?.toLowerCase();

          let timeIn = '-';
          let timeOut = '-';
          let leaveInfo = null;

          if (status === 'paid_leave' || status === 'absent') {
            timeIn = '08:00 AM';
            timeOut = '05:00 PM';

            // Check if leave information is stored directly in the attendance record
            if (record.leave_type || record.leave_reason) {
              leaveInfo = {
                leaveType: record.leave_type,
                reason: record.leave_reason,
                startDate: record.leave_start_date,
                endDate: record.leave_end_date
              };
            }
          } else {
            // Handle different time in field names
            const timeInValue = record.time_in || record.check_in_time;
            if (timeInValue) {
              try {
                // Try parsing as full timestamp first (e.g., "2024-04-15T08:30:00")
                let timeInDate = new Date(timeInValue);
                
                // If that doesn't work, try parsing as time only (e.g., "08:30:00")
                if (isNaN(timeInDate.getTime())) {
                  timeInDate = new Date(`2000-01-01T${timeInValue}`);
                }
                
                // If valid, format the time
                if (!isNaN(timeInDate.getTime())) {
                  timeIn = timeInDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                }
              } catch (error) {
                console.error('Error parsing time_in:', timeInValue, error);
                timeIn = '-';
              }
            }
          }

          // Handle different time out field names
          const timeOutValue = record.time_out || record.check_out_time;
          if (timeOutValue) {
            try {
              // Try parsing as full timestamp first (e.g., "2024-04-15T17:30:00")
              let timeOutDate = new Date(timeOutValue);
              
              // If that doesn't work, try parsing as time only (e.g., "17:30:00")
              if (isNaN(timeOutDate.getTime())) {
                timeOutDate = new Date(`2000-01-01T${timeOutValue}`);
              }
              
              // If valid, format the time
              if (!isNaN(timeOutDate.getTime())) {
                timeOut = timeOutDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
              }
            } catch (error) {
              console.error('Error parsing time_out:', timeOutValue, error);
              timeOut = '-';
            }
          }

          return {
            id: record.id,
            date: record.date || record.attendance_date,
            timeIn,
            timeOut,
            status,
            leaveInfo
          };
        });

        setModalAttendanceRecords(attendanceArray);
        console.log(`✅ Loaded ${attendanceArray.length} attendance records for modal`);
      } else {
        setModalAttendanceRecords([]);
        console.log('ℹ️ No attendance records found for modal');
      }

      setShowAttendanceModal(true);
    } catch (error) {
      console.error('❌ Error in handleEmployeeClick:', error);
      setModalAttendanceRecords([]);
      setShowAttendanceModal(true);
    }
  };

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp => {
    const name = emp.full_name || emp.name;
    const id = emp.employee_number || emp.id;
    const email = emp.email;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      name.toLowerCase().includes(searchLower) ||
      id.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower)
    );
  });

  const currentEmployee = selectedEmployee 
    ? employees.find(emp => {
        const empId = emp.employee_number || emp.id;
        return empId === selectedEmployee;
      })
    : null;

  // STATE B: Member Profile & History View
  if (selectedEmployee && currentEmployee) {
    const empData = isSupabaseConfigured ? {
      name: currentEmployee.full_name || currentEmployee.name,
      id: currentEmployee.employee_number || currentEmployee.id,
      email: currentEmployee.email || currentEmployee.email,
      phone: currentEmployee.contact_number || currentEmployee.phone,
      position: currentEmployee.position || currentEmployee.position,
      team: currentEmployee.teams?.name || currentEmployee.team,
      address: currentEmployee.address || 'Not provided',
      dateHired: currentEmployee.date_hired ? new Date(currentEmployee.date_hired).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }) : 'Not provided',
      status: currentEmployee.status || 'active',
    } : {
      name: currentEmployee.name,
      id: currentEmployee.id,
      email: currentEmployee.email,
      phone: currentEmployee.phone,
      position: currentEmployee.position,
      team: currentEmployee.team,
      address: currentEmployee.address || 'Not provided',
      dateHired: 'Not provided',
      status: currentEmployee.status || 'active',
    };

    return (
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => setSelectedEmployee(null)}
          className="flex items-center gap-2 text-sm font-semibold text-[#0B3060] hover:text-[#0B3060]/80 hover:underline transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Team Members
        </button>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - QR Code & Basic Info */}
          <div className="space-y-6">
            {/* QR Code Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-[#0B3060]" />
                <h2 className="font-bold text-[#1F2937]">Employee QR Code</h2>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-white border-4 border-[#F7B34C] rounded-xl p-4 mb-4 shadow-md">
                  <QRCodeGenerator 
                    value={empData.id} 
                    size={200} 
                    showDownload={true}
                    employeeName={empData.name}
                  />
                </div>
                <div className="bg-[#0B3060] text-white px-6 py-2 rounded-full font-mono text-sm font-semibold">
                  {empData.id}
                </div>
                <p className="text-xs text-[#6B7280] mt-2 text-center">
                  Scan this QR code for attendance tracking
                </p>
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-[#1F2937] mb-4">Employment Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    empData.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {empData.status?.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Date Hired</span>
                  <span className="text-sm font-medium text-[#1F2937]">{empData.dateHired}</span>
                </div>
              </div>
            </div>

            {/* Login Credentials Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-[#F7B34C]/30">
              <div className="flex items-center gap-2 mb-4">
                <Key className="w-5 h-5 text-[#0B3060]" />
                <h3 className="font-bold text-[#1F2937]">Login Credentials</h3>
              </div>
              <div className="space-y-4">
                {/* Username */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <UserCircle className="w-4 h-4 text-[#6B7280]" />
                    <p className="text-xs text-[#6B7280] font-semibold">Username</p>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                    <p className="text-sm font-mono font-semibold text-[#0B3060] break-all">
                      {empData.id}
                    </p>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-[#6B7280]" />
                    <p className="text-xs text-[#6B7280] font-semibold">Password</p>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 relative">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-mono font-semibold text-[#0B3060] break-all flex-1">
                        {showPassword 
                          ? (currentEmployee.password_hash || currentEmployee.qr_token || 'Not set')
                          : '••••••••••••'
                        }
                      </p>
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-[#6B7280]" />
                        ) : (
                          <Eye className="w-4 h-4 text-[#6B7280]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* QR Token (if different from employee number) */}
                {currentEmployee.qr_token && currentEmployee.qr_token !== empData.id && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <QrCode className="w-4 h-4 text-[#6B7280]" />
                      <p className="text-xs text-[#6B7280] font-semibold">QR Token</p>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <p className="text-sm font-mono font-semibold text-[#0B3060] break-all">
                        {currentEmployee.qr_token}
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    These credentials are used for system access. Keep them confidential.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Detailed Info & Attendance */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start gap-6 mb-6">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] flex items-center justify-center text-white font-bold text-3xl border-4 border-[#F7B34C] shadow-lg flex-shrink-0">
                  {empData.name.split(' ').map(n => n[0]).join('')}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-[#1F2937] mb-2">
                    {empData.name}
                  </h1>
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-4 h-4 text-[#6B7280]" />
                    <span className="text-[#6B7280]">{empData.position}</span>
                    <span className="text-[#6B7280]">•</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#0B3060] text-white">
                      {empData.team}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-[#0B3060] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6B7280] mb-1">Email Address</p>
                    <p className="text-sm font-medium text-[#1F2937] break-all">{empData.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-[#0B3060] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-[#6B7280] mb-1">Contact Number</p>
                    <p className="text-sm font-medium text-[#1F2937]">{empData.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Hash className="w-5 h-5 text-[#0B3060] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-[#6B7280] mb-1">Employee ID</p>
                    <p className="text-sm font-mono font-semibold text-[#1F2937]">{empData.id}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-[#0B3060] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6B7280] mb-1">Address</p>
                    <p className="text-sm font-medium text-[#1F2937] break-words">{empData.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance History Card */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-[#F9FAFB] px-6 py-4 border-b border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#0B3060]" />
                    <h2 className="text-lg font-bold text-[#1F2937]">
                      Attendance History
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowExportFilter(!showExportFilter)}
                      disabled={isLoadingAttendance || employeeAttendance.length === 0}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[#0B3060] hover:bg-[#1a4a8a] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>

                    {/* Export Filter Dropdown */}
                    {showExportFilter && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowExportFilter(false)}
                        />
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                          <div className="p-4">
                            <h3 className="text-sm font-bold text-[#1F2937] mb-3">Export Attendance Records</h3>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-[#6B7280] mb-1">
                                  Start Date
                                </label>
                                <input
                                  type="date"
                                  value={exportStartDate}
                                  onChange={(e) => setExportStartDate(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-[#6B7280] mb-1">
                                  End Date
                                </label>
                                <input
                                  type="date"
                                  value={exportEndDate}
                                  onChange={(e) => setExportEndDate(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-transparent"
                                />
                              </div>

                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                <p className="text-xs text-blue-900">
                                  Leave dates empty to export all records
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => {
                                  setShowExportFilter(false);
                                  setExportStartDate('');
                                  setExportEndDate('');
                                }}
                                className="flex-1 px-3 py-2 text-sm font-medium text-[#6B7280] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleExportAttendance}
                                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-[#0B3060] hover:bg-[#1a4a8a] rounded-lg transition-colors"
                              >
                                Export
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => fetchEmployeeAttendance(empData.id)}
                    disabled={isLoadingAttendance}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#0B3060] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingAttendance ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                </div>

                {/* Date Filter Controls */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setAttendanceFilterPreset('all')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        attendanceFilterPreset === 'all'
                          ? 'bg-[#0B3060] text-white shadow-md'
                          : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      onClick={() => setAttendanceFilterPreset('last_7_days')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        attendanceFilterPreset === 'last_7_days'
                          ? 'bg-[#0B3060] text-white shadow-md'
                          : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                      }`}
                    >
                      Last 7 Days
                    </button>
                    <button
                      onClick={() => setAttendanceFilterPreset('last_30_days')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        attendanceFilterPreset === 'last_30_days'
                          ? 'bg-[#0B3060] text-white shadow-md'
                          : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                      }`}
                    >
                      Last 30 Days
                    </button>
                    <button
                      onClick={() => setAttendanceFilterPreset('this_week')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        attendanceFilterPreset === 'this_week'
                          ? 'bg-[#0B3060] text-white shadow-md'
                          : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                      }`}
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => setAttendanceFilterPreset('this_month')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        attendanceFilterPreset === 'this_month'
                          ? 'bg-[#0B3060] text-white shadow-md'
                          : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      onClick={() => setAttendanceFilterPreset('last_month')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        attendanceFilterPreset === 'last_month'
                          ? 'bg-[#0B3060] text-white shadow-md'
                          : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                      }`}
                    >
                      Last Month
                    </button>
                    <button
                      onClick={() => setAttendanceFilterPreset('year_to_date')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        attendanceFilterPreset === 'year_to_date'
                          ? 'bg-[#0B3060] text-white shadow-md'
                          : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                      }`}
                    >
                      Year to Date
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowAttendanceDateFilter(!showAttendanceDateFilter)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                          attendanceFilterPreset === 'custom'
                            ? 'bg-[#0B3060] text-white shadow-md'
                            : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        {attendanceFilterPreset === 'custom' && attendanceDateRange?.from && attendanceDateRange?.to ? (
                          <span>
                            {attendanceDateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {attendanceDateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        ) : (
                          <span>Custom Range</span>
                        )}
                      </button>

                      {/* Calendar Modal */}
                      {showAttendanceDateFilter && (
                        <>
                          <div
                            className="fixed inset-0 bg-black/20 z-[100]"
                            onClick={() => setShowAttendanceDateFilter(false)}
                          />
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
                                    onClick={() => setShowAttendanceDateFilter(false)}
                                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                  >
                                    <X className="w-5 h-5 text-white" />
                                  </button>
                                </div>
                                <p className="text-sm text-white/80 mt-1">Choose attendance date range</p>
                              </div>

                              {/* Quick Presets */}
                              <div className="px-6 py-4 bg-gray-50 border-b">
                                <p className="text-xs font-semibold text-[#6B7280] mb-2">Quick Select:</p>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => {
                                      const today = new Date();
                                      const lastWeek = new Date(today);
                                      lastWeek.setDate(today.getDate() - 7);
                                      setAttendanceDateRange({ from: lastWeek, to: today });
                                      setAttendanceFilterPreset('custom');
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-[#0B3060] bg-white border border-[#0B3060] rounded-lg hover:bg-[#0B3060] hover:text-white transition-colors"
                                  >
                                    Last 7 Days
                                  </button>
                                  <button
                                    onClick={() => {
                                      const today = new Date();
                                      const lastMonth = new Date(today);
                                      lastMonth.setDate(today.getDate() - 30);
                                      setAttendanceDateRange({ from: lastMonth, to: today });
                                      setAttendanceFilterPreset('custom');
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-[#0B3060] bg-white border border-[#0B3060] rounded-lg hover:bg-[#0B3060] hover:text-white transition-colors"
                                  >
                                    Last 30 Days
                                  </button>
                                  <button
                                    onClick={() => {
                                      const today = new Date();
                                      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                                      setAttendanceDateRange({ from: firstDayOfMonth, to: today });
                                      setAttendanceFilterPreset('custom');
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-[#0B3060] bg-white border border-[#0B3060] rounded-lg hover:bg-[#0B3060] hover:text-white transition-colors"
                                  >
                                    This Month
                                  </button>
                                  <button
                                    onClick={() => {
                                      const today = new Date();
                                      const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
                                      setAttendanceDateRange({ from: firstDayOfYear, to: today });
                                      setAttendanceFilterPreset('custom');
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium text-[#0B3060] bg-white border border-[#0B3060] rounded-lg hover:bg-[#0B3060] hover:text-white transition-colors"
                                  >
                                    Year to Date
                                  </button>
                                </div>
                              </div>

                              {/* Calendar Section */}
                              <div className="p-8 bg-white">
                                <CalendarPicker
                                  mode="range"
                                  selected={attendanceDateRange}
                                  onSelect={(range) => {
                                    setAttendanceDateRange(range);
                                    setAttendanceFilterPreset('custom');
                                  }}
                                  numberOfMonths={2}
                                  className="rounded-md border-0"
                                />
                              </div>

                              {/* Selected Range Display */}
                              {attendanceDateRange?.from && attendanceDateRange?.to && (
                                <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
                                  <div className="flex items-center justify-center gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-[#0B3060]">Selected Range:</span>
                                      <span className="text-[#1F2937]">
                                        {attendanceDateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                      <span className="text-[#6B7280]">to</span>
                                      <span className="text-[#1F2937]">
                                        {attendanceDateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                    </div>
                                    <span className="px-2 py-1 text-xs font-semibold bg-[#F7B34C] text-[#0B3060] rounded-full">
                                      {Math.ceil((attendanceDateRange.to.getTime() - attendanceDateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t rounded-b-xl">
                                <button
                                  onClick={() => setShowAttendanceDateFilter(false)}
                                  className="flex-1 px-6 py-3 text-sm font-semibold text-[#6B7280] bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => {
                                    if (attendanceDateRange?.from && attendanceDateRange?.to) {
                                      setShowAttendanceDateFilter(false);
                                      toast.success('Date range applied');
                                    } else {
                                      toast.error('Please select both start and end dates');
                                    }
                                  }}
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

                  {attendanceFilterPreset !== 'all' && (
                    <button
                      onClick={() => {
                        setAttendanceFilterPreset('all');
                        setAttendanceDateRange(undefined);
                        toast.info('Filter cleared');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
                    >
                      <X className="w-3 h-3" />
                      Clear Filter
                    </button>
                  )}

                  <div className="ml-auto flex items-center gap-2">
                    <div className="text-xs text-[#6B7280]">
                      Showing <span className="font-semibold text-[#0B3060]">{filteredAttendanceRecords.length}</span> of <span className="font-semibold">{employeeAttendance.length}</span> records
                    </div>
                    {attendanceFilterPreset !== 'all' && filteredAttendanceRecords.length < employeeAttendance.length && (
                      <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                        Filtered
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {isLoadingAttendance ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B3060] mx-auto mb-4"></div>
                    <p className="text-sm text-[#6B7280]">Loading attendance records...</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                          Time In
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                          Time Out
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                          Hours Rendered
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                          Leave Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredAttendanceRecords.length > 0 ? (
                        <>
                          {filteredAttendanceRecords.map((record, index) => (
                            <tr key={`${record.id}-${record.date}-${index}`} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm text-[#1F2937]">
                                {new Date(record.date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-[#1F2937]">
                                {(record.status === 'paid_leave' || record.status === 'absent') ? '-' : record.timeIn}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-[#1F2937]">
                                {(record.status === 'paid_leave' || record.status === 'absent') ? '-' : record.timeOut}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold text-[#0B3060]">
                                {record.hoursWorked > 0 ? `${record.hoursWorked.toFixed(2)} hrs` : '-'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  record.status === 'present'
                                    ? 'bg-green-100 text-green-700'
                                    : record.status === 'late'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : record.status === 'paid_leave'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {record.status === 'paid_leave' ? 'Paid Leave' : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {record.leaveInfo ? (
                                  <div className="text-xs space-y-1">
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
                          {/* Total Hours Row */}
                          <tr className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white font-bold">
                            <td colSpan={3} className="px-6 py-4 text-right text-sm uppercase tracking-wider">
                              Total Hours Rendered:
                            </td>
                            <td className="px-6 py-4 text-lg">
                              {filteredAttendanceRecords.reduce((total, record) => total + (record.hoursWorked || 0), 0).toFixed(2)} hrs
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-[#6B7280]">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="font-medium">No attendance records found</p>
                            <p className="text-sm">Attendance data will appear here once the employee checks in</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STATE A: Member List View
  return (
    <div className="space-y-4">
      {/* Team Leader Info Banner */}
      <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-xl shadow-sm p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1">Team Leader Dashboard</h2>
            <p className="text-white/90 text-sm mb-3">
              Managing <strong>{currentAdminData.team}</strong> Team
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="px-3 py-1.5 bg-white/20 rounded-full text-sm">
                {currentAdminData.full_name || currentAdminData.name} • {currentAdminData.position}
              </div>
              <div className="px-3 py-1.5 bg-white/20 rounded-full text-sm">
                {employees.length} Team {employees.length === 1 ? 'Member' : 'Members'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-blue-900">
            <strong>Team-Based Access:</strong> You can only view and manage employees in your assigned team ({currentAdminData.team}). 
            Employees from other teams are not visible in your portal.
          </p>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="bg-[#F9FAFB] px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-[#1F2937]">
              {currentAdminData.team} Team Members
            </h1>
            
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-transparent w-64"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B3060] mx-auto mb-4"></div>
            <p className="text-[#6B7280]">Loading team members...</p>
          </div>
        ) : (
          <>
            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white border-b border-[#E5E7EB]">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      ID Num
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredEmployees.map((employee) => {
                    const empName = employee.full_name || employee.name;
                    const empId = employee.employee_number || employee.id;
                    const empEmail = employee.email;
                    const empTeam = employee.teams?.name || employee.team;
                    const empPosition = employee.position;

                    return (
                      <tr
                        key={empId}
                        onClick={() => setSelectedEmployee(empId)}
                        className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                      >
                        {/* Employee Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                              {empName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#1F2937]">{empName}</p>
                              <p className="text-xs text-[#6B7280]">{empEmail}</p>
                            </div>
                          </div>
                        </td>

                        {/* ID Num Column */}
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-[#6B7280]">{empId}</span>
                        </td>

                        {/* Team Column */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#0B3060] text-white">
                            {empTeam}
                          </span>
                        </td>

                        {/* Position Column */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-[#1F2937]">{empPosition}</span>
                        </td>

                        {/* Action Column */}
                        <td className="px-6 py-4 text-right">
                          <ChevronRight className="w-5 h-5 text-[#6B7280] inline-block" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Empty State */}
              {filteredEmployees.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-[#1F2937] font-semibold mb-1">
                    {searchTerm ? 'No matching team members found' : `No employees in ${currentAdminData.team} team yet`}
                  </p>
                  <p className="text-sm text-[#6B7280]">
                    {searchTerm 
                      ? 'Try adjusting your search terms' 
                      : 'Team members will appear here once they are registered to your team'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Employee Attendance Modal */}
      <EmployeeAttendanceModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        employee={selectedEmployeeForModal}
        records={modalAttendanceRecords}
      />
    </div>
  );
}