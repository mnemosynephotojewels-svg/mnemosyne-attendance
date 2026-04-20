import React, { useState } from 'react';
import { Card } from '../components/Card';
import { QrCode, Copy, Download, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { toast } from 'sonner';

export function AdminQRCodeSetup() {
  const [copied, setCopied] = useState(false);

  const sqlQuery = `-- ============================================
-- ADMIN QR CODE SETUP
-- This SQL adds QR code support to the admins table
-- ============================================

-- Step 1: Add qr_code column to admins table if it doesn't exist
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Step 2: Generate QR codes for all admins using their admin_number
-- The QR code value is simply their admin_number (e.g., 'ADM-001')
UPDATE admins
SET qr_code = admin_number
WHERE qr_code IS NULL OR qr_code = '';

-- Step 3: Verify the update
SELECT 
  admin_number,
  full_name,
  username,
  department,
  qr_code,
  CASE 
    WHEN qr_code IS NOT NULL AND qr_code != '' THEN '✅ QR Code Set'
    ELSE '❌ Missing QR Code'
  END as qr_status
FROM admins
ORDER BY admin_number;

-- ============================================
-- EXPECTED RESULT
-- ============================================
-- All admins should now have their admin_number 
-- stored in the qr_code column.
-- 
-- Example:
-- admin_number | qr_code  | qr_status
-- -------------|----------|-------------
-- ADM-001      | ADM-001  | ✅ QR Code Set
-- ADM-002      | ADM-002  | ✅ QR Code Set
-- ADM-003      | ADM-003  | ✅ QR Code Set
-- ============================================`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    toast.success('SQL query copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sqlQuery], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin_qr_code_setup_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('SQL file downloaded!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] to-[#1a4d8f] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F7B34C] rounded-2xl mb-4">
            <QrCode className="w-8 h-8 text-[#0B3060]" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Admin QR Code Setup
          </h1>
          <p className="text-white/80 text-lg">
            Generate QR codes for all Team Leader Admin accounts
          </p>
        </div>

        {/* Instructions Card */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  📋 How to Use This SQL Query
                </h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700 text-sm ml-2">
                  <li>Copy the SQL query below using the "Copy SQL" button</li>
                  <li>Open your Supabase Dashboard → SQL Editor</li>
                  <li>Paste the SQL query into the editor</li>
                  <li>Click "Run" to execute the query</li>
                  <li>Verify that all admins now have QR codes assigned</li>
                  <li>Return to your admin Settings page to view and download QR codes</li>
                </ol>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Database className="w-5 h-5" />
                What This Query Does:
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                <li>Adds a <code className="bg-blue-200 px-1 rounded">qr_code</code> column to the admins table</li>
                <li>Sets each admin's QR code to their <code className="bg-blue-200 px-1 rounded">admin_number</code> (e.g., ADM-001)</li>
                <li>QR codes can be used in Kiosk Mode for attendance tracking</li>
                <li>Each admin can view their QR code in Settings → My QR Code</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* SQL Query Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Database className="w-6 h-6 text-[#0B3060]" />
                SQL Query
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors text-sm font-medium"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy SQL
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F7B34C] text-[#0B3060] rounded-lg hover:bg-[#F7B34C]/90 transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download .sql
                </button>
              </div>
            </div>

            <div className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto">
              <pre className="text-sm font-mono whitespace-pre-wrap">{sqlQuery}</pre>
            </div>
          </div>
        </Card>

        {/* Success Card */}
        <Card className="mt-6">
          <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  ✅ After Running the Query
                </h3>
                <p className="text-green-800 text-sm mb-3">
                  Once you've successfully run the SQL query in Supabase, all team leader admin accounts will have QR codes!
                </p>
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Next Steps:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                    <li>Each admin can log in and go to <strong>Settings → My QR Code</strong></li>
                    <li>They can download their QR code as a PNG image</li>
                    <li>The QR code can be printed or saved on their phone</li>
                    <li>Admins can use their QR code in Kiosk Mode to clock in/out</li>
                    <li>All schedule validations will work (paid leave, day off, duplicate prevention)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Technical Details */}
        <Card className="mt-6">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔧 Technical Details</h3>
            
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">QR Code Format</h4>
                <p className="text-sm text-purple-800 mb-2">
                  The QR code stores the admin's employee number in a simple format:
                </p>
                <code className="block bg-purple-900 text-purple-100 p-3 rounded text-xs font-mono">
                  ADM-001
                </code>
                <p className="text-sm text-purple-800 mt-2">
                  When scanned in Kiosk Mode, the system will:
                </p>
                <ol className="list-decimal list-inside text-sm text-purple-800 mt-1 ml-2 space-y-1">
                  <li>Check if the user exists in the employees table</li>
                  <li>If not found, check the admins table</li>
                  <li>Validate their schedule for today</li>
                  <li>Record attendance if all validations pass</li>
                </ol>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 mb-2">Database Schema</h4>
                <p className="text-sm text-orange-800 mb-2">
                  The <code className="bg-orange-200 px-1 rounded">qr_code</code> column structure:
                </p>
                <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                  <li><strong>Type:</strong> TEXT</li>
                  <li><strong>Nullable:</strong> Yes (existing records start as NULL)</li>
                  <li><strong>Value:</strong> Same as admin_number field</li>
                  <li><strong>Purpose:</strong> Enable Kiosk Mode attendance for admins</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Kiosk Mode Integration</h4>
                <p className="text-sm text-blue-800">
                  The Kiosk Mode has been enhanced to support admin QR codes:
                </p>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1 mt-2">
                  <li>✅ Checks both employees and admins tables</li>
                  <li>✅ Validates schedule existence for today</li>
                  <li>✅ Blocks attendance if on paid leave</li>
                  <li>✅ Blocks attendance if day off</li>
                  <li>✅ Prevents duplicate time in/out</li>
                  <li>✅ Displays admin name and role on success</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
