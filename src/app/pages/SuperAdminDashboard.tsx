import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Users, CheckCircle, Clock, TrendingUp, RefreshCw, AlertCircle, UserCheck, Shield, Building2, Activity, Crown, Calendar, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Area, AreaChart } from 'recharts';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { useNavigate } from 'react-router';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

interface AdminWithStatus {
  admin_number: string;
  full_name: string;
  role: string;
  department: string;
  profile_picture_url?: string;
  status: 'present' | 'late' | 'absent';
}

interface UserWithStatus {
  id: string;
  full_name: string;
  position: string;
  profile_picture_url?: string;
  status: 'present' | 'late' | 'absent';
  userType: 'employee' | 'admin';
}

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allAdmins, setAllAdmins] = useState<any[]>([]);
  const [usersWithStatus, setUsersWithStatus] = useState<UserWithStatus[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([]);
  const [viewFilter, setViewFilter] = useState<'all' | 'employees' | 'admins'>('all');
  const [scheduleWarning, setScheduleWarning] = useState({
    show: false,
    employeesWithoutSchedules: 0,
    adminsWithoutSchedules: 0,
    totalWithoutSchedules: 0,
  });
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalAdmins: 0,
    totalUsers: 0,
    employeesPresent: 0,
    employeesLate: 0,
    employeesAbsent: 0,
    adminsPresent: 0,
    adminsLate: 0,
    adminsAbsent: 0,
    overallPresent: 0,
    overallLate: 0,
    overallAbsent: 0,
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('⚠️ Supabase not configured');
      toast.error('Database not configured');
      setIsLoading(false);
      return;
    }

    fetchAllDashboardData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log('🔄 [SuperAdminDashboard] Auto-refreshing...');
      setIsRefreshing(true);
      fetchAllDashboardData();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Listen for attendance updates
  useEffect(() => {
    const handleAttendanceUpdate = () => {
      console.log('📢 [SuperAdminDashboard] Attendance updated, refreshing...');
      setIsRefreshing(true);
      fetchAllDashboardData();
    };

    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    return () => window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
  }, []);

  const fetchAllDashboardData = async () => {
    try {
      setIsLoading(true);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 [SuperAdminDashboard] Fetching ALL data (Employees + Admins)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Fetch all employees
      const employeesResponse = await fetch(`${API_BASE_URL}/employees`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });

      if (!employeesResponse.ok) {
        throw new Error('Failed to fetch employees');
      }

      const employeesResult = await employeesResponse.json();
      const fetchedEmployees = employeesResult.success ? employeesResult.data : [];
      setAllEmployees(fetchedEmployees);
      console.log('✅ Employees fetched:', fetchedEmployees.length);

      // Fetch all admins (excluding super admin)
      const { data: fetchedAdmins, error: adminsError } = await supabase!
        .from('admins')
        .select('admin_number, full_name, email, role, department, profile_picture_url')
        .order('created_at', { ascending: false });

      if (adminsError) {
        console.error('❌ Error fetching admins:', adminsError);
      } else {
        setAllAdmins(fetchedAdmins || []);
        console.log('✅ Admin Team Leaders fetched:', fetchedAdmins?.length || 0);
      }

      // Fetch today's attendance for BOTH employees and admins
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const attendanceResponse = await fetch(
        `${API_BASE_URL}/attendance/records?start_date=${startOfDay}&end_date=${endOfDay}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      let todayAttendance: any[] = [];
      if (attendanceResponse.ok) {
        const attendanceResult = await attendanceResponse.json();
        todayAttendance = attendanceResult.success ? attendanceResult.data : [];
        console.log('✅ Today\'s attendance records:', todayAttendance.length);
      }

      // Create attendance maps for employees and admins
      const employeeAttendanceMap = new Map();
      const adminAttendanceMap = new Map();

      todayAttendance
        .filter(record => record.type === 'IN' || record.action === 'IN')
        .forEach(record => {
          const identifier = record.employee_number || record.admin_number;
          const status = record.status || 'present';
          
          // Check if it's an admin or employee based on identifier prefix
          if (identifier && identifier.startsWith('ADM-')) {
            adminAttendanceMap.set(identifier, status);
          } else if (identifier && identifier.startsWith('EMP-')) {
            employeeAttendanceMap.set(identifier, status);
          }
        });

      console.log('📊 Employee attendance entries:', employeeAttendanceMap.size);
      console.log('📊 Admin attendance entries:', adminAttendanceMap.size);

      // 🆕 Fetch today's schedules to calculate accurate absence count
      const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const schedulesResponse = await fetch(
        `${API_BASE_URL}/schedules/employees-scheduled?date=${todayDate}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      let scheduledEmployeeNumbers: string[] = [];
      let scheduledAdminNumbers: string[] = [];
      
      if (schedulesResponse.ok) {
        const schedulesResult = await schedulesResponse.json();
        if (schedulesResult.success && schedulesResult.data) {
          // 🆕 Backend now returns separate arrays for employees and admins
          scheduledEmployeeNumbers = schedulesResult.data.employeeNumbers || [];
          scheduledAdminNumbers = schedulesResult.data.adminNumbers || [];
          
          const totalScheduled = scheduledEmployeeNumbers.length + scheduledAdminNumbers.length;
          console.log(`📅 Total users scheduled for today (excluding day-offs): ${totalScheduled}`);
          console.log(`   📋 Employees scheduled: ${scheduledEmployeeNumbers.length}`);
          console.log(`   📋 Admins scheduled: ${scheduledAdminNumbers.length}`);
          
          // Log the actual IDs to verify
          if (scheduledEmployeeNumbers.length > 0) {
            console.log(`   🔍 Employee IDs scheduled:`, scheduledEmployeeNumbers.join(', '));
          }
          if (scheduledAdminNumbers.length > 0) {
            console.log(`   🔍 Admin IDs scheduled:`, scheduledAdminNumbers.join(', '));
          } else {
            console.warn(`   ⚠️ NO ADMIN SCHEDULES FOUND!`);
          }
        } else {
          console.error('❌ Schedules endpoint returned error:', await schedulesResponse.text());
        }
      } else {
        console.warn('⚠️ Could not fetch schedules, absence count may be inaccurate');
      }

      // Calculate employee stats - ONLY count as absent if they have a schedule
      const employeesPresent = Array.from(employeeAttendanceMap.values()).filter(s => s === 'present').length;
      const employeesLate = Array.from(employeeAttendanceMap.values()).filter(s => s === 'late').length;
      const employeesAbsent = scheduledEmployeeNumbers.length > 0 
        ? Math.max(0, scheduledEmployeeNumbers.length - employeeAttendanceMap.size)
        : 0; // If no schedules fetched, show 0 absent instead of all users

      // Calculate admin stats - ONLY count as absent if they have a schedule
      const adminsPresent = Array.from(adminAttendanceMap.values()).filter(s => s === 'present').length;
      const adminsLate = Array.from(adminAttendanceMap.values()).filter(s => s === 'late').length;
      const adminsAbsent = scheduledAdminNumbers.length > 0
        ? Math.max(0, scheduledAdminNumbers.length - adminAttendanceMap.size)
        : 0; // If no schedules fetched, show 0 absent instead of all admins

      // Calculate overall stats
      const totalUsers = fetchedEmployees.length + (fetchedAdmins?.length || 0);
      const overallPresent = employeesPresent + adminsPresent;
      const overallLate = employeesLate + adminsLate;
      const overallAbsent = employeesAbsent + adminsAbsent;

      setStats({
        totalEmployees: fetchedEmployees.length,
        totalAdmins: fetchedAdmins?.length || 0,
        totalUsers,
        employeesPresent,
        employeesLate,
        employeesAbsent,
        adminsPresent,
        adminsLate,
        adminsAbsent,
        overallPresent,
        overallLate,
        overallAbsent,
      });

      console.log('📊 Dashboard Stats:');
      console.log('   Employees - Total:', fetchedEmployees.length, 'Present:', employeesPresent, 'Late:', employeesLate, 'Absent:', employeesAbsent);
      console.log('   Admins - Total:', fetchedAdmins?.length || 0, 'Present:', adminsPresent, 'Late:', adminsLate, 'Absent:', adminsAbsent);
      console.log('   Overall - Total:', totalUsers, 'Present:', overallPresent, 'Late:', overallLate, 'Absent:', overallAbsent);

      // Build combined users with status for Real-time Status panel
      const combinedUsers: UserWithStatus[] = [];

      // Fetch detailed schedules for ALL users to check grace periods
      let schedulesMap = new Map();
      let activeSchedulesCount = { employees: 0, admins: 0 };
      try {
        // Fetch all schedules from KV store for today using correct parameter name
        const allSchedulesResponse = await fetch(
          `${API_BASE_URL}/schedules?schedule_date=${todayDate}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );

        console.log('🔍 Fetching schedules from:', `${API_BASE_URL}/schedules?schedule_date=${todayDate}`);

        if (allSchedulesResponse.ok) {
          const allSchedulesResult = await allSchedulesResponse.json();
          console.log('📥 Raw response from schedules endpoint:', allSchedulesResult);
          
          if (allSchedulesResult.success && allSchedulesResult.data) {
            const rawSchedules = allSchedulesResult.data;
            console.log('📅 Raw schedules data:', rawSchedules.length, 'total schedules');
            
            // Log first few schedules to see structure
            if (rawSchedules.length > 0) {
              console.log('📋 Sample schedule (first one):', JSON.stringify(rawSchedules[0], null, 2));
            }
            
            // Filter out DAY_OFF and PAID_LEAVE schedules - only active work schedules
            const activeSchedules = rawSchedules.filter((schedule: any) => {
              const isDayOff = schedule.shift_type === 'DAY_OFF' || schedule.is_day_off === true;
              const isPaidLeave = schedule.shift_type === 'PAID_LEAVE' || schedule.is_paid_leave === true;
              const isActive = !isDayOff && !isPaidLeave;
              
              // Log filtering decisions for debugging
              if (!isActive) {
                console.log(`   ⏭️ Filtered out schedule for ${schedule.employee_number || schedule.admin_number}: isDayOff=${isDayOff}, isPaidLeave=${isPaidLeave}`);
              }
              
              return isActive;
            });
            
            console.log(`📅 Active work schedules (excluding day-offs and paid leave): ${activeSchedules.length}`);
            console.log(`   🗑️ Filtered out: ${rawSchedules.length - activeSchedules.length} schedules (day-offs or paid leave)`);
            
            // Map schedules by employee_number or admin_number
            activeSchedules.forEach((schedule: any) => {
              const userNumber = schedule.employee_number || schedule.admin_number;
              if (userNumber) {
                schedulesMap.set(userNumber, schedule);
                
                // Count by type
                if (userNumber.startsWith('EMP-')) {
                  activeSchedulesCount.employees++;
                } else if (userNumber.startsWith('ADM-')) {
                  activeSchedulesCount.admins++;
                }
                
                console.log(`   📋 Schedule for ${userNumber}:`, {
                  time_in: schedule.time_in,
                  grace_period: schedule.grace_period,
                  shift_type: schedule.shift_type,
                  is_day_off: schedule.is_day_off,
                  is_paid_leave: schedule.is_paid_leave,
                  userType: userNumber.startsWith('ADM-') ? 'ADMIN' : 'EMPLOYEE'
                });
              } else {
                console.warn('   ⚠️ Schedule missing user identifier:', schedule);
              }
            });
            
            console.log('📅 Active schedules mapped:', schedulesMap.size);
            console.log(`   📊 Employee schedules: ${activeSchedulesCount.employees}`);
            console.log(`   📊 Admin schedules: ${activeSchedulesCount.admins}`);
            
            // Log which employees are in the schedules map
            const employeeScheduleIds = Array.from(schedulesMap.keys()).filter(id => id.startsWith('EMP-'));
            const adminScheduleIds = Array.from(schedulesMap.keys()).filter(id => id.startsWith('ADM-'));
            console.log('📋 Employee IDs with schedules:', employeeScheduleIds.join(', ') || 'NONE');
            console.log('📋 Admin IDs with schedules:', adminScheduleIds.join(', ') || 'NONE');
          } else {
            console.error('❌ Schedules endpoint returned success=false or no data:', allSchedulesResult);
          }
        } else {
          console.error('❌ Failed to fetch schedules:', allSchedulesResponse.status, await allSchedulesResponse.text());
        }
      } catch (error) {
        console.error('❌ Exception while fetching detailed schedules:', error);
      }

      // Helper function to check if user exceeded grace period and should be marked absent
      const checkIfAbsent = (userNumber: string, scheduleInfo: any): boolean => {
        if (!scheduleInfo) {
          console.log(`⚠️ No schedule info for ${userNumber}`);
          return false;
        }
        
        const now = new Date();
        const scheduleTimeIn = scheduleInfo.time_in; // Format: "HH:MM:SS"
        const gracePeriod = scheduleInfo.grace_period || 0; // in minutes
        
        if (!scheduleTimeIn) {
          console.log(`⚠️ No time_in found for ${userNumber}`);
          return false;
        }
        
        // Create a date object for scheduled time + grace period
        const timeParts = scheduleTimeIn.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        // Add grace period
        const graceEndTime = new Date(scheduledTime.getTime() + gracePeriod * 60000);
        
        const isAbsent = now > graceEndTime;
        
        console.log(`⏰ Grace check for ${userNumber}:`, {
          current_time: now.toLocaleTimeString(),
          scheduled_time: scheduledTime.toLocaleTimeString(),
          grace_period_minutes: gracePeriod,
          grace_end_time: graceEndTime.toLocaleTimeString(),
          is_absent: isAbsent
        });
        
        return isAbsent;
      };

      // 🆕 BUILD allScheduledUsers FROM scheduledEmployeeNumbers & scheduledAdminNumbers
      // This ensures ALL scheduled users show up, even if detailed schedules fail
      const allScheduledUsers: UserWithStatus[] = [];
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔨 Building Real-time Status from scheduled user lists');
      console.log(`   📋 Processing ${scheduledEmployeeNumbers.length} scheduled employees`);
      console.log(`   📋 Processing ${scheduledAdminNumbers.length} scheduled admins`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // 🔍 DEBUG: Show what we're working with
      console.log('🔍 DEBUG - Data Available:');
      console.log(`   - fetchedEmployees count: ${fetchedEmployees.length}`);
      console.log(`   - fetchedAdmins count: ${fetchedAdmins?.length || 0}`);
      console.log(`   - scheduledEmployeeNumbers: [${scheduledEmployeeNumbers.join(', ')}]`);
      console.log(`   - scheduledAdminNumbers: [${scheduledAdminNumbers.join(', ')}]`);
      if (fetchedEmployees.length > 0) {
        console.log(`   - Sample employee numbers in DB: [${fetchedEmployees.slice(0, 5).map((e: any) => e.employee_number).join(', ')}]`);
      }

      // Process scheduled employees
      for (const empNumber of scheduledEmployeeNumbers) {
        const emp = fetchedEmployees.find(e => e.employee_number === empNumber);
        if (!emp) {
          console.log(`⚠️ Employee ${empNumber} scheduled but NOT FOUND in fetchedEmployees array!`);
          console.log(`   🔍 All employee numbers in DB: [${fetchedEmployees.map((e: any) => e.employee_number).join(', ')}]`);
          continue;
        }
        
        const hasCheckedIn = employeeAttendanceMap.has(empNumber);
        const scheduleInfo = schedulesMap.get(empNumber); // May be undefined if detailed schedules failed
        
        let status: 'present' | 'late' | 'absent';
        if (hasCheckedIn) {
          // Has checked in - use their actual status
          status = employeeAttendanceMap.get(empNumber);
          console.log(`✅ Employee ${empNumber} (${emp.full_name}) checked in with status: ${status}`);
        } else {
          // No check-in - determine if absent or late
          if (scheduleInfo) {
            // We have detailed schedule info - use grace period calculation
            const exceededGracePeriod = checkIfAbsent(empNumber, scheduleInfo);
            status = exceededGracePeriod ? 'absent' : 'late';
            console.log(`❌ Employee ${empNumber} (${emp.full_name}) NOT checked in - Status: ${status} (using grace period)`);
          } else {
            // No detailed schedule info - mark as absent (simplified fallback)
            status = 'absent';
            console.log(`❌ Employee ${empNumber} (${emp.full_name}) NOT checked in - Status: ${status} (no schedule details, fallback)`);
          }
        }
        
        allScheduledUsers.push({
          id: emp.employee_number,
          full_name: emp.full_name,
          position: emp.position || 'Employee',
          profile_picture_url: emp.profile_picture_url,
          status: status,
          userType: 'employee',
        });
      }

      // Process scheduled admins
      for (const adminNumber of scheduledAdminNumbers) {
        const admin = (fetchedAdmins || []).find(a => a.admin_number === adminNumber);
        if (!admin) {
          console.log(`⚠️ Admin ${adminNumber} scheduled but not found in database`);
          continue;
        }
        
        const hasCheckedIn = adminAttendanceMap.has(adminNumber);
        const scheduleInfo = schedulesMap.get(adminNumber); // May be undefined if detailed schedules failed
        
        let status: 'present' | 'late' | 'absent';
        if (hasCheckedIn) {
          // Has checked in - use their actual status
          status = adminAttendanceMap.get(adminNumber);
          console.log(`✅ Admin ${adminNumber} (${admin.full_name}) checked in with status: ${status}`);
        } else {
          // No check-in - determine if absent or late
          if (scheduleInfo) {
            // We have detailed schedule info - use grace period calculation
            const exceededGracePeriod = checkIfAbsent(adminNumber, scheduleInfo);
            status = exceededGracePeriod ? 'absent' : 'late';
            console.log(`❌ Admin ${adminNumber} (${admin.full_name}) NOT checked in - Status: ${status} (using grace period)`);
          } else {
            // No detailed schedule info - mark as absent (simplified fallback)
            status = 'absent';
            console.log(`❌ Admin ${adminNumber} (${admin.full_name}) NOT checked in - Status: ${status} (no schedule details, fallback)`);
          }
        }
        
        allScheduledUsers.push({
          id: admin.admin_number,
          full_name: admin.full_name,
          position: admin.role === 'admin' ? 'Team Leader' : admin.role,
          profile_picture_url: admin.profile_picture_url,
          status: status,
          userType: 'admin',
        });
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Processed ${allScheduledUsers.filter(u => u.userType === 'employee').length} scheduled employees`);
      console.log(`✅ Processed ${allScheduledUsers.filter(u => u.userType === 'admin').length} scheduled admins`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Sort users: absent first, then late, then present
      allScheduledUsers.sort((a, b) => {
        const statusOrder = { 'absent': 0, 'late': 1, 'present': 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setUsersWithStatus(allScheduledUsers);
      console.log('✅ Combined users with status:', allScheduledUsers.length);
      console.log('   📊 Breakdown:');
      console.log(`      - Employees: ${allScheduledUsers.filter(u => u.userType === 'employee').length}`);
      console.log(`      - Admins: ${allScheduledUsers.filter(u => u.userType === 'admin').length}`);
      console.log(`   📊 Status Breakdown:`);
      console.log(`      - Present: ${allScheduledUsers.filter(u => u.status === 'present').length}`);
      console.log(`      - Late: ${allScheduledUsers.filter(u => u.status === 'late').length}`);
      console.log(`      - Absent: ${allScheduledUsers.filter(u => u.status === 'absent').length}`);
      
      // 🔍 Log detailed list of absent users
      const absentUsers = allScheduledUsers.filter(u => u.status === 'absent');
      if (absentUsers.length > 0) {
        console.log('   🚨 ABSENT USERS:');
        absentUsers.forEach(user => {
          console.log(`      - ${user.id} (${user.full_name}) - ${user.userType.toUpperCase()}`);
        });
      }

      // 🆕 RECALCULATE STATS USING THE ACCURATE allScheduledUsers DATA
      // This ensures the stats cards match the Real-time Status panel
      // BUT: Fall back to original calculation if detailed schedules weren't fetched
      let accurateEmployeesPresent, accurateEmployeesLate, accurateEmployeesAbsent;
      let accurateAdminsPresent, accurateAdminsLate, accurateAdminsAbsent;
      let accurateOverallPresent, accurateOverallLate, accurateOverallAbsent;

      if (allScheduledUsers.length > 0) {
        // Use the detailed schedule data with grace period calculations
        accurateEmployeesPresent = allScheduledUsers.filter(u => u.userType === 'employee' && u.status === 'present').length;
        accurateEmployeesLate = allScheduledUsers.filter(u => u.userType === 'employee' && u.status === 'late').length;
        accurateEmployeesAbsent = allScheduledUsers.filter(u => u.userType === 'employee' && u.status === 'absent').length;
        
        accurateAdminsPresent = allScheduledUsers.filter(u => u.userType === 'admin' && u.status === 'present').length;
        accurateAdminsLate = allScheduledUsers.filter(u => u.userType === 'admin' && u.status === 'late').length;
        accurateAdminsAbsent = allScheduledUsers.filter(u => u.userType === 'admin' && u.status === 'absent').length;

        accurateOverallPresent = accurateEmployeesPresent + accurateAdminsPresent;
        accurateOverallLate = accurateEmployeesLate + accurateAdminsLate;
        accurateOverallAbsent = accurateEmployeesAbsent + accurateAdminsAbsent;

        console.log('✅ Using accurate stats from Real-time Status data');
      } else {
        // Fall back to the original calculation method if detailed schedules failed
        console.warn('⚠️ No detailed schedules found, using fallback calculation');
        
        accurateEmployeesPresent = employeesPresent;
        accurateEmployeesLate = employeesLate;
        accurateEmployeesAbsent = employeesAbsent;
        
        accurateAdminsPresent = adminsPresent;
        accurateAdminsLate = adminsLate;
        accurateAdminsAbsent = adminsAbsent;

        accurateOverallPresent = overallPresent;
        accurateOverallLate = overallLate;
        accurateOverallAbsent = overallAbsent;
      }

      // Update stats with accurate counts from Real-time Status data
      setStats({
        totalEmployees: fetchedEmployees.length,
        totalAdmins: fetchedAdmins?.length || 0,
        totalUsers,
        employeesPresent: accurateEmployeesPresent,
        employeesLate: accurateEmployeesLate,
        employeesAbsent: accurateEmployeesAbsent,
        adminsPresent: accurateAdminsPresent,
        adminsLate: accurateAdminsLate,
        adminsAbsent: accurateAdminsAbsent,
        overallPresent: accurateOverallPresent,
        overallLate: accurateOverallLate,
        overallAbsent: accurateOverallAbsent,
      });

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 UPDATED Dashboard Stats (from Real-time Status):');
      console.log(`   Employees - Present: ${accurateEmployeesPresent}, Late: ${accurateEmployeesLate}, Absent: ${accurateEmployeesAbsent}`);
      console.log(`   Admins - Present: ${accurateAdminsPresent}, Late: ${accurateAdminsLate}, Absent: ${accurateAdminsAbsent}`);
      console.log(`   Overall - Present: ${accurateOverallPresent}, Late: ${accurateOverallLate}, Absent: ${accurateOverallAbsent}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // 🆕 Calculate users without schedules for warning banner
      const employeesWithoutSchedules = fetchedEmployees.length - scheduledEmployeeNumbers.length;
      const adminsWithoutSchedules = (fetchedAdmins?.length || 0) - scheduledAdminNumbers.length;
      const totalWithoutSchedules = employeesWithoutSchedules + adminsWithoutSchedules;
      
      console.log('⚠️ SCHEDULE COVERAGE ANALYSIS:');
      console.log(`   Total Employees: ${fetchedEmployees.length}`);
      console.log(`   Employees with schedules today: ${scheduledEmployeeNumbers.length}`);
      console.log(`   Employees WITHOUT schedules: ${employeesWithoutSchedules}`);
      console.log(`   Total Admins: ${fetchedAdmins?.length || 0}`);
      console.log(`   Admins with schedules today: ${scheduledAdminNumbers.length}`);
      console.log(`   Admins WITHOUT schedules: ${adminsWithoutSchedules}`);
      console.log(`   Total users WITHOUT schedules: ${totalWithoutSchedules}`);
      
      // Show warning if users don't have schedules
      setScheduleWarning({
        show: totalWithoutSchedules > 0,
        employeesWithoutSchedules: Math.max(0, employeesWithoutSchedules),
        adminsWithoutSchedules: Math.max(0, adminsWithoutSchedules),
        totalWithoutSchedules: Math.max(0, totalWithoutSchedules),
      });

      // Fetch weekly trends for BOTH employees and admins
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const weekStart = new Date(sevenDaysAgo.setHours(0, 0, 0, 0)).toISOString();

      const weeklyResponse = await fetch(
        `${API_BASE_URL}/attendance/records?start_date=${weekStart}&end_date=${endOfDay}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      if (weeklyResponse.ok) {
        const weeklyResult = await weeklyResponse.json();
        const weeklyRecords = weeklyResult.success ? weeklyResult.data : [];
        
        // Group by day with separate counts for employees and admins
        const dayMap = new Map();
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        weeklyRecords
          .filter((r: any) => r.type === 'IN' || r.action === 'IN')
          .forEach((record: any) => {
            const date = new Date(record.timestamp);
            const dayKey = date.toDateString();
            if (!dayMap.has(dayKey)) {
              dayMap.set(dayKey, { employees: new Set(), admins: new Set() });
            }
            
            const identifier = record.employee_number || record.admin_number;
            if (identifier && identifier.startsWith('ADM-')) {
              dayMap.get(dayKey).admins.add(identifier);
            } else if (identifier && identifier.startsWith('EMP-')) {
              dayMap.get(dayKey).employees.add(identifier);
            }
          });

        const chartData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayKey = date.toDateString();
          const dayName = days[date.getDay()];
          const employeeCount = dayMap.get(dayKey)?.employees.size || 0;
          const adminCount = dayMap.get(dayKey)?.admins.size || 0;
          const isToday = i === 0;
          
          chartData.push({
            id: `day-${i}`,
            day: dayName,
            employees: employeeCount,
            admins: adminCount,
            total: employeeCount + adminCount,
            isToday,
          });
        }
        
        setWeeklyTrends(chartData);
        console.log('✅ Weekly trends processed:', chartData);
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error: any) {
      console.error('❌ Error fetching dashboard data:', error);
      const errorMessage = error.message || 'Failed to load dashboard data';
      console.error('Error details:', {
        message: errorMessage,
        stack: error.stack,
        name: error.name
      });
      toast.error(`Dashboard Error: ${errorMessage}`);
      
      // Set empty data to prevent UI errors
      setAllEmployees([]);
      setAllAdmins([]);
      setUsersWithStatus([]);
      setWeeklyTrends([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAllDashboardData();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get filtered data based on view filter
  const getFilteredStats = () => {
    switch (viewFilter) {
      case 'employees':
        return {
          total: stats.totalEmployees,
          present: stats.employeesPresent,
          late: stats.employeesLate,
          absent: stats.employeesAbsent,
        };
      case 'admins':
        return {
          total: stats.totalAdmins,
          present: stats.adminsPresent,
          late: stats.adminsLate,
          absent: stats.adminsAbsent,
        };
      default:
        return {
          total: stats.totalUsers,
          present: stats.overallPresent,
          late: stats.overallLate,
          absent: stats.overallAbsent,
        };
    }
  };

  const filteredStats = getFilteredStats();

  // Coverage data for pie chart - Always include all values with unique IDs to prevent key conflicts
  const coverageData = [
    { id: `present-${viewFilter}`, name: 'Present', value: filteredStats.present, color: '#10B981' },
    { id: `late-${viewFilter}`, name: 'Late', value: filteredStats.late, color: '#F7B34C' },
    { id: `absent-${viewFilter}`, name: 'Absent', value: filteredStats.absent, color: '#EF4444' },
  ].filter(item => item.value > 0); // Only include non-zero values

  // Filter users for real-time status based on selected view
  const filteredUsers = usersWithStatus.filter(user => {
    if (viewFilter === 'employees') return user.userType === 'employee';
    if (viewFilter === 'admins') return user.userType === 'admin';
    return true; // 'all'
  });

  // Filter weekly trends based on view
  const getWeeklyTrendsFiltered = () => {
    if (viewFilter === 'employees') {
      return weeklyTrends.map(day => ({
        ...day,
        key: `emp-${day.id}`, // Add unique key
        attendance: day.employees,
      }));
    } else if (viewFilter === 'admins') {
      return weeklyTrends.map(day => ({
        ...day,
        key: `adm-${day.id}`, // Add unique key
        attendance: day.admins,
      }));
    }
    return weeklyTrends.map(day => ({
        ...day,
        key: `all-${day.id}`, // Add unique key
    })); // Show both for 'all'
  };

  const weeklyTrendsFiltered = getWeeklyTrendsFiltered();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0B3060] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6B7280] font-semibold">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Super Admin Dashboard</h1>
          <p className="text-[#6B7280]">Comprehensive overview of all employees and administrators</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.log('🔍 DIAGNOSTIC REPORT - ABSENT USERS');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              
              console.log('\n📊 STATS OBJECT:');
              console.log('  Total Employees:', stats.totalEmployees);
              console.log('  Employees Absent:', stats.employeesAbsent);
              console.log('  Total Admins:', stats.totalAdmins);
              console.log('  Admins Absent:', stats.adminsAbsent);
              
              console.log('\n👥 USERS WITH STATUS ARRAY:');
              console.log('  Total users:', usersWithStatus.length);
              console.log('  Employee users:', usersWithStatus.filter(u => u.userType === 'employee').length);
              console.log('  Admin users:', usersWithStatus.filter(u => u.userType === 'admin').length);
              
              console.log('\n🚨 ABSENT USERS IN ARRAY:');
              const absentEmployees = usersWithStatus.filter(u => u.userType === 'employee' && u.status === 'absent');
              const absentAdmins = usersWithStatus.filter(u => u.userType === 'admin' && u.status === 'absent');
              
              console.log(`  Absent Employees (${absentEmployees.length}):`);
              absentEmployees.forEach(emp => {
                console.log(`    ❌ ${emp.id} - ${emp.full_name} - ${emp.position}`);
              });
              
              console.log(`  Absent Admins (${absentAdmins.length}):`);
              absentAdmins.forEach(admin => {
                console.log(`    ❌ ${admin.id} - ${admin.full_name} - ${admin.position}`);
              });
              
              console.log('\n🔍 ALL EMPLOYEES:');
              console.log('  Total fetched:', allEmployees.length);
              if (allEmployees.length > 0) {
                console.log('  Sample IDs:', allEmployees.slice(0, 5).map(e => e.employee_number).join(', '));
              }
              
              console.log('\n🔍 ALL ADMINS:');
              console.log('  Total fetched:', allAdmins.length);
              if (allAdmins.length > 0) {
                console.log('  Sample IDs:', allAdmins.slice(0, 5).map(a => a.admin_number).join(', '));
              }
              
              console.log('\n📋 FILTERED USERS (based on viewFilter=' + viewFilter + '):');
              const filtered = usersWithStatus.filter(user => {
                if (viewFilter === 'employees') return user.userType === 'employee';
                if (viewFilter === 'admins') return user.userType === 'admin';
                return true;
              });
              console.log('  Filtered count:', filtered.length);
              console.log('  Absent in filtered:', filtered.filter(u => u.status === 'absent').length);
              
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              
              alert('📊 Diagnostic report generated!\n\nCheck the browser console for detailed information.\n\n' +
                `Summary:\n` +
                `- Total users with status: ${usersWithStatus.length}\n` +
                `- Absent employees: ${absentEmployees.length}\n` +
                `- Absent admins: ${absentAdmins.length}\n` +
                `- Current view filter: ${viewFilter}`
              );
            }}
            className="flex items-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            🔍 Diagnose Absent
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] hover:from-[#1a4a8a] hover:to-[#0B3060] text-white rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 font-semibold"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-md p-2 border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#6B7280] px-3">View:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setViewFilter('all')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                viewFilter === 'all'
                  ? 'bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white shadow-md'
                  : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>All Users</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  viewFilter === 'all' ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {stats.totalUsers}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setViewFilter('employees')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                viewFilter === 'employees'
                  ? 'bg-gradient-to-r from-[#F7B34C] to-[#f5a623] text-white shadow-md'
                  : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                <span>Employees Only</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  viewFilter === 'employees' ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {stats.totalEmployees}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setViewFilter('admins')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                viewFilter === 'admins'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Admin Team Leaders</span>
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  viewFilter === 'admins' ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {stats.totalAdmins}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Info Banner */}
      {viewFilter !== 'all' && (
        <div className={`p-4 rounded-xl border-2 ${
          viewFilter === 'employees' 
            ? 'bg-amber-50 border-amber-200' 
            : 'bg-purple-50 border-purple-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              viewFilter === 'employees' ? 'bg-amber-100' : 'bg-purple-100'
            }`}>
              {viewFilter === 'employees' ? (
                <UserCheck className="w-5 h-5 text-amber-600" />
              ) : (
                <Shield className="w-5 h-5 text-purple-600" />
              )}
            </div>
            <div>
              <p className={`font-bold ${
                viewFilter === 'employees' ? 'text-amber-900' : 'text-purple-900'
              }`}>
                Viewing {viewFilter === 'employees' ? 'Employees' : 'Admin Team Leaders'} Only
              </p>
              <p className={`text-sm ${
                viewFilter === 'employees' ? 'text-amber-700' : 'text-purple-700'
              }`}>
                Showing attendance records for {filteredStats.total} {viewFilter === 'employees' ? 'employees' : 'admin team leaders'}
              </p>
            </div>
            <button
              onClick={() => setViewFilter('all')}
              className={`ml-auto px-4 py-2 rounded-lg font-semibold transition-all ${
                viewFilter === 'employees'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              Show All
            </button>
          </div>
        </div>
      )}

      {/* Schedule Warning Banner */}
      {scheduleWarning.show && (
        <div className="p-5 rounded-xl border-2 bg-gradient-to-r from-orange-50 to-red-50 border-orange-300 shadow-md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-orange-900 text-lg mb-1">
                ⚠️ Schedule Configuration Required
              </p>
              <p className="text-orange-800 text-sm mb-3">
                {scheduleWarning.totalWithoutSchedules} user{scheduleWarning.totalWithoutSchedules !== 1 ? 's' : ''} don't have schedules assigned for today. 
                Without schedules, the system cannot accurately detect absent users.
              </p>
              <div className="flex items-center gap-4 text-sm mb-3">
                {scheduleWarning.employeesWithoutSchedules > 0 && (
                  <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg">
                    <UserCheck className="w-4 h-4 text-orange-700" />
                    <span className="text-orange-800 font-semibold">
                      {scheduleWarning.employeesWithoutSchedules} employee{scheduleWarning.employeesWithoutSchedules !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {scheduleWarning.adminsWithoutSchedules > 0 && (
                  <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg">
                    <Shield className="w-4 h-4 text-orange-700" />
                    <span className="text-orange-800 font-semibold">
                      {scheduleWarning.adminsWithoutSchedules} admin{scheduleWarning.adminsWithoutSchedules !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate('/super-admin/schedule')}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow-md"
              >
                <Calendar className="w-4 h-4" />
                Go to Schedule Management
              </button>
            </div>
            <button
              onClick={() => setScheduleWarning({ ...scheduleWarning, show: false })}
              className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
              title="Dismiss warning"
            >
              <X className="w-5 h-5 text-orange-600" />
            </button>
          </div>
        </div>
      )}

      {/* Top Stats - 4 Cards in a Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-14 h-14 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-lg ${
                viewFilter === 'employees' 
                  ? 'from-amber-500 to-amber-600' 
                  : viewFilter === 'admins' 
                  ? 'from-purple-500 to-purple-600' 
                  : 'from-blue-500 to-blue-600'
              }`}>
                {viewFilter === 'employees' ? (
                  <UserCheck className="w-7 h-7 text-white" />
                ) : viewFilter === 'admins' ? (
                  <Shield className="w-7 h-7 text-white" />
                ) : (
                  <Users className="w-7 h-7 text-white" />
                )}
              </div>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                viewFilter === 'employees' 
                  ? 'bg-amber-50' 
                  : viewFilter === 'admins' 
                  ? 'bg-purple-50' 
                  : 'bg-blue-50'
              }`}>
                <Activity className={`w-4 h-4 ${
                  viewFilter === 'employees' 
                    ? 'text-amber-600' 
                    : viewFilter === 'admins' 
                    ? 'text-purple-600' 
                    : 'text-blue-600'
                }`} />
                <span className={`text-xs font-bold ${
                  viewFilter === 'employees' 
                    ? 'text-amber-600' 
                    : viewFilter === 'admins' 
                    ? 'text-purple-600' 
                    : 'text-blue-600'
                }`}>
                  {viewFilter === 'all' ? 'ALL' : viewFilter === 'employees' ? 'EMP' : 'ADM'}
                </span>
              </div>
            </div>
            <p className="text-sm text-[#6B7280] mb-1 font-medium">
              {viewFilter === 'all' ? 'Total Users' : viewFilter === 'employees' ? 'Total Employees' : 'Total Admins'}
            </p>
            <p className="text-4xl font-bold text-[#1F2937] mb-2">{filteredStats.total}</p>
            {viewFilter === 'all' && (
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <span>{stats.totalEmployees} Employees</span>
                <span>•</span>
                <span>{stats.totalAdmins} Admins</span>
              </div>
            )}
          </div>
        </Card>

        {/* Overall Present */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-green-50 rounded-full">
                <UserCheck className="w-4 h-4 text-green-600" />
                <span className="text-xs font-bold text-green-600">
                  {filteredStats.total > 0 ? Math.round((filteredStats.present / filteredStats.total) * 100) : 0}%
                </span>
              </div>
            </div>
            <p className="text-sm text-[#6B7280] mb-1 font-medium">Present Today</p>
            <p className="text-4xl font-bold text-green-600 mb-2">{filteredStats.present}</p>
            {viewFilter === 'all' && (
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <span>{stats.employeesPresent} Employees</span>
                <span>•</span>
                <span>{stats.adminsPresent} Admins</span>
              </div>
            )}
          </div>
        </Card>

        {/* Overall Late */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-amber-50 rounded-full">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-600">
                  {filteredStats.total > 0 ? Math.round((filteredStats.late / filteredStats.total) * 100) : 0}%
                </span>
              </div>
            </div>
            <p className="text-sm text-[#6B7280] mb-1 font-medium">Late Today</p>
            <p className="text-4xl font-bold text-amber-600 mb-2">{filteredStats.late}</p>
            {viewFilter === 'all' && (
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <span>{stats.employeesLate} Employees</span>
                <span>•</span>
                <span>{stats.adminsLate} Admins</span>
              </div>
            )}
          </div>
        </Card>

        {/* Overall Absent */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-red-50 rounded-full">
                <Users className="w-4 h-4 text-red-600" />
                <span className="text-xs font-bold text-red-600">
                  {filteredStats.total > 0 ? Math.round((filteredStats.absent / filteredStats.total) * 100) : 0}%
                </span>
              </div>
            </div>
            <p className="text-sm text-[#6B7280] mb-1 font-medium">Absent Today</p>
            <p className="text-xs text-[#9CA3AF] mb-2 italic">(Scheduled, No Time-In)</p>
            <p className="text-4xl font-bold text-red-600 mb-2">{filteredStats.absent}</p>
            {viewFilter === 'all' && (
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <span>{stats.employeesAbsent} Employees</span>
                <span>•</span>
                <span>{stats.adminsAbsent} Admins</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Second Row: Coverage Chart + Breakdown Chart + Real-time Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overall Coverage - Pie Chart */}
        <div className="lg:col-span-4">
          <Card title={`${viewFilter === 'all' ? "Today's Overall Coverage" : viewFilter === 'employees' ? "Employees Coverage" : "Admin Team Leaders Coverage"}`}>
            {coverageData.length > 0 ? (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={coverageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        isAnimationActive={false}
                      >
                        {coverageData.map((entry, index) => (
                          <Cell key={`coverage-pie-${entry.id}-${index}-${viewFilter}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center mt-4 pb-4">
                  <p className="text-4xl font-bold text-[#1F2937] mb-1">
                    {filteredStats.total > 0 ? Math.round((filteredStats.present / filteredStats.total) * 100) : 0}%
                  </p>
                  <p className="text-sm text-[#6B7280] font-medium">Attendance Rate</p>
                </div>
                
                {/* Legend */}
                <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                  {coverageData.map((item) => (
                    <div key={item.id} className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs font-medium text-[#6B7280]">{item.name}</span>
                      </div>
                      <p className="text-lg font-bold text-[#1F2937]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-72 text-[#6B7280]">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No attendance data yet</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Employee vs Admin Breakdown - Only show when filter is 'all' */}
        {viewFilter === 'all' && (
          <div className="lg:col-span-4">
            <Card>
              <div className="p-6 pb-4">
                <h3 className="text-lg font-bold text-[#1F2937] mb-1">Employees vs Admins Breakdown</h3>
                <p className="text-xs text-[#6B7280] mb-4">
                  <span className="inline-flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Only showing users who were <span className="font-semibold">scheduled to work today</span>
                  </span>
                </p>
              </div>
              <div className="h-80 px-6 pb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { id: 'emp-bd', category: 'Employees', present: stats.employeesPresent, late: stats.employeesLate, absent: stats.employeesAbsent },
                    { id: 'adm-bd', category: 'Admins', present: stats.adminsPresent, late: stats.adminsLate, absent: stats.adminsAbsent },
                  ]} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="category" 
                      stroke="#6B7280"
                      tick={{ fill: '#6B7280', fontWeight: 600 }}
                    />
                    <YAxis 
                      stroke="#6B7280"
                      tick={{ fill: '#6B7280' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      cursor={{ fill: 'rgba(11, 48, 96, 0.05)' }}
                      formatter={(value: any, name: string) => {
                        if (name === 'Absent') {
                          return [value, 'Absent (Scheduled, No Time-In)'];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                    <Bar key="bar-present" dataKey="present" fill="#10B981" radius={[8, 8, 0, 0]} name="Present" />
                    <Bar key="bar-late" dataKey="late" fill="#F7B34C" radius={[8, 8, 0, 0]} name="Late" />
                    <Bar key="bar-absent" dataKey="absent" fill="#EF4444" radius={[8, 8, 0, 0]} name="Absent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {/* Real-time Status */}
        <div className={viewFilter === 'all' ? 'lg:col-span-4' : 'lg:col-span-8'}>
          <Card title={`Real-time Status ${viewFilter === 'employees' ? '(Employees)' : viewFilter === 'admins' ? '(Admin Team Leaders)' : '(All Users)'}`}>
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:shadow-md transition-all border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      {user.profile_picture_url ? (
                        <img
                          src={user.profile_picture_url}
                          alt={user.full_name}
                          className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-md"
                        />
                      ) : (
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-md ${
                          user.userType === 'admin' 
                            ? 'bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] text-white'
                            : 'bg-gradient-to-br from-[#F7B34C] to-[#f5a623] text-white'
                        }`}>
                          {getInitials(user.full_name)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#1F2937] text-sm">{user.full_name}</p>
                          {user.userType === 'admin' && (
                            <Shield className="w-3.5 h-3.5 text-[#0B3060]" />
                          )}
                        </div>
                        <p className="text-xs text-[#6B7280]">{user.position}</p>
                      </div>
                    </div>
                    <StatusBadge status={user.status} size="sm" />
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-32 text-[#6B7280]">
                  <div className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No users found</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 🚨 ABSENT USERS TODAY - Dedicated Section */}
      <Card 
        title="🚨 Absent Users Today" 
        icon={<AlertCircle className="w-5 h-5 text-red-600" />}
      >
        <div className="space-y-6">
          {/* 🔍 DEBUG INFO */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs font-mono">
            <p className="font-bold mb-2">🔍 Debug Info:</p>
            <p>Total usersWithStatus: {usersWithStatus.length}</p>
            <p>Employees in array: {usersWithStatus.filter(u => u.userType === 'employee').length}</p>
            <p>Admins in array: {usersWithStatus.filter(u => u.userType === 'admin').length}</p>
            <p className="text-red-600 font-bold">Absent Employees: {usersWithStatus.filter(u => u.userType === 'employee' && u.status === 'absent').length}</p>
            <p className="text-red-600 font-bold">Absent Admins: {usersWithStatus.filter(u => u.userType === 'admin' && u.status === 'absent').length}</p>
          </div>

          {/* Absent Employees */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
              <h3 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F7B34C]" />
                Absent Employees ({usersWithStatus.filter(u => u.userType === 'employee' && u.status === 'absent').length})
              </h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {usersWithStatus.filter(u => u.userType === 'employee' && u.status === 'absent').length > 0 ? (
                usersWithStatus
                  .filter(u => u.userType === 'employee' && u.status === 'absent')
                  .map((user) => (
                    <div
                      key={`absent-emp-${user.id}`}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div className="flex items-center gap-3">
                        {user.profile_picture_url ? (
                          <img
                            src={user.profile_picture_url}
                            alt={user.full_name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-br from-[#F7B34C] to-[#f5a623] text-white shadow-sm">
                            {getInitials(user.full_name)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[#1F2937] text-sm">{user.full_name}</p>
                          <p className="text-xs text-[#6B7280]">{user.position}</p>
                        </div>
                      </div>
                      <StatusBadge status="absent" size="sm" />
                    </div>
                  ))
              ) : (
                <div className="text-center py-6 text-[#6B7280]">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-50" />
                  <p className="text-sm">All employees are present! 🎉</p>
                </div>
              )}
            </div>
          </div>

          {/* Absent Admin Team Leaders */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
              <h3 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0B3060]" />
                Absent Admin Team Leaders ({usersWithStatus.filter(u => u.userType === 'admin' && u.status === 'absent').length})
              </h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {usersWithStatus.filter(u => u.userType === 'admin' && u.status === 'absent').length > 0 ? (
                usersWithStatus
                  .filter(u => u.userType === 'admin' && u.status === 'absent')
                  .map((user) => (
                    <div
                      key={`absent-admin-${user.id}`}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div className="flex items-center gap-3">
                        {user.profile_picture_url ? (
                          <img
                            src={user.profile_picture_url}
                            alt={user.full_name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] text-white shadow-sm">
                            {getInitials(user.full_name)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#1F2937] text-sm">{user.full_name}</p>
                            <Crown className="w-3.5 h-3.5 text-[#F7B34C]" />
                          </div>
                          <p className="text-xs text-[#6B7280]">{user.position}</p>
                        </div>
                      </div>
                      <StatusBadge status="absent" size="sm" />
                    </div>
                  ))
              ) : (
                <div className="text-center py-6 text-[#6B7280]">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-50" />
                  <p className="text-sm">All admin team leaders are present! 🎉</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Weekly Attendance Trends - Full Width */}
      <Card title="Weekly Attendance Trends" icon={<TrendingUp className="w-5 h-5 text-[#6B7280]" />}>
        {weeklyTrendsFiltered.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {viewFilter === 'all' ? (
                <AreaChart data={weeklyTrendsFiltered} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="weeklyColorEmployees" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B3060" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0B3060" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="weeklyColorAdmins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F7B34C" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F7B34C" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontWeight: 600 }}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      padding: '12px',
                    }}
                    cursor={{ fill: 'rgba(11, 48, 96, 0.05)' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Area
                    key={`weekly-area-emp-${viewFilter}`}
                    type="monotone"
                    dataKey="employees"
                    stroke="#0B3060"
                    fillOpacity={1}
                    fill="url(#weeklyColorEmployees)"
                    strokeWidth={3}
                    name="Employees"
                  />
                  <Area
                    key={`weekly-area-adm-${viewFilter}`}
                    type="monotone"
                    dataKey="admins"
                    stroke="#F7B34C"
                    fillOpacity={1}
                    fill="url(#weeklyColorAdmins)"
                    strokeWidth={3}
                    name="Admins"
                  />
                </AreaChart>
              ) : (
                <AreaChart data={weeklyTrendsFiltered} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="weeklyColorSingle" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={viewFilter === 'employees' ? '#F7B34C' : '#8B5CF6'} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={viewFilter === 'employees' ? '#F7B34C' : '#8B5CF6'} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280', fontWeight: 600 }}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      padding: '12px',
                    }}
                    cursor={{ fill: 'rgba(11, 48, 96, 0.05)' }}
                  />
                  <Area
                    key={`weekly-area-single-${viewFilter}`}
                    type="monotone"
                    dataKey="attendance"
                    stroke={viewFilter === 'employees' ? '#F7B34C' : '#8B5CF6'}
                    fillOpacity={1}
                    fill="url(#weeklyColorSingle)"
                    strokeWidth={3}
                    name={viewFilter === 'employees' ? 'Employees' : 'Admin Team Leaders'}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-96 text-[#6B7280]">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No weekly attendance data available</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}