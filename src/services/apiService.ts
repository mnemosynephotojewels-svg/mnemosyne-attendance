/**
 * API Service
 * Central service for all HTTP requests to the backend server
 */

import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

// Helper function for making API requests
async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    ...options.headers,
  };

  try {
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`📡 API Response: ${response.status} ${response.statusText}`);

    // Try to parse JSON response
    let data;
    try {
      // First get the raw text to debug
      const responseText = await response.text();
      console.log('📄 Raw response (first 200 chars):', responseText.substring(0, 200));
      
      // Try to parse it as JSON
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      throw new Error(`Invalid JSON response from ${endpoint}`);
    }

    if (!response.ok) {
      const errorMsg = data.error || `API request failed with status ${response.status}`;
      console.error(`❌ API Error (${response.status}):`, errorMsg);
      throw new Error(errorMsg);
    }

    console.log('✅ API Request successful');
    return data;
  } catch (error: any) {
    // Network error (Failed to fetch)
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('❌ Network Error: Unable to reach the server');
      console.error('   URL:', url);
      console.error('   This could be due to:');
      console.error('   - Server is not running');
      console.error('   - CORS issues');
      console.error('   - Network connectivity problems');
    } else {
      console.error(`❌ API request error for ${endpoint}:`, error);
    }
    throw error;
  }
}

// ============================================
// ATTENDANCE API
// ============================================

export const attendanceApi = {
  /**
   * Record attendance (Time In/Out)
   */
  recordAttendance: async (params: {
    employee_number: string;
    action: 'IN' | 'OUT';
    timestamp?: string;
  }) => {
    return apiRequest('/attendance/record', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Get attendance records
   */
  getRecords: async (params?: {
    employee_number?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.employee_number) queryParams.append('employee_number', params.employee_number);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    const query = queryParams.toString();
    return apiRequest(`/attendance/records${query ? `?${query}` : ''}`);
  },

  /**
   * Manually update attendance record (Admin override)
   */
  updateRecord: async (params: {
    employee_number: string;
    attendance_date: string;
    check_in_time?: string | null;
    check_out_time?: string | null;
    status?: 'present' | 'late' | 'absent';
    notes?: string;
    updated_by: string;
  }) => {
    return apiRequest('/attendance/update', {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  },

  /**
   * Mark employee as absent (Auto or Manual)
   */
  markAbsent: async (params: {
    employee_number: string;
    attendance_date: string;
    reason: 'grace_period_expired' | 'manual_override';
    marked_by?: string;
  }) => {
    return apiRequest('/attendance/mark-absent', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};

// ============================================
// LEAVE REQUEST API
// ============================================

export const leaveRequestApi = {
  /**
   * Create a new leave request
   */
  create: async (params: {
    employee_number: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
  }) => {
    return apiRequest('/leave-requests/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Get leave requests
   */
  getAll: async (params?: {
    employee_number?: string;
    status?: 'pending' | 'approved' | 'rejected';
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.employee_number) queryParams.append('employee_number', params.employee_number);
    if (params?.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    return apiRequest(`/leave-requests${query ? `?${query}` : ''}`);
  },

  /**
   * Approve or reject a leave request
   */
  updateStatus: async (id: string, params: {
    status: 'approved' | 'rejected';
    reviewed_by: string;
  }) => {
    return apiRequest(`/leave-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  },

  /**
   * Delete a leave request
   */
  delete: async (id: string) => {
    return apiRequest(`/leave-requests/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get leave balance for an employee
   */
  getBalance: async (employee_number: string) => {
    return apiRequest(`/employees/${employee_number}/leave-balance`, {
      method: 'GET',
    });
  },
};

// ============================================
// SCHEDULE API
// ============================================

export const scheduleApi = {
  /**
   * Get schedules
   */
  getAll: async (params?: {
    employee_number?: string;
    admin_number?: string;
    start_date?: string;
    end_date?: string;
    user_type?: 'employee' | 'admin';
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.employee_number) queryParams.append('employee_number', params.employee_number);
    if (params?.admin_number) queryParams.append('admin_number', params.admin_number);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.user_type) queryParams.append('user_type', params.user_type);

    const query = queryParams.toString();
    return apiRequest(`/schedules${query ? `?${query}` : ''}`);
  },

  /**
   * Create or update a schedule
   */
  upsert: async (params: {
    employee_number?: string;
    admin_number?: string;
    schedule_date: string;
    shift_start?: string | null;
    shift_end?: string | null;
    is_day_off: boolean;
    user_type?: 'employee' | 'admin';
    grace_period?: number;
  }) => {
    return apiRequest('/schedules/upsert', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};

// ============================================
// EMPLOYEE API
// ============================================

export const employeeApi = {
  /**
   * Get all employees
   */
  getAll: async () => {
    return apiRequest('/employees');
  },

  /**
   * Create a new employee
   */
  create: async (data: {
    full_name: string;
    email: string;
    phone_number: string;
    position: string;
    team_id: number;
    join_date: string;
    profile_picture_url?: string;
  }) => {
    return apiRequest('/employees/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an employee
   */
  update: async (employee_number: string, data: any) => {
    return apiRequest(`/employees/${employee_number}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete an employee
   */
  delete: async (employee_number: string) => {
    return apiRequest(`/employees/${employee_number}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// ADMIN API
// ============================================

export const adminApi = {
  /**
   * Get all admins
   */
  getAll: async () => {
    return apiRequest('/admins');
  },

  /**
   * Update an admin
   */
  update: async (admin_number: string, data: any) => {
    return apiRequest(`/admins/${admin_number}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete an admin
   */
  delete: async (admin_number: string) => {
    return apiRequest(`/admins/${admin_number}`, {
      method: 'DELETE',
    });
  },

  /**
   * Sync employee team_id assignments from team names
   */
  syncTeamAssignments: async () => {
    return apiRequest('/sync-team-assignments', {
      method: 'POST',
    });
  },
};

// ============================================
// NOTIFICATION API
// ============================================

export const notificationApi = {
  /**
   * Get notifications for a user
   */
  getForUser: async (user_number: string) => {
    return apiRequest(`/notifications/${user_number}`);
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id: string) => {
    return apiRequest(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },
};