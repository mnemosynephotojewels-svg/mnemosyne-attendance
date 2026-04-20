import React from 'react';
import { AlertCircle, Database, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DatabaseSetupAlertProps {
  onClose?: () => void;
}

export function DatabaseSetupAlert({ onClose }: DatabaseSetupAlertProps) {
  const [copied, setCopied] = React.useState(false);

  const sqlScript = `-- Add paid_leave_balance column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;

-- Set all existing employees to 12 days
UPDATE employees 
SET paid_leave_balance = 12 
WHERE paid_leave_balance IS NULL;

-- Prevent negative balances
ALTER TABLE employees 
ADD CONSTRAINT check_leave_balance_non_negative 
CHECK (paid_leave_balance >= 0);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_employees_leave_balance 
ON employees(paid_leave_balance);`;

  const handleCopy = () => {
    // Try modern Clipboard API first, fallback to legacy method
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sqlScript)
        .then(() => {
          setCopied(true);
          toast.success('SQL script copied to clipboard!');
          setTimeout(() => setCopied(false), 3000);
        })
        .catch(() => {
          // Fallback to legacy method
          fallbackCopyToClipboard();
        });
    } else {
      // Fallback to legacy method
      fallbackCopyToClipboard();
    }
  };

  const fallbackCopyToClipboard = () => {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = sqlScript;
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
        setCopied(true);
        toast.success('SQL script copied to clipboard!');
        setTimeout(() => setCopied(false), 3000);
      } else {
        toast.error('Failed to copy. Please copy manually.');
      }
    } catch (err) {
      console.error('Fallback copy failed:', err);
      toast.error('Failed to copy. Please copy manually.');
    }

    document.body.removeChild(textArea);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B3060] to-[#164B8E] p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Database className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">Database Setup Required</h2>
              <p className="text-blue-100">
                The leave balance tracking system requires a database column to be added.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Alert Message */}
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 mb-1">Action Required</p>
                <p className="text-amber-800 text-sm">
                  The <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">paid_leave_balance</code> column 
                  is missing from your employees table. Please run the SQL script below to enable leave balance tracking.
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900">Setup Instructions</h3>
            
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#0B3060] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  <strong>Copy the SQL script below</strong> by clicking the copy button
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#0B3060] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>
                  <strong>Open Supabase Dashboard</strong> → Go to your project → Click <strong>"SQL Editor"</strong> in the sidebar
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#0B3060] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>
                  <strong>Paste the SQL script</strong> into the editor
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#0B3060] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>
                  <strong>Click "RUN"</strong> to execute the script
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[#0B3060] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  5
                </span>
                <span>
                  <strong>Reload the page</strong> to apply the changes
                </span>
              </li>
            </ol>
          </div>

          {/* SQL Script */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-sm text-gray-900">SQL Script</label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#0B3060] text-white rounded-lg hover:bg-[#164B8E] transition-colors text-sm font-medium"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Script
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs font-mono leading-relaxed">
                {sqlScript}
              </pre>
            </div>
          </div>

          {/* What This Does */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 text-sm">What This Script Does:</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex gap-2">
                <span>•</span>
                <span>Adds a <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">paid_leave_balance</code> column to track each employee's remaining leave days</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Sets all employees to 12 days (default annual allowance)</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Prevents negative balances with a database constraint</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Creates an index for better query performance</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
          <p className="text-sm text-gray-600">
            Need help? Check <code className="bg-gray-200 px-2 py-1 rounded text-xs">/QUICK_SETUP_LEAVE_BALANCE.md</code>
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}