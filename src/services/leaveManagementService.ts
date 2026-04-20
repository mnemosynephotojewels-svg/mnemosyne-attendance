/**
 * MNEMOSYNE LEAVE MANAGEMENT SERVICE
 * Handles all leave request operations including paid/unpaid leave workflow
 */

import { supabase } from '../lib/supabaseClient';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface LeaveRequest {
  id: string;
  employee_number: string;
  leave_type: 'sick_leave' | 'vacation_leave' | 'emergency_leave' | 'personal_leave';
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  is_paid: boolean;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  attachment_url?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalanceHistory {
  id: string;
  employee_number: string;
  leave_request_id?: string;
  change_amount: number;
  balance_before: number;
  balance_after: number;
  change_type: 'annual_allocation' | 'paid_leave_approved' | 'unpaid_leave_approved' | 'leave_rejected' | 'manual_adjustment';
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface LeaveApprovalResult {
  success: boolean;
  message: string;
  is_paid?: boolean;
  days_deducted?: number;
  new_balance?: number;
  attendance_status?: string;
}

export interface EmployeeLeaveBalance {
  employee_number: string;
  full_name: string;
  leave_balance: number;
  pending_requests: number;
  approved_paid: number;
  approved_unpaid: number;
  total_paid_days_taken: number;
  total_unpaid_days_taken: number;
}

// ============================================
// LEAVE REQUEST SERVICE
// ============================================

export class LeaveManagementService {
  /**
   * Get employee's current leave balance
   */
  static async getEmployeeBalance(employeeNumber: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('leave_balance')
        .eq('employee_number', employeeNumber)
        .single();

      if (error) throw error;

      return {
        success: true,
        balance: data.leave_balance || 0
      };
    } catch (error: any) {
      console.error('Error fetching employee balance:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Submit a new leave request
   */
  static async submitLeaveRequest(request: {
    employee_number: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
    attachment_url?: string;
  }): Promise<{ success: boolean; data?: LeaveRequest; error?: string; warning?: string }> {
    try {
      // Calculate business days (excluding weekends)
      const totalDays = this.calculateBusinessDays(request.start_date, request.end_date);

      if (totalDays <= 0) {
        return {
          success: false,
          error: 'Invalid date range. End date must be after start date and include at least one business day.'
        };
      }

      // Get current balance to show warning
      const balanceResult = await this.getEmployeeBalance(request.employee_number);
      const currentBalance = balanceResult.balance || 0;

      let warning: string | undefined;
      if (currentBalance === 0) {
        warning = '⚠️ Your paid leave balance is exhausted. If approved, this will be marked as UNPAID LEAVE (Absent).';
      } else if (totalDays > currentBalance) {
        warning = `⚠️ Requesting ${totalDays} days but only ${currentBalance} paid days remaining. The excess (${totalDays - currentBalance} days) will be unpaid if approved.`;
      }

      // Insert leave request
      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          employee_number: request.employee_number,
          leave_type: request.leave_type,
          start_date: request.start_date,
          end_date: request.end_date,
          total_days: totalDays,
          reason: request.reason,
          attachment_url: request.attachment_url,
          status: 'pending',
          is_paid: currentBalance >= totalDays, // Pre-calculate expected status
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as LeaveRequest,
        warning
      };
    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Approve a leave request (handles both paid and unpaid logic)
   */
  static async approveLeaveRequest(
    leaveRequestId: string,
    approvedBy: string
  ): Promise<LeaveApprovalResult> {
    try {
      // Call the database stored procedure
      const { data, error } = await supabase.rpc('approve_leave_request', {
        p_leave_request_id: leaveRequestId,
        p_approved_by: approvedBy
      });

      if (error) throw error;

      // The stored procedure returns a JSON result
      return data as LeaveApprovalResult;
    } catch (error: any) {
      console.error('Error approving leave request:', error);
      return {
        success: false,
        message: `Failed to approve leave request: ${error.message}`
      };
    }
  }

  /**
   * Reject a leave request
   */
  static async rejectLeaveRequest(
    leaveRequestId: string,
    rejectedBy: string,
    rejectionReason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.rpc('reject_leave_request', {
        p_leave_request_id: leaveRequestId,
        p_rejected_by: rejectedBy,
        p_rejection_reason: rejectionReason
      });

      if (error) throw error;

      return data as { success: boolean; message: string };
    } catch (error: any) {
      console.error('Error rejecting leave request:', error);
      return {
        success: false,
        message: `Failed to reject leave request: ${error.message}`
      };
    }
  }

  /**
   * Get all leave requests (with filters)
   */
  static async getLeaveRequests(filters?: {
    employee_number?: string;
    status?: 'pending' | 'approved' | 'rejected';
    team?: string;
  }): Promise<{ success: boolean; data?: LeaveRequest[]; error?: string }> {
    try {
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          employees (
            full_name,
            teams (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (filters?.employee_number) {
        query = query.eq('employee_number', filters.employee_number);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by team if specified (client-side filter)
      let filteredData = data;
      if (filters?.team) {
        filteredData = data.filter((request: any) => 
          request.employees?.teams?.name === filters.team
        );
      }

      return {
        success: true,
        data: filteredData as LeaveRequest[]
      };
    } catch (error: any) {
      console.error('Error fetching leave requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get leave balance history for an employee
   */
  static async getBalanceHistory(employeeNumber: string): Promise<{ success: boolean; data?: LeaveBalanceHistory[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('leave_balance_history')
        .select('*')
        .eq('employee_number', employeeNumber)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data as LeaveBalanceHistory[]
      };
    } catch (error: any) {
      console.error('Error fetching balance history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get employee leave summary (using the view)
   */
  static async getEmployeeLeaveSummary(employeeNumber?: string): Promise<{ success: boolean; data?: EmployeeLeaveBalance[]; error?: string }> {
    try {
      let query = supabase
        .from('employee_leave_summary')
        .select('*');

      if (employeeNumber) {
        query = query.eq('employee_number', employeeNumber);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data as EmployeeLeaveBalance[]
      };
    } catch (error: any) {
      console.error('Error fetching leave summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reset annual leave balances (typically run at year start)
   */
  static async resetAnnualBalances(): Promise<{ success: boolean; message: string; employees_updated?: number }> {
    try {
      const { data, error } = await supabase.rpc('reset_annual_leave_balances');

      if (error) throw error;

      return data as { success: boolean; message: string; employees_updated?: number };
    } catch (error: any) {
      console.error('Error resetting annual balances:', error);
      return {
        success: false,
        message: `Failed to reset balances: ${error.message}`
      };
    }
  }

  /**
   * Calculate business days between two dates (excluding weekends)
   */
  static calculateBusinessDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;
    
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Exclude Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  /**
   * Check if employee can submit leave request
   */
  static async canSubmitLeave(employeeNumber: string, requestedDays: number): Promise<{
    can_submit: boolean;
    will_be_paid: boolean;
    paid_days: number;
    unpaid_days: number;
    current_balance: number;
    message: string;
  }> {
    try {
      const balanceResult = await this.getEmployeeBalance(employeeNumber);
      
      if (!balanceResult.success) {
        throw new Error(balanceResult.error);
      }

      const currentBalance = balanceResult.balance || 0;

      // Employee can always submit, but we inform them about paid/unpaid status
      if (currentBalance === 0) {
        return {
          can_submit: true,
          will_be_paid: false,
          paid_days: 0,
          unpaid_days: requestedDays,
          current_balance: currentBalance,
          message: 'Your paid leave balance is exhausted. This request will be marked as UNPAID LEAVE if approved.'
        };
      } else if (requestedDays > currentBalance) {
        return {
          can_submit: true,
          will_be_paid: false, // Partially paid
          paid_days: currentBalance,
          unpaid_days: requestedDays - currentBalance,
          current_balance: currentBalance,
          message: `You have ${currentBalance} paid days remaining. ${currentBalance} days will be paid, and ${requestedDays - currentBalance} days will be unpaid if approved.`
        };
      } else {
        return {
          can_submit: true,
          will_be_paid: true,
          paid_days: requestedDays,
          unpaid_days: 0,
          current_balance: currentBalance,
          message: `This leave request will be fully paid if approved. You will have ${currentBalance - requestedDays} paid days remaining.`
        };
      }
    } catch (error: any) {
      console.error('Error checking leave eligibility:', error);
      return {
        can_submit: false,
        will_be_paid: false,
        paid_days: 0,
        unpaid_days: requestedDays,
        current_balance: 0,
        message: `Error checking eligibility: ${error.message}`
      };
    }
  }

  /**
   * Get pending leave requests count for admin dashboard
   */
  static async getPendingRequestsCount(team?: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      // Simplified query without joins to avoid foreign key relationship errors
      let query = supabase
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Note: Team filtering would require manual filtering if needed
      // Since we removed the join, team filtering is not available in this query

      const { count, error } = await query;

      if (error) throw error;

      return {
        success: true,
        count: count || 0
      };
    } catch (error: any) {
      console.error('Error counting pending requests:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default LeaveManagementService;
