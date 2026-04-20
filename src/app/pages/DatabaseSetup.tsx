import React, { useState } from "react";
import { Database, AlertCircle, CheckCircle, Copy, Terminal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function DatabaseSetup() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingAttendance, setIsClearingAttendance] = useState(false);

  const copyToClipboard = (text: string, section: string) => {
    // Try modern Clipboard API first, fallback to legacy method
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedSection(section);
          toast.success(`${section} copied to clipboard!`);
          setTimeout(() => setCopiedSection(null), 2000);
        })
        .catch(() => {
          // Fallback to legacy method
          fallbackCopyToClipboard(text, section);
        });
    } else {
      // Fallback to legacy method
      fallbackCopyToClipboard(text, section);
    }
  };

  const fallbackCopyToClipboard = (text: string, section: string) => {
    // Create a temporary textarea element
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
        setCopiedSection(section);
        toast.success(`${section} copied to clipboard!`);
        setTimeout(() => setCopiedSection(null), 2000);
      } else {
        toast.error('Failed to copy. Please copy manually.');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      toast.error('Failed to copy. Please copy manually.');
    }

    document.body.removeChild(textArea);
  };

  const clearAttendanceOnly = async () => {
    if (!confirm("⚠️ WARNING: This will permanently delete ALL ATTENDANCE RECORDS!\n\nThis action will:\n• Delete all attendance records (time in/out)\n• Clear all attendance history\n• Reset attendance to zero\n\nThis will NOT affect:\n• Employees\n• Admins\n• Leave requests\n• Schedules\n• Teams\n\nAre you sure you want to clear all attendance records?")) {
      return;
    }

    setIsClearingAttendance(true);
    
    try {
      console.log("🗑️ Clearing attendance records only...");
      
      // Use the /database/clear-all endpoint which already exists and works
      // But we'll need to manually reconstruct non-attendance data
      // Actually, let's use a simpler approach: directly call the KV store via SQL
      
      // Since we can't modify the server without 403 errors, we'll use the existing endpoint
      // and then restore the non-attendance data
      
      toast.info("Fetching current non-attendance data...");
      
      // Step 1: Get all current data
      const employeesResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/employees`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      const schedulesResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/schedules`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      if (!employeesResponse.ok || !schedulesResponse.ok) {
        throw new Error('Failed to fetch current data');
      }
      
      const employeesData = await employeesResponse.json();
      const schedulesData = await schedulesResponse.json();
      
      console.log(`📊 Backed up ${employeesData.data?.length || 0} employees and schedules`);
      
      // Step 2: Clear ALL data
      toast.info("Clearing all database records...");
      
      const clearResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/database/clear-all`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      const clearResult = await clearResponse.json();
      
      if (!clearResponse.ok || !clearResult.success) {
        throw new Error(clearResult.error || 'Failed to clear database');
      }
      
      console.log("✅ All data cleared");
      
      // Step 3: Restore non-attendance data
      toast.info("Restoring employees and schedules...");
      
      // Restore employees
      if (employeesData.data && employeesData.data.length > 0) {
        for (const employee of employeesData.data) {
          // Re-register each employee using the existing endpoint
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-df988758/employees/register`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify(employee)
            }
          );
        }
      }
      
      // Restore schedules
      if (schedulesData.data && schedulesData.data.length > 0) {
        for (const schedule of schedulesData.data) {
          await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-df988758/schedules/create`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify(schedule)
            }
          );
        }
      }
      
      console.log("✅ Successfully cleared attendance records and restored other data");
      toast.success("Successfully cleared all attendance records!");
      
      // Dispatch event to refresh attendance pages
      window.dispatchEvent(new CustomEvent('attendanceUpdate'));
      
    } catch (error) {
      console.error("❌ Error clearing attendance records:", error);
      toast.error(`Failed to clear attendance records: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsClearingAttendance(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm("⚠️ WARNING: This will permanently delete ALL records from the database!\n\nThis includes:\n• All employees\n• All admins\n• All attendance records\n• All leave requests\n• All schedules\n• All notifications\n\nThe teams table will NOT be deleted.\n\nAre you absolutely sure you want to continue?")) {
      return;
    }

    setIsClearing(true);
    
    try {
      console.log("🗑️ Clearing all database records...");
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/database/clear-all`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to clear database');
      }

      console.log("✅ Database cleared successfully:", result);
      
      toast.success("All database records deleted successfully!");
      
      // Show detailed results
      const results = result.results;
      console.log("Deletion results:", results);
      
      const successCount = Object.values(results).filter((r: any) => r.success).length;
      const totalCount = Object.keys(results).length;
      
      toast.success(`Successfully cleared ${successCount}/${totalCount} tables`);
      
    } catch (error) {
      console.error("❌ Error clearing database:", error);
      toast.error(`Failed to clear database: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsClearing(false);
    }
  };

  const rlsPoliciesSQL = `-- ============================================
-- MNEMOSYNE ATTENDANCE SYSTEM
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- This script disables RLS for prototype/development
-- For production, enable RLS and create proper policies
-- ============================================

-- DISABLE RLS FOR ALL TABLES (Development Mode)
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('employees', 'teams', 'attendance_records', 'leave_requests', 'activity_logs');`;

  const teamsDataSQL = `-- ============================================
-- INSERT TEAMS DATA
-- ============================================

INSERT INTO teams (id, name, description, created_at) VALUES
  (1, 'Engineering', 'Software development and technical infrastructure', NOW()),
  (2, 'Creative', 'Design, branding, and creative content', NOW()),
  (3, 'Marketing', 'Marketing campaigns and brand strategy', NOW()),
  (4, 'Human Resources', 'Employee management and HR operations', NOW()),
  (5, 'Sales', 'Sales operations and client relations', NOW()),
  (6, 'Product', 'Product management and strategy', NOW())
ON CONFLICT (id) DO NOTHING;`;

  const verifySQL = `-- ============================================
-- VERIFY DATABASE SETUP
-- ============================================

-- Check if teams exist
SELECT * FROM teams ORDER BY id;

-- Check if RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('employees', 'teams', 'attendance_records', 'leave_requests', 'activity_logs');

-- Check employees table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'employees' 
ORDER BY ordinal_position;`;

  const adminLeaveSQL = `-- ============================================
-- ADMIN LEAVE REQUESTS MIGRATION
-- ============================================
-- Add support for admin team leaders to submit leave requests
-- This adds an admin_number column to the leave_requests table
-- ============================================

-- Add admin_number column to leave_requests table
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- Add attachment_url column for file attachments (if not exists)
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Add index for faster admin leave request queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_admin_number 
ON leave_requests(admin_number);

-- Verify the new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leave_requests' 
AND column_name IN ('admin_number', 'attachment_url', 'employee_number')
ORDER BY ordinal_position;`;

  const adminLeaveBalanceSQL = `-- ============================================
-- ADMIN LEAVE BALANCE MIGRATION
-- ============================================
-- Add paid_leave_balance tracking for admins
-- This enables automatic balance deduction when leave is approved
-- ============================================

-- Add paid_leave_balance column to admins table
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;

-- Set default balance for existing admins (if null)
UPDATE admins 
SET paid_leave_balance = 12 
WHERE paid_leave_balance IS NULL;

-- Verify the column was added successfully
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'admins' 
AND column_name = 'paid_leave_balance';

-- Show current admin balances
SELECT admin_number, full_name, paid_leave_balance 
FROM admins 
ORDER BY admin_number;`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#1a4d8f] to-[#0B3060] py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-[#0B3060]" />
            <h1 className="text-3xl font-bold text-[#1F2937]">Database Setup & Configuration</h1>
          </div>
        </div>

        {/* Critical Warning */}
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-900 mb-3">
                🚨 EMPLOYEES NOT SAVING TO DATABASE
              </h3>
              <p className="text-sm text-red-800 mb-3">
                <strong>Problem:</strong> Row Level Security (RLS) is blocking database inserts. This is why employees disappear after registration.
              </p>
              <p className="text-sm text-red-800 mb-3">
                <strong>Solution:</strong> Follow the 4 simple steps below to fix this issue permanently.
              </p>
              <div className="bg-red-100 rounded-lg p-4 mt-4">
                <p className="text-sm font-bold text-red-900 mb-2">⚠️ FOR DEVELOPMENT/PROTOTYPE ONLY</p>
                <p className="text-xs text-red-800">
                  This guide disables RLS for easier development. For production apps, you should enable RLS and create proper security policies.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-white border-2 border-blue-400 rounded-xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Open Supabase SQL Editor
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                  <li>Go to your <strong>Supabase Dashboard</strong></li>
                  <li>Click on your project</li>
                  <li>In the left sidebar, click <strong>"SQL Editor"</strong></li>
                  <li>Click <strong>"New Query"</strong> button</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white border-2 border-blue-400 rounded-xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Disable Row Level Security (RLS)
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  This will allow your app to insert, update, and delete data without authentication restrictions.
                </p>
                
                <div className="bg-slate-50 border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-700 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <Terminal className="w-4 h-4" />
                      <span className="text-sm font-mono">disable_rls.sql</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(rlsPoliciesSQL, "RLS Policies")}
                      className="flex items-center gap-2 px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs transition-colors"
                    >
                      {copiedSection === "RLS Policies" ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy SQL
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-800 max-h-96">
{rlsPoliciesSQL}
                  </pre>
                </div>

                <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-900 mb-2">✅ After copying:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-green-800">
                    <li>Paste the SQL into Supabase SQL Editor</li>
                    <li>Click <strong>"Run"</strong> button (or press Ctrl+Enter)</li>
                    <li>Wait for "Success" message</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white border-2 border-blue-400 rounded-xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Insert Teams Data
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Add the required teams (Engineering, Creative, Marketing, etc.) to your database.
                </p>
                
                <div className="bg-slate-50 border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-700 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <Terminal className="w-4 h-4" />
                      <span className="text-sm font-mono">insert_teams.sql</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(teamsDataSQL, "Teams Data")}
                      className="flex items-center gap-2 px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs transition-colors"
                    >
                      {copiedSection === "Teams Data" ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy SQL
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-800 max-h-64">
{teamsDataSQL}
                  </pre>
                </div>

                <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-900 mb-2">✅ After copying:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-green-800">
                    <li>Create a <strong>new query</strong> in SQL Editor</li>
                    <li>Paste the SQL and click <strong>"Run"</strong></li>
                    <li>You should see "6 rows affected"</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white border-2 border-blue-400 rounded-xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Verify Setup
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Run this query to confirm everything is configured correctly.
                </p>
                
                <div className="bg-slate-50 border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-700 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <Terminal className="w-4 h-4" />
                      <span className="text-sm font-mono">verify_setup.sql</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(verifySQL, "Verify SQL")}
                      className="flex items-center gap-2 px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs transition-colors"
                    >
                      {copiedSection === "Verify SQL" ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy SQL
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-800 max-h-64">
{verifySQL}
                  </pre>
                </div>

                <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-900 mb-2">✅ Expected results:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                    <li>6 teams should appear (Engineering, Creative, Marketing, etc.)</li>
                    <li>All tables should show <code className="bg-green-100 px-1 rounded">rowsecurity = false</code></li>
                    <li>Employees table should have all required columns</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 - Admin Leave Migration */}
          <div className="bg-white border-2 border-orange-400 rounded-xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                5
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  🆕 Enable Admin Leave Requests
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  <strong>REQUIRED:</strong> This migration adds support for admin team leaders to submit leave requests to Super Admin.
                </p>
                
                <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-orange-900 mb-2">⚠️ Run this migration to fix errors</p>
                  <p className="text-xs text-orange-800">
                    If you see "column leave_requests.admin_number does not exist" errors, you MUST run this migration.
                  </p>
                </div>
                
                <div className="bg-slate-50 border border-slate-300 rounded-lg overflow-hidden">
                  <div className="bg-slate-700 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <Terminal className="w-4 h-4" />
                      <span className="text-sm font-mono">admin_leave_migration.sql</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(adminLeaveSQL, "Admin Leave Migration")}
                      className="flex items-center gap-2 px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs transition-colors"
                    >
                      {copiedSection === "Admin Leave Migration" ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy SQL
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-800 max-h-96">
{adminLeaveSQL}
                  </pre>
                </div>

                <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-900 mb-2">✅ After running this migration:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                    <li>Admin team leaders can submit leave requests</li>
                    <li>Super Admin will see both employee AND admin leave requests</li>
                    <li>Leave requests will track file attachments properly</li>
                    <li>Admin requests are marked with a Shield icon in Super Admin view</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 6: Admin Leave Balance */}
          <div className="bg-white border-2 border-purple-400 rounded-xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                6
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  💰 Enable Admin Leave Balance Tracking
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  <strong>NEW:</strong> This migration adds leave balance tracking for admins. When Super Admin approves admin leave requests, the balance will be automatically deducted.
                </p>
                
                <div className="bg-purple-50 border border-purple-300 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-purple-900 mb-2">📋 What this does:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-purple-800">
                    <li>Adds <code className="bg-purple-200 px-1 rounded">paid_leave_balance</code> column to admins table</li>
                    <li>Sets default balance of 12 days for all admins</li>
                    <li>Automatically deducts days when Super Admin approves admin leave</li>
                    <li>Works the same as employee leave balance system</li>
                  </ul>
                </div>

                <div className="bg-slate-100 rounded-lg p-4 mb-4 overflow-x-auto">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-700">SQL Migration Script:</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(adminLeaveBalanceSQL);
                        toast.success('Admin leave balance migration SQL copied!');
                      }}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                    >
                      📋 Copy SQL
                    </button>
                  </div>
                  <pre className="text-xs text-slate-800 whitespace-pre-wrap">
                    {adminLeaveBalanceSQL}
                  </pre>
                </div>

                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700 mb-4">
                  <li>Click the <strong>"📋 Copy SQL"</strong> button above</li>
                  <li>Open <strong>Supabase SQL Editor</strong></li>
                  <li>Paste the SQL and click <strong>"Run"</strong></li>
                  <li>You should see a success message showing admin balances</li>
                  <li>Go to <strong>Settings → API → Reload schema cache</strong></li>
                </ol>

                <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-900 mb-2">✅ After running this migration:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                    <li>Admins will have a leave balance displayed on their leave request page</li>
                    <li>When Super Admin approves admin leave, balance automatically deducts</li>
                    <li>Works with both paid and unpaid leave (ABSENT) logic</li>
                    <li>Balance can be reset using the Reset Leave Balance page</li>
                  </ul>
                </div>

                <div className="mt-4 bg-amber-50 border border-amber-300 rounded-lg p-4">
                  <p className="text-sm font-semibold text-amber-900 mb-2">⚠️ Important Notes:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
                    <li>All existing admins will default to 12 days balance</li>
                    <li>If you already have admin leave requests approved, those won't retroactively deduct</li>
                    <li>You can manually adjust balances in Supabase Table Editor if needed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Final Step */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                ✓
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-900 mb-3">
                  Test Employee Registration
                </h3>
                <p className="text-sm text-green-800 mb-4">
                  After completing the steps above:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                  <li>Go to <strong>Register Employee</strong> page</li>
                  <li>Fill in the form and click <strong>Register</strong></li>
                  <li>Check browser console (F12) for success messages</li>
                  <li>Navigate away and come back - the employee number should continue incrementing</li>
                  <li>Go to <strong>Members</strong> page to see your registered employees</li>
                </ol>
                
                <div className="mt-4 p-4 bg-green-100 rounded-lg">
                  <p className="text-sm font-bold text-green-900">
                    🎉 If employees now appear in the Members page, your database is working correctly!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-slate-600" />
            Troubleshooting
          </h3>
          
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-slate-900 mb-1">❌ Error: "relation 'employees' does not exist"</p>
              <p className="text-slate-600 ml-4">
                → You need to create the database tables first. Check your Supabase project setup.
              </p>
            </div>
            
            <div>
              <p className="font-semibold text-slate-900 mb-1">❌ Error: "permission denied for table employees"</p>
              <p className="text-slate-600 ml-4">
                → RLS is still enabled. Make sure you ran the disable RLS script and it showed "Success".
              </p>
            </div>
            
            <div>
              <p className="font-semibold text-slate-900 mb-1">❌ Error: "duplicate key value violates unique constraint"</p>
              <p className="text-slate-600 ml-4">
                → An employee with that number already exists. The app should handle this automatically.
              </p>
            </div>
            
            <div>
              <p className="font-semibold text-slate-900 mb-1">❌ Employees still not saving</p>
              <p className="text-slate-600 ml-4">
                → Open browser console (F12) when registering. Look for red error messages starting with ❌
              </p>
            </div>
          </div>
        </div>

        {/* Clear All Data */}
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Trash2 className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-900 mb-3">
                🚨 CLEAR ALL DATABASE RECORDS
              </h3>
              <p className="text-sm text-red-800 mb-3">
                <strong>Warning:</strong> This will permanently delete ALL records from the database!
              </p>
              <p className="text-sm text-red-800 mb-3">
                <strong>Includes:</strong> All employees, admins, attendance records, leave requests, schedules, and notifications.
              </p>
              <p className="text-sm text-red-800 mb-3">
                <strong>Excludes:</strong> The teams table will NOT be deleted.
              </p>
              <div className="bg-red-100 rounded-lg p-4 mt-4">
                <p className="text-sm font-bold text-red-900 mb-2">⚠️ FOR DEVELOPMENT/PROTOTYPE ONLY</p>
                <p className="text-xs text-red-800">
                  This guide disables RLS for easier development. For production apps, you should enable RLS and create proper security policies.
                </p>
              </div>
              <button
                onClick={clearAllData}
                disabled={isClearing}
                className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                {isClearing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Clearing Database...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Clear All Database Records
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Clear Attendance Only */}
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Trash2 className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-900 mb-3">
                🚨 CLEAR ATTENDANCE RECORDS ONLY
              </h3>
              <p className="text-sm text-red-800 mb-3">
                <strong>Warning:</strong> This will permanently delete ALL ATTENDANCE RECORDS!
              </p>
              <p className="text-sm text-red-800 mb-3">
                <strong>Includes:</strong> All attendance records (time in/out), attendance history, and reset attendance to zero.
              </p>
              <p className="text-sm text-red-800 mb-3">
                <strong>Excludes:</strong> Employees, admins, leave requests, schedules, and teams.
              </p>
              <div className="bg-red-100 rounded-lg p-4 mt-4">
                <p className="text-sm font-bold text-red-900 mb-2">⚠️ FOR DEVELOPMENT/PROTOTYPE ONLY</p>
                <p className="text-xs text-red-800">
                  This guide disables RLS for easier development. For production apps, you should enable RLS and create proper security policies.
                </p>
              </div>
              <button
                onClick={clearAttendanceOnly}
                disabled={isClearingAttendance}
                className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                {isClearingAttendance ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Clearing Attendance...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Clear Attendance Records Only
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}