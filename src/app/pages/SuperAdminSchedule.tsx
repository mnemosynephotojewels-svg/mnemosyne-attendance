import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, X, Users, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { scheduleApi } from '../../services/apiService';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { SchedulesTableSetupBanner } from '../components/SchedulesTableSetupBanner';
import { SchedulesTableErrorBanner } from '../components/SchedulesTableErrorBanner';

// Generate dates for 2 weeks
const generateDates = (numDays = 14) => {
  const dates = [];
  const today = new Date();
  
  for (let i = 0; i < numDays; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
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

interface TeamGroup {
  teamId: string;
  teamName: string;
  employees: any[];
}

interface AdminGroup {
  adminNumber: string;
  adminName: string;
  role: string;
  team: string;
  teamId: string;
}

interface ScheduleModalProps {
  date: Date;
  employee: any;
  currentSchedule: any;
  onSave: (schedule: any) => void;
  onClose: () => void;
  onRefresh?: () => void; // Add optional refresh callback
}

function ScheduleModal({ date, employee, currentSchedule, onSave, onClose, onRefresh }: ScheduleModalProps) {
  const [scheduleType, setScheduleType] = useState(currentSchedule?.type || 'working');
  const [startTime, setStartTime] = useState(currentSchedule?.start || '08:00');
  const [endTime, setEndTime] = useState(currentSchedule?.end || '17:00');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      let scheduleData = null;
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💾 SAVING SCHEDULE FROM FRONTEND');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Employee:', employee);
      console.log('Date:', date.toISOString().split('T')[0]);
      console.log('Schedule Type:', scheduleType);
      console.log('User Type:', employee.userType);
      console.log('Employee/Admin ID:', employee.id);
      
      if (scheduleType === 'working') {
        scheduleData = { type: 'working', start: startTime, end: endTime };
        
        const payload = {
          [employee.userType === 'admin' ? 'admin_number' : 'employee_number']: employee.id,
          schedule_date: date.toISOString().split('T')[0],
          shift_start: startTime,
          shift_end: endTime,
          is_day_off: false,
          user_type: employee.userType || 'employee',
        };
        
        console.log('📤 Payload to send:', JSON.stringify(payload, null, 2));
        
        // Save to database if configured
        if (isSupabaseConfigured) {
          console.log('✅ Supabase is configured, calling scheduleApi.upsert...');
          const result = await scheduleApi.upsert(payload);
          console.log('✅ Schedule upsert result:', result);
          
          // Check for Supabase errors
          if (result.supabase_error || result.table_fix_required) {
            setSupabaseError(result.supabase_error);
          }
          
          // Check if save actually failed
          if (!result.success) {
            console.error('❌ Server returned failure:', result);
            throw new Error(result.error || 'Failed to save schedule to database');
          }
          
          // ⏳ Wait a bit for database to fully commit the transaction
          console.log('⏳ Waiting for database to commit...');
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.warn('⚠️ Supabase not configured, skipping database save');
        }
      } else if (scheduleType === 'off') {
        scheduleData = { type: 'off' };
        
        const payload = {
          [employee.userType === 'admin' ? 'admin_number' : 'employee_number']: employee.id,
          schedule_date: date.toISOString().split('T')[0],
          shift_start: null,
          shift_end: null,
          is_day_off: true,
          user_type: employee.userType || 'employee',
        };
        
        console.log('📤 Payload to send:', JSON.stringify(payload, null, 2));
        
        // Save to database if configured
        if (isSupabaseConfigured) {
          console.log('✅ Supabase is configured, calling scheduleApi.upsert...');
          const result = await scheduleApi.upsert(payload);
          console.log('✅ Schedule upsert result:', result);
          
          // Check for Supabase errors
          if (result.supabase_error || result.table_fix_required) {
            setSupabaseError(result.supabase_error);
          }
          
          // Check if save actually failed
          if (!result.success) {
            console.error('❌ Server returned failure:', result);
            throw new Error(result.error || 'Failed to save schedule to database');
          }
          
          // ⏳ Wait a bit for database to fully commit the transaction
          console.log('⏳ Waiting for database to commit...');
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.warn('⚠️ Supabase not configured, skipping database save');
        }
      } else if (scheduleType === 'remove') {
        // Handle schedule removal
        scheduleData = null; // This will remove the schedule from local state
        
        const payload = {
          [employee.userType === 'admin' ? 'admin_number' : 'employee_number']: employee.id,
          schedule_date: date.toISOString().split('T')[0],
          shift_start: null,
          shift_end: null,
          is_day_off: false, // Not a day off, just no schedule
          user_type: employee.userType || 'employee',
        };
        
        console.log('🗑️ Removing schedule, payload:', JSON.stringify(payload, null, 2));
        
        // Delete from database by upserting with null values
        if (isSupabaseConfigured) {
          console.log('✅ Supabase is configured, removing schedule...');
          const result = await scheduleApi.upsert(payload);
          console.log('✅ Schedule removal result:', result);
          
          // Check if removal actually failed
          if (!result.success) {
            console.error('❌ Server returned failure:', result);
            throw new Error(result.error || 'Failed to remove schedule from database');
          }
          
          // ⏳ Wait a bit for database to fully commit the transaction
          console.log('⏳ Waiting for database to commit...');
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.warn('⚠️ Supabase not configured, skipping database removal');
        }
      }
      
      console.log('✅ Schedule saved successfully to database');
      
      // Don't update local state - instead, refresh from database to ensure sync
      // This prevents race conditions where local state gets overwritten by refresh
      console.log('🔄 Refreshing data from database...');
      if (onRefresh) {
        await onRefresh();
      }
      
      console.log('✅ UI refreshed with latest data');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      toast.success('Schedule updated successfully');
      onClose();
    } catch (error) {
      console.error('❌ Error saving schedule:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Show detailed error message to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for common error patterns and provide helpful messages
      if (errorMessage.includes('42P01') || errorMessage.includes('does not exist')) {
        toast.error('Database table missing! Please visit /super-admin/schedule-diagnostic to create the schedules table.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('RLS')) {
        toast.error('Database permission error. Please check your Supabase RLS policies.');
      } else {
        toast.error(`Failed to save schedule: ${errorMessage}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1F2937]">Set Schedule</h2>
            <p className="text-sm text-[#6B7280] mt-1">
              {employee.name} • {date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Schedule Type Selection */}
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-2">
              Schedule Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setScheduleType('working')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  scheduleType === 'working'
                    ? 'bg-[#0B3060] text-white shadow-md'
                    : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                }`}
              >
                Working
              </button>
              <button
                onClick={() => setScheduleType('off')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  scheduleType === 'off'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                }`}
              >
                Day Off
              </button>
              <button
                onClick={() => setScheduleType('remove')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  scheduleType === 'remove'
                    ? 'bg-gray-500 text-white shadow-md'
                    : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                }`}
              >
                Remove
              </button>
            </div>
          </div>

          {/* Time Inputs - Only show for working schedule */}
          {scheduleType === 'working' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/20 focus:border-[#0B3060]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/20 focus:border-[#0B3060]"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-[#1F2937] rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Schedule'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SuperAdminSchedule() {
  const [teamGroups, setTeamGroups] = useState<TeamGroup[]>([]);
  const [adminList, setAdminList] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'employees' | 'admins'>('employees'); // Toggle between employees and admins
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [scheduleData, setScheduleData] = useState<any>({});
  const [dates] = useState(generateDates(14));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    date: Date | null;
    employee: any | null;
  }>({ isOpen: false, date: null, employee: null });

  const today = new Date().toISOString().split('T')[0];

  // Fetch all employees grouped by teams AND fetch all admins
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 FETCHING ALL SCHEDULES FOR SUPER ADMIN');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (!isSupabaseConfigured || !supabase) {
          console.warn('⚠️ Supabase not configured');
          setIsLoading(false);
          return;
        }

        // Fetch all teams
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name')
          .order('name');

        if (teamsError) {
          throw new Error(`Failed to fetch teams: ${teamsError.message}`);
        }

        console.log('✅ Teams fetched:', teamsData?.length || 0);

        // Create a map of teams
        const teamsMap = new Map(teamsData.map(team => [team.id, team.name]));

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

        // Fetch all admin team leaders (excluding super admins)
        const { data: adminsData, error: adminsError } = await supabase
          .from('admins')
          .select(`
            id,
            admin_number,
            full_name,
            email,
            role,
            department,
            status,
            profile_picture_url
          `)
          .eq('status', 'active')
          .not('admin_number', 'like', 'SA-%') // Exclude super admins (SA- prefix)
          .order('full_name');

        if (adminsError) {
          console.error('❌ Error fetching admins:', adminsError);
        } else {
          console.log('✅ Admins fetched:', adminsData?.length || 0);
          
          // Log detailed admin data for debugging
          if (adminsData && adminsData.length > 0) {
            console.log('📋 Admin Details:');
            adminsData.forEach((admin: any, index: number) => {
              console.log(`   ${index + 1}. ${admin.full_name} (${admin.admin_number})`);
              console.log(`      - Role: ${admin.role}`);
              console.log(`      - Status: ${admin.status}`);
              console.log(`      - Department: ${admin.department}`);
            });
          } else {
            console.log('⚠️ No admin team leaders found in database');
            console.log('   Checking criteria:');
            console.log('   - status must be "active"');
            console.log('   - role must NOT be "super_admin"');
          }
          
          // Transform admin data to match expected format
          const transformedAdmins = adminsData.map((admin: any) => ({
            id: admin.admin_number,
            name: admin.full_name,
            email: admin.email,
            position: admin.role === 'team_leader' ? 'Team Leader' : admin.role === 'admin' ? 'Admin' : 'Administrator',
            team: admin.department || 'Unassigned',
            teamId: admin.department, // Using department name as teamId for consistency
            avatar: admin.profile_picture_url,
            initials: getInitials(admin.full_name),
            color: getColorFromId(admin.admin_number),
            userType: 'admin',
          }));
          
          console.log('✅ Transformed admins:', transformedAdmins.length);
          setAdminList(transformedAdmins);
        }

        // Group employees by team
        const groupedByTeam = new Map<string, any[]>();
        
        employeesData.forEach((emp: any) => {
          const teamId = emp.team_id || 'unassigned';
          if (!groupedByTeam.has(teamId)) {
            groupedByTeam.set(teamId, []);
          }
          
          // Transform employee data to match expected format
          groupedByTeam.get(teamId)!.push({
            id: emp.employee_number,
            name: emp.full_name,
            email: emp.email,
            position: emp.position,
            team: teamsMap.get(emp.team_id) || 'Unassigned',
            teamId: emp.team_id,
            avatar: emp.profile_picture_url,
            initials: getInitials(emp.full_name),
            color: getColorFromId(emp.employee_number),
            userType: 'employee',
          });
        });

        // Add admins to their respective teams
        if (adminsData && adminsData.length > 0) {
          console.log('📂 Adding admins to their team groups:');
          adminsData.forEach((admin: any) => {
            // Try to match admin's department to a team by name
            let matchedTeamId = null;
            teamsData.forEach((team: any) => {
              if (team.name.toLowerCase() === admin.department?.toLowerCase()) {
                matchedTeamId = team.id;
              }
            });
            
            const teamId = matchedTeamId || admin.department || 'unassigned';
            
            if (!groupedByTeam.has(teamId)) {
              groupedByTeam.set(teamId, []);
            }
            
            // Add admin to team group with gold color
            groupedByTeam.get(teamId)!.push({
              id: admin.admin_number,
              name: admin.full_name,
              email: admin.email,
              position: 'Team Leader',
              team: admin.department || 'Unassigned',
              teamId: teamId,
              avatar: admin.profile_picture_url,
              initials: getInitials(admin.full_name),
              color: '#F7B34C', // Gold for admins
              userType: 'admin',
              isAdmin: true,
            });
            
            console.log(`   ✅ Added ${admin.full_name} to team: ${admin.department} (matched team_id: ${matchedTeamId || 'N/A'})`);
          });
        }

        // Convert to array of team groups
        const groups: TeamGroup[] = [];
        
        groupedByTeam.forEach((members, teamId) => {
          const teamName = teamsMap.get(teamId) || (typeof teamId === 'string' && teamId !== 'unassigned' ? teamId : 'Unassigned');
          
          // Sort members: admins first, then employees, both alphabetically
          const sortedMembers = members.sort((a, b) => {
            if (a.isAdmin && !b.isAdmin) return -1; // Admin comes first
            if (!a.isAdmin && b.isAdmin) return 1; // Employee comes after
            return a.name.localeCompare(b.name); // Then sort alphabetically
          });
          
          groups.push({
            teamId,
            teamName,
            employees: sortedMembers,
          });
        });

        // Sort groups by team name
        groups.sort((a, b) => a.teamName.localeCompare(b.teamName));

        setTeamGroups(groups);
        
        // Select first team by default
        if (groups.length > 0) {
          setSelectedTeamId(groups[0].teamId);
        }

        console.log(`✅ Grouped into ${groups.length} teams`);
        groups.forEach(group => {
          console.log(`   - ${group.teamName}: ${group.employees.length} employees`);
        });

        // Fetch schedules
        const startDate = dates[0].toISOString().split('T')[0];
        const endDate = dates[dates.length - 1].toISOString().split('T')[0];
        
        console.log('Fetching schedules from', startDate, 'to', endDate);
        
        // Fetch employee schedules
        const scheduleResponse = await scheduleApi.getAll({
          start_date: startDate,
          end_date: endDate,
        });
        
        console.log('Employee schedules fetched:', scheduleResponse?.schedules?.length || 0);
        
        // Fetch admin schedules
        const adminScheduleResponse = await scheduleApi.getAll({
          start_date: startDate,
          end_date: endDate,
          user_type: 'admin',
        });
        
        console.log('Admin schedules fetched:', adminScheduleResponse?.schedules?.length || 0);
        
        // Transform schedule data to our format
        const schedules: any = {};
        
        // Process employee schedules
        if (scheduleResponse?.schedules) {
          scheduleResponse.schedules.forEach((schedule: any) => {
            const dateKey = schedule.schedule_date;
            
            if (!schedules[dateKey]) {
              schedules[dateKey] = {};
            }
            
            const identifier = schedule.employee_number;
            if (identifier) {
              if (schedule.is_paid_leave) {
                // Paid leave schedule entry created by leave approval
                schedules[dateKey][identifier] = { type: 'paid_leave', hours: 8 };
              } else if (schedule.is_day_off) {
                schedules[dateKey][identifier] = { type: 'off' };
              } else {
                schedules[dateKey][identifier] = {
                  type: 'working',
                  start: schedule.shift_start,
                  end: schedule.shift_end,
                };
              }
            }
          });
        }
        
        // Process admin schedules
        if (adminScheduleResponse?.schedules) {
          adminScheduleResponse.schedules.forEach((schedule: any) => {
            const dateKey = schedule.schedule_date;
            
            if (!schedules[dateKey]) {
              schedules[dateKey] = {};
            }
            
            const identifier = schedule.admin_number;
            if (identifier) {
              if (schedule.is_paid_leave) {
                // Paid leave schedule entry created by leave approval
                schedules[dateKey][identifier] = { type: 'paid_leave', hours: 8 };
              } else if (schedule.is_day_off) {
                schedules[dateKey][identifier] = { type: 'off' };
              } else {
                schedules[dateKey][identifier] = {
                  type: 'working',
                  start: schedule.shift_start,
                  end: schedule.shift_end,
                };
              }
            }
          });
        }

        // 🆕 Fetch attendance records to identify paid leave days
        try {
          const attendanceUrl = `https://${(await import('/utils/supabase/info')).projectId}.supabase.co/functions/v1/make-server-df988758/attendance/records?start_date=${startDate}&end_date=${endDate}`;
          const attendanceResponse = await fetch(attendanceUrl, {
            headers: {
              'Authorization': `Bearer ${(await import('/utils/supabase/info')).publicAnonKey}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (attendanceResponse.ok) {
            const attendanceResult = await attendanceResponse.json();
            if (attendanceResult.success && attendanceResult.data) {
              console.log('✅ Attendance records fetched:', attendanceResult.data.length);
              
              // Mark paid leave days in the schedule
              attendanceResult.data.forEach((record: any) => {
                if (record.action === 'PAID_LEAVE' || record.type === 'PAID_LEAVE' || record.status === 'paid_leave') {
                  const recordDate = record.timestamp?.split('T')[0];
                  const employeeNum = record.employee_number;
                  
                  if (recordDate && employeeNum) {
                    if (!schedules[recordDate]) {
                      schedules[recordDate] = {};
                    }
                    // Mark as paid leave - this overrides the normal schedule
                    schedules[recordDate][employeeNum] = {
                      type: 'paid_leave',
                      hours: 8
                    };
                  }
                }
              });
            }
          }
        } catch (error) {
          console.warn('⚠️  Could not fetch attendance records for paid leave display:', error);
        }
        
        setScheduleData(schedules);
        console.log('Schedule data loaded:', Object.keys(schedules).length, 'dates');
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
  }, [dates]);

  // Add refresh function
  const refreshScheduleData = async () => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔄 REFRESHING SCHEDULE DATA');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const startDate = dates[0].toISOString().split('T')[0];
      const endDate = dates[dates.length - 1].toISOString().split('T')[0];
      
      console.log(`📅 Date range: ${startDate} to ${endDate}`);
      
      // Fetch employee schedules
      console.log('📥 Fetching employee schedules...');
      const scheduleResponse = await scheduleApi.getAll({
        start_date: startDate,
        end_date: endDate,
      });
      console.log('✅ Employee schedules response:', scheduleResponse);
      console.log(`   Found ${scheduleResponse?.schedules?.length || 0} employee schedule(s)`);
      
      // Fetch admin schedules
      console.log('📥 Fetching admin schedules...');
      const adminScheduleResponse = await scheduleApi.getAll({
        start_date: startDate,
        end_date: endDate,
        user_type: 'admin',
      });
      console.log('✅ Admin schedules response:', adminScheduleResponse);
      console.log(`   Found ${adminScheduleResponse?.schedules?.length || 0} admin schedule(s)`);
      
      // Transform schedule data to our format
      const schedules: any = {};
      
      // Process employee schedules
      if (scheduleResponse?.schedules) {
        scheduleResponse.schedules.forEach((schedule: any) => {
          const dateKey = schedule.schedule_date;
          
          if (!schedules[dateKey]) {
            schedules[dateKey] = {};
          }
          
          const identifier = schedule.employee_number;
          if (identifier) {
            if (schedule.is_paid_leave) {
              schedules[dateKey][identifier] = { type: 'paid_leave', hours: 8 };
            } else if (schedule.is_day_off) {
              schedules[dateKey][identifier] = { type: 'off' };
            } else {
              schedules[dateKey][identifier] = {
                type: 'working',
                start: schedule.shift_start,
                end: schedule.shift_end,
              };
            }
          }
        });
      }
      
      // Process admin schedules
      if (adminScheduleResponse?.schedules) {
        adminScheduleResponse.schedules.forEach((schedule: any) => {
          const dateKey = schedule.schedule_date;
          
          if (!schedules[dateKey]) {
            schedules[dateKey] = {};
          }
          
          const identifier = schedule.admin_number;
          if (identifier) {
            if (schedule.is_paid_leave) {
              schedules[dateKey][identifier] = { type: 'paid_leave', hours: 8 };
            } else if (schedule.is_day_off) {
              schedules[dateKey][identifier] = { type: 'off' };
            } else {
              schedules[dateKey][identifier] = {
                type: 'working',
                start: schedule.shift_start,
                end: schedule.shift_end,
              };
            }
          }
        });
      }
      
      setScheduleData(schedules);
      console.log('✅ Schedule data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing schedule data:', error);
    }
  };

  const formatDateHeader = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const isToday = (date: Date) => {
    return date.toISOString().split('T')[0] === today;
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#0B3060] animate-spin mx-auto mb-4" />
          <p className="text-[#6B7280] font-semibold">Loading team schedules...</p>
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

  // No teams state
  if (teamGroups.length === 0) {
    return (
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-[#0B3060]" />
          <div>
            <h1 className="text-[#1F2937] text-2xl font-bold">Manage Team Schedule</h1>
            <p className="text-[#6B7280]">Super Administrator</p>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#1F2937] mb-2">No Employees Found</h3>
          <p className="text-[#6B7280] mb-6">
            There are no active employees in the system yet.
          </p>
          <button
            onClick={() => window.location.href = '/super-admin/register'}
            className="px-6 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-semibold"
          >
            Register First Employee
          </button>
        </div>
      </div>
    );
  }

  const selectedTeam = teamGroups.find(g => g.teamId === selectedTeamId) || teamGroups[0];
  const employees = selectedTeam?.employees || [];
  
  // Get the current display list based on view mode
  const displayList = viewMode === 'employees' ? employees : adminList;

  // Check if display list is empty for current view
  const isDisplayListEmpty = displayList.length === 0;

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-[#0B3060]" />
        <div>
          <h1 className="text-[#1F2937] text-2xl font-bold">Manage Team Schedule</h1>
          <p className="text-[#6B7280]">Super Administrator</p>
        </div>
        <div className="ml-auto">
          <a
            href="/super-admin/schedule-fix"
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium flex items-center gap-2"
          >
            🔧 Fix Schedule Issues
          </a>
        </div>
      </div>

      {/* Setup Banner */}
      <SchedulesTableSetupBanner />
      
      {/* Error Banner - shows if there are column errors */}
      <SchedulesTableErrorBanner 
        error={supabaseError || undefined} 
        onDismiss={() => setSupabaseError(null)}
      />

      {/* Empty State for Current View */}
      {isDisplayListEmpty ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#1F2937] mb-2">
            {viewMode === 'employees' ? 'No Employees in This Team' : 'No Admin Team Leaders Found'}
          </h3>
          <p className="text-[#6B7280] mb-6">
            {viewMode === 'employees' 
              ? 'There are no active employees in the selected team yet.' 
              : 'There are no active admin team leaders in the system yet.'}
          </p>
          {viewMode === 'admins' && (
            <button
              onClick={() => window.location.href = '/super-admin/register'}
              className="px-6 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-semibold"
            >
              Register Admin Team Leader
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Controls Row - Team Selector (only for employees) and Member Count */}
          <div className="flex items-center justify-between">
            {viewMode === 'employees' ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="appearance-none px-4 py-2.5 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/20 focus:border-[#0B3060] text-[#1F2937] font-medium cursor-pointer hover:bg-gray-50 transition-colors min-w-[250px]"
                  >
                    {teamGroups.map((team) => (
                      <option key={team.teamId} value={team.teamId}>
                        {team.teamName} ({team.employees.length} member{team.employees.length !== 1 ? 's' : ''})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="text-lg font-semibold text-[#1F2937]">
                All Admin Team Leaders
              </div>
            )}

            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <Users className="w-5 h-5 text-[#0B3060]" />
              <span className="font-semibold text-[#0B3060]">
                {displayList.length} {viewMode === 'employees' ? 'Member' : 'Admin'}{displayList.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

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
                      {displayList.map((employee) => (
                        <th
                          key={employee.id}
                          className="bg-white border-b-2 border-gray-200"
                          style={{ minWidth: '220px', maxWidth: '220px' }}
                        >
                          <div className="px-4 py-3 flex flex-col items-center gap-2">
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                              style={{ backgroundColor: employee.color }}
                            >
                              {employee.initials}
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-[#1F2937] text-sm">{employee.name}</p>
                              <p className="text-xs text-[#6B7280]">{employee.position}</p>
                            </div>
                          </div>
                        </th>
                      ))}
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
                        {displayList.map((employee) => {
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
                                    className="w-full h-16 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg hover:shadow-md hover:scale-[1.02] transition-all p-3"
                                  >
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                      <Clock className="w-4 h-4 text-green-700" />
                                      <span className="text-sm font-bold text-green-900">Working</span>
                                    </div>
                                    <div className="text-xs text-green-700 font-semibold">
                                      {schedule.start} - {schedule.end}
                                    </div>
                                  </button>
                                )}

                                {/* Day Off Cell */}
                                {schedule?.type === 'off' && (
                                  <button
                                    onClick={() => handleCellClick(date, employee)}
                                    className="w-full h-16 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg hover:shadow-md hover:scale-[1.02] transition-all p-3 flex items-center justify-center"
                                  >
                                    <div className="text-center">
                                      <div className="text-sm font-bold text-red-900 mb-1">Day Off</div>
                                      <div className="text-xs text-red-600">Not Scheduled</div>
                                    </div>
                                  </button>
                                )}

                                {/* Paid Leave Cell */}
                                {schedule?.type === 'paid_leave' && (
                                  <button
                                    onClick={() => handleCellClick(date, employee)}
                                    className="w-full h-16 bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg hover:shadow-md hover:scale-[1.02] transition-all p-3 flex items-center justify-center"
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
              onRefresh={refreshScheduleData}
            />
          )}
        </>
      )}
    </div>
  );
}