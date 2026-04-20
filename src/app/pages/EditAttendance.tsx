import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Edit2, Save, X, Loader2, AlertCircle, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { toast } from 'sonner';
import { currentAdmin } from '../../data/mockData';
import { getAllEmployees } from '../../services/employeeService';
import { attendanceApi } from '../../services/apiService';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

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
  
  const numericPart = id.replace(/\D/g, '');
  const index = parseInt(numericPart) % colors.length;
  return colors[index];
};

interface EditAttendanceModalProps {
  date: Date;
  employee: any;
  currentRecord: any;
  onSave: () => void;
  onClose: () => void;
}

function EditAttendanceModal({ date, employee, currentRecord, onSave, onClose }: EditAttendanceModalProps) {
  const [checkInTime, setCheckInTime] = useState(currentRecord?.check_in_time || '');
  const [checkOutTime, setCheckOutTime] = useState(currentRecord?.check_out_time || '');
  const [status, setStatus] = useState<'present' | 'late' | 'absent'>(currentRecord?.status || 'present');
  const [notes, setNotes] = useState(currentRecord?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const adminData = JSON.parse(localStorage.getItem('mnemosyne_admin_profile') || 
                               localStorage.getItem('adminSession') || 
                               '{"admin_number": "ADMIN-001"}');

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      if (!isSupabaseConfigured) {
        toast.error('Database not configured');
        return;
      }

      await attendanceApi.updateRecord({
        employee_number: employee.id,
        attendance_date: date.toISOString().split('T')[0],
        check_in_time: checkInTime || null,
        check_out_time: checkOutTime || null,
        status,
        notes,
        updated_by: adminData.admin_number,
      });

      toast.success('Attendance record updated successfully');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error updating attendance:', error);
      toast.error(error.message || 'Failed to update attendance');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-[#1F2937]">Edit Attendance Record</h3>
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

        {/* Status Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#1F2937] mb-3">
            Attendance Status
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setStatus('present')}
              className={`p-3 rounded-lg border-2 transition-all ${
                status === 'present'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CheckCircle className={`w-5 h-5 mx-auto mb-1 ${
                status === 'present' ? 'text-green-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-semibold ${
                status === 'present' ? 'text-green-600' : 'text-gray-600'
              }`}>Present</p>
            </button>

            <button
              onClick={() => setStatus('late')}
              className={`p-3 rounded-lg border-2 transition-all ${
                status === 'late'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${
                status === 'late' ? 'text-yellow-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-semibold ${
                status === 'late' ? 'text-yellow-600' : 'text-gray-600'
              }`}>Late</p>
            </button>

            <button
              onClick={() => setStatus('absent')}
              className={`p-3 rounded-lg border-2 transition-all ${
                status === 'absent'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <X className={`w-5 h-5 mx-auto mb-1 ${
                status === 'absent' ? 'text-red-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-semibold ${
                status === 'absent' ? 'text-red-600' : 'text-gray-600'
              }`}>Absent</p>
            </button>
          </div>
        </div>

        {/* Time Fields (hidden when absent) */}
        {status !== 'absent' && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] mb-2">
                Check-In Time
              </label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-[#0B3060]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1F2937] mb-2">
                Check-Out Time
              </label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-[#0B3060]"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#1F2937] mb-2">
            Notes / Reason
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Enter reason for manual override (e.g., QR code issue, valid excuse, etc.)"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-[#0B3060] resize-none"
          />
        </div>

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
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
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

export function EditAttendance() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    employee: any | null;
  }>({ isOpen: false, employee: null });
  const [currentAdminData, setCurrentAdminData] = useState<any>(currentAdmin);

  // Load admin data from localStorage
  const loadAdminData = () => {
    try {
      const profileData = localStorage.getItem('mnemosyne_admin_profile');
      const sessionData = localStorage.getItem('adminSession');
      const currentUser = localStorage.getItem('mnemosyne_current_user');

      let adminData = currentAdmin;

      if (profileData) {
        const profile = JSON.parse(profileData);
        adminData = {
          ...currentAdmin,
          name: profile.username || profile.full_name || currentAdmin.name,
          team: profile.department || currentAdmin.team,
        };
      } else if (sessionData) {
        const session = JSON.parse(sessionData);
        adminData = {
          ...currentAdmin,
          name: session.username || session.full_name || currentAdmin.name,
          team: session.department || currentAdmin.team,
        };
      } else if (currentUser) {
        const user = JSON.parse(currentUser);
        adminData = {
          ...currentAdmin,
          name: user.username || user.full_name || currentAdmin.name,
          team: user.department || currentAdmin.team,
        };
      }

      setCurrentAdminData(adminData);
      return adminData;
    } catch (error) {
      console.error('Error loading admin data:', error);
      return currentAdmin;
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Fetch employees and attendance records
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all employees
      const allEmployees = await getAllEmployees();
      
      // Filter by current admin's department
      const teamEmployees = allEmployees.filter(emp => {
        const empDepartment = emp.department || emp.teams?.name || emp.team;
        return empDepartment === currentAdminData.team;
      });
      
      // Add color and initials to employees
      const enrichedEmployees = teamEmployees.map(emp => ({
        ...emp,
        initials: getInitials(emp.name),
        color: getColorFromId(emp.id),
      }));
      
      setEmployees(enrichedEmployees);
      
      // Fetch attendance records for selected date if Supabase is configured
      if (isSupabaseConfigured && enrichedEmployees.length > 0) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        
        const response = await attendanceApi.getRecords({
          start_date: dateStr,
          end_date: dateStr,
        });
        
        // Transform attendance data to our format
        const records: any = {};
        
        if (response?.records) {
          response.records.forEach((record: any) => {
            // Only include records for team members
            if (enrichedEmployees.some(emp => emp.id === record.employee_number)) {
              records[record.employee_number] = {
                check_in_time: record.check_in_time,
                check_out_time: record.check_out_time,
                status: record.status,
                notes: record.notes,
              };
            }
          });
        }
        
        setAttendanceRecords(records);
      }
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, currentAdminData]);

  const handleEditClick = (employee: any) => {
    setModalState({ isOpen: true, employee });
  };

  const handleSaveAttendance = () => {
    fetchData(); // Reload data
  };

  const getAttendanceRecord = (employeeId: string) => {
    return attendanceRecords[employeeId];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'late':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'absent':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#0B3060] animate-spin mx-auto mb-4" />
          <p className="text-[#6B7280] font-semibold">Loading attendance records...</p>
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
          <h3 className="text-lg font-bold text-[#1F2937] mb-2">Failed to Load Data</h3>
          <p className="text-[#6B7280] mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Edit2 className="w-8 h-8 text-[#0B3060]" />
          <div>
            <h1 className="text-[#1F2937] text-2xl font-bold">Edit Attendance Records</h1>
            <p className="text-[#6B7280]">{currentAdminData.team} Team - Manual Override</p>
          </div>
        </div>

        {/* Date Selector */}
        <div>
          <label className="block text-sm font-semibold text-[#1F2937] mb-2">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            max={new Date().toISOString().split('T')[0]}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-[#0B3060]"
          />
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-900">Manual Attendance Override</p>
            <p className="text-sm text-blue-700 mt-1">
              Use this page to manually edit attendance records for team members who have valid reasons
              such as QR code issues, technical problems, or approved late arrivals.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Date Display */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-6 h-6 text-[#0B3060]" />
          <h2 className="text-xl font-bold text-[#1F2937]">{formatDate(selectedDate)}</h2>
        </div>

        {/* Employee List */}
        {employees.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No team members found for {currentAdminData.team} team</p>
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map((employee) => {
              const record = getAttendanceRecord(employee.id);
              
              return (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: employee.color }}
                    >
                      {employee.initials}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#1F2937]">{employee.name}</p>
                      <p className="text-sm text-[#6B7280]">{employee.position || 'Employee'}</p>
                    </div>

                    {/* Attendance Status */}
                    <div className="flex items-center gap-4">
                      {record ? (
                        <>
                          <div className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm ${getStatusColor(record.status)}`}>
                            {record.status.toUpperCase()}
                          </div>
                          {record.status !== 'absent' && (
                            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                              <Clock className="w-4 h-4" />
                              <span>
                                {record.check_in_time || '--:--'} - {record.check_out_time || '--:--'}
                              </span>
                            </div>
                          )}
                          {record.notes && (
                            <div className="max-w-xs text-xs text-[#6B7280] italic truncate">
                              "{record.notes}"
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 text-sm">
                          No Record
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => handleEditClick(employee)}
                    className="ml-4 px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-semibold flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {modalState.isOpen && modalState.employee && (
        <EditAttendanceModal
          date={selectedDate}
          employee={modalState.employee}
          currentRecord={getAttendanceRecord(modalState.employee.id)}
          onSave={handleSaveAttendance}
          onClose={() => setModalState({ isOpen: false, employee: null })}
        />
      )}
    </div>
  );
}
