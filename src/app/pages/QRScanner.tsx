import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ScanLine, User, CheckCircle, AlertCircle, RotateCw, Clock, Calendar } from 'lucide-react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { employees } from '../../data/mockData';
import { attendanceApi } from '../../services/apiService';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { toast } from 'sonner';

interface AttendanceRecord {
  employeeId: string;
  lastAction: 'IN' | 'OUT';
  time: Date;
}

interface QRCodeData {
  type: 'employee' | 'admin' | 'superadmin';
  id: string;
  name: string;
  department: string;
  timestamp: string;
}

export function QRScanner() {
  const [manualId, setManualId] = useState('');
  const [scanning, setScanning] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [selectedAction, setSelectedAction] = useState<'IN' | 'OUT'>('IN');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    employeeName: string;
    employeeId: string;
    action: string;
    time: string;
    role?: string;
    department?: string;
  } | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load admin/super admin info on mount
  useEffect(() => {
    const profileData = localStorage.getItem('mnemosyne_admin_profile');
    const superAdminSession = localStorage.getItem('superAdminSession');
    
    if (profileData) {
      const profile = JSON.parse(profileData);
      setAdminInfo({
        name: profile.full_name || profile.username,
        role: 'Team Leader',
        department: profile.department
      });
    } else if (superAdminSession) {
      const session = JSON.parse(superAdminSession);
      setAdminInfo({
        name: session.full_name || session.username,
        role: 'Super Admin',
        department: 'All Departments'
      });
    }
  }, []);

  const processAttendance = useCallback(async (scannedData: string) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 QR CODE SCANNED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Raw data:', scannedData);
    console.log('Selected action:', selectedAction);

    let qrData: QRCodeData | null = null;
    let userId: string;
    let userName: string;
    let userDepartment: string;
    let userRole: string;

    try {
      qrData = JSON.parse(scannedData);
      console.log('✅ Parsed QR code data:', qrData);
      console.log('   QR Type:', qrData.type);
      console.log('   QR ID:', qrData.id);
      console.log('   QR Name:', qrData.name);
      console.log('   QR Department:', qrData.department);
      
      userId = qrData.id;
      userName = qrData.name;
      userDepartment = qrData.department;
      userRole = qrData.type === 'employee' ? 'Employee' : qrData.type === 'admin' ? 'Team Leader' : 'Super Admin';
      
      console.log('📋 Extracted values:');
      console.log('   userId:', userId);
      console.log('   userName:', userName);
      console.log('   userDepartment:', userDepartment);
      console.log('   userRole:', userRole);
    } catch (e) {
      console.log('⚠️ Legacy QR code format detected, using ID:', scannedData);
      userId = scannedData;
      userName = 'Unknown';
      userDepartment = 'Unknown';
      userRole = 'Employee';
    }

    if (isSupabaseConfigured && supabase) {
      try {
        console.log('🔍 Verifying user in database...');
        console.log('   User ID:', userId);
        
        if (userId.startsWith('EMP-')) {
          const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .select('full_name, teams(name), employee_number')
            .eq('employee_number', userId)
            .maybeSingle();

          if (employeeError || !employeeData) {
            console.error('❌ Employee not found in database:', employeeError);
            setScanResult({
              success: false,
              employeeName: userName || 'Unknown',
              employeeId: userId,
              action: 'ERROR',
              time: 'Employee not found in database',
              role: userRole,
              department: userDepartment
            });
            toast.error(`Employee ${userId} not found. Please ensure they are registered.`);
            setTimeout(() => setScanResult(null), 4000);
            return;
          }

          userName = employeeData.full_name;
          userDepartment = employeeData.teams?.name || userDepartment;
          userRole = 'Employee';
          console.log('✅ Employee verified:', userName, userDepartment);
          
        } else if (userId.startsWith('ADM-')) {
          console.log('🔍 Looking up admin in database...');
          console.log('   Table: admins');
          console.log('   Field: admin_number');
          console.log('   Value:', userId);
          
          const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('full_name, department, admin_number')
            .eq('admin_number', userId)
            .maybeSingle();

          console.log('📊 Database query result:');
          console.log('   Data:', adminData);
          console.log('   Error:', adminError);

          if (adminError || !adminData) {
            console.error('❌ Admin not found in database');
            console.error('   Admin Number searched:', userId);
            console.error('   Error details:', adminError);
            console.error('   Data returned:', adminData);
            
            setScanResult({
              success: false,
              employeeName: userName || 'Unknown',
              employeeId: userId,
              action: 'ERROR',
              time: adminError ? `DB Error: ${adminError.message}` : 'Admin not found in database',
              role: userRole,
              department: userDepartment
            });
            
            if (adminError) {
              toast.error(`Database error: ${adminError.message}`, {
                description: `Admin ${userId} - Check console for details`
              });
            } else {
              toast.error(`Admin ${userId} not found in database`, {
                description: 'Please ensure the admin is registered in Supabase'
              });
            }
            setTimeout(() => setScanResult(null), 5000);
            return;
          }

          userName = adminData.full_name;
          userDepartment = adminData.department || userDepartment;
          userRole = 'Team Leader';
          console.log('✅ Admin verified:', userName, userDepartment);
        } else {
          console.error('❌ Unknown ID format:', userId);
          setScanResult({
            success: false,
            employeeName: 'Unknown',
            employeeId: userId,
            action: 'ERROR',
            time: 'Invalid ID format. Expected EMP-XXX or ADM-XXX',
            role: 'Unknown',
            department: 'Unknown'
          });
          toast.error('Invalid ID format. Please contact support.');
          setTimeout(() => setScanResult(null), 4000);
          return;
        }

        // 🆕 CHECK IF USER HAS SCHEDULE FOR TODAY
        const today = new Date();
        const todayDate = today.toISOString().split('T')[0];

        console.log('🔍 Checking schedule for today...');
        console.log('   User ID:', userId);
        console.log('   Date:', todayDate);

        const { data: scheduleData, error: scheduleError } = await supabase
          .from('schedules')
          .select('*')
          .or(`employee_number.eq.${userId},admin_number.eq.${userId}`)
          .eq('schedule_date', todayDate)
          .maybeSingle();

        console.log('📊 Schedule query result:');
        console.log('   Data:', scheduleData);
        console.log('   Error:', scheduleError);

        if (scheduleError) {
          console.error('❌ Error checking schedule:', scheduleError);
          setScanResult({
            success: false,
            employeeName: userName,
            employeeId: userId,
            action: 'ERROR',
            time: `Database error: ${scheduleError.message}`,
            role: userRole,
            department: userDepartment
          });
          toast.error('Error checking schedule. Please contact administrator.');
          setTimeout(() => setScanResult(null), 5000);
          return;
        }

        if (!scheduleData) {
          console.log('❌ No schedule found for today');
          setScanResult({
            success: false,
            employeeName: userName,
            employeeId: userId,
            action: 'NO SCHEDULE',
            time: 'No schedule for today',
            role: userRole,
            department: userDepartment
          });
          toast.error(`${userName} has no schedule for today`, {
            description: 'Please contact your supervisor to add a schedule'
          });
          setTimeout(() => setScanResult(null), 5000);
          return;
        }

        // Check if it's a day off schedule
        if (scheduleData.is_day_off === true) {
          console.log('❌ Today is marked as day off');
          setScanResult({
            success: false,
            employeeName: userName,
            employeeId: userId,
            action: 'DAY OFF',
            time: 'Scheduled as day off',
            role: userRole,
            department: userDepartment
          });
          toast.error(`${userName} is scheduled as DAY OFF today`, {
            description: 'Cannot take attendance on scheduled day off'
          });
          setTimeout(() => setScanResult(null), 5000);
          return;
        }

        // Check if it's paid leave
        if (scheduleData.is_paid_leave === true) {
          console.log('❌ Today is marked as paid leave');
          setScanResult({
            success: false,
            employeeName: userName,
            employeeId: userId,
            action: 'PAID LEAVE',
            time: 'On paid leave',
            role: userRole,
            department: userDepartment
          });
          toast.error(`${userName} is on PAID LEAVE today`, {
            description: 'Cannot take attendance during paid leave'
          });
          setTimeout(() => setScanResult(null), 5000);
          return;
        }

        // Validate working schedule has shift times
        if (!scheduleData.shift_start || !scheduleData.shift_end) {
          console.log('❌ Schedule has no shift times');
          setScanResult({
            success: false,
            employeeName: userName,
            employeeId: userId,
            action: 'INVALID SCHEDULE',
            time: 'Schedule incomplete',
            role: userRole,
            department: userDepartment
          });
          toast.error(`${userName}'s schedule is incomplete`, {
            description: 'Shift times not set. Contact administrator.'
          });
          setTimeout(() => setScanResult(null), 5000);
          return;
        }

        console.log('✅ Schedule verified:', {
          shift_start: scheduleData.shift_start,
          shift_end: scheduleData.shift_end,
          grace_period: scheduleData.grace_period
        });

        console.log('🔍 Checking existing attendance for today...');
        const { data: existingAttendance, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('employee_number', userId)
          .eq('date', todayDate);

        if (!attendanceError && existingAttendance && existingAttendance.length > 0) {
          const record = existingAttendance[0];
          console.log('📊 Existing attendance found:', record);
          
          // Check if trying to TIME IN when already timed in
          if (selectedAction === 'IN' && record.time_in) {
            console.log('⚠️ Already timed in today at:', record.time_in);
            
            // Check if already timed out
            if (record.time_out) {
              setScanResult({
                success: false,
                employeeName: userName,
                employeeId: userId,
                action: 'COMPLETE',
                time: 'Already completed attendance for today',
                role: userRole,
                department: userDepartment
              });
              toast.info(`${userName} has already completed TIME IN and TIME OUT for today.`, {
                description: `IN: ${new Date(record.time_in).toLocaleTimeString()} | OUT: ${new Date(record.time_out).toLocaleTimeString()}`
              });
            } else {
              setScanResult({
                success: false,
                employeeName: userName,
                employeeId: userId,
                action: 'ALREADY TIMED IN',
                time: new Date(record.time_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                role: userRole,
                department: userDepartment
              });
              toast.warning(`${userName} already timed in at ${new Date(record.time_in).toLocaleTimeString()}`, {
                description: 'Please select TIME OUT to end the shift'
              });
            }
            setTimeout(() => setScanResult(null), 5000);
            return;
          }
          
          // Check if trying to TIME OUT when already timed out
          if (selectedAction === 'OUT' && record.time_out) {
            console.log('⚠️ Already timed out today at:', record.time_out);
            setScanResult({
              success: false,
              employeeName: userName,
              employeeId: userId,
              action: 'ALREADY TIMED OUT',
              time: new Date(record.time_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              role: userRole,
              department: userDepartment
            });
            toast.warning(`${userName} already timed out at ${new Date(record.time_out).toLocaleTimeString()}`, {
              description: 'Attendance for today is complete'
            });
            setTimeout(() => setScanResult(null), 5000);
            return;
          }
        }
        
      } catch (error) {
        console.error('❌ Database verification error:', error);
        toast.error('Database connection error. Please try again.');
        setTimeout(() => setScanResult(null), 4000);
        return;
      }
    } else {
      if (!qrData) {
        const employee = employees.find(emp => emp.id === userId);
        if (employee) {
          userName = employee.name;
          userDepartment = employee.team;
          userRole = 'Employee';
        } else {
          setScanResult({
            success: false,
            employeeName: 'Unknown',
            employeeId: userId,
            action: 'ERROR',
            time: 'Database not configured and employee not found',
            role: 'Unknown',
            department: 'Unknown'
          });
          toast.error('Please configure database connection.');
          setTimeout(() => setScanResult(null), 4000);
          return;
        }
      }
    }

    const now = new Date();

    // Process attendance for both employees (EMP-) and admins (ADM-)
    if (isSupabaseConfigured && (userId.startsWith('EMP-') || userId.startsWith('ADM-'))) {
      try {
        console.log('💾 Saving attendance to database...');
        console.log('   Using selected action:', selectedAction);
        console.log('   User type:', userId.startsWith('ADM-') ? 'ADMIN' : 'EMPLOYEE');
        const response = await attendanceApi.recordAttendance({
          employee_number: userId,
          action: selectedAction,
          timestamp: now.toISOString()
        });
        
        if (!response.success) {
          console.error('❌ Server rejected attendance:', response.error, response.message);
          
          let errorMessage = response.message || 'Failed to record attendance';
          
          setScanResult({
            success: false,
            employeeName: userName,
            employeeId: userId,
            action: 'ERROR',
            time: errorMessage,
            role: userRole,
            department: userDepartment
          });
          
          if (response.error === 'DUPLICATE_TIME_IN') {
            toast.error('Already timed in today! You can only TIME IN once per day.');
          } else if (response.error === 'DUPLICATE_TIME_OUT') {
            toast.error('Already timed out today! You can only TIME OUT once per day.');
          } else if (response.error === 'NO_TIME_IN') {
            toast.error('Must TIME IN first before TIME OUT!');
          } else if (response.error === 'NO_SCHEDULE') {
            toast.error('No schedule set for today. Contact your team leader.');
          } else if (response.error === 'DAY_OFF') {
            toast.info('This is a scheduled day off.');
          } else {
            toast.error(errorMessage);
          }
          
          setTimeout(() => setScanResult(null), 5000);
          return;
        }
        
        const action = response.data?.action || response.data?.type || selectedAction;
        console.log('✅ Attendance saved to database:', { userId, action });
        toast.success(`${action === 'IN' ? 'Time In' : 'Time Out'} recorded successfully!`);
        
        const newRecords = new Map(attendanceRecords);
        newRecords.set(userId, {
          employeeId: userId,
          lastAction: action as 'IN' | 'OUT',
          time: now
        });
        setAttendanceRecords(newRecords);
        
        setScanResult({
          success: true,
          employeeName: userName,
          employeeId: userId,
          action: `TIME ${action}`,
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          role: userRole,
          department: userDepartment
        });
        
        window.dispatchEvent(new CustomEvent('attendanceUpdated', { 
          detail: { userId, action, timestamp: now.toISOString() } 
        }));
        console.log('📢 Dispatched attendanceUpdated event');
      } catch (error) {
        console.error('❌ Error saving attendance to database:', error);
        setScanResult({
          success: false,
          employeeName: userName,
          employeeId: userId,
          action: 'ERROR',
          time: 'Failed to save to database. Please try again.',
          role: userRole,
          department: userDepartment
        });
        toast.error('Failed to record attendance. Please try again.');
        setTimeout(() => setScanResult(null), 4000);
        return;
      }
    }

    console.log('✅ Attendance processed successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    setTimeout(() => {
      setScanResult(null);
    }, 4000);
  }, [attendanceRecords, selectedAction]);

  const scanQRCode = useCallback(() => {
    if (webcamRef.current && scanning && !scanResult) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(image, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
              setScanning(false);
              processAttendance(code.data);
              setTimeout(() => setScanning(true), 3500);
            }
          }
        };
      }
    }
  }, [scanning, scanResult, processAttendance]);

  useEffect(() => {
    if (scanning && !scanResult) {
      scanIntervalRef.current = setInterval(scanQRCode, 150);
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [scanning, scanResult, scanQRCode]);

  const handleManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    processAttendance(manualId);
    setManualId('');
  };

  return (
    <div className="min-h-screen -m-6 p-6 bg-gray-50">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <ScanLine className="w-8 h-8 text-[#0B3060]" />
          <div>
            <h1 className="text-[#1F2937] text-2xl font-bold">QR Attendance Scanner</h1>
            {adminInfo && (
              <p className="text-[#6B7280]">{adminInfo.name} • {adminInfo.role}</p>
            )}
          </div>
        </div>
      </div>

      {/* Date & Time Banner */}
      <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-xl p-6 mb-6 shadow-md">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-white/80">Current Date</p>
              <p className="font-bold text-xl">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-white/80">Current Time</p>
              <p className="font-bold text-3xl" style={{ fontFamily: 'Inter, sans-serif' }}>
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Controls */}
        <div className="space-y-6">
          {/* Action Selection Card */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-[#1F2937] mb-1">Attendance Type</h2>
              <p className="text-sm text-[#6B7280]">Select action before scanning</p>
            </div>
            
            <div className="space-y-3">
              {/* Time In Button */}
              <button
                onClick={() => setSelectedAction('IN')}
                className={`group relative rounded-lg border-2 p-4 transition-all w-full ${
                  selectedAction === 'IN'
                    ? 'border-green-600 bg-green-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${
                    selectedAction === 'IN' 
                      ? 'bg-green-600' 
                      : 'bg-gray-100 group-hover:bg-green-100'
                  }`}>
                    <CheckCircle className={`w-6 h-6 ${
                      selectedAction === 'IN' ? 'text-white' : 'text-gray-600 group-hover:text-green-600'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-bold ${
                      selectedAction === 'IN' ? 'text-green-700' : 'text-[#1F2937] group-hover:text-green-700'
                    }`}>
                      Time In
                    </p>
                    <p className={`text-xs ${
                      selectedAction === 'IN' ? 'text-green-600' : 'text-[#6B7280] group-hover:text-green-600'
                    }`}>
                      Morning Check-in
                    </p>
                  </div>
                  {selectedAction === 'IN' && (
                    <div className="bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                      ACTIVE
                    </div>
                  )}
                </div>
              </button>

              {/* Time Out Button */}
              <button
                onClick={() => setSelectedAction('OUT')}
                className={`group relative rounded-lg border-2 p-4 transition-all w-full ${
                  selectedAction === 'OUT'
                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${
                    selectedAction === 'OUT' 
                      ? 'bg-blue-600' 
                      : 'bg-gray-100 group-hover:bg-blue-100'
                  }`}>
                    <AlertCircle className={`w-6 h-6 ${
                      selectedAction === 'OUT' ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-bold ${
                      selectedAction === 'OUT' ? 'text-blue-700' : 'text-[#1F2937] group-hover:text-blue-700'
                    }`}>
                      Time Out
                    </p>
                    <p className={`text-xs ${
                      selectedAction === 'OUT' ? 'text-blue-600' : 'text-[#6B7280] group-hover:text-blue-600'
                    }`}>
                      End of Shift
                    </p>
                  </div>
                  {selectedAction === 'OUT' && (
                    <div className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                      ACTIVE
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Status Indicator */}
            <div className={`mt-4 p-3 rounded-lg text-center text-sm font-semibold border ${
              selectedAction === 'IN' 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              <div className="flex items-center justify-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  selectedAction === 'IN' ? 'bg-green-600' : 'bg-blue-600'
                }`}></div>
                {selectedAction === 'IN' ? 'TIME IN MODE' : 'TIME OUT MODE'}
              </div>
            </div>
          </div>

          {/* Manual Entry Card */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-[#1F2937] mb-1">Manual Entry</h2>
              <p className="text-sm text-[#6B7280]">Enter employee ID if needed</p>
            </div>

            <form onSubmit={handleManualEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1F2937] mb-2">
                  Employee ID Number
                </label>
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="EMP-001"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/20 focus:border-[#0B3060] transition-all placeholder:text-gray-400 text-[#1F2937]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2.5 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-all font-semibold shadow-sm text-sm"
              >
                Record Attendance
              </button>
            </form>

            {/* Quick Tip */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#F7B34C] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#6B7280]">
                  Always verify employee identity before recording attendance
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Camera Scanner (2 columns) */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 h-full">
            {/* Scanner Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937] mb-1">Camera Scanner</h2>
                <p className="text-sm text-[#6B7280]">Position QR code within the scanning frame</p>
              </div>
              <button
                onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-all font-semibold shadow-sm text-sm"
              >
                <RotateCw className="w-4 h-4" />
                <span className="hidden sm:inline">Switch Camera</span>
              </button>
            </div>
            
            {/* Camera Display */}
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg border border-gray-300">
              {!scanResult ? (
                <>
                  <Webcam
                    key={facingMode}
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{
                      facingMode: facingMode,
                      width: 1280,
                      height: 720
                    }}
                  />
                  
                  {/* Scanning Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative">
                      {/* Scanning Frame */}
                      <div className="w-80 h-80 relative">
                        {/* Animated Corner Brackets */}
                        <div className="absolute top-0 left-0 w-16 h-16 border-t-[6px] border-l-[6px] border-[#F7B34C] rounded-tl-2xl animate-pulse"></div>
                        <div className="absolute top-0 right-0 w-16 h-16 border-t-[6px] border-r-[6px] border-[#F7B34C] rounded-tr-2xl animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-[6px] border-l-[6px] border-[#F7B34C] rounded-bl-2xl animate-pulse"></div>
                        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-[6px] border-r-[6px] border-[#F7B34C] rounded-br-2xl animate-pulse"></div>
                        
                        {/* Center Scan Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ScanLine className="w-20 h-20 text-[#F7B34C] animate-pulse" />
                        </div>

                        {/* Animated Scanning Line */}
                        <div className="absolute inset-0 overflow-hidden rounded-lg">
                          <div 
                            className="w-full h-1 bg-gradient-to-r from-transparent via-[#F7B34C] to-transparent shadow-lg shadow-[#F7B34C]/50" 
                            style={{
                              animation: 'scan 2s ease-in-out infinite',
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-lg border border-[#F7B34C]/50 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                        scanning ? 'bg-green-500' : 'bg-[#F7B34C]'
                      }`}></div>
                      <span className="text-sm font-semibold">
                        {scanning ? 'Ready to Scan' : 'Processing...'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* Scan Result Display */
                <div className={`w-full h-full flex flex-col items-center justify-center p-8 text-white animate-fadeIn ${
                  scanResult.success 
                    ? 'bg-gradient-to-br from-green-600 to-green-700' 
                    : 'bg-gradient-to-br from-red-600 to-red-700'
                }`}>
                  {scanResult.success ? (
                    <CheckCircle className="w-24 h-24 mb-6 animate-bounce" />
                  ) : (
                    <AlertCircle className="w-24 h-24 mb-6" />
                  )}
                  <h2 className="text-3xl font-bold mb-2">{scanResult.employeeName}</h2>
                  <p className="text-lg mb-2 text-white/90">{scanResult.role}</p>
                  <p className="text-base mb-6 text-white/80">{scanResult.department}</p>
                  <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-lg font-bold text-xl mb-4 border border-white/30">
                    {scanResult.action}
                  </div>
                  <div className="text-4xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {scanResult.time}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { transform: translateY(320px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}