import { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, MapPin, Clock, User, Loader, Calendar } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { Logo } from '../components/Logo';

// Check if Supabase is configured
const isSupabaseConfigured = !!(projectId && publicAnonKey);

// Mock data for offline mode
const employees = [
  { id: 'EMP001', name: 'John Doe', position: 'Software Engineer' },
  { id: 'EMP002', name: 'Jane Smith', position: 'Product Manager' },
  { id: 'EMP003', name: 'Bob Johnson', position: 'Designer' },
];

// Timeout wrapper for fetch requests
const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
};

// Attendance API wrapper with timeout
const attendanceApi = {
  recordAttendance: async (data: { employee_number: string; action: string; timestamp: string }) => {
    const response = await fetchWithTimeout(
      `https://${projectId}.supabase.co/functions/v1/make-server-df988758/attendance/record`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(data),
      },
      15000 // 15 second timeout for attendance recording
    );
    
    if (!response.ok) {
      throw new Error(`Attendance recording failed: ${response.statusText}`);
    }
    
    return await response.json();
  }
};

interface AttendanceRecord {
  employeeId: string;
  lastAction: 'IN' | 'OUT';
  time: Date;
}

export function KioskMode() {
  const [time, setTime] = useState(new Date());
  const [scanning, setScanning] = useState(true);
  const [success, setSuccess] = useState<{ name: string; position: string; action: string; time: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const webcamRef = useRef<Webcam>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const processQRCode = useCallback(async (employeeId: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Parse QR code data - it might be JSON or plain string
    let actualEmployeeId = employeeId;
    let qrData: any = null;
    
    try {
      // Try to parse as JSON first
      qrData = JSON.parse(employeeId);
      if (qrData && qrData.id) {
        actualEmployeeId = qrData.id;
        console.log('📱 [Kiosk] Parsed QR code JSON:', qrData);
      }
    } catch (e) {
      // Not JSON, use as-is (backward compatibility)
      actualEmployeeId = employeeId;
      console.log('📱 [Kiosk] Using plain QR code value:', employeeId);
    }
    
    console.log('🔍 [Kiosk] Processing QR code for employee/admin:', actualEmployeeId);
    
    // Save to database if Supabase is configured
    if (isSupabaseConfigured) {
      try {
        // STEP 0: Fetch user data from database (supports both employees and admins)
        console.log('🔍 [Kiosk] Fetching user data for:', actualEmployeeId);
        
        let userData: any = null;
        let userType: 'employee' | 'admin' = 'employee';

        // Try to fetch as employee first
        const employeeResponse = await fetchWithTimeout(`https://${projectId}.supabase.co/functions/v1/make-server-df988758/employees?employee_number=${actualEmployeeId}`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });

        if (employeeResponse.ok) {
          const employeeResult = await employeeResponse.json();
          if (employeeResult.success && employeeResult.data && employeeResult.data.length > 0) {
            userData = employeeResult.data[0];
            userType = 'employee';
            console.log('✅ [Kiosk] Found as Employee:', userData);
          }
        }

        // If not found as employee, try as admin
        if (!userData) {
          const adminResponse = await fetchWithTimeout(`https://${projectId}.supabase.co/functions/v1/make-server-df988758/admins?employee_number=${actualEmployeeId}`, {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          });

          if (adminResponse.ok) {
            const adminResult = await adminResponse.json();
            if (adminResult.success && adminResult.data && adminResult.data.length > 0) {
              userData = adminResult.data[0];
              userType = 'admin';
              console.log('✅ [Kiosk] Found as Admin:', userData);
            }
          }
        }

        // If still not found, show error
        if (!userData) {
          setError('User not found. Invalid QR code.');
          setTimeout(() => setError(null), 3000);
          return;
        }

        console.log('👤 [Kiosk] User Type:', userType);
        console.log('👤 [Kiosk] User Data:', userData);

        // STEP 1: Check if user has a schedule for today
        console.log('🔍 [Kiosk] Checking schedule for:', actualEmployeeId, 'Date:', today);
        
        // Build schedule query based on user type
        let scheduleUrl;
        if (userType === 'admin') {
          scheduleUrl = `https://${projectId}.supabase.co/functions/v1/make-server-df988758/schedules?admin_number=${actualEmployeeId}&schedule_date=${today}`;
        } else {
          scheduleUrl = `https://${projectId}.supabase.co/functions/v1/make-server-df988758/schedules?employee_number=${actualEmployeeId}&schedule_date=${today}`;
        }
        
        const scheduleResponse = await fetchWithTimeout(scheduleUrl, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });

        if (!scheduleResponse.ok) {
          throw new Error('Failed to check schedule');
        }

        const scheduleResult = await scheduleResponse.json();
        console.log('📅 [Kiosk] Schedule result:', scheduleResult);

        // Check if schedule exists for today
        if (!scheduleResult.success || !scheduleResult.data || scheduleResult.data.length === 0) {
          setError('You don\'t have a work schedule today. Please check your work schedule.');
          setTimeout(() => setError(null), 5000);
          return;
        }

        const todaySchedule = scheduleResult.data[0];
        console.log('📅 [Kiosk] Today\'s schedule:', todaySchedule);

        // STEP 2: Check if the schedule is a paid leave
        if (todaySchedule.is_paid_leave || todaySchedule.schedule_type === 'PAID_LEAVE') {
          setError('Time in/out unsuccessful. You are on leave today.');
          setTimeout(() => setError(null), 5000);
          return;
        }

        // STEP 3: Check if the schedule is a day off
        if (todaySchedule.is_day_off) {
          setError('Time in/out unsuccessful. Today is your day off.');
          setTimeout(() => setError(null), 5000);
          return;
        }

        // STEP 4: Check existing attendance records for today to prevent duplicates
        console.log('🔍 [Kiosk] Checking existing attendance for:', actualEmployeeId, 'Date:', today);
        
        const attendanceCheckResponse = await fetchWithTimeout(`https://${projectId}.supabase.co/functions/v1/make-server-df988758/attendance/records?employee_number=${actualEmployeeId}&date=${today}`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });

        if (!attendanceCheckResponse.ok) {
          throw new Error('Failed to check existing attendance');
        }

        const existingAttendance = await attendanceCheckResponse.json();
        console.log('📊 [Kiosk] Existing attendance:', existingAttendance);

        // Determine TIME IN or TIME OUT based on existing records
        let action: 'IN' | 'OUT';
        let hasTimedIn = false;
        let hasTimedOut = false;

        if (existingAttendance.success && existingAttendance.data && existingAttendance.data.length > 0) {
          // Check if user already has time_in and time_out for today
          const todayRecord = existingAttendance.data[0];
          
          hasTimedIn = todayRecord.time_in !== null && todayRecord.time_in !== undefined;
          hasTimedOut = todayRecord.time_out !== null && todayRecord.time_out !== undefined;

          console.log('📊 [Kiosk] Attendance status:', {
            hasTimedIn,
            hasTimedOut,
            time_in: todayRecord.time_in,
            time_out: todayRecord.time_out
          });

          // Prevent duplicate time in
          if (hasTimedIn && !hasTimedOut) {
            action = 'OUT';
          } else if (hasTimedIn && hasTimedOut) {
            setError('You already timed in and timed out today');
            setTimeout(() => setError(null), 4000);
            return;
          } else {
            action = 'IN';
          }
        } else {
          // No record exists, this is TIME IN
          action = 'IN';
        }

        console.log('✅ [Kiosk] Action determined:', action);

        // STEP 5: Record attendance
        const response = await attendanceApi.recordAttendance({
          employee_number: actualEmployeeId,
          action: action,
          timestamp: now.toISOString()
        });

        console.log('✅ Kiosk attendance saved to database:', { employeeId, action, response });

        // Update local attendance records only on success
        const newRecords = new Map(attendanceRecords);
        newRecords.set(actualEmployeeId, {
          employeeId: actualEmployeeId,
          lastAction: action,
          time: now
        });
        setAttendanceRecords(newRecords);

        // Show success message
        setSuccess({
          name: userData.name || userData.full_name || userData.username || 'User',
          position: userData.position || userData.role || 'Team Member',
          action: action === 'IN' ? 'TIME IN SUCCESSFUL' : 'TIME OUT SUCCESSFUL',
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        });

        setScanning(false);

        setTimeout(() => {
          setSuccess(null);
          setScanning(true);
        }, 3000);

      } catch (error: any) {
        console.error('❌ Error saving kiosk attendance to database:', error);
        
        // Show appropriate error message
        setError(error.message || 'Failed to record attendance. Please try again.');
        
        setTimeout(() => setError(null), 4000);
      }
    } else {
      // Offline mode - just update local records
      // Find user in mock data
      const employee = employees.find(emp => emp.id === actualEmployeeId);
      
      if (!employee) {
        setError('Employee not found. Invalid QR code.');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Determine TIME IN or TIME OUT based on local records
      const currentRecord = attendanceRecords.get(actualEmployeeId);
      let action: 'IN' | 'OUT';

      if (!currentRecord || currentRecord.lastAction === 'OUT') {
        action = 'IN';
      } else {
        action = 'OUT';
      }

      const newRecords = new Map(attendanceRecords);
      newRecords.set(actualEmployeeId, {
        employeeId: actualEmployeeId,
        lastAction: action,
        time: now
      });
      setAttendanceRecords(newRecords);

      setSuccess({
        name: employee.name,
        position: employee.position,
        action: action === 'IN' ? 'TIME IN SUCCESSFUL' : 'TIME OUT SUCCESSFUL',
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      });

      setScanning(false);

      setTimeout(() => {
        setSuccess(null);
        setScanning(true);
      }, 3000);
    }
  }, [attendanceRecords]);

  const scanQRCode = useCallback(() => {
    if (webcamRef.current && scanning && !success) {
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
              processQRCode(code.data);
            }
          }
        };
      }
    }
  }, [scanning, success, processQRCode]);

  useEffect(() => {
    if (scanning && !success) {
      scanIntervalRef.current = setInterval(scanQRCode, 500);
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
  }, [scanning, success, scanQRCode]);

  // Simulate scan for testing (when no QR code is available)
  const simulateScan = () => {
    const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
    processQRCode(randomEmployee.id);
  };

  return (
    <div className="min-h-screen bg-[#0B3060] flex flex-col">
      {/* Header */}
      <div className="p-8">
        <Logo variant="light" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        {/* Clock */}
        <div className="text-center mb-12">
          <div className="text-7xl md:text-8xl font-bold text-[#F7B34C] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-xl text-white/70">
            {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        {/* Camera Frame */}
        <div className="relative w-full max-w-md aspect-square">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-2xl border-4 border-dashed border-white/30 flex items-center justify-center overflow-hidden">
            {!success && !error && (
              <div className="relative w-full h-full">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                  videoConstraints={{
                    facingMode: 'user',
                    width: 640,
                    height: 640
                  }}
                />
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-4 border-[#F7B34C] rounded-lg relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#F7B34C]"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#F7B34C]"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#F7B34C]"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#F7B34C]"></div>
                    
                    {/* Animated scanning line */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="w-full h-1 bg-[#F7B34C] animate-pulse" 
                           style={{
                             animation: 'scan 2s ease-in-out infinite',
                           }}></div>
                    </div>
                  </div>
                </div>

                <div className="absolute top-4 left-4 right-4 bg-black/70 text-white text-center py-3 rounded-lg backdrop-blur-sm">
                  <p className="text-lg font-semibold">Please scan your QR Code</p>
                  <p className="text-sm text-white/70 mt-1">Position code within the frame</p>
                </div>

                {/* Test button */}
                <button
                  onClick={simulateScan}
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-[#F7B34C] hover:bg-[#F7B34C]/90 text-[#0B3060] px-6 py-3 rounded-lg font-semibold transition-colors pointer-events-auto"
                >
                  Test Scan
                </button>
              </div>
            )}

            {/* Success State */}
            {success && (
              <div className="w-full h-full bg-[#16A34A] flex flex-col items-center justify-center p-8 text-white animate-fadeIn">
                <CheckCircle className="w-24 h-24 mb-6 animate-bounce" />
                <h2 className="text-3xl font-bold mb-2">{success.name}</h2>
                <p className="text-xl mb-6">{success.position}</p>
                <div className="bg-white text-[#16A34A] px-6 py-3 rounded-full font-bold text-lg mb-4">
                  {success.action}
                </div>
                <div className="text-4xl font-bold">{success.time}</div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="w-full h-full bg-[#DC2626] flex flex-col items-center justify-center p-8 text-white animate-fadeIn">
                {error.toLowerCase().includes('schedule') || error.toLowerCase().includes('leave') || error.toLowerCase().includes('day off') ? (
                  <>
                    <Calendar className="w-24 h-24 mb-6" strokeWidth={2} />
                    <h2 className="text-2xl font-bold text-center mb-3">{error}</h2>
                    {error.toLowerCase().includes('schedule') && (
                      <p className="text-white/80 text-center text-sm">Please contact your administrator to set up your schedule.</p>
                    )}
                    {error.toLowerCase().includes('paid leave') && (
                      <p className="text-white/80 text-center text-sm">Enjoy your paid leave day!</p>
                    )}
                    {error.toLowerCase().includes('day off') && (
                      <p className="text-white/80 text-center text-sm">Enjoy your day off!</p>
                    )}
                  </>
                ) : error.toLowerCase().includes('already timed') ? (
                  <>
                    <CheckCircle className="w-24 h-24 mb-6" strokeWidth={2} />
                    <h2 className="text-2xl font-bold text-center mb-3">{error}</h2>
                    <p className="text-white/80 text-center text-sm">Your attendance has been recorded.</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-24 h-24 mb-6" />
                    <h2 className="text-2xl font-bold text-center">{error}</h2>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-white/60 text-center mt-8 max-w-md">
          Scan your employee QR code to record your attendance. The system will automatically determine Time In or Time Out.
        </p>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(250px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}