import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { QrCode, Download, User, IdCard, Shield, Printer, Info, AlertCircle } from 'lucide-react';
import { useLocation } from 'react-router';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { toast } from 'sonner';

export function MyQRCode() {
  const location = useLocation();
  const [userInfo, setUserInfo] = useState<{
    name: string;
    id: string;
    role: string;
    department: string;
  } | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // Determine user role based on path
      const isEmployee = location.pathname.startsWith('/employee');
      const isAdmin = location.pathname.startsWith('/admin') && !location.pathname.startsWith('/admin/login');
      const isSuperAdmin = location.pathname.startsWith('/super-admin');

      if (isEmployee) {
        // Load employee data
        const employeeData = localStorage.getItem('mnemosyne_employee_profile');
        if (employeeData) {
          const profile = JSON.parse(employeeData);
          const userInfoData = {
            name: profile.full_name || 'Employee',
            id: profile.employee_number || 'EMP-000',
            role: 'Employee',
            department: profile.department || 'Unknown Department'
          };
          setUserInfo(userInfoData);
          
          // Create QR code data with JSON structure for attendance system
          const qrData = JSON.stringify({
            type: 'employee',
            id: profile.employee_number || 'EMP-000',
            name: profile.full_name || 'Employee',
            department: profile.department || 'Unknown Department',
            timestamp: new Date().toISOString()
          });
          setQrCodeData(qrData);
        }
      } else if (isSuperAdmin) {
        // Super Admin
        const superAdminData = localStorage.getItem('mnemosyne_superadmin_profile');
        if (superAdminData) {
          const profile = JSON.parse(superAdminData);
          const userInfoData = {
            name: profile.username || 'Super Admin',
            id: 'SUPER-ADMIN-001',
            role: 'Super Administrator',
            department: 'Administration'
          };
          setUserInfo(userInfoData);
          
          // Create QR code data for super admin
          const qrData = JSON.stringify({
            type: 'superadmin',
            id: 'SUPER-ADMIN-001',
            name: profile.username || 'Super Admin',
            department: 'Administration',
            timestamp: new Date().toISOString()
          });
          setQrCodeData(qrData);
        }
      } else if (isAdmin) {
        // 🔥 ADMIN QR CODE - GENERATE DYNAMICALLY OR FETCH FROM DATABASE
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 LOADING ADMIN QR CODE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Load admin data from localStorage first
        let adminData = localStorage.getItem('mnemosyne_admin_profile');
        if (!adminData) {
          adminData = localStorage.getItem('adminSession');
        }
        
        if (adminData) {
          const profile = JSON.parse(adminData);
          console.log('📋 LocalStorage admin profile:', profile);
          
          // Fetch admin data from Supabase
          if (isSupabaseConfigured && supabase && profile.id) {
            try {
              console.log('🔍 Fetching admin data from Supabase...');
              const { data: freshAdminData, error } = await supabase
                .from('admins')
                .select('admin_number, full_name, department, email')
                .eq('id', profile.id)
                .maybeSingle();
              
              if (error || !freshAdminData) {
                console.error('❌ Error fetching admin data:', error);
                // Fallback to localStorage data
                console.log('⚠️ Using localStorage data as fallback');
                const userInfoData = {
                  name: profile.full_name || 'Admin',
                  id: profile.admin_number || 'ADM-000',
                  role: 'Team Leader',
                  department: profile.department || 'Unknown Department'
                };
                setUserInfo(userInfoData);
                
                // Generate QR code data dynamically
                const qrData = JSON.stringify({
                  type: 'admin',
                  id: profile.admin_number || 'ADM-000',
                  name: profile.full_name || 'Admin',
                  department: profile.department || 'Unknown Department',
                  timestamp: new Date().toISOString()
                });
                setQrCodeData(qrData);
                setIsLoading(false);
                return;
              }

              console.log('✅ Fresh admin data from Supabase:', freshAdminData);

              // Update localStorage with fresh data
              const updatedProfile = {
                ...profile,
                admin_number: freshAdminData.admin_number,
                full_name: freshAdminData.full_name,
                department: freshAdminData.department
              };
              localStorage.setItem('mnemosyne_admin_profile', JSON.stringify(updatedProfile));
              localStorage.setItem('adminSession', JSON.stringify(updatedProfile));

              const userInfoData = {
                name: freshAdminData.full_name,
                id: freshAdminData.admin_number,
                role: 'Team Leader',
                department: freshAdminData.department
              };
              setUserInfo(userInfoData);
              
              // Generate unique QR code data for admin (consistent format)
              const qrData = JSON.stringify({
                type: 'admin',
                id: freshAdminData.admin_number,
                name: freshAdminData.full_name,
                department: freshAdminData.department,
                timestamp: new Date().toISOString()
              });
              setQrCodeData(qrData);
              
              console.log('✅ Admin QR code generated successfully');
              console.log('   admin_number:', freshAdminData.admin_number);
              console.log('   name:', freshAdminData.full_name);
              console.log('   department:', freshAdminData.department);
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              
              setDebugInfo({
                qrData: qrData,
                adminNumber: freshAdminData.admin_number,
                fullName: freshAdminData.full_name,
                department: freshAdminData.department,
                source: 'generated'
              });

            } catch (error) {
              console.error('❌ Error fetching admin data:', error);
              toast.error('Failed to load admin data. Using cached data.');
              
              // Fallback to localStorage
              const userInfoData = {
                name: profile.full_name || 'Admin',
                id: profile.admin_number || 'ADM-000',
                role: 'Team Leader',
                department: profile.department || 'Unknown Department'
              };
              setUserInfo(userInfoData);
              
              const qrData = JSON.stringify({
                type: 'admin',
                id: profile.admin_number || 'ADM-000',
                name: profile.full_name || 'Admin',
                department: profile.department || 'Unknown Department',
                timestamp: new Date().toISOString()
              });
              setQrCodeData(qrData);
            }
          } else {
            console.warn('⚠️ Supabase not configured or admin ID not found');
            // Use localStorage data
            const userInfoData = {
              name: profile.full_name || 'Admin',
              id: profile.admin_number || 'ADM-000',
              role: 'Team Leader',
              department: profile.department || 'Unknown Department'
            };
            setUserInfo(userInfoData);
            
            const qrData = JSON.stringify({
              type: 'admin',
              id: profile.admin_number || 'ADM-000',
              name: profile.full_name || 'Admin',
              department: profile.department || 'Unknown Department',
              timestamp: new Date().toISOString()
            });
            setQrCodeData(qrData);
          }
        } else {
          console.warn('⚠️ No admin data found in localStorage');
          toast.error('Admin session not found. Please log in again.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [location.pathname]);

  const handlePrint = () => {
    window.print();
  };

  if (!userInfo) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        {debugInfo?.error === 'Database column missing' ? (
          <Card>
            <div className="max-w-2xl">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-orange-900 mb-2">
                      🔧 Database Setup Required
                    </h3>
                    <p className="text-sm text-orange-800 mb-4">
                      The admin QR code system requires database setup. Please contact your Super Admin to complete the following steps:
                    </p>
                    <ol className="text-sm text-orange-800 space-y-2 list-decimal list-inside mb-4">
                      <li>Log in as Super Admin</li>
                      <li>Navigate to: <strong>Super Admin → Setup Admin QR Column</strong></li>
                      <li>Follow the instructions to add the <code className="bg-orange-200 px-1 rounded">qr_code_data</code> column</li>
                      <li>Generate QR codes for all admins</li>
                    </ol>
                    <div className="bg-white rounded-lg p-3 border border-orange-300">
                      <p className="text-xs text-orange-900 font-mono">
                        Error Code: {debugInfo.errorCode} - Column 'qr_code_data' does not exist
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <p className="text-gray-500">Loading your QR code...</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <QrCode className="w-8 h-8 text-[#0B3060]" />
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937]">My QR Code</h1>
            <p className="text-sm text-[#6B7280]">Your personal attendance QR code</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-medium"
        >
          <Printer className="w-4 h-4" />
          Print QR Code
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-[#0B3060] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#0B3060] mb-1">How to use your QR Code:</p>
            <ul className="text-sm text-[#1F2937] space-y-1 list-disc list-inside">
              <li>Download or print your QR code for easy access</li>
              <li>Scan your QR code at the kiosk or scanner to record attendance</li>
              <li>First scan of the day = Time In, Second scan = Time Out</li>
              <li>Keep your QR code secure - it's unique to you</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Card */}
        <Card>
          <h2 className="text-xl font-semibold text-[#1F2937] mb-6 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#0B3060]" />
            Your Attendance QR Code
          </h2>

          <div className="flex flex-col items-center">
            {/* QR Code Display */}
            <div className="bg-white border-4 border-[#F7B34C] rounded-xl p-4 mb-4 shadow-md">
              <QRCodeGenerator 
                value={qrCodeData} 
                size={200} 
                showDownload={true}
                employeeName={userInfo.name}
              />
            </div>

            {/* User ID Display */}
            <div className="bg-[#0B3060] text-white px-6 py-2 rounded-full font-mono text-sm font-semibold">
              {userInfo.id}
            </div>
            <p className="text-xs text-[#6B7280] mt-2 text-center">
              Scan this QR code for attendance tracking
            </p>
          </div>
        </Card>

        {/* User Information Card */}
        <Card>
          <h2 className="text-xl font-semibold text-[#1F2937] mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-[#0B3060]" />
            Your Information
          </h2>

          <div className="space-y-4">
            {/* Name */}
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm text-[#6B7280] mb-1">Full Name</p>
              <p className="text-lg font-semibold text-[#1F2937]">{userInfo.name}</p>
            </div>

            {/* ID Number */}
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm text-[#6B7280] mb-1">ID Number</p>
              <div className="flex items-center gap-2">
                <IdCard className="w-5 h-5 text-[#0B3060]" />
                <p className="text-lg font-semibold text-[#0B3060]">{userInfo.id}</p>
              </div>
            </div>

            {/* Role */}
            <div className="border-b border-gray-200 pb-4">
              <p className="text-sm text-[#6B7280] mb-1">Role</p>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#F7B34C]" />
                <p className="text-lg font-semibold text-[#1F2937]">{userInfo.role}</p>
              </div>
            </div>

            {/* Department */}
            <div className="pb-4">
              <p className="text-sm text-[#6B7280] mb-1">Department</p>
              <p className="text-lg font-semibold text-[#1F2937]">{userInfo.department}</p>
            </div>

            {/* QR Code Usage Stats */}
            <div className="bg-gradient-to-r from-[#F7B34C]/10 to-[#F7B34C]/5 rounded-lg p-4 mt-6">
              <p className="text-sm font-semibold text-[#1F2937] mb-3">QR Code Features:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0B3060] mt-1.5"></div>
                  <p className="text-sm text-[#1F2937]">Unique to your account</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0B3060] mt-1.5"></div>
                  <p className="text-sm text-[#1F2937]">Works on all kiosks and scanners</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0B3060] mt-1.5"></div>
                  <p className="text-sm text-[#1F2937]">Automatically tracks time in/out</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0B3060] mt-1.5"></div>
                  <p className="text-sm text-[#1F2937]">Secure and encrypted</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Instructions Card */}
      <Card>
        <h2 className="text-xl font-semibold text-[#1F2937] mb-4">Attendance Instructions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-[#0B3060] rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="font-semibold text-[#1F2937] mb-2">Download QR Code</h3>
            <p className="text-sm text-[#6B7280]">
              Click the "Download QR Code" button to save your QR code to your device or print it for physical use
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-[#F7B34C] rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="font-semibold text-[#1F2937] mb-2">Scan at Kiosk</h3>
            <p className="text-sm text-[#6B7280]">
              When arriving at work, scan your QR code at any attendance kiosk or scanner
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="font-semibold text-[#1F2937] mb-2">Confirm Attendance</h3>
            <p className="text-sm text-[#6B7280]">
              The system will display your name and confirm your time in or time out
            </p>
          </div>
        </div>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            text-align: center;
            padding: 2rem;
          }
        }
      `}</style>

      {/* Hidden Print Area */}
      <div className="print-area hidden print:block">
        <h1 className="text-2xl font-bold text-[#1F2937] mb-2">Mnemosyne Attendance System</h1>
        <p className="text-lg text-[#6B7280] mb-6">{userInfo.role} QR Code</p>
        <div className="inline-block border-4 border-[#0B3060] rounded-2xl p-8 mb-4">
          <QRCodeGenerator 
            value={qrCodeData} 
            size={280} 
            showDownload={false}
            employeeName={userInfo.name}
          />
        </div>
        <div className="mt-4">
          <p className="text-lg font-semibold text-[#1F2937]">{userInfo.name}</p>
          <p className="text-md text-[#0B3060] font-bold">{userInfo.id}</p>
          <p className="text-sm text-[#6B7280]">{userInfo.department}</p>
        </div>
      </div>
    </div>
  );
}