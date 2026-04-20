import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Logo } from '../components/Logo';
import { CheckCircle, XCircle, Clock, Calendar as CalendarIcon, Settings, Lock, Unlock, ArrowLeft, Camera, RefreshCw, MapPin, Navigation } from 'lucide-react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';
import { attendanceApi, employeeApi } from '../../services/apiService';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import {
  checkLocationAccess,
  loadGeofenceFromLocalStorage,
  formatDistance,
  getLocationStatusDisplay,
  LocationStatus,
  GeofenceConfig,
} from '../../utils/geolocation';

type ScanMode = 'TIME_IN' | 'TIME_OUT' | 'AUTO';
type AttendanceStatus = 'On Time' | 'Late' | 'Absent';

interface KioskSettings {
  workStartTime: string; // Format: "HH:mm"
  workEndTime: string;
  gracePeriodMinutes: number;
  scanMode: ScanMode;
  isModeLocked: boolean;
}

interface EmployeeData {
  employee_number: string;
  full_name: string;
  position: string;
  teams?: { name: string };
  team?: string;
}

interface AttendanceResult {
  success: boolean;
  action: 'IN' | 'OUT';
  employee: EmployeeData;
  timestamp: string;
  status?: AttendanceStatus;
  message: string;
}

export function KioskModeEnhanced() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<AttendanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [recentScans, setRecentScans] = useState<AttendanceResult[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(() => {
    // Always default to rear camera for kiosk mode, but allow override from localStorage
    const savedMode = localStorage.getItem('kiosk_camera_mode');
    return (savedMode as 'user' | 'environment') || 'environment'; // Default to rear camera
  });
  const [retryCount, setRetryCount] = useState(0);
  const [useBasicConstraints, setUseBasicConstraints] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [useNativeVideo, setUseNativeVideo] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [showPermissionInstructions, setShowPermissionInstructions] = useState(false);
  const [manualCameraMode, setManualCameraMode] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  
  // Geofence state
  const [geofenceConfig, setGeofenceConfig] = useState<GeofenceConfig | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus | null>(null);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [locationCheckError, setLocationCheckError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [settings, setSettings] = useState<KioskSettings>({
    workStartTime: '08:00',
    workEndTime: '17:00',
    gracePeriodMinutes: 15,
    scanMode: 'AUTO',
    isModeLocked: false,
  });
  
  const [selectedMode, setSelectedMode] = useState<ScanMode>('AUTO');
  
  const webcamRef = useRef<Webcam>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize selected mode based on settings
  useEffect(() => {
    if (settings.isModeLocked) {
      setSelectedMode(settings.scanMode);
    }
  }, [settings.isModeLocked, settings.scanMode]);

  // Load geofence configuration on mount
  useEffect(() => {
    loadGeofenceConfig();
  }, []);

  /**
   * Load geofence configuration from localStorage and database via backend API
   */
  const loadGeofenceConfig = async () => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🗺️ [Kiosk] LOADING GEOFENCE CONFIGURATION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Try loading from localStorage first (instant)
      try {
        const localConfig = loadGeofenceFromLocalStorage();
        if (localConfig) {
          console.log('✅ [Kiosk] Loaded geofence from localStorage:');
          console.log('   - Radius: ' + localConfig.radius_meters + ' meters');
          console.log('   - Enabled: ' + localConfig.enabled);
          console.log('   - Center: (' + localConfig.center_latitude + ', ' + localConfig.center_longitude + ')');
          setGeofenceConfig(localConfig);
        }
      } catch (localStorageError: any) {
        console.error('❌ [Kiosk] localStorage read error:', localStorageError.message);
        // Clear corrupted data
        try {
          localStorage.removeItem('geofence_config');
          localStorage.removeItem('mnemosyne_geofence_config');
          console.log('🗑️ [Kiosk] Cleared corrupted geofence data from localStorage');
        } catch (e) {
          console.error('❌ [Kiosk] Could not clear localStorage:', e);
        }
      }
      
      // Then try to load from backend API (bypasses RLS, will update if different)
      if (isSupabaseConfigured) {
        try {
          // Fetch directly from Supabase
          const { data, error } = await supabase
            .from('geofence_config')
            .select('*')
            .limit(1)
            .single();

          if (!error && data) {
            console.log('✅ [Kiosk] Loaded geofence from database (overriding localStorage):');
            console.log('   - Radius: ' + data.radius_meters + ' meters');
            console.log('   - Enabled: ' + data.enabled);
            console.log('   - Center: (' + data.center_latitude + ', ' + data.center_longitude + ')');
            setGeofenceConfig(data);
            
            // Save to localStorage for offline access
            try {
              localStorage.setItem('geofence_config', JSON.stringify(data));
            } catch (saveError) {
              console.warn('⚠️ [Kiosk] Could not save to localStorage:', saveError);
            }
          } else if (error) {
            console.warn('⚠️ [Kiosk] Database load error:', error);
          }
        } catch (apiError) {
          console.warn('⚠️ [Kiosk] Failed to fetch from database:', apiError);
        }
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
      console.error('❌ [Kiosk] Error loading geofence config:', error);
    }
  };

  /**
   * Check if user is within allowed location radius
   */
  const checkUserLocation = async (): Promise<boolean> => {
    // If geofencing is not configured or disabled, allow access
    if (!geofenceConfig || !geofenceConfig.enabled) {
      console.log('ℹ️ [Kiosk] Geofencing disabled, allowing access');
      setLocationStatus({
        isWithinRadius: true,
        distance: 0,
        hasPermission: true,
      });
      return true;
    }

    try {
      setIsCheckingLocation(true);
      setLocationCheckError(null);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📍 [Kiosk] GEOFENCE CHECK STARTED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📊 Geofence Configuration:');
      console.log('   - Center: (' + geofenceConfig.center_latitude + ', ' + geofenceConfig.center_longitude + ')');
      console.log('   - Allowed Radius: ' + geofenceConfig.radius_meters + ' meters');
      console.log('   - Location Name: ' + (geofenceConfig.location_name || 'N/A'));
      console.log('   - Enabled: ' + geofenceConfig.enabled);
      
      // Check location access
      const status = await checkLocationAccess(geofenceConfig);
      setLocationStatus(status);
      
      console.log('📊 Location Check Result:');
      console.log('   - Has Permission: ' + status.hasPermission);
      console.log('   - Distance from Center: ' + status.distance + ' meters');
      console.log('   - Allowed Radius: ' + geofenceConfig.radius_meters + ' meters');
      console.log('   - Is Within Radius: ' + status.isWithinRadius);
      console.log('   - Decision: ' + (status.isWithinRadius ? '✅ ALLOWED' : '❌ BLOCKED'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (!status.hasPermission) {
        setLocationCheckError('Location permission denied. Please enable location access.');
        toast.error('📍 Location permission required');
        return false;
      }
      
      if (!status.isWithinRadius) {
        const distance = formatDistance(status.distance);
        const allowedDistance = formatDistance(geofenceConfig.radius_meters);
        setLocationCheckError(
          `You are ${distance} away from the allowed location. Must be within ${allowedDistance}.`
        );
        toast.error(`⚠️ Outside allowed area (${distance} away)`);
        return false;
      }
      
      console.log('✅ [Kiosk] User is within allowed radius - Time In/Out ALLOWED');
      setLocationCheckError(null);
      return true;
      
    } catch (error: any) {
      console.error('❌ [Kiosk] Location check error:', error);
      setLocationCheckError('Unable to verify location. Please try again.');
      toast.error('📍 Location check failed');
      return false;
    } finally {
      setIsCheckingLocation(false);
    }
  };

  /**
   * Calculate attendance status based on time
   */
  const calculateStatus = (action: 'IN' | 'OUT', timestamp: Date): AttendanceStatus => {
    if (action !== 'IN') return 'On Time'; // Only calculate for Time In

    const timeStr = timestamp.toTimeString().substring(0, 5); // "HH:mm"
    const [hours, minutes] = timeStr.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;

    const [startHours, startMinutes] = settings.workStartTime.split(':').map(Number);
    const workStartMinutes = startHours * 60 + startMinutes;
    const graceEndMinutes = workStartMinutes + settings.gracePeriodMinutes;

    if (currentMinutes <= graceEndMinutes) {
      return 'On Time';
    } else {
      return 'Late';
    }
  };

  /**
   * Determine action based on scan mode and existing records
   */
  const determineAction = async (employeeNumber: string): Promise<'IN' | 'OUT' | null> => {
    // For manual modes
    if (selectedMode === 'TIME_IN') return 'IN';
    if (selectedMode === 'TIME_OUT') return 'OUT';

    // For AUTO mode - check today's records
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await attendanceApi.getRecords({
        employee_number: employeeNumber,
        start_date: today,
        end_date: today,
      });

      if (result.success && result.data) {
        const records = result.data;
        
        // Check what actions exist today - try multiple possible column names
        const hasTimeIn = records.some((r: any) => 
          r.action_type === 'IN' || r.type === 'IN' || r.action === 'IN'
        );
        const hasTimeOut = records.some((r: any) => 
          r.action_type === 'OUT' || r.type === 'OUT' || r.action === 'OUT'
        );

        if (!hasTimeIn) {
          return 'IN'; // No time in yet
        } else if (hasTimeIn && !hasTimeOut) {
          return 'OUT'; // Has time in, no time out
        } else {
          // Both exist - already completed for the day
          throw new Error('Already completed attendance for today');
        }
      }

      // No records found - default to IN
      return 'IN';
    } catch (err: any) {
      // If it's our custom error, re-throw it
      if (err.message === 'Already completed attendance for today') {
        throw err;
      }
      // For other errors, default to IN
      console.warn('Error checking records, defaulting to IN:', err);
      return 'IN';
    }
  };

  /**
   * Process scanned QR code
   */
  const processQRCode = useCallback(async (qrData: string) => {
    try {
      setScanning(false);
      
      console.log('🔍 [Kiosk] QR CODE SCANNED:', qrData);
      
      // **STEP 1: CHECK LOCATION FIRST** - Before processing anything else
      console.log('📍 [Kiosk] Checking geofence restrictions...');
      const locationAllowed = await checkUserLocation();
      
      if (!locationAllowed) {
        // Location check failed - block Time In/Time Out
        throw new Error(
          locationCheckError || 
          'You must be within the allowed location to clock in/out. Please move closer to the office.'
        );
      }
      
      console.log('✅ [Kiosk] Location check passed, proceeding with attendance...');
      
      // Try to parse as JSON (new format with type field)
      let employeeNumber: string;
      let userType: 'employee' | 'admin' = 'employee';
      let userName: string | undefined;
      let userDepartment: string | undefined;
      
      try {
        const parsed = JSON.parse(qrData);
        console.log('✅ [Kiosk] Parsed JSON:', parsed);
        
        if (parsed.type === 'admin') {
          userType = 'admin';
          employeeNumber = parsed.id;
          userName = parsed.name;
          userDepartment = parsed.department;
        } else if (parsed.type === 'employee') {
          userType = 'employee';
          employeeNumber = parsed.id;
          userName = parsed.name;
          userDepartment = parsed.department;
        } else {
          // Fallback to plain text employee number
          employeeNumber = qrData.trim();
        }
      } catch {
        // QR code is plain text (old format) - treat as employee number
        console.log('⚠️ [Kiosk] Legacy format detected');
        employeeNumber = qrData.trim();
      }

      if (!employeeNumber) {
        throw new Error('QR code is empty or invalid format');
      }

      console.log('🔍 [Kiosk] Looking up user:', employeeNumber, 'Type:', userType);

      // Fetch user data from database (employee or admin)
      let employee: EmployeeData | null = null;
      
      if (isSupabaseConfigured) {
        if (userType === 'admin' || employeeNumber.startsWith('ADM-')) {
          // Look up admin using server API (checks both KV store and Supabase table)
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🔍 [Kiosk] ADMIN LOOKUP');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('   User Type:', userType);
          console.log('   Admin Number:', employeeNumber);
          console.log('   QR Data:', qrData);
          
          // FIRST: Try using server API endpoint (checks both KV store and Supabase table)
          console.log('🔍 [Kiosk] Method 1: Querying server API for admin...');
          try {
            const apiResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-df988758/admins?search=${employeeNumber}`,
              {
                headers: {
                  'Authorization': `Bearer ${publicAnonKey}`
                }
              }
            );

            if (apiResponse.ok) {
              const apiResult = await apiResponse.json();
              console.log('📊 [Kiosk] Server API response:', apiResult);
              
              if (apiResult.success && apiResult.data && apiResult.data.length > 0) {
                const adminData = apiResult.data[0];
                console.log('✅ [Kiosk] Admin found via server API!');
                console.log('   Full Name:', adminData.full_name);
                console.log('   Department:', adminData.department);
                console.log('   Position:', adminData.position || adminData.role);
                console.log('   Source: Server API (KV store or Supabase)');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                employee = {
                  employee_number: adminData.admin_number,
                  full_name: adminData.full_name,
                  position: adminData.position || adminData.role || 'Team Leader',
                  teams: adminData.department ? { name: adminData.department } : null
                };
              }
            } else {
              console.warn('⚠️ [Kiosk] Server API returned non-OK status:', apiResponse.status);
            }
          } catch (apiError: any) {
            console.error('⚠️ [Kiosk] Server API error:', apiError.message);
          }

          // FALLBACK: Try Supabase direct query if server API didn't work
          if (!employee) {
            console.log('🔍 [Kiosk] Method 2: Querying Supabase admins table directly...');
            let { data: adminData, error } = await supabase
              .from('admins')
              .select('admin_number, full_name, position, department')
              .eq('admin_number', employeeNumber)
              .maybeSingle();
            
            console.log('📊 [Kiosk] Admins table result:', { adminData, error });
            
            // If not found, try 'admin' table (singular)
            if (error || !adminData) {
              console.log('⚠️ [Kiosk] Not found in "admins" table, trying "admin" table...');
              const adminResult = await supabase
                .from('admin')
                .select('admin_number, full_name, position, department')
                .eq('admin_number', employeeNumber)
                .maybeSingle();
              
              console.log('📊 [Kiosk] Admin table result:', adminResult);
              adminData = adminResult.data;
              error = adminResult.error;
            }
            
            if (!error && adminData) {
              console.log('✅ [Kiosk] Admin found in Supabase table!');
              console.log('   Full Name:', adminData.full_name);
              console.log('   Department:', adminData.department);
              console.log('   Position:', adminData.position);
              console.log('   Source: Supabase direct query');
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              employee = {
                employee_number: adminData.admin_number,
                full_name: adminData.full_name,
                position: adminData.position || 'Team Leader',
                teams: adminData.department ? { name: adminData.department } : null
              };
            }
          }

          // If still not found, show detailed error
          if (!employee) {
            console.error('❌ [Kiosk] ADMIN NOT FOUND ANYWHERE');
            console.error('   Admin Number:', employeeNumber);
            console.error('   Checked: Server API, Supabase admins table, Supabase admin table');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('⚠️ TROUBLESHOOTING:');
            console.error('   1. Use Admin DB Diagnostic tool to check if admin exists');
            console.error('   2. Admin must be registered via Super Admin → Register Admin');
            console.error('   3. Verify admin_number matches exactly:', employeeNumber);
            console.error('   4. Check browser console for full error details');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          }
        } else {
          // Look up employee in employees table
          const { data: empData, error } = await supabase
            .from('employees')
            .select('employee_number, full_name, position, teams(name)')
            .eq('employee_number', employeeNumber)
            .maybeSingle(); // Changed from .single() to .maybeSingle() to handle 0 rows gracefully
            
          if (!error && empData) {
            console.log('✅ [Kiosk] Employee found:', empData);
            employee = empData;
          } else {
            console.error('❌ [Kiosk] Employee not found:', error);
          }
        }
      }

      if (!employee) {
        const userTypeLabel = userType === 'admin' ? 'Admin' : 'Employee';
        throw new Error(`${userTypeLabel} ${employeeNumber} not found in database. Please ensure they are registered.`);
      }

      // Determine action (IN or OUT)
      const action = await determineAction(employeeNumber);
      
      if (!action) {
        throw new Error('Unable to determine attendance action');
      }

      const now = new Date();
      const status = calculateStatus(action, now);

      // Record attendance to database
      if (isSupabaseConfigured) {
        console.log('🔄 [Kiosk] Calling attendance API...');
        console.log('   Employee:', employeeNumber);
        console.log('   Action:', action);
        console.log('   Timestamp:', now.toISOString());
        
        const attendanceResult = await attendanceApi.recordAttendance({
          employee_number: employeeNumber,
          action: action,
          timestamp: now.toISOString()
        });
        
        console.log('📡 [Kiosk] API Response:', attendanceResult);
        console.log('   Success:', attendanceResult.success);
        console.log('   Data:', attendanceResult.data);
        console.log('   Error:', attendanceResult.error);
        console.log('   Message:', attendanceResult.message);
        
        // Check if attendance was rejected due to validation rules
        if (!attendanceResult.success) {
          console.log('❌ [Kiosk] Attendance API returned failure:', attendanceResult);
          let errorMsg = attendanceResult.message || 'Failed to record attendance';
          
          // Handle specific error codes
          if (attendanceResult.error === 'NO_SCHEDULE') {
            errorMsg = '⚠️ No schedule found - but attendance is still recorded. Contact your admin if this is unexpected.';
            console.log('⚠️ [Kiosk] NO_SCHEDULE error - this should not block attendance anymore');
          } else if (attendanceResult.error === 'SCHEDULE_ERROR') {
            errorMsg = attendanceResult.message || 'Unable to verify your schedule. Please contact your admin team leader.';
          } else if (attendanceResult.error === 'DAY_OFF') {
            errorMsg = attendanceResult.message || 'Today is your scheduled day off. No attendance needed.';
          } else if (attendanceResult.error === 'PAID_LEAVE') {
            errorMsg = attendanceResult.message || 'You have an approved paid leave today. No need to clock in/out.';
          } else if (attendanceResult.error === 'DUPLICATE_TIME_IN') {
            errorMsg = 'Already timed in today! You can only TIME IN once per day.';
          } else if (attendanceResult.error === 'DUPLICATE_TIME_OUT') {
            errorMsg = 'Already timed out today! You can only TIME OUT once per day.';
          } else if (attendanceResult.error === 'NO_TIME_IN') {
            errorMsg = 'Must TIME IN first before you can TIME OUT.';
          }
          
          console.log('❌ [Kiosk] Final error message:', errorMsg);
          throw new Error(errorMsg);
        }
        
        console.log('✅ [Kiosk] Attendance recorded successfully!');
      }

      // Success!
      const successResult: AttendanceResult = {
        success: true,
        action: action,
        employee: employee,
        timestamp: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: status,
        message: `TIME ${action} SUCCESSFUL`,
      };

      console.log('✅ [Kiosk] Success result prepared:', successResult);
      setResult(successResult);
      
      // Add to recent scans
      setRecentScans(prev => [successResult, ...prev.slice(0, 4)]);

      // Play success sound
      playSound('success');
      
      // Show toast notification
      toast.success(`✅ Time ${action} recorded for ${employee.full_name}`, {
        duration: 3000,
        description: `${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • ${status}`
      });

      // VERIFY RECORD WAS SAVED - Double check in database
      if (isSupabaseConfigured) {
        console.log('🔍 [Kiosk] Verifying record was saved to database...');
        try {
          const verifyResult = await attendanceApi.getRecords({
            employee_number: employeeNumber,
            start_date: now.toISOString().split('T')[0],
            end_date: now.toISOString().split('T')[0]
          });
          
          if (verifyResult.success && verifyResult.data && verifyResult.data.length > 0) {
            const savedRecord = verifyResult.data[0];
            console.log('✅✅✅ [Kiosk] VERIFIED - Record saved to database!');
            console.log('   Record ID:', savedRecord.id);
            console.log('   Employee:', savedRecord.employee_number);
            console.log('   Date:', savedRecord.date);
            console.log('   Time In:', savedRecord.time_in);
            console.log('   Time Out:', savedRecord.time_out);
            console.log('   Status:', savedRecord.status);
          } else {
            console.warn('⚠️ [Kiosk] Verification failed - record not found immediately (may take a moment)');
          }
        } catch (verifyError) {
          console.error('⚠️ [Kiosk] Error during verification:', verifyError);
        }
      }
      
      // DISPATCH EVENT - Notify other components to refresh
      console.log('📢 [Kiosk] Dispatching attendanceUpdated event...');
      window.dispatchEvent(new CustomEvent('attendanceUpdated', {
        detail: {
          employee_number: employeeNumber,
          action: action,
          timestamp: now.toISOString(),
          source: 'kiosk_mode'
        }
      }));
      console.log('✅ [Kiosk] Event dispatched - other components should refresh');

      console.log('✅ [Kiosk] Attendance successfully recorded, will reset in 4 seconds');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Auto-reset after 4 seconds
      setTimeout(() => {
        setResult(null);
        setScanning(true);
      }, 4000);

    } catch (err: any) {
      console.error('QR Processing Error:', err);
      
      let errorMessage = 'Unknown error occurred';
      
      if (err.message === 'Employee not found') {
        errorMessage = 'Employee not found - Invalid QR code';
      } else if (err.message === 'Already completed attendance for today') {
        errorMessage = 'Already timed in AND timed out today';
      } else if (err.message.includes('Invalid QR code')) {
        errorMessage = 'Invalid QR code format';
      } else if (err.message.includes('Unable to determine')) {
        errorMessage = 'System error - Please try again';
      } else {
        errorMessage = err.message;
      }

      setError(errorMessage);
      playSound('error');

      setTimeout(() => {
        setError(null);
        setScanning(true);
      }, 4000);
    }
  }, [selectedMode, settings, isSupabaseConfigured]);

  /**
   * Scan QR code from webcam
   */
  const scanQRCode = useCallback(() => {
    if (webcamRef.current && scanning && !result && !error) {
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
            
            if (code && code.data) {
              processQRCode(code.data);
            }
          }
        };
      }
    }
  }, [scanning, result, error, processQRCode]);

  useEffect(() => {
    if (scanning && !result && !error) {
      // Ultra-fast scanning: 150ms interval for instant QR detection (70% faster than 500ms)
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
  }, [scanning, result, error, scanQRCode]);

  /**
   * Play sound feedback
   */
  const playSound = (type: 'success' | 'error') => {
    // Create simple beep sounds using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'success') {
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    } else {
      oscillator.frequency.value = 200;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    }

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  /**
   * Handle mode selection
   */
  const handleModeChange = (mode: ScanMode) => {
    if (!settings.isModeLocked) {
      setSelectedMode(mode);
      toast.success(`Mode changed to ${mode.replace('_', ' ')}`);
    }
  };

  /**
   * Save settings
   */
  const saveSettings = () => {
    toast.success('Kiosk settings saved');
    setShowSettings(false);
  };

  // Function to request camera permission
  const requestCameraPermission = async () => {
    if (isRequestingPermission) {
      console.log('⏳ Already requesting permission, please wait...');
      return;
    }

    setIsRequestingPermission(true);
    
    try {
      console.log('========================================');
      console.log('📹 CAMERA PERMISSION REQUEST STARTED');
      console.log('========================================');
      console.log('🌐 Current URL:', window.location.href);
      console.log('🔒 Protocol:', window.location.protocol);
      console.log('🏠 Hostname:', window.location.hostname);
      console.log('📱 User Agent:', navigator.userAgent);
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      console.log('✅ getUserMedia API is available');
      
      // Check HTTPS requirement (except localhost)
      if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
        throw new Error('HTTPS_REQUIRED');
      }
      
      console.log('✅ Security check passed');
      
      toast.info('📷 Requesting camera access...', { duration: 2000 });
      
      console.log(' Calling getUserMedia({ video: true })...');
      
      // Try to enumerate devices first to check if any cameras exist
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('📹 Available video devices:', videoDevices.length);
        
        if (videoDevices.length === 0) {
          throw new Error('NO_CAMERA_DETECTED');
        }
      } catch (enumError) {
        console.warn('⚠️ Could not enumerate devices:', enumError);
        // Continue anyway - the device might still work
      }
      
      // Request permission with the simplest possible constraint
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false
      });
      
      console.log('========================================');
      console.log('✅ CAMERA PERMISSION GRANTED!');
      console.log('========================================');
      console.log('📹 Stream ID:', mediaStream.id);
      console.log('📹 Video Tracks:', mediaStream.getVideoTracks().length);
      
      if (mediaStream.getVideoTracks().length > 0) {
        const track = mediaStream.getVideoTracks()[0];
        console.log('📹 Track Label:', track.label);
        console.log('📹 Track Settings:', track.getSettings());
        console.log('📹 Track Capabilities:', track.getCapabilities ? track.getCapabilities() : 'Not supported');
      }
      
      toast.success('✅ Camera permission granted!', { duration: 2000 });
      
      // Keep stream alive
      setStream(mediaStream);
      
      console.log('🔄 Reloading page in 1.5 seconds...');
      
      // Reload to apply
      setTimeout(() => {
        console.log('🔄 Reloading now...');
        window.location.reload();
      }, 1500);
      
    } catch (err: any) {
      console.log('========================================');
      console.error('❌ CAMERA PERMISSION FAILED');
      console.log('========================================');
      console.error('Error object:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      
      let helpfulMessage = 'Camera access failed';
      let toastDuration = 5000;
      
      if (err.message === 'HTTPS_REQUIRED') {
        helpfulMessage = '🔒 HTTPS Required: Camera needs HTTPS (not HTTP)';
        toast.error(helpfulMessage, { duration: toastDuration });
        toast.error(`Change URL to: https://${window.location.host}${window.location.pathname}`, { duration: 8000 });
      } else if (err.name === 'NotAllowedError') {
        helpfulMessage = '🚫 Permission Denied: You clicked "Block" or "Deny". Please click "Allow" when the popup appears!';
        toast.error(helpfulMessage, { duration: toastDuration });
        toast.info('💡 Tip: Look for the permission popup in your address bar or at the top of the screen', { duration: 6000 });
      } else if (err.name === 'NotFoundError') {
        helpfulMessage = '📷 No Camera Found: Your device may not have a camera or it\'s not connected';
        toast.error(helpfulMessage, { duration: toastDuration });
      } else if (err.name === 'NotReadableError') {
        helpfulMessage = '📵 Camera In Use: Another app is using the camera. Close Instagram, Facebook, TikTok, or other apps!';
        toast.error(helpfulMessage, { duration: toastDuration });
      } else if (err.name === 'SecurityError') {
        helpfulMessage = '🔒 Security Error: Camera requires HTTPS (secure connection)';
        toast.error(helpfulMessage, { duration: toastDuration });
      } else if (err.message && err.message.includes('getUserMedia is not supported')) {
        helpfulMessage = '🚫 Browser Not Supported: Try using Chrome, Firefox, or Safari';
        toast.error(helpfulMessage, { duration: toastDuration });
      } else if (err.message === 'NO_CAMERA_DETECTED') {
        helpfulMessage = '📷 No Camera Detected: Your device does not have a camera';
        toast.error(helpfulMessage, { duration: toastDuration });
      } else {
        helpfulMessage = `❌ Error: ${err.message || 'Unknown error'}`;
        toast.error(helpfulMessage, { duration: toastDuration });
      }
      
      console.log('📝 User-friendly message:', helpfulMessage);
      setCameraError(helpfulMessage);
      
    } finally {
      setIsRequestingPermission(false);
      console.log('========================================');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] flex flex-col relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 z-50 bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-lg transition-colors backdrop-blur-sm flex items-center gap-2 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="hidden sm:inline">Back to Home</span>
      </button>

      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-colors backdrop-blur-sm"
      >
        <Settings className="w-5 h-5" />
      </button>
      
      {/* Camera Permission Quick Access Button */}
      {cameraError && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md">
          <button
            onClick={requestCameraPermission}
            disabled={isRequestingPermission}
            className={`w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-4 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 ${
              isRequestingPermission ? 'opacity-70 cursor-wait' : 'animate-pulse'
            }`}
          >
            <Camera className="w-7 h-7" />
            <div className="flex flex-col items-start">
              <span className="text-base leading-tight">
                {isRequestingPermission ? '⏳ Requesting...' : '🎥 Allow Camera Access'}
              </span>
              <span className="text-xs font-normal opacity-90">
                {isRequestingPermission ? 'Please allow when popup appears' : 'Tap to show permission popup'}
              </span>
            </div>
          </button>
          
          {/* HTTPS Warning if applicable */}
          {window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && (
            <div className="mt-2 bg-yellow-500 text-black px-4 py-3 rounded-xl font-semibold text-sm text-center shadow-xl">
              ⚠️ Change URL to <code className="bg-black/20 px-2 py-1 rounded">https://</code>
            </div>
          )}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 z-50 bg-white rounded-xl shadow-2xl p-6 w-80 max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-bold text-[#1F2937] mb-4">Kiosk Settings</h3>
          
          <div className="space-y-4">
            {/* Work Start Time */}
            <div>
              <label className="block text-sm font-medium text-[#6B7280] mb-1">
                Work Start Time
              </label>
              <input
                type="time"
                value={settings.workStartTime}
                onChange={(e) => setSettings({ ...settings, workStartTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]"
              />
            </div>

            {/* Work End Time */}
            <div>
              <label className="block text-sm font-medium text-[#6B7280] mb-1">
                Work End Time
              </label>
              <input
                type="time"
                value={settings.workEndTime}
                onChange={(e) => setSettings({ ...settings, workEndTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]"
              />
            </div>

            {/* Grace Period */}
            <div>
              <label className="block text-sm font-medium text-[#6B7280] mb-1">
                Grace Period (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.gracePeriodMinutes}
                onChange={(e) => setSettings({ ...settings, gracePeriodMinutes: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]"
              />
            </div>

            {/* Default Scan Mode */}
            <div>
              <label className="block text-sm font-medium text-[#6B7280] mb-1">
                Default Scan Mode
              </label>
              <select
                value={settings.scanMode}
                onChange={(e) => setSettings({ ...settings, scanMode: e.target.value as ScanMode })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]"
              >
                <option value="AUTO">Auto Detect</option>
                <option value="TIME_IN">Time In Only</option>
                <option value="TIME_OUT">Time Out Only</option>
              </select>
            </div>

            {/* Lock Mode */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[#6B7280]">
                Lock Scan Mode
              </label>
              <button
                onClick={() => setSettings({ ...settings, isModeLocked: !settings.isModeLocked })}
                className={`p-2 rounded-lg transition-colors ${
                  settings.isModeLocked ? 'bg-[#0B3060] text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {settings.isModeLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            onClick={saveSettings}
            className="w-full mt-6 bg-[#0B3060] text-white py-2 rounded-lg font-semibold hover:bg-[#0B3060]/90 transition-colors"
          >
            Save Settings
          </button>
        </div>
      )}

      {/* Header */}
      <div className="p-6 md:p-8">
        <Logo variant="light" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row items-start justify-center px-4 pb-8 gap-6">
        {/* Left Side - Scanner */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl">
          {/* Clock */}
          <div className="text-center mb-8">
            <div className="text-6xl md:text-7xl font-bold text-[#F7B34C] mb-2">
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-lg md:text-xl text-white/80 flex items-center justify-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Geofence Location Status */}
          {geofenceConfig && geofenceConfig.enabled && (
            <div className="mb-6 w-full max-w-md">
              {isCheckingLocation ? (
                <div className="bg-blue-500/20 border-2 border-blue-500/40 rounded-lg px-4 py-3 flex items-center gap-3 backdrop-blur-sm animate-pulse">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <div className="flex-1">
                    <p className="text-blue-200 font-semibold text-sm">Checking Location...</p>
                    <p className="text-blue-300/80 text-xs">Please wait</p>
                  </div>
                </div>
              ) : locationStatus ? (
                <div className={`border-2 rounded-lg px-4 py-3 flex items-center gap-3 backdrop-blur-sm ${
                  locationStatus.isWithinRadius
                    ? 'bg-green-500/20 border-green-500/40'
                    : 'bg-red-500/20 border-red-500/40'
                }`}>
                  <div className="flex-shrink-0">
                    {locationStatus.isWithinRadius ? (
                      <MapPin className="w-6 h-6 text-green-400" />
                    ) : (
                      <Navigation className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${
                      locationStatus.isWithinRadius ? 'text-green-200' : 'text-red-200'
                    }`}>
                      {locationStatus.isWithinRadius ? '✅ Within Allowed Area' : '⚠️ Outside Allowed Area'}
                    </p>
                    <p className={`text-xs ${
                      locationStatus.isWithinRadius ? 'text-green-300/80' : 'text-red-300/80'
                    }`}>
                      {locationStatus.isWithinRadius 
                        ? `${formatDistance(locationStatus.distance)} from center`
                        : `${formatDistance(locationStatus.distance)} away - Must be within ${formatDistance(geofenceConfig.radius_meters)}`
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-500/20 border-2 border-yellow-500/40 rounded-lg px-4 py-3 flex items-center gap-3 backdrop-blur-sm">
                  <MapPin className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-yellow-200 font-semibold text-sm">Location Verification Enabled</p>
                    <p className="text-yellow-300/80 text-xs">Scan QR code to verify location</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode Selection */}
          {!settings.isModeLocked && (
            <div className="flex gap-3 mb-6">
              {(['TIME_IN', 'TIME_OUT', 'AUTO'] as ScanMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    selectedMode === mode
                      ? 'bg-[#F7B34C] text-[#0B3060] shadow-lg scale-105'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {mode.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}

          {settings.isModeLocked && (
            <div className="mb-6 flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
              <Lock className="w-4 h-4 text-[#F7B34C]" />
              <span className="text-white font-medium">Mode Locked: {selectedMode.replace('_', ' ')}</span>
            </div>
          )}

          {/* Camera Frame */}
          <div className="relative w-full max-w-md aspect-square">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-2xl border-4 border-dashed border-white/30 flex items-center justify-center overflow-hidden">
              {!result && !error && (
                <div className="relative w-full h-full">
                  <Webcam
                    key={`${retryCount}-${facingMode}-${useBasicConstraints}`}
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={
                      selectedDeviceId
                        ? {
                            deviceId: selectedDeviceId,
                            width: { ideal: 640 },
                            height: { ideal: 640 }
                          }
                        : {
                            facingMode: facingMode, // Always use facingMode
                            width: { ideal: 640 },
                            height: { ideal: 640 }
                          }
                    }
                    onUserMedia={() => {
                      setCameraReady(true);
                      setCameraError(null);
                      console.log('✅ Camera ready');
                      console.log('📹 Current facingMode:', facingMode);
                      console.log('📹 Saved preference:', localStorage.getItem('kiosk_camera_mode'));
                      toast.success(`Camera connected: ${facingMode === 'environment' ? 'Rear/Back' : 'Front'} camera`);
                    }}
                    onUserMediaError={(err) => {
                      const errorMsg = err instanceof Error ? err.message : String(err);
                      setCameraError(`${errorMsg}`);
                      setCameraReady(false);
                      console.error('❌ Camera error:', err);
                      
                      // Auto-fallback to basic mode on first error
                      if (!useBasicConstraints && retryCount === 0) {
                        console.log('🔄 Auto-retrying with basic constraints...');
                        setTimeout(() => {
                          setUseBasicConstraints(true);
                          setRetryCount(prev => prev + 1);
                        }, 1000);
                      }
                    }}
                  />
                  
                  {/* Camera Status Indicator */}
                  {cameraReady && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      Live
                    </div>
                  )}
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-4 border-[#F7B34C] rounded-lg relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#F7B34C]"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#F7B34C]"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#F7B34C]"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#F7B34C]"></div>
                      
                      {/* Animated scanning line */}
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="w-full h-1 bg-[#F7B34C] scan-line"></div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-4 left-4 right-4 bg-black/80 text-white text-center py-3 rounded-lg backdrop-blur-sm">
                    <p className="text-lg font-semibold">Scan Your QR Code</p>
                    <p className="text-sm text-white/70 mt-1">Position code within the frame</p>
                  </div>
                </div>
              )}

              {/* Success State */}
              {result && (
                <div className="w-full h-full bg-gradient-to-br from-[#16A34A] to-[#15803d] flex flex-col items-center justify-center p-8 text-white animate-fadeIn">
                  <CheckCircle className="w-20 h-20 mb-4 animate-bounce" />
                  <h2 className="text-3xl font-bold mb-1">{result.employee.full_name}</h2>
                  <p className="text-lg mb-4 opacity-90">{result.employee.position}</p>
                  <div className="bg-white text-[#16A34A] px-8 py-3 rounded-full font-bold text-xl mb-3">
                    {result.message}
                  </div>
                  <div className="text-5xl font-bold mb-2">{result.timestamp}</div>
                  {result.status && (
                    <div className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                      result.status === 'On Time' ? 'bg-white/20' : 'bg-yellow-400/30'
                    }`}>
                      {result.status}
                    </div>
                  )}
                  
                  {/* Database Confirmation Banner */}
                  <div className="mt-6 bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-xl px-6 py-4 max-w-md">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold text-sm">✅ Saved to Database</p>
                        <p className="text-white/80 text-xs">Record will appear in your Attendance History</p>
                      </div>
                    </div>
                    <div className="bg-black/20 rounded-lg px-3 py-2 mt-2">
                      <p className="text-white/70 text-xs font-mono">
                        Employee #{result.employee.employee_number || 'N/A'}
                      </p>
                      <p className="text-white/70 text-xs font-mono">
                        Date: {new Date().toISOString().split('T')[0]}
                      </p>
                    </div>
                  </div>
                  
                  {/* Auto-reset countdown */}
                  <p className="mt-4 text-white/60 text-sm">Resetting in 4 seconds...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="w-full h-full bg-gradient-to-br from-[#DC2626] to-[#b91c1c] flex flex-col items-center justify-center p-8 text-white animate-fadeIn">
                  <XCircle className="w-20 h-20 mb-6" />
                  <h2 className="text-2xl font-bold text-center px-4">{error}</h2>
                </div>
              )}
            </div>
          </div>

          <p className="text-white/70 text-center mt-6 max-w-md text-sm">
            {selectedMode === 'AUTO' && 'System will automatically detect Time In or Time Out'}
            {selectedMode === 'TIME_IN' && 'Kiosk is set to Time In mode only'}
            {selectedMode === 'TIME_OUT' && 'Kiosk is set to Time Out mode only'}
          </p>

          {/* Camera Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 w-full max-w-md">
            <button
              onClick={() => {
                const newMode = facingMode === 'user' ? 'environment' : 'user';
                setFacingMode(newMode);
                // Persist camera preference to localStorage
                localStorage.setItem('kiosk_camera_mode', newMode);
                setCameraReady(false); // Reset camera ready state to force reload
                toast.success(`Switched to ${newMode === 'environment' ? 'rear/back' : 'front'} camera`);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#F7B34C] hover:bg-[#F7B34C]/90 text-[#0B3060] rounded-lg transition-colors font-semibold shadow-lg w-full sm:w-auto"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Flip Camera ({facingMode === 'environment' ? 'Using Back' : 'Using Front'})</span>
            </button>
            
            {cameraReady && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-500/20 text-green-200 rounded-lg border border-green-500/30">
                <Camera className="w-5 h-5" />
                <span className="font-medium">Camera Active</span>
              </div>
            )}
            
            {cameraError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-500/20 text-red-200 rounded-lg border border-red-500/30">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Camera Error</span>
              </div>
            )}
          </div>

          {/* Camera Error Message */}
          {cameraError && (
            <div className="mt-4 p-6 bg-red-500/10 border-2 border-red-500/30 rounded-xl text-white max-w-md space-y-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-200 mb-2">Camera Access Issue</p>
                  <p className="text-sm text-white/80 mb-4">
                    {window.location.protocol === 'http:' && window.location.hostname !== 'localhost' 
                      ? '⚠️ HTTPS REQUIRED: Your site is using HTTP. Mobile browsers require HTTPS for camera access!' 
                      : 'The camera could not be accessed. Click "Manual Start Camera" below to try again.'}\n                  </p>
                  
                  <div className="bg-black/30 rounded-lg p-3 mb-4">
                    <p className="text-xs font-mono text-red-300 break-all">{cameraError}</p>
                  </div>
                  
                  {/* HTTPS Warning */}
                  {window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && (
                    <div className="bg-yellow-500/20 border-2 border-yellow-500/40 rounded-lg p-3 mb-4">
                      <p className="text-yellow-200 font-bold text-sm mb-2">🔒 Security Issue Detected</p>
                      <p className="text-yellow-100 text-xs mb-2">
                        Your current URL: <code className="bg-black/30 px-1 py-0.5 rounded">{window.location.href}</code>
                      </p>
                      <p className="text-yellow-100 text-xs">
                        ✅ Change to: <code className="bg-black/30 px-1 py-0.5 rounded">https://{window.location.host}{window.location.pathname}</code>
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 text-xs text-white/70">
                    <p className="font-semibold text-white/90">💡 Quick Fixes:</p>
                    <ul className="space-y-1.5 list-disc list-inside ml-2">
                      <li>Click "<strong>Manual Start Camera</strong>" button below</li>
                      <li>When prompted, select "<strong>Allow</strong>"</li>
                      <li>Close any other apps using your camera</li>
                      <li>Make sure you're NOT in Private/Incognito mode</li>
                      <li>Use Chrome or Firefox for best results</li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2 mt-4">
                    <button
                      onClick={async () => {
                        try {
                          console.log('📹 Manual camera start initiated...');
                          console.log('🌐 Protocol:', window.location.protocol);
                          console.log('🏠 Hostname:', window.location.hostname);
                          
                          // Check HTTPS first
                          if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
                            toast.error('❌ Camera requires HTTPS! Change URL to https://');
                            return;
                          }
                          
                          toast.info('📷 Requesting camera access...');
                          
                          // Try the absolute simplest constraints
                          const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                            video: { facingMode: 'user' },
                            audio: false 
                          });
                          
                          console.log('✅ Camera access granted!');
                          console.log('📹 Stream tracks:', mediaStream.getVideoTracks());
                          
                          toast.success('✅ Camera access granted! Reloading page...');
                          
                          // Keep the stream active
                          setStream(mediaStream);
                          
                          // Reload to apply
                          setTimeout(() => {
                            window.location.reload();
                          }, 1500);
                          
                        } catch (err: any) {
                          console.error('❌ Manual camera start failed:', err);
                          
                          let helpfulMessage = 'Camera access failed';
                          
                          if (err.name === 'NotAllowedError') {
                            helpfulMessage = '🚫 Permission Denied: You must click "Allow" when prompted';
                          } else if (err.name === 'NotFoundError') {
                            helpfulMessage = '📷 No Camera Found: Your device may not have a camera';
                          } else if (err.name === 'NotReadableError') {
                            helpfulMessage = '📵 Camera In Use: Close other apps using the camera (Instagram, Facebook, etc.)';
                          } else if (err.name === 'SecurityError') {
                            helpfulMessage = '🔒 Security Error: Camera requires HTTPS (not HTTP)';
                          } else {
                            helpfulMessage = `❌ Error: ${err.message}`;
                          }
                          
                          toast.error(helpfulMessage);
                          setCameraError(helpfulMessage);
                        }
                      }}
                      className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-base"
                    >
                      <Camera className="w-5 h-5" />
                      Manual Start Camera
                    </button>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setCameraError(null);
                          setCameraReady(false);
                          setRetryCount(prev => prev + 1);
                          window.location.reload();
                        }}
                        className="flex-1 bg-[#F7B34C] hover:bg-[#f5a82d] text-[#0B3060] px-4 py-2.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reload
                      </button>
                      
                      <button
                        onClick={() => setShowPermissionInstructions(!showPermissionInstructions)}
                        className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors"
                      >
                        {showPermissionInstructions ? 'Hide' : 'Help'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Detailed Permission Instructions */}
                  {showPermissionInstructions && (
                    <div className="mt-4 bg-black/50 rounded-lg p-4 space-y-3 text-xs">
                      <p className="font-bold text-white">🔧 How to Clear Cached Permissions:</p>
                      
                      <div className="space-y-2">
                        <p className="text-yellow-300 font-semibold">📱 For Mobile Chrome (Android):</p>
                        <ol className="list-decimal list-inside space-y-1 text-white/80 ml-2">
                          <li>Tap the <strong>🔒 lock icon</strong> or <strong>ⓘ info icon</strong> in the address bar</li>
                          <li>Tap "<strong>Permissions</strong>" or "<strong>Site settings</strong>"</li>
                          <li>Find "<strong>Camera</strong>" and tap it</li>
                          <li>Select "<strong>Allow</strong>"</li>
                          <li>Go back and <strong>reload</strong> the page</li>
                        </ol>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-yellow-300 font-semibold">🍎 For Mobile Safari (iPhone/iPad):</p>
                        <ol className="list-decimal list-inside space-y-1 text-white/80 ml-2">
                          <li>Open your device <strong>Settings</strong> app</li>
                          <li>Scroll down to "<strong>Safari</strong>"</li>
                          <li>Scroll to "<strong>Camera</strong>"</li>
                          <li>Select "<strong>Allow</strong>"</li>
                          <li>Close and reopen Safari, then reload page</li>
                        </ol>
                        <p className="text-orange-300 text-xs italic">Note: Safari in Private Mode blocks camera entirely!</p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-yellow-300 font-semibold">🖥️ For Desktop Chrome:</p>
                        <ol className="list-decimal list-inside space-y-1 text-white/80 ml-2">
                          <li>Click the <strong>🎥 camera icon</strong> or 🔒 lock in address bar</li>
                          <li>Click "<strong>Camera</strong>" and select "<strong>Allow</strong>"</li>
                          <li>Reload the page</li>
                        </ol>
                      </div>
                      
                      <div className="bg-red-500/20 border border-red-500/30 rounded p-2 mt-2">
                        <p className="text-red-200 font-semibold">⚠️ Common Issues:</p>
                        <ul className="list-disc list-inside space-y-1 text-white/70 ml-2 mt-1">
                          <li><strong>Private/Incognito Mode</strong>: May block camera entirely</li>
                          <li><strong>Another app using camera</strong>: Close other apps (Facebook, Instagram, etc.)</li>
                          <li><strong>Browser cache</strong>: Try clearing browser data</li>
                          <li><strong>HTTP site</strong>: Camera requires HTTPS on most mobile browsers</li>
                        </ul>
                      </div>
                      
                      <button
                        onClick={async () => {
                          // Check for permission status
                          try {
                            if (navigator.permissions && navigator.permissions.query) {
                              const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
                              toast.info(`Current permission: ${permissionStatus.state}`);
                              setPermissionState(permissionStatus.state as any);
                              
                              if (permissionStatus.state === 'denied') {
                                toast.error('🚫 Permission is DENIED. Please follow the instructions above to clear it.');
                              } else if (permissionStatus.state === 'granted') {
                                toast.success('✅ Permission is GRANTED. Try reloading the page.');
                              } else {
                                toast.info('❓ Permission is PROMPT. Camera will ask for permission.');
                              }
                            } else {
                              toast.info('Browser doesn\'t support permission checking');
                            }
                          } catch (err) {
                            console.log('Permission check not supported:', err);
                            toast.info('Permission check not available on this browser');
                          }
                        }}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold"
                      >
                        Check Current Permission Status
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Recent Scans */}
        {recentScans.length > 0 && (
          <div className="w-full lg:w-80 bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Scans
            </h3>
            <div className="space-y-3">
              {recentScans.map((scan, index) => (
                <div key={index} className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{scan.employee.full_name}</p>
                      <p className="text-white/70 text-xs">{scan.employee.position}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      scan.action === 'IN' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
                    }`}>
                      {scan.action}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-white/60">{scan.timestamp}</span>
                    {scan.status && (
                      <span className={`px-2 py-0.5 rounded ${
                        scan.status === 'On Time' ? 'bg-green-500/30 text-green-100' : 'bg-yellow-500/30 text-yellow-100'
                      }`}>
                        {scan.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(250px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .scan-line {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}