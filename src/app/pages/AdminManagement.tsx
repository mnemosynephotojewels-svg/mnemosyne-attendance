import React, { useState, useEffect } from 'react';
import { getAllAdmins, Admin } from '../../services/adminService';
import { Shield, Search, Filter, UserCog, Mail, Phone, Building, Key, Eye, EyeOff, Copy, Users, QrCode, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { QRCodeGenerator } from '../components/QRCodeGenerator';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function AdminManagement() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminTeams, setAdminTeams] = useState<Record<string, string>>({});
  const [adminAttendanceStatus, setAdminAttendanceStatus] = useState<Record<string, 'online' | 'offline'>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [showQRCodes, setShowQRCodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchAdmins = async () => {
      setIsLoading(true);
      const data = await getAllAdmins();
      setAdmins(data);
      
      // Fetch team information for each admin if Supabase is configured
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: adminsData, error } = await supabase
            .from('admins')
            .select('admin_number, department');
          
          if (!error && adminsData) {
            const teamMap: Record<string, string> = {};
            adminsData.forEach((item: any) => {
              if (item.department) {
                teamMap[item.admin_number] = item.department;
              }
            });
            setAdminTeams(teamMap);
          }
        } catch (error) {
          console.error('Error fetching admin teams:', error);
        }
      }

      // 🆕 Fetch today's attendance for all admins to determine online/offline status
      try {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const attendanceResponse = await fetch(
          `${API_BASE_URL}/attendance/records?start_date=${startOfDay}&end_date=${endOfDay}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );

        if (attendanceResponse.ok) {
          const attendanceResult = await attendanceResponse.json();
          const todayAttendance = attendanceResult.success ? attendanceResult.data : [];
          
          // Create a map of admin_number -> status (online/offline)
          const statusMap: Record<string, 'online' | 'offline'> = {};
          
          // Check which admins have clocked in today (have an "IN" record)
          const adminNumbers = new Set<string>();
          todayAttendance.forEach((record: any) => {
            if ((record.type === 'IN' || record.action === 'IN') && record.admin_number) {
              adminNumbers.add(record.admin_number);
            }
          });
          
          // Set status for each admin
          data.forEach((admin) => {
            statusMap[admin.id] = adminNumbers.has(admin.id) ? 'online' : 'offline';
          });
          
          setAdminAttendanceStatus(statusMap);
          console.log('📊 Admin attendance status loaded:', statusMap);
        }
      } catch (error) {
        console.error('Error fetching admin attendance:', error);
      }
      
      setIsLoading(false);
    };

    fetchAdmins();
  }, []);

  // Toggle password visibility for specific admin
  const togglePasswordVisibility = (adminId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [adminId]: !prev[adminId]
    }));
  };

  // Copy credentials to clipboard
  const copyCredentials = (admin: Admin) => {
    const credentials = `🔐 ADMIN LOGIN CREDENTIALS\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nName: ${admin.name}\nAdmin ID: ${admin.id}\n\nUSERNAME: ${admin.username}\nPASSWORD: ${admin.password || 'Not set'}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nLogin URL: /admin/login`;
    
    // Try modern Clipboard API first, fallback to legacy method
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(credentials)
        .then(() => {
          toast.success('Credentials copied to clipboard!');
        })
        .catch(() => {
          fallbackCopyToClipboard(credentials);
        });
    } else {
      fallbackCopyToClipboard(credentials);
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success('Credentials copied to clipboard!');
      } else {
        toast.error('Failed to copy credentials');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      toast.error('Failed to copy credentials');
    }

    document.body.removeChild(textArea);
  };

  // Filter admins based on search
  const filteredAdmins = admins.filter(admin => 
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: 'admin' | 'super-admin') => {
    return role === 'super-admin' 
      ? 'bg-purple-100 text-purple-800 border-purple-300'
      : 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const getAccessBadgeColor = (accessLevel: 'standard' | 'full') => {
    return accessLevel === 'full'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-[#0B3060]" />
          <div>
            <h1 className="text-3xl font-bold text-[#1F2937]">Admin Management</h1>
            <p className="text-gray-600 text-sm mt-1">View and manage all administrator accounts (Team Leaders & Super Admins)</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-[#0B3060]">{admins.length}</p>
          <p className="text-sm text-gray-600">Total Admins</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="bg-[#F9FAFB] px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1F2937]">Administrator List</h2>
            
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search admin..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3060] focus:border-transparent w-64"
                />
              </div>

              {/* Filter Button */}
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-[#1F2937] hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B3060] mx-auto mb-4"></div>
            <p className="text-[#6B7280]">Loading administrators...</p>
          </div>
        ) : (
          <>
            {/* Admin Cards Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-[#0B3060] hover:shadow-md transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] flex items-center justify-center text-white font-bold text-lg border-2 border-[#F7B34C] flex-shrink-0">
                      {admin.avatar ? (
                        <img src={admin.avatar} alt={admin.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        admin.name.split(' ').map(n => n[0]).join('')
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-[#1F2937] truncate">
                        {admin.name}
                      </h3>
                      <p className="text-xs font-mono text-[#6B7280] mb-1">{admin.id}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeColor(admin.role)}`}>
                          {admin.role === 'super-admin' ? 'Super Admin' : 'Admin'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getAccessBadgeColor(admin.accessLevel)}`}>
                          {admin.accessLevel === 'full' ? 'Full Access' : 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                      <span className="text-[#1F2937] truncate">{admin.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                      <span className="text-[#1F2937]">{admin.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                      <span className="text-[#1F2937]">{admin.department}</span>
                    </div>
                    {adminTeams[admin.id] && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-[#6B7280] flex-shrink-0" />
                        <span className="text-[#1F2937] font-medium">
                          {adminTeams[admin.id]} Team
                          {admin.role === 'admin' && <span className="text-[#6B7280] text-xs ml-1"> (Team Leader)</span>}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#6B7280]">Attendance Status:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        adminAttendanceStatus[admin.id] === 'online'
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-gray-100 text-gray-800 border border-gray-300'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          adminAttendanceStatus[admin.id] === 'online' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                        }`}></span>
                        {adminAttendanceStatus[admin.id] === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Login Credentials Section */}
                  <div className="mt-4 pt-4 border-t-2 border-amber-200">
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Key className="w-4 h-4 text-amber-700" />
                        <h4 className="text-sm font-bold text-amber-900">Login Credentials</h4>
                      </div>
                      
                      <div className="space-y-2">
                        {/* Username */}
                        <div>
                          <p className="text-xs text-amber-800 font-semibold mb-1">USERNAME</p>
                          <div className="bg-white px-3 py-2 rounded border border-amber-300">
                            <p className="text-sm font-mono font-bold text-[#0B3060] break-all">
                              {admin.username}
                            </p>
                          </div>
                        </div>

                        {/* Password */}
                        <div>
                          <p className="text-xs text-amber-800 font-semibold mb-1">PASSWORD</p>
                          <div className="bg-white px-3 py-2 rounded border border-amber-300 flex items-center justify-between gap-2">
                            <p className="text-sm font-mono font-bold text-[#0B3060] break-all">
                              {visiblePasswords[admin.id] ? (admin.password || 'Not set') : '••••••••••'}
                            </p>
                            <button
                              onClick={() => togglePasswordVisibility(admin.id)}
                              className="flex-shrink-0 text-amber-700 hover:text-amber-900 transition-colors"
                            >
                              {visiblePasswords[admin.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Copy Button */}
                        <button
                          onClick={() => copyCredentials(admin)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#F7B34C] hover:bg-[#F7B34C]/90 text-[#0B3060] rounded-lg font-semibold text-sm transition-colors mt-3"
                        >
                          <Copy className="w-4 h-4" />
                          Copy Credentials
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Attendance QR Code Section */}
                  <div className="mt-4 pt-4 border-t-2 border-blue-200">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <QrCode className="w-4 h-4 text-blue-700" />
                        <h4 className="text-sm font-bold text-blue-900">Attendance QR Code</h4>
                      </div>
                      
                      <div className="space-y-3">
                        {/* QR Code Toggle Button */}
                        <button
                          onClick={() => setShowQRCodes(prev => ({
                            ...prev,
                            [admin.id]: !prev[admin.id]
                          }))}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#0B3060] hover:bg-[#0B3060]/90 text-white rounded-lg font-semibold text-sm transition-colors"
                        >
                          <QrCode className="w-4 h-4" />
                          {showQRCodes[admin.id] ? 'Hide QR Code' : 'Show QR Code'}
                        </button>

                        {/* QR Code Display */}
                        {showQRCodes[admin.id] && (
                          <div className="bg-white rounded-lg p-4 border border-blue-300">
                            <div className="flex flex-col items-center">
                              <p className="text-xs text-blue-800 font-semibold mb-3 text-center">
                                Scan this QR code at kiosk for attendance
                              </p>
                              <QRCodeGenerator
                                value={JSON.stringify({
                                  type: 'admin',
                                  id: admin.id,
                                  name: admin.name,
                                  department: admin.department,
                                  timestamp: new Date().toISOString()
                                })}
                                size={160}
                                showDownload={true}
                                employeeName={admin.name}
                              />
                              <p className="text-xs text-[#6B7280] mt-3 text-center">
                                Use this QR code for Time In / Time Out
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredAdmins.length === 0 && (
              <div className="text-center py-12">
                <UserCog className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-[#6B7280] text-lg font-medium">No administrators found</p>
                <p className="text-[#6B7280] text-sm">Try adjusting your search criteria</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}