import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Bell, Calendar, Clock, CheckCircle, XCircle, AlertCircle, User, Shield, Filter as FilterIcon, RefreshCw, MessageSquare, X, ChevronDown, Users } from 'lucide-react';
import { leaveRequestApi } from '../../services/apiService';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'leave_request' | 'attendance_alert' | 'time-correction';
  title: string;
  message: string;
  details?: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  employeeName?: string;
  employeeId?: string;
  employeeTeam?: string;
  leaveRequestId?: string;
  priority?: 'low' | 'medium' | 'high';
  rejectionReason?: string;
}

interface Department {
  id: string;
  name: string;
  count: number;
}

export function SuperAdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch leave requests from database
  const fetchNotifications = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔔 FETCHING NOTIFICATIONS FOR SUPER ADMIN');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Fetch all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      if (teamsError) {
        throw new Error(`Failed to fetch teams: ${teamsError.message}`);
      }

      console.log('✅ Teams fetched:', teamsData?.length || 0);

      // Fetch leave requests
      const result = await leaveRequestApi.getAll();

      if (!result.success || !result.data) {
        throw new Error('Invalid response from server');
      }

      console.log(`✅ Fetched ${result.data.length} total leave requests`);

      // Transform to notifications
      const allNotifications: Notification[] = result.data.map((lr: any) => ({
        id: lr.id,
        type: 'leave_request' as const,
        employeeName: lr.employees?.full_name || 'Unknown Employee',
        employeeId: lr.employee_number,
        employeeTeam: lr.employees?.teams?.name || 'Unknown',
        title: `${lr.leave_type} Request`,
        message: `${lr.reason}\nFrom: ${new Date(lr.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\nTo: ${new Date(lr.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        timestamp: new Date(lr.created_at).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: lr.status,
        leaveRequestId: lr.id,
        priority: lr.priority || 'medium',
      }));

      setNotifications(allNotifications);

      // Calculate departments with notification counts
      const departmentsWithNotifs = teamsData
        .map(team => ({
          id: team.id,
          name: team.name,
          count: allNotifications.filter(n => n.employeeTeam === team.name).length
        }))
        .filter(dept => dept.count > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setDepartments(departmentsWithNotifs);

      console.log('✅ Notifications loaded for Super Admin');
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
  }, []);

  // Filter notifications by department and status
  const filteredNotifications = notifications.filter(notif => {
    const matchesDepartment = selectedDepartment === 'all' || notif.employeeTeam === selectedDepartment;
    const matchesStatus = statusFilter === 'all' || notif.status === statusFilter;
    return matchesDepartment && matchesStatus;
  });

  const pendingCount = notifications.filter(n => n.status === 'pending').length;
  const approvedCount = notifications.filter(n => n.status === 'approved').length;
  const rejectedCount = notifications.filter(n => n.status === 'rejected').length;

  const handleApprove = async (id: string) => {
    if (!isSupabaseConfigured) {
      toast.error('Database not configured');
      return;
    }

    try {
      await leaveRequestApi.updateStatus(id, {
        status: 'approved',
        reviewed_by: 'SUPER-ADMIN'
      });

      setNotifications(notifications.map(notif => 
        notif.id === id ? { ...notif, status: 'approved' as const } : notif
      ));

      const notification = notifications.find(n => n.id === id);
      toast.success(`${notification?.title} has been approved for ${notification?.employeeName}`);
      console.log('✅ Leave request approved and saved to database');
    } catch (error) {
      console.error('❌ Error approving leave request:', error);
      toast.error('Failed to approve leave request');
    }
  };

  const handleRejectClick = (id: string) => {
    setSelectedNotification(id);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    if (!selectedNotification || !isSupabaseConfigured) {
      return;
    }

    try {
      await leaveRequestApi.updateStatus(selectedNotification, {
        status: 'rejected',
        reviewed_by: 'SUPER-ADMIN'
      });

      setNotifications(notifications.map(notif => 
        notif.id === selectedNotification 
          ? { ...notif, status: 'rejected' as const, rejectionReason: rejectionReason } 
          : notif
      ));
      
      const notification = notifications.find(n => n.id === selectedNotification);
      toast.error(`${notification?.title} has been rejected for ${notification?.employeeName}`);
      
      setShowRejectModal(false);
      setSelectedNotification(null);
      setRejectionReason('');
      console.log('✅ Leave request rejected and saved to database');
    } catch (error) {
      console.error('❌ Error rejecting leave request:', error);
      toast.error('Failed to reject leave request');
    }
  };

  const handleCloseModal = () => {
    setShowRejectModal(false);
    setSelectedNotification(null);
    setRejectionReason('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1F2937] mb-2">Notifications</h1>
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <Shield className="w-4 h-4" />
          <span>Super Administrator - Managing all department notifications</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-semibold ml-2">
                {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Super Admin Info Banner */}
      <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-xl p-4 mb-6 shadow-md">
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 bg-white/20 rounded-lg">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-white/80">Super Administrator Notifications</p>
            <p className="font-bold text-lg">All Departments</p>
          </div>
          <div className="ml-auto flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-white/80">Pending</p>
              <p className="font-bold text-2xl">{pendingCount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/80">Approved</p>
              <p className="font-bold text-2xl">{approvedCount}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/80">Rejected</p>
              <p className="font-bold text-2xl">{rejectedCount}</p>
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

      {/* Department Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <FilterIcon className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm font-semibold text-[#1F2937]">Filter by Department:</span>
        </div>

        {isLoading ? (
          <div className="h-10 w-full bg-gray-200 animate-pulse rounded-lg"></div>
        ) : (
          <div className="relative">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/20 focus:border-[#0B3060] transition-colors text-sm font-medium appearance-none bg-white cursor-pointer"
            >
              <option value="all">
                All Departments ({notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'})
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name} ({dept.count} {dept.count === 1 ? 'notification' : 'notifications'})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280] pointer-events-none" />
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#6B7280]">Filter by Status:</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#0B3060] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-[#0B3060] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'approved'
                ? 'bg-[#0B3060] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === 'rejected'
                ? 'bg-[#0B3060] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No notifications found</p>
              <p className="text-sm text-gray-400 mt-1">
                {selectedDepartment === 'all' 
                  ? 'Leave request notifications will appear here' 
                  : `No notifications from ${selectedDepartment}`}
              </p>
            </div>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
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
                      <h3 className="font-semibold text-[#1F2937]">{notification.title}</h3>
                      <p className="text-sm text-gray-600">
                        {notification.employeeName} ({notification.employeeId})
                      </p>
                      <p className="text-xs text-[#0B3060] font-medium mt-1">
                        Department: {notification.employeeTeam}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      notification.status === 'pending'
                        ? 'bg-[#FEF9C3] text-[#CA8A04]'
                        : notification.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                    </span>
                  </div>

                  <p className="text-sm text-[#1F2937] mb-2 whitespace-pre-line">{notification.message}</p>
                  
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
          ))
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
