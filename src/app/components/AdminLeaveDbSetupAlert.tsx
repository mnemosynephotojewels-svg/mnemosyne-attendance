import React from 'react';
import { AlertCircle, X, Database, Copy, CheckCircle, ExternalLink, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../../../utils/supabase/info';

interface AdminLeaveDbSetupAlertProps {
  onClose: () => void;
}

export function AdminLeaveDbSetupAlert({ onClose }: AdminLeaveDbSetupAlertProps) {
  const [copied, setCopied] = React.useState(false);

  const migrationSQL = `ALTER TABLE leave_requests ALTER COLUMN employee_number DROP NOT NULL;`;

  const copyToClipboard = async () => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(migrationSQL);
        setCopied(true);
        toast.success('SQL copied! Now paste it in Supabase SQL Editor');
        setTimeout(() => setCopied(false), 3000);
      } else {
        // Fallback method
        const textarea = document.createElement('textarea');
        textarea.value = migrationSQL;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
          setCopied(true);
          toast.success('SQL copied! Now paste it in Supabase SQL Editor');
          setTimeout(() => setCopied(false), 3000);
        } else {
          toast.info('Please manually select and copy the SQL code');
        }
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.info('Please manually select and copy the SQL code');
    }
  };

  const openSupabaseSQLEditor = () => {
    const supabaseUrl = `https://supabase.com/dashboard/project/${projectId}/sql/new`;
    window.open(supabaseUrl, '_blank');
    toast.success('Opening Supabase SQL Editor...', { duration: 2000 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-5 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Quick Database Fix Required</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Problem Explanation */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
            <p className="text-red-800 font-semibold mb-1">
              ⚠️ The database needs a small update to allow admin leave requests
            </p>
            <p className="text-red-700 text-sm">
              This is a one-time setup that takes less than 1 minute
            </p>
          </div>

          {/* Simple 3-Step Guide */}
          <div className="space-y-6">
            {/* Step 1: Copy SQL */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Copy This SQL Code</h3>
                  <div className="relative group">
                    <pre 
                      className="bg-gray-900 text-green-400 p-4 pr-16 rounded-lg text-sm font-mono overflow-x-auto cursor-pointer hover:bg-gray-800 transition-colors"
                      onClick={(e) => {
                        const selection = window.getSelection();
                        const range = document.createRange();
                        range.selectNodeContents(e.currentTarget);
                        selection?.removeAllRanges();
                        selection?.addRange(range);
                      }}
                    >
{migrationSQL}
                    </pre>
                    <button
                      onClick={copyToClipboard}
                      className={`absolute top-3 right-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg ${
                        copied 
                          ? 'bg-green-600 text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    💡 Click the code box to select all, or use the Copy button
                  </p>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowDown className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 2: Open Supabase */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Open Supabase SQL Editor</h3>
                  <button
                    onClick={openSupabaseSQLEditor}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl w-full justify-center"
                  >
                    <Database className="w-5 h-5" />
                    Open SQL Editor
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-gray-600 mt-3">
                    This will open the Supabase SQL Editor in a new tab
                  </p>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowDown className="w-6 h-6 text-gray-400" />
            </div>

            {/* Step 3: Paste and Run */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Paste & Run</h3>
                  <ol className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>In the SQL Editor, paste the code (Ctrl+V or Cmd+V)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Click the <strong>"Run"</strong> button (or press Ctrl+Enter)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Wait for "Success. No rows returned" message</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Come back here and refresh the page</strong></span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {/* What This Does */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">What does this SQL do?</h4>
            <p className="text-xs text-gray-700 leading-relaxed">
              It allows the <code className="bg-gray-200 px-1 rounded">employee_number</code> field to be empty (nullable) 
              so that admin accounts can submit leave requests using their <code className="bg-gray-200 px-1 rounded">admin_number</code> instead. 
              This is safe and won't affect existing employee leave requests.
            </p>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>💡 Need help?</strong> If you're stuck, the SQL code is already copied (if you clicked the Copy button). 
              Just open the SQL Editor link above, paste the code, and click Run. That's it!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 flex justify-end gap-3 rounded-b-2xl border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}