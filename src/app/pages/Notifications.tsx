import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Bell, Calendar, Clock, CheckCircle, XCircle, AlertCircle, User, Shield, Filter as FilterIcon, RefreshCw, MessageSquare, X } from 'lucide-react';
import { leaveRequestApi, employeeApi } from '../../services/apiService';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { currentAdmin } from '../../data/mockData';

interface Notification {
  id: string;
  type: 'leave_request' | 'attendance_alert' | 'time-correction';
  title: string;
  message: string;
  details?: string;
  timestamp: string;
  status: 'unread' | 'read' | 'pending' | 'reviewed';
  employeeName?: string;
  employeeId?: string;
  employeeTeam?: string;
  leaveRequestId?: string;
  priority?: 'low' | 'medium' | 'high';
  rejectionReason?: string;
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAdminData, setCurrentAdminData] = useState<any>(currentAdmin);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Load admin data from localStorage
  const loadAdminData = () => {
    try {
      const profileData = localStorage.getItem('mnemosyne_admin_profile');
      const sessionData = localStorage.getItem('adminSession');
      const currentUser = localStorage.getItem('mnemosyne_current_user');

      let adminData = currentAdmin;

      if (profileData) {
        const profile = JSON.parse(profileData);
        console.log('✅ [Notifications] Loading from profile:', profile.department);
        adminData = {
          ...currentAdmin,
          name: profile.username || profile.full_name || currentAdmin.name,
          team: profile.department || currentAdmin.team,
        };
      } else if (sessionData) {
        const session = JSON.parse(sessionData);
        console.log('✅ [Notifications] Loading from session:', session.department);
        adminData = {
          ...currentAdmin,
          name: session.username || session.full_name || currentAdmin.name,
          team: session.department || currentAdmin.team,
        };
      } else if (currentUser) {
        const user = JSON.parse(currentUser);
        console.log('✅ [Notifications] Loading from user:', user.department);
        adminData = {
          ...currentAdmin,
          name: user.username || user.full_name || currentAdmin.name,
          team: user.department || currentAdmin.team,
        };
      }

      console.log('📌 [Notifications] Department:', adminData.team);
      setCurrentAdminData(adminData);
      return adminData;
    } catch (error) {
      console.error('❌ [Notifications] Error loading admin data:', error);
      return currentAdmin;
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      console.log('🔄 [Notifications] Storage changed, reloading...');
      loadAdminData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdate', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdate', handleStorageChange);
    };
  }, []);

  // Fetch leave requests from database
  const fetchNotifications = async () => {
    if (!isSupabaseConfigured) {
      // Use mock data if database not configured
      setNotifications([
        {
          id: 'NOT-001',
          type: 'leave_request',
          title: 'Sick Leave Request',
          message: 'Requesting sick leave for March 18-19, 2026',
          timestamp: '2026-03-14 02:15 PM',
          status: 'unread'
        },
        {
          id: 'NOT-002',
          type: 'attendance_alert',
          title: 'Late Arrival',
          message: 'Forgot to Time In',
          timestamp: '2026-03-15 09:30 AM',
          status: 'unread'
        },
      ]);
      return;
    }

    try {
      setIsLoading(true);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔔 FETCHING NOTIFICATIONS FOR TEAM LEADER');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Team Leader:', currentAdminData.name);
      console.log('Team:', currentAdminData.team);

      // Fetch leave requests
      const result = await leaveRequestApi.getAll();

      if (!result.success || !result.data) {
        throw new Error('Invalid response from server');
      }

      console.log(`✅ Fetched ${result.data.length} total leave requests`);

      // Filter to only team members and transform to notifications
      const teamNotifications: Notification[] = result.data
        .filter((lr: any) => {
          const employeeTeam = lr.employees?.teams?.name;
          return employeeTeam === currentAdminData.team;
        })
        .map((lr: any) => ({
          id: lr.id,
          type: 'leave_request' as const,
          employeeName: lr.employees?.full_name || 'Unknown Employee',
          employeeId: lr.employee_number,
          employeeTeam: lr.employees?.teams?.name,
          title: `${lr.leave_type} Request`,
          message: `${lr.reason}\nFrom: ${new Date(lr.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\nTo: ${new Date(lr.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          timestamp: new Date(lr.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          status: lr.status === 'pending' ? 'unread' : 'read',
          leaveRequestId: lr.id,
          priority: lr.priority || 'medium',
        }));

      console.log(`✅ Filtered to ${teamNotifications.length} notifications for ${currentAdminData.team} team`);
      
      // Log team member details
      teamNotifications.forEach((notif, index) => {
        console.log(`   ${index + 1}. ${notif.employeeName} (${notif.employeeId}) - ${notif.title}`);
      });

      setNotifications(teamNotifications);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [currentAdminData]);

  // Filter notifications by status
  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'pending') return notif.status === 'unread';
    if (filter === 'reviewed') return notif.status === 'read';
    return false;
  });

  const pendingCount = notifications.filter(n => n.status === 'unread').length;

  const handleApprove = (id: string) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, status: 'read' as const } : notif
    ));
    const notification = notifications.find(n => n.id === id);
    toast.success(`${notification?.title} has been approved for ${notification?.employeeName}`);
  };

  const handleRejectClick = (id: string) => {
    setSelectedNotification(id);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    if (selectedNotification) {
      setNotifications(notifications.map(notif => 
        notif.id === selectedNotification 
          ? { ...notif, status: 'read' as const, rejectionReason: rejectionReason } 
          : notif
      ));
      
      const notification = notifications.find(n => n.id === selectedNotification);
      toast.error(`${notification?.title} has been rejected for ${notification?.employeeName}`);
      
      setShowRejectModal(false);
      setSelectedNotification(null);
      setRejectionReason('');
    }
  };

  const handleCloseModal = () => {
    setShowRejectModal(false);
    setSelectedNotification(null);
    setRejectionReason('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Notifications</h1>
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <FilterIcon className="w-4 h-4" />
          <span>Showing notifications from <strong className="text-[#0B3060]">{currentAdminData.team}</strong> team members only</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-semibold ml-2">
                {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Team Info Banner */}
      <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-xl p-4 mb-6 shadow-md">
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 bg-white/20 rounded-lg">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-white/80">Team Leader Notifications</p>
            <p className="font-bold text-lg">{currentAdminData.name} - {currentAdminData.team} Team</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-white/80">Total Notifications</p>
              <p className="font-bold text-2xl">{notifications.length}</p>
            </div>
            <button
              onClick={fetchNotifications}
              disabled={isLoading}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh notifications"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#6B7280]">Filter by Status:</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#0B3060] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-[#0B3060] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('reviewed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'reviewed'
                ? 'bg-[#0B3060] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Reviewed
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredNotifications.map((notification) => (
          <Card key={notification.id}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                notification.type === 'time-correction' 
                  ? 'bg-blue-100' 
                  : 'bg-purple-100'
              }`}>
                {notification.type === 'time-correction' ? (
                  <MessageSquare className={`w-6 h-6 ${
                    notification.type === 'time-correction' 
                      ? 'text-blue-600' 
                      : 'text-purple-600'
                  }`} />
                ) : (
                  <Calendar className="w-6 h-6 text-purple-600" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-[#1F2937]">{notification.message}</h3>
                    <p className="text-sm text-gray-600">
                      {notification.employeeName} ({notification.employeeId})
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    notification.status === 'pending'
                      ? 'bg-[#FEF9C3] text-[#CA8A04]'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {notification.status === 'pending' ? 'Pending' : 'Reviewed'}
                  </span>
                </div>

                <p className="text-sm text-[#1F2937] mb-2">{notification.details}</p>
                
                <p className="text-xs text-gray-500 mb-3">
                  {notification.timestamp}
                </p>

                {/* Show rejection reason if exists */}
                {notification.rejectionReason && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-600">{notification.rejectionReason}</p>
                  </div>
                )}

                {notification.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(notification.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectClick(notification.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {filteredNotifications.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notifications found</p>
            </div>
          </Card>
        )}
      </div>

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#1F2937]">Rejection Reason</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting this request. The employee will see this message.
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] min-h-[120px] resize-none"
                autoFocus
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}