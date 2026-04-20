import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Search, 
  Filter, 
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
  X,
  UserCog,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { Calendar as CalendarPicker } from '../components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { exportEmployeeAttendanceWithHoursToCSV } from '../utils/exportUtils';

interface TeamMember {
  id: string;
  employee_number: string;
  full_name: string;
  email: string;
  phone_number?: string;
  position: string;
  birthday?: string;
  profile_picture_url?: string;
  status: string;
  created_at: string;
  team_id: string;
  team_name: string;
  password_hash?: string;
  qr_token?: string;
  date_hired?: string;
  user_type: 'employee' | 'admin'; // Add user type to distinguish
  admin_number?: string; // For admins
}

interface AdminInfo {
  id: string;
  full_name: string;
  email: string;
  department: string;
  team_id: string;
  team_name: string;
  memberCount: number;
}

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

// Fallback mock data for attendance history
const attendanceHistory: any[] = [];

export function SuperAdminMembers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [expandedAdmins, setExpandedAdmins] = useState<Set<string>>(new Set());
  
  // New state for expandable attendance in table view
  const [expandedMemberAttendance, setExpandedMemberAttendance] = useState<Set<string>>(new Set());
  const [memberAttendanceData, setMemberAttendanceData] = useState<Map<string, any[]>>(new Map());
  const [loadingMemberAttendance, setLoadingMemberAttendance] = useState<Set<string>>(new Set());

  // Attendance history date filter states
  const [showAttendanceDateFilter, setShowAttendanceDateFilter] = useState(false);
  const [attendanceDateRange, setAttendanceDateRange] = useState<DateRange | undefined>(undefined);
  const [attendanceFilterPreset, setAttendanceFilterPreset] = useState<'all' | 'last_30_days' | 'last_90_days' | 'custom'>('all');

  // Export filter states
  const [showExportFilter, setShowExportFilter] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  useEffect(() => {
    fetchAllAdminsAndMembers();
  }, []);

  // Fetch employee attendance when an employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeAttendance(selectedEmployee);
    }
  }, [selectedEmployee]);

  const toggleAdminExpansion = (adminId: string) => {
    setExpandedAdmins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(adminId)) {
        newSet.delete(adminId);
      } else {
        newSet.add(adminId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedAdmins(new Set(admins.map(a => a.id)));
  };

  const collapseAll = () => {
    setExpandedAdmins(new Set());
  };

  const fetchAllAdminsAndMembers = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching all admins and members for Super Admin...');

      if (!isSupabaseConfigured || !supabase) {
        console.warn('⚠️ Supabase not configured, skipping data fetch');
        setIsLoading(false);
        return;
      }

      // Fetch all teams first
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, description')
        .order('name');

      if (teamsError) {
        console.error('❌ Error fetching teams:', teamsError);
        toast.error('Failed to fetch teams');
        setIsLoading(false);
        return;
      }

      console.log('✅ Teams fetched:', teamsData);

      // Fetch all admins with role "administrator" or "admin" (Admin Team Leaders)
      const { data: adminsData, error: adminsError } = await supabase
        .from('admins')
        .select(`
          id,
          admin_number,
          full_name,
          email,
          phone_number,
          department,
          role,
          status,
          created_at,
          profile_picture_url,
          password_hash
        `)
        .in('role', ['administrator', 'admin']) // Include both 'administrator' and 'admin' roles
        .order('full_name');

      if (adminsError) {
        console.error('❌ Error fetching admins:', adminsError);
        toast.error('Failed to fetch admin team leaders');
        setIsLoading(false);
        return;
      }

      console.log('✅ Admin Team Leaders fetched:', adminsData);

      // Fetch all employees with team information
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(`
          id,
          employee_number,
          full_name,
          email,
          phone_number,
          position,
          birthday,
          profile_picture_url,
          status,
          created_at,
          team_id,
          password_hash,
          qr_token
        `)
        .order('full_name');

      if (employeesError) {
        console.error('❌ Error fetching employees:', employeesError);
        toast.error('Failed to fetch employees');
        setIsLoading(false);
        return;
      }

      console.log('✅ Employees fetched:', employeesData);

      // Create a teams map for easy lookup
      const teamsMap = new Map(teamsData.map(team => [team.id, team]));
      
      // Also create a map by team name for admins who store department as name
      const teamsByName = new Map(
        teamsData.map(team => [team.name.toLowerCase(), team])
      );

      console.log('📋 Available teams:', teamsData.map(t => ({ id: t.id, name: t.name })));

      // Transform employees data to include team_name and user_type
      const employeesWithTeamName = employeesData.map((emp: any) => {
        const team = teamsMap.get(emp.team_id);
        return {
          ...emp,
          team_name: team?.name || 'Unassigned',
          user_type: 'employee' as const,
        };
      });

      // Transform admins data to match employee structure
      const adminsAsMembers = adminsData.map((admin: any) => {
        console.log(`👤 Processing admin: ${admin.full_name}, department field: "${admin.department}"`);
        
        // Try to get team by ID first
        let team = teamsMap.get(admin.department);
        let teamId = admin.department;
        
        // If not found by ID, try matching by name
        if (!team && admin.department) {
          const departmentLower = admin.department.toLowerCase();
          team = teamsByName.get(departmentLower);
          if (team) {
            teamId = team.id;
            console.log(`  ✅ Matched by name: "${admin.department}" → ${team.name} (${team.id})`);
          } else {
            console.log(`  ❌ No match found for department: "${admin.department}"`);
          }
        } else if (team) {
          console.log(`  ✅ Matched by ID: ${team.name}`);
        }
        
        return {
          id: admin.id,
          employee_number: admin.admin_number,
          admin_number: admin.admin_number,
          full_name: admin.full_name,
          email: admin.email,
          phone_number: admin.phone_number || undefined,
          position: 'Team Leader', // Admins are team leaders
          profile_picture_url: admin.profile_picture_url,
          status: admin.status || 'active',
          created_at: admin.created_at,
          team_id: teamId,
          team_name: team?.name || 'Unassigned',
          password_hash: admin.password_hash,
          user_type: 'admin' as const,
        };
      });

      // Combine employees and admins into one unified list
      const allMembersUnified = [...employeesWithTeamName, ...adminsAsMembers];

      // Sort by full name
      allMembersUnified.sort((a, b) => a.full_name.localeCompare(b.full_name));

      console.log(`✅ Total unified members: ${allMembersUnified.length} (${employeesWithTeamName.length} employees + ${adminsAsMembers.length} admins)`);
      
      // Log team assignments for debugging
      console.log('📊 Team breakdown:');
      const teamBreakdown = new Map();
      allMembersUnified.forEach(member => {
        const teamName = member.team_name;
        if (!teamBreakdown.has(teamName)) {
          teamBreakdown.set(teamName, { employees: 0, admins: 0 });
        }
        const counts = teamBreakdown.get(teamName);
        if (member.user_type === 'admin') {
          counts.admins++;
        } else {
          counts.employees++;
        }
      });
      teamBreakdown.forEach((counts, teamName) => {
        console.log(`  ${teamName}: ${counts.employees} employees + ${counts.admins} admins = ${counts.employees + counts.admins} total`);
      });

      setAllMembers(allMembersUnified);

      // Keep admin info for the banner statistics
      const adminsWithInfo = adminsData.map((admin: any) => {
        const teamId = admin.department;
        const team = teamsMap.get(teamId);
        const teamName = team?.name || 'Unassigned';
        const memberCount = employeesWithTeamName.filter((m: any) => m.team_id === teamId).length;

        return {
          id: admin.id,
          full_name: admin.full_name,
          email: admin.email,
          department: admin.department,
          team_id: teamId,
          team_name: teamName,
          memberCount: memberCount,
        };
      });

      setAdmins(adminsWithInfo);

    } catch (error) {
      console.error('❌ Unexpected error fetching data:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployeeAttendance = async (employeeNumber: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setEmployeeAttendance(attendanceHistory);
      return;
    }

    try {
      setIsLoadingAttendance(true);
      console.log('📊 Fetching attendance for employee:', employeeNumber);

      // First, get the employee's internal ID from the employee_number
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_number', employeeNumber)
        .maybeSingle();

      if (employeeError || !employeeData) {
        console.error('❌ Employee not found:', employeeError);
        toast.error('Employee not found in database');
        setEmployeeAttendance([]);
        setIsLoadingAttendance(false);
        return;
      }

      const employeeId = employeeData.id;
      console.log('✅ Found employee ID:', employeeId);

      // Fetch attendance records using employee_number
      const { data: attendanceData, error: attendanceError} = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_number', employeeNumber)
        .order('date', { ascending: false })
        .limit(100);

      if (attendanceError) {
        console.error('❌ Error fetching attendance:', attendanceError);
        console.error('   Error details:', JSON.stringify(attendanceError, null, 2));
        toast.error(`Failed to fetch attendance: ${attendanceError.message || 'Unknown error'}`);
        setEmployeeAttendance([]);
        setIsLoadingAttendance(false);
        return;
      }

      // Fetch employee schedule for the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select('*')
        .eq('employee_number', employeeNumber)
        .gte('schedule_date', startDate.toISOString().split('T')[0])
        .lte('schedule_date', endDate.toISOString().split('T')[0]);

      const schedules = schedulesData || [];

      console.log(`📅 Found ${schedules.length} schedule entries`);
      console.log(`📊 Found ${attendanceData?.length || 0} attendance records`);

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

        // Process attendance records directly
        const attendanceArray = attendanceData.map((record: any, index: number) => {
          // Handle different date field names
          const date = record.date || record.attendance_date;
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

            // Include leave request information if stored directly in attendance record
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
              timeIn = new Date(`2000-01-01T${timeInValue}`).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });
            }
          }

          // Handle different time out field names
          const timeOutValue = record.time_out || record.check_out_time;
          if (timeOutValue) {
            timeOut = new Date(`2000-01-01T${timeOutValue}`).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
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
      }
    } catch (error: any) {
      console.error('❌ Error fetching attendance:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast.error(`Error fetching attendance: ${errorMessage}`);
      setEmployeeAttendance(attendanceHistory);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // New function to toggle attendance expansion in table view
  const toggleMemberAttendance = async (employeeNumber: string) => {
    // If already expanded, collapse it
    if (expandedMemberAttendance.has(employeeNumber)) {
      setExpandedMemberAttendance(prev => {
        const newSet = new Set(prev);
        newSet.delete(employeeNumber);
        return newSet;
      });
      return;
    }

    // Expand and fetch attendance data if not already fetched
    setExpandedMemberAttendance(prev => new Set(prev).add(employeeNumber));

    // If data not already fetched, fetch it
    if (!memberAttendanceData.has(employeeNumber)) {
      await fetchMemberAttendanceForTable(employeeNumber);
    }
  };

  // Fetch attendance for table view (limited to last 10 records)
  const fetchMemberAttendanceForTable = async (employeeNumber: string) => {
    if (!isSupabaseConfigured) {
      console.warn('⚠️ Supabase not configured, cannot fetch attendance');
      toast.error('Database not configured');
      return;
    }

    try {
      setLoadingMemberAttendance(prev => new Set(prev).add(employeeNumber));
      console.log('📊 [SuperAdmin] Fetching attendance for:', employeeNumber);

      // First, check if attendance table exists and has data
      const { count, error: countError } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('employee_number', employeeNumber);

      if (countError) {
        console.error('❌ Error checking attendance table:', countError);
        console.error('   Error details:', JSON.stringify(countError, null, 2));
        toast.error(`Database error: ${countError.message}`);
        setMemberAttendanceData(prev => new Map(prev).set(employeeNumber, []));
        setLoadingMemberAttendance(prev => {
          const newSet = new Set(prev);
          newSet.delete(employeeNumber);
          return newSet;
        });
        return;
      }

      console.log(`📊 Found ${count || 0} attendance records for ${employeeNumber}`);

      if (count === 0) {
        console.log(`ℹ️ No attendance records found for ${employeeNumber}`);
        toast.info('No attendance records found for this member');
        setMemberAttendanceData(prev => new Map(prev).set(employeeNumber, []));
        setLoadingMemberAttendance(prev => {
          const newSet = new Set(prev);
          newSet.delete(employeeNumber);
          return newSet;
        });
        return;
      }

      // Fetch attendance records directly from Supabase with leave_request join
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select(`
          *,
          leave_requests (
            id,
            leave_type,
            reason,
            start_date,
            end_date
          )
        `)
        .eq('employee_number', employeeNumber)
        .order('date', { ascending: false })
        .limit(10); // Limit to last 10 records for table view

      if (attendanceError) {
        console.error('❌ Supabase error fetching attendance with leave join:', attendanceError);
        console.error('   Error details:', JSON.stringify(attendanceError, null, 2));
        
        // If the join fails, try without the leave_requests join
        console.log('🔄 Retrying without leave_requests join...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('employee_number', employeeNumber)
          .order('date', { ascending: false })
          .limit(10);
        
        if (fallbackError) {
          console.error('❌ Fallback query also failed:', fallbackError);
          console.error('   Error details:', JSON.stringify(fallbackError, null, 2));
          toast.error('Failed to load attendance records');
          setMemberAttendanceData(prev => new Map(prev).set(employeeNumber, []));
          setLoadingMemberAttendance(prev => {
            const newSet = new Set(prev);
            newSet.delete(employeeNumber);
            return newSet;
          });
          return;
        }
        
        // Use fallback data without leave info
        if (fallbackData && fallbackData.length > 0) {
          console.log(`✅ Loaded ${fallbackData.length} records (without leave join)`);
          const attendanceArray = fallbackData.map((record: any, index: number) => {
            const date = record.attendance_date;
            const status = record.attendance_status?.toLowerCase() || 'present';
            
            let timeIn = '-';
            let timeOut = '-';
            
            if (status === 'paid_leave' || status === 'absent') {
              timeIn = '08:00 AM';
              timeOut = '05:00 PM';
            } else if (record.check_in_time) {
              timeIn = new Date(`2000-01-01T${record.check_in_time}`).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });
            }
            
            if (record.check_out_time) {
              timeOut = new Date(`2000-01-01T${record.check_out_time}`).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });
            }
            
            return {
              id: record.id || index.toString(),
              date: date,
              timeIn,
              timeOut,
              status,
              leaveInfo: null
            };
          });

          setMemberAttendanceData(prev => new Map(prev).set(employeeNumber, attendanceArray));
          toast.success(`Loaded ${attendanceArray.length} attendance records`);
        } else {
          console.log('ℹ️ Fallback query returned no data');
          setMemberAttendanceData(prev => new Map(prev).set(employeeNumber, []));
          toast.info('No attendance records found');
        }
        setLoadingMemberAttendance(prev => {
          const newSet = new Set(prev);
          newSet.delete(employeeNumber);
          return newSet;
        });
        return;
      }

      if (attendanceData && attendanceData.length > 0) {
        // Process attendance records
        const attendanceArray = attendanceData.map((record: any, index: number) => {
          const date = record.attendance_date;
          const status = record.attendance_status?.toLowerCase() || 'present';
          
          let timeIn = '-';
          let timeOut = '-';
          let leaveInfo = null;
          
          if (status === 'paid_leave' || status === 'absent') {
            timeIn = '08:00 AM';
            timeOut = '05:00 PM';

            if (record.leave_type || record.leave_reason) {
              leaveInfo = {
                leaveType: record.leave_type,
                reason: record.leave_reason,
                startDate: record.leave_start_date,
                endDate: record.leave_end_date
              };
            }
          } else if (record.check_in_time) {
            timeIn = new Date(`2000-01-01T${record.check_in_time}`).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
          }
          
          if (record.check_out_time) {
            timeOut = new Date(`2000-01-01T${record.check_out_time}`).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });
          }
          
          return {
            id: record.id || index.toString(),
            date: date,
            timeIn,
            timeOut,
            status,
            leaveInfo
          };
        });

        // Update memberAttendanceData
        setMemberAttendanceData(prev => new Map(prev).set(employeeNumber, attendanceArray));
        console.log(`✅ Loaded ${attendanceArray.length} attendance records for ${employeeNumber}`);
        toast.success(`Loaded ${attendanceArray.length} attendance records with leave details`);
      } else {
        console.log('ℹ️ Query successful but returned no data');
        setMemberAttendanceData(prev => new Map(prev).set(employeeNumber, []));
        toast.info('No attendance records found');

      }
    } catch (error) {
      console.error('❌ Error fetching attendance:', error);
      // Set empty array so UI shows "no records" instead of loading forever
      setMemberAttendanceData(prev => new Map(prev).set(employeeNumber, []));
    } finally {
      setLoadingMemberAttendance(prev => {
        const newSet = new Set(prev);
        newSet.delete(employeeNumber);
        return newSet;
      });
    }
  };

  // Filter members based on selected department filter and search
  const filteredMembers = allMembers.filter(member => {
    // Filter by department if selected
    const matchesDepartment = selectedDepartmentFilter === 'all' || member.team_name === selectedDepartmentFilter;
    
    // Filter by search term
    const matchesSearch = !searchTerm || (
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.team_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return matchesDepartment && matchesSearch;
  });

  // Get filtered attendance records based on date range
  const getFilteredAttendanceRecords = () => {
    if (attendanceFilterPreset === 'all') {
      return employeeAttendance;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate = new Date(today);
    let endDate = new Date(today);

    if (attendanceFilterPreset === 'last_30_days') {
      startDate.setDate(today.getDate() - 30);
    } else if (attendanceFilterPreset === 'last_90_days') {
      startDate.setDate(today.getDate() - 90);
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
        name: currentEmployee.full_name,
        id: currentEmployee.employee_number,
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

  const currentEmployee = selectedEmployee
    ? allMembers.find(emp => emp.employee_number === selectedEmployee)
    : null;

  // Get unique departments with member counts
  const departments = Array.from(
    new Map(
      allMembers.map(member => [
        member.team_name,
        {
          name: member.team_name,
          count: allMembers.filter(m => m.team_name === member.team_name).length
        }
      ])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Get selected department name for display
  const selectedDepartmentName = selectedDepartmentFilter !== 'all'
    ? selectedDepartmentFilter
    : null;

  // STATE B: Member Profile & History View
  if (selectedEmployee && currentEmployee) {
    const empData = {
      name: currentEmployee.full_name,
      id: currentEmployee.employee_number,
      email: currentEmployee.email,
      phone: currentEmployee.phone_number || 'Not provided',
      position: currentEmployee.position,
      team: currentEmployee.team_name,
      address: 'Not provided', // Address is not included in the new employee data
      dateHired: currentEmployee.created_at ? new Date(currentEmployee.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }) : 'Not provided',
      status: currentEmployee.status || 'active',
    };

    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Back Button */}
          <button
            onClick={() => setSelectedEmployee(null)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Members
          </button>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - QR Code & Basic Info */}
            <div className="space-y-6">
              {/* QR Code Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-4 h-4 text-gray-500" />
                  <h2 className="font-semibold text-gray-900">QR Code</h2>
                </div>
                <div className="flex flex-col items-center">
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-4">
                    <QRCodeGenerator 
                      value={empData.id} 
                      size={200} 
                      showDownload={true}
                      employeeName={empData.name}
                    />
                  </div>
                  <div className="bg-gray-900 text-white px-4 py-1.5 rounded-lg font-mono text-sm font-medium">
                    {empData.id}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Scan for attendance tracking
                  </p>
                </div>
              </div>

              {/* Status Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Employment Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium ${
                      empData.status === 'active' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}>
                      {empData.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Date Hired</span>
                    <span className="text-sm font-medium text-gray-900">{empData.dateHired}</span>
                  </div>
                </div>
              </div>

              {/* Login Credentials Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-4 h-4 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">Login Credentials</h3>
                </div>
                <div className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Username</label>
                    <div className="bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-200">
                      <p className="text-sm font-mono font-medium text-gray-900 break-all">
                        {empData.id}
                      </p>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Password</label>
                    <div className="bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-200 relative">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-mono font-medium text-gray-900 break-all flex-1">
                          {showPassword 
                            ? (currentEmployee.password_hash || currentEmployee.qr_token || 'Not set')
                            : '••••••••••••'
                          }
                        </p>
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-gray-500" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* QR Token (if different from employee number) */}
                  {currentEmployee.qr_token && currentEmployee.qr_token !== empData.id && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">QR Token</label>
                      <div className="bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-200">
                        <p className="text-sm font-mono font-medium text-gray-900 break-all">
                          {currentEmployee.qr_token}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      Keep these credentials confidential
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Detailed Info & Attendance */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Header Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start gap-6 mb-6">
                  {/* Avatar */}
                  {currentEmployee.profile_picture_url ? (
                    <img
                      src={currentEmployee.profile_picture_url}
                      alt={empData.name}
                      className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
                      {getInitials(empData.name)}
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                      {empData.name}
                    </h1>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{empData.position}</span>
                      <span className="text-gray-300">•</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        {empData.team}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Mail className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="text-sm font-medium text-gray-900 break-all">{empData.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Phone className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{empData.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Hash className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Employee ID</p>
                      <p className="text-sm font-mono font-medium text-gray-900">{empData.id}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">Address</p>
                      <p className="text-sm font-medium text-gray-900 break-words">{empData.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance History Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAttendanceFilterPreset('all')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        attendanceFilterPreset === 'all'
                          ? 'bg-[#0B3060] text-white'
                          : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setAttendanceFilterPreset('last_30_days')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        attendanceFilterPreset === 'last_30_days'
                          ? 'bg-[#0B3060] text-white'
                          : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                      }`}
                    >
                      Last 30 Days
                    </button>
                    <button
                      onClick={() => setAttendanceFilterPreset('last_90_days')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        attendanceFilterPreset === 'last_90_days'
                          ? 'bg-[#0B3060] text-white'
                          : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                      }`}
                    >
                      Last 90 Days
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowAttendanceDateFilter(!showAttendanceDateFilter)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          attendanceFilterPreset === 'custom'
                            ? 'bg-[#0B3060] text-white'
                            : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                        }`}
                      >
                        Custom Range
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
                                  <div className="flex items-center justify-center gap-2 text-sm">
                                    <span className="font-semibold text-[#0B3060]">Selected Range:</span>
                                    <span className="text-[#1F2937]">
                                      {attendanceDateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <span className="text-[#6B7280]">to</span>
                                    <span className="text-[#1F2937]">
                                      {attendanceDateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Clear Filter
                    </button>
                  )}

                  <div className="ml-auto text-xs text-[#6B7280]">
                    Showing <span className="font-semibold text-[#0B3060]">{filteredAttendanceRecords.length}</span> of <span className="font-semibold">{employeeAttendance.length}</span> records
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
                                <div className="text-sm">
                                  <div className="font-semibold text-[#0B3060]">
                                    {record.leaveInfo.leaveType}
                                  </div>
                                  <div className="text-xs text-[#6B7280] mt-1 line-clamp-2">
                                    {record.leaveInfo.reason}
                                  </div>
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
      </div>
    );
  }

  // STATE A: Member List View
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-500 mt-1">Manage all team members across the organization</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Members</p>
              <p className="text-2xl font-semibold text-gray-900">{allMembers.length}</p>
            </div>
            <div className="h-12 w-px bg-gray-300"></div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Team Leaders</p>
              <p className="text-2xl font-semibold text-gray-900">{admins.length}</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, ID, email..."
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/10 focus:border-[#0B3060] transition-all text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Department Filter */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Department</label>
              {isLoading ? (
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded-lg"></div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedDepartmentFilter}
                    onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/10 focus:border-[#0B3060] transition-all text-sm appearance-none bg-white cursor-pointer"
                  >
                    <option value="all">All Departments ({allMembers.length})</option>
                    {departments.map((dept) => (
                      <option key={dept.name} value={dept.name}>
                        {dept.name} ({dept.count})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedDepartmentFilter !== 'all' || searchTerm) && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Active filters:</span>
              {selectedDepartmentFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                  {selectedDepartmentFilter}
                  <button
                    onClick={() => setSelectedDepartmentFilter('all')}
                    className="hover:bg-gray-200 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">
                  "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="hover:bg-gray-200 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDepartmentFilter('all');
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium ml-auto"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Members Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B3060] mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Loading members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">No members found</p>
              <p className="text-xs text-gray-500 mt-1">
                {searchTerm || selectedDepartmentFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No employees registered yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredMembers.map((member) => (
                    <React.Fragment key={member.id}>
                      <tr className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {member.profile_picture_url ? (
                              <img
                                src={member.profile_picture_url}
                                alt={member.full_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${member.user_type === 'admin' ? 'bg-amber-500' : 'bg-gray-400'}`}>
                                {getInitials(member.full_name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 truncate">{member.full_name}</p>
                                {member.user_type === 'admin' && (
                                  <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    Leader
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">{member.email}</p>
                            </div>
                          </div>
                        </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-600">
                          {member.employee_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{member.position}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          {member.team_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                            member.status === 'active'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-gray-50 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {member.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMemberAttendance(member.employee_number);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              expandedMemberAttendance.has(member.employee_number)
                                ? 'bg-[#0B3060] text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                            title="View Attendance"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {expandedMemberAttendance.has(member.employee_number) ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEmployee(member.employee_number);
                            }}
                            className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="View Profile"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Attendance Details Row */}
                    {expandedMemberAttendance.has(member.employee_number) && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900">Recent Attendance</h4>
                            {memberAttendanceData.get(member.employee_number) ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {memberAttendanceData.get(member.employee_number)!.map((record: any) => (
                                  <div
                                    key={record.id}
                                    className="bg-white rounded-lg p-3 border border-gray-200"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-gray-500">
                                        {new Date(record.date).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </span>
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                                          record.status === 'PRESENT'
                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                            : record.status === 'LATE'
                                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                            : record.status === 'ABSENT'
                                            ? 'bg-red-50 text-red-700 border border-red-200'
                                            : record.status === 'PAID_LEAVE'
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'bg-gray-50 text-gray-700 border border-gray-200'
                                        }`}
                                      >
                                        {record.status.replace('_', ' ')}
                                      </span>
                                    </div>
                                    {record.time_in && (
                                      <div className="text-xs text-gray-600">
                                        In: {new Date(record.time_in).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    )}
                                    {record.time_out && (
                                      <div className="text-xs text-gray-600">
                                        Out: {new Date(record.time_out).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    )}
                                    {record.hours_worked && (
                                      <div className="text-xs font-medium text-gray-900 mt-1">
                                        Hours: {record.hours_worked}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                                Loading attendance data...
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}