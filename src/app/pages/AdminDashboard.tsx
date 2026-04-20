import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Users, CheckCircle, Clock, Shield, AlertCircle, UserCheck, LogIn, LogOut, QrCode, RefreshCw } from 'lucide-react';
import { currentAdmin } from '../../data/mockData';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { QRCodeGenerator } from '../components/QRCodeGenerator';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function AdminDashboard() {
  const navigate = useNavigate();
  const [teamEmployees, setTeamEmployees] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [adminAttendance, setAdminAttendance] = useState<any[]>([]);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [currentAdminData, setCurrentAdminData] = useState<any>(currentAdmin);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [hasCheckedOutToday, setHasCheckedOutToday] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<string | null>(null);
  const [todayCheckOut, setTodayCheckOut] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [scheduledEmployeesToday, setScheduledEmployeesToday] = useState<string[]>([]);

  // Load admin data from localStorage
  const loadAdminData = () => {
    try {
      // Try to load from updated profile storage first
      const profileData = localStorage.getItem('mnemosyne_admin_profile');
      const sessionData = localStorage.getItem('adminSession');
      const currentUser = localStorage.getItem('mnemosyne_current_user');

      let adminData = currentAdmin; // Fallback to mock data

      if (profileData) {
        const profile = JSON.parse(profileData);
        console.log('✅ Loading admin data from profile storage:', profile);
        console.log('📋 Department from profile:', profile.department);
        adminData = {
          ...currentAdmin,
          id: profile.admin_number || profile.id || currentAdmin.id,
          admin_number: profile.admin_number || profile.id || currentAdmin.id,
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
        console.log('✅ Loading admin data from session:', session);
        console.log('📋 Department from session:', session.department);
        adminData = {
          ...currentAdmin,
          id: session.admin_number || session.id || currentAdmin.id,
          admin_number: session.admin_number || session.id || currentAdmin.id,
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
        console.log('✅ Loading admin data from current user:', user);
        console.log('📋 Department from current user:', user.department);
        adminData = {
          ...currentAdmin,
          id: user.admin_number || user.id || currentAdmin.id,
          admin_number: user.admin_number || user.id || currentAdmin.id,
          name: user.username || user.full_name || currentAdmin.name,
          full_name: user.full_name || currentAdmin.name,
          email: user.email || currentAdmin.email,
          phone_number: user.phone_number || currentAdmin.phone_number,
          position: user.position || currentAdmin.position,
          team: user.department || currentAdmin.team, // Use department field
          profile_picture_url: user.profile_picture_url,
        };
      }

      console.log('📊 Final Admin Data:', adminData);
      console.log('📌 Department that will be displayed:', adminData.team);
      console.log('🔑 Admin ID:', adminData.id);
      console.log('🔑 Admin Number:', adminData.admin_number);
      
      setCurrentAdminData(adminData);
      return adminData;
    } catch (error) {
      console.error('❌ Error loading admin data:', error);
      return currentAdmin;
    }
  };

  useEffect(() => {
    const adminData = loadAdminData();
    fetchDashboardData(adminData);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log('🔄 [AdminDashboard] Auto-refreshing dashboard...');
      const adminData = loadAdminData();
      setIsRefreshing(true);
      fetchDashboardData(adminData).then(() => {
        setLastRefreshTime(new Date());
      });
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [currentAdminData]);

  // Listen for attendance update events from QR scanner or other components
  useEffect(() => {
    const handleAttendanceUpdate = (event: any) => {
      console.log('📢 [AdminDashboard] Attendance update event received, refreshing...');
      console.log('   Event details:', event.detail);
      const adminData = loadAdminData();
      setIsRefreshing(true);
      fetchDashboardData(adminData).then(() => {
        setLastRefreshTime(new Date());
      });
    };

    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);

    return () => {
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
    };
  }, []);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('🔄 Storage changed, reloading admin data...');
      loadAdminData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdate', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdate', handleStorageChange);
    };
  }, []);

  const fetchDashboardData = async (adminData: any) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Fetching dashboard data for admin:', adminData.name);
      console.log('Team:', adminData.team);

      // Fetch all employees
      const employeesResponse = await fetch(`${API_BASE_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!employeesResponse.ok) {
        throw new Error('Failed to fetch employees');
      }

      const employeesResult = await employeesResponse.json();
      
      if (!employeesResult.success || !employeesResult.data) {
        throw new Error('Invalid response from server');
      }

      const allEmployees = employeesResult.data;
      console.log(`📊 Total employees in database: ${allEmployees.length}`);

      // Filter by admin's department
      const filtered = allEmployees.filter((emp: any) => {
        const employeeDepartment = emp.department || emp.teams?.name || emp.team;
        const matches = employeeDepartment === adminData.team;
        
        console.log(`🔍 Checking employee: ${emp.full_name}`);
        console.log(`   Employee department: "${employeeDepartment}"`);
        console.log(`   Admin department: "${adminData.team}"`);
        console.log(`   Match: ${matches ? '✅ YES' : '❌ NO'}`);
        
        return matches;
      });

      console.log(`✅ Filtered team members: ${filtered.length} out of ${allEmployees.length} total employees`);
      setTeamEmployees(filtered);

      // Fetch today's attendance records
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      console.log('📅 Fetching attendance records for today:', startOfDay, 'to', endOfDay);

      const attendanceResponse = await fetch(
        `${API_BASE_URL}/attendance/records?start_date=${startOfDay}&end_date=${endOfDay}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (attendanceResponse.ok) {
        const attendanceResult = await attendanceResponse.json();
        if (attendanceResult.success && attendanceResult.data) {
          // Filter to only team members' attendance
          const teamMemberNumbers = filtered.map((emp: any) => emp.employee_number);
          const teamAttendance = attendanceResult.data.filter((record: any) => 
            teamMemberNumbers.includes(record.employee_number)
          );
          
          console.log(`✅ Today's attendance records for team: ${teamAttendance.length}`);
          setAttendanceRecords(teamAttendance);
        }
      } else {
        console.warn('⚠️ Could not fetch attendance records');
        setAttendanceRecords([]);
      }

      // Fetch admin's attendance records
      const adminNumber = adminData.admin_number || adminData.employee_number; // Support both fields for backwards compatibility
      const adminAttendanceResponse = await fetch(
        `${API_BASE_URL}/attendance/records?employee_number=${adminNumber}&start_date=${startOfDay}&end_date=${endOfDay}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      let fetchedAdminAttendance: any[] = [];

      if (adminAttendanceResponse.ok) {
        const adminAttendanceResult = await adminAttendanceResponse.json();
        if (adminAttendanceResult.success && adminAttendanceResult.data) {
          console.log(`✅ Admin's attendance records for today: ${adminAttendanceResult.data.length}`);
          fetchedAdminAttendance = adminAttendanceResult.data;
          setAdminAttendance(fetchedAdminAttendance);
        }
      } else {
        console.warn('⚠️ Could not fetch admin attendance records');
        setAdminAttendance([]);
      }

      // Fetch admin's profile (optional - admins are in different table)
      // Admins don't exist in the employees table, so skip this fetch
      // Admin data is already loaded from adminData
      console.log('ℹ️  Admin profiles are stored in the admins table, not employees table');
      setAdminProfile(null);

      // Check if admin has checked in today (using fetched data)
      const adminCheckedIn = fetchedAdminAttendance.some(record => record.type === 'IN' || record.action === 'IN');
      setHasCheckedInToday(adminCheckedIn);

      // Check if admin has checked out today (using fetched data)
      const adminCheckedOut = fetchedAdminAttendance.some(record => record.type === 'OUT' || record.action === 'OUT');
      setHasCheckedOutToday(adminCheckedOut);

      // Set check-in and check-out times for admin (using fetched data)
      const adminCheckInRecord = fetchedAdminAttendance.find(record => record.type === 'IN' || record.action === 'IN');
      const adminCheckOutRecord = fetchedAdminAttendance.find(record => record.type === 'OUT' || record.action === 'OUT');
      setTodayCheckIn(adminCheckInRecord ? adminCheckInRecord.timestamp : null);
      setTodayCheckOut(adminCheckOutRecord ? adminCheckOutRecord.timestamp : null);

      // 🆕 Fetch employees scheduled for today (excluding day-offs)
      const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const scheduledResponse = await fetch(
        `${API_BASE_URL}/schedules/employees-scheduled?date=${todayDate}&department=${adminData.team}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (scheduledResponse.ok) {
        const scheduledResult = await scheduledResponse.json();
        if (scheduledResult.success && scheduledResult.data) {
          const scheduledEmployeeNumbers = scheduledResult.data.employeeNumbers || [];
          console.log(`📅 Employees scheduled for today in ${adminData.team}: ${scheduledEmployeeNumbers.length}`);
          setScheduledEmployeesToday(scheduledEmployeeNumbers);
        } else {
          console.warn('⚠️ No schedule data returned for today');
          setScheduledEmployeesToday([]);
        }
      } else {
        console.warn('⚠️ Could not fetch scheduled employees for today');
        setScheduledEmployeesToday([]);
      }

    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Calculate stats from real attendance data
  const totalEmployees = teamEmployees.length;
  
  // Get unique employees who checked in today and their status
  const employeeAttendanceMap = new Map();
  
  attendanceRecords
    .filter(record => record.type === 'IN' || record.action === 'IN')
    .forEach(record => {
      employeeAttendanceMap.set(record.employee_number, record.status || 'present');
    });
  
  // 🔒 Count late employees - only those with schedules
  const lateCount = Array.from(employeeAttendanceMap.entries())
    .filter(([empNum, status]) => status === 'late' && scheduledEmployeesToday.includes(empNum))
    .length;
  
  // 🔒 Count only those who checked in AND have a schedule for today
  const presentToday = Array.from(employeeAttendanceMap.keys())
    .filter(empNum => scheduledEmployeesToday.includes(empNum))
    .length;
  
  // 🆕 Calculate absent: Only count employees who have a schedule for today but haven't checked in
  // This ensures we don't count employees without schedules or those with day-offs as absent
  const scheduledEmployeesCount = scheduledEmployeesToday.length;
  const absentCount = Math.max(0, scheduledEmployeesCount - presentToday);
  const lateAbsent = lateCount + absentCount;

  console.log('📊 Dashboard Stats:');
  console.log(`   Total team members: ${totalEmployees}`);
  console.log(`   Scheduled today: ${scheduledEmployeesCount}`);
  console.log(`   Checked in: ${employeeAttendanceMap.size}`);
  console.log(`   Present (with schedule): ${presentToday}`);
  console.log(`   Late: ${lateCount}`);
  console.log(`   Absent: ${absentCount}`);

  const coverageData = [
    { name: 'Present', value: presentToday, color: '#0B3060' },
    { name: 'Late', value: lateCount, color: '#F7B34C' },
    { name: 'Absent', value: absentCount, color: '#D1D5DB' },
  ].filter(item => item.value > 0); // Filter out zero values to avoid duplicate keys

  // Enhance employees with attendance status
  const employeesWithStatus = teamEmployees.map(emp => {
    // Check if this employee has a schedule for today
    const hasSchedule = scheduledEmployeesToday.includes(emp.employee_number);
    const hasCheckedIn = employeeAttendanceMap.has(emp.employee_number);
    
    // Determine attendance status with schedule prioritization
    let attendanceStatus: 'present' | 'late' | 'absent' | 'no-schedule';
    
    if (!hasSchedule) {
      // 🔒 PRIORITY 1: No schedule = always "No Schedule" regardless of check-in
      attendanceStatus = 'no-schedule';
    } else if (hasCheckedIn) {
      // Has schedule AND checked in = use their actual status (present/late)
      attendanceStatus = employeeAttendanceMap.get(emp.employee_number);
    } else {
      // Has schedule but no check-in = absent
      attendanceStatus = 'absent';
    }
    
    return {
      ...emp,
      attendanceStatus,
      hasCheckedIn,
      hasSchedule
    };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0B3060] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6B7280]">Loading team dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h3 className="font-semibold text-red-900">Error Loading Dashboard</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={() => {
            const adminData = loadAdminData();
            fetchDashboardData(adminData);
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Department Header */}
      <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-xl shadow-lg p-6 text-white mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-7 h-7 text-[#F7B34C]" />
            </div>
            <div>
              <p className="text-sm text-white/80 mb-1">Department</p>
              <h1 className="text-3xl font-bold">{currentAdminData.team || 'Not Assigned'}</h1>
              <p className="text-white/90 text-sm mt-1">
                Team Leader: {currentAdminData.full_name || currentAdminData.name} • {currentAdminData.position}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <p className="text-2xl font-bold">{totalEmployees}</p>
              <p className="text-sm text-white/90">Team {totalEmployees === 1 ? 'Member' : 'Members'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin's Personal Attendance Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#1F2937] mb-4 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-[#0B3060]" />
          My Attendance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Check-In Status */}
          <Card>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#6B7280] text-sm font-medium">Check-In Status</p>
                <LogIn className={`w-5 h-5 ${hasCheckedInToday ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              {hasCheckedInToday ? (
                <div>
                  <p className="text-2xl font-bold text-green-600 mb-1">
                    {todayCheckIn ? new Date(todayCheckIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </p>
                  <p className="text-xs text-[#6B7280]">Checked in successfully</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-bold text-gray-400 mb-1">--:--</p>
                  <p className="text-xs text-red-500">Not checked in yet</p>
                </div>
              )}
            </div>
          </Card>

          {/* Check-Out Status */}
          <Card>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#6B7280] text-sm font-medium">Check-Out Status</p>
                <LogOut className={`w-5 h-5 ${hasCheckedOutToday ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              {hasCheckedOutToday ? (
                <div>
                  <p className="text-2xl font-bold text-blue-600 mb-1">
                    {todayCheckOut ? new Date(todayCheckOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </p>
                  <p className="text-xs text-[#6B7280]">Checked out successfully</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-bold text-gray-400 mb-1">--:--</p>
                  <p className="text-xs text-[#6B7280]">{hasCheckedInToday ? 'Still working' : 'N/A'}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Today's Status */}
          <Card>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#6B7280] text-sm font-medium">Today's Status</p>
                <CheckCircle className={`w-5 h-5 ${hasCheckedInToday ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                {hasCheckedInToday ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    ✓ Present
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold">
                    ⊗ Absent
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7280]">
                {hasCheckedInToday && hasCheckedOutToday ? 'Completed for today' : 
                 hasCheckedInToday ? 'Currently working' : 'Not started yet'}
              </p>
            </div>
          </Card>

          {/* Admin QR Code Card */}
          <Card>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#6B7280] text-sm font-medium">My Attendance QR Code</p>
                <QrCode className="w-5 h-5 text-[#0B3060]" />
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-white border-4 border-[#0B3060] rounded-2xl p-4 mb-3 shadow-lg">
                  <QRCodeGenerator 
                    value={JSON.stringify({
                      type: 'admin',
                      id: currentAdminData.admin_number || currentAdminData.id || 'ADM-000',
                      name: currentAdminData.full_name || currentAdminData.name,
                      department: currentAdminData.team,
                      timestamp: new Date().toISOString()
                    })} 
                    size={150} 
                    showDownload={false}
                    employeeName={currentAdminData.full_name || currentAdminData.name}
                  />
                </div>
                <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white px-4 py-1.5 rounded-full font-medium text-sm mb-3">
                  ID: {currentAdminData.admin_number || currentAdminData.id || 'ADM-000'}
                </div>
                <button
                  onClick={() => navigate('/admin/qr-code')}
                  className="w-full bg-gradient-to-r from-[#F7B34C] to-[#f5a82d] hover:from-[#f5a82d] hover:to-[#F7B34C] text-[#0B3060] px-3 py-2 rounded-lg font-semibold transition-all text-sm shadow-md flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  View Full Size
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-[#1F2937] mb-6">Team Overview</h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm mb-1">Team Members</p>
                <p className="text-3xl font-bold text-[#1F2937]">{totalEmployees}</p>
                <p className="text-xs text-[#6B7280] mt-1">{currentAdminData.team} Team</p>
              </div>
              <div className="w-12 h-12 bg-[#0B3060]/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-[#0B3060]" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm mb-1">Present Today</p>
                <p className="text-3xl font-bold text-[#16A34A]">{presentToday}</p>
                <p className="text-xs text-[#6B7280] mt-1">In office</p>
              </div>
              <div className="w-12 h-12 bg-[#DCFCE7] rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-[#16A34A]" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7280] text-sm mb-1">Late / Absent</p>
                <p className="text-3xl font-bold text-[#DC2626]">{lateAbsent}</p>
                <p className="text-xs text-[#6B7280] mt-1">{lateCount} late, {absentCount} absent</p>
              </div>
              <div className="w-12 h-12 bg-[#FEE2E2] rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#DC2626]" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Real-time Status */}
      <Card title="Real-time Status">
          {/* Department Members Header */}
          <div className="mb-4 pb-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#1F2937] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0B3060]" />
                  {currentAdminData.team} Department Members
                </h3>
                <p className="text-xs text-[#6B7280] mt-1">
                  Showing {teamEmployees.length} {teamEmployees.length === 1 ? 'employee' : 'employees'} registered to this department
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#6B7280]">Today's Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
                    {presentToday} Present
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                    {absentCount} Absent
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {teamEmployees.length === 0 ? (
              <div className="text-center py-12 text-[#6B7280]">
                <Users className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-lg mb-1">No team members found</p>
                <p className="text-sm">No employees are registered to {currentAdminData.team} department yet</p>
                <p className="text-xs mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 inline-block">
                  💡 Register new employees with department: <strong>{currentAdminData.team}</strong>
                </p>
              </div>
            ) : (
              employeesWithStatus
                .filter(employee => employee.attendanceStatus !== 'no-schedule') // FILTER: Only show employees with work schedules
                .map((employee) => {
                const employeeDepartment = employee.department || employee.teams?.name || employee.team || 'N/A';
                const checkInRecord = attendanceRecords.find(
                  record => record.employee_number === employee.employee_number && (record.type === 'IN' || record.action === 'IN')
                );
                const checkOutRecord = attendanceRecords.find(
                  record => record.employee_number === employee.employee_number && (record.type === 'OUT' || record.action === 'OUT')
                );
                
                return (
                  <div
                    key={employee.employee_number}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-[#0B3060] transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Profile Picture / Avatar */}
                      <div className="relative">
                        {employee.profile_picture_url ? (
                          <img
                            src={employee.profile_picture_url}
                            alt={employee.full_name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-[#F7B34C]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {employee.full_name
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .toUpperCase()}
                          </div>
                        )}
                        {/* Status Indicator Dot */}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                          employee.hasCheckedIn ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      
                      {/* Employee Information */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-[#1F2937] truncate">{employee.full_name}</p>
                          <span className="px-2 py-0.5 bg-[#0B3060] text-white rounded text-[10px] font-bold">
                            #{employee.employee_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-[#0B3060]">📋</span>
                            {employee.position || 'N/A'}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-[#0B3060]">🏢</span>
                            {employeeDepartment}
                          </span>
                        </div>
                        
                        {/* Attendance Time Info */}
                        {employee.hasCheckedIn && (
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            {checkInRecord && (
                              <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded">
                                <LogIn className="w-3 h-3" />
                                In: {new Date(checkInRecord.timestamp).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            )}
                            {checkOutRecord && (
                              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                <LogOut className="w-3 h-3" />
                                Out: {new Date(checkOutRecord.timestamp).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="ml-4">
                      <StatusBadge status={employee.attendanceStatus || 'active'} size="sm" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
    </div>
  );
}