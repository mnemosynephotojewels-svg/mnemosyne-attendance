import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Database, CheckCircle, AlertCircle, Copy, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';

export function SetupAdminQRColumn() {
  const [isAdding, setIsAdding] = useState(false);
  const [columnExists, setColumnExists] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const SQL_QUERY = `-- Add qr_code_data column to admins table
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS qr_code_data TEXT;`;

  const copySQL = () => {
    navigator.clipboard.writeText(SQL_QUERY);
    toast.success('SQL copied to clipboard!');
  };

  const checkColumn = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase is not configured');
      return;
    }

    setIsChecking(true);
    try {
      // Try to select the column - if it fails, column doesn't exist
      const { error } = await supabase
        .from('admins')
        .select('qr_code_data')
        .limit(1);

      if (error) {
        if (error.code === '42703') {
          // Column does not exist
          setColumnExists(false);
          toast.info('Column does not exist yet');
        } else {
          console.error('Error checking column:', error);
          toast.error('Error checking column: ' + error.message);
        }
      } else {
        setColumnExists(true);
        toast.success('✅ Column already exists!');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to check column: ' + error.message);
    } finally {
      setIsChecking(false);
    }
  };

  const addColumn = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase is not configured');
      return;
    }

    setIsAdding(true);
    try {
      // Execute SQL using rpc or direct SQL
      const { error } = await supabase.rpc('exec_sql', { sql_query: SQL_QUERY });

      if (error) {
        // RPC might not exist, show manual instructions
        console.error('Error adding column:', error);
        toast.error('Please run the SQL manually in Supabase SQL Editor', { duration: 5000 });
      } else {
        toast.success('✅ Column added successfully!');
        setColumnExists(true);
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Please run the SQL manually in Supabase SQL Editor', { duration: 5000 });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Database className="w-8 h-8 text-[#0B3060]" />
        <div>
          <h1 className="text-3xl font-bold text-[#1F2937]">Setup Admin QR Column</h1>
          <p className="text-sm text-[#6B7280]">Add the qr_code_data column to admins table</p>
        </div>
      </div>

      {/* Status Check */}
      <Card>
        <h2 className="text-xl font-semibold text-[#1F2937] mb-4">Column Status</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={checkColumn}
            disabled={isChecking}
            className="px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Check Column Status'}
          </button>
          {columnExists !== null && (
            <div className="flex items-center gap-2">
              {columnExists ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-medium">Column exists! ✅</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <span className="text-orange-600 font-medium">Column does not exist</span>
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Manual SQL Instructions */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-[#0B3060] font-bold">1</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#1F2937] mb-2">Copy the SQL Query</h3>
              <div className="bg-gray-900 rounded-lg p-4 relative">
                <pre className="text-green-400 text-sm overflow-x-auto">
                  <code>{SQL_QUERY}</code>
                </pre>
                <button
                  onClick={copySQL}
                  className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                  title="Copy SQL"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-[#0B3060] font-bold">2</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#1F2937] mb-2">Open Supabase SQL Editor</h3>
              <p className="text-sm text-[#6B7280] mb-2">
                Go to your Supabase Dashboard → SQL Editor
              </p>
              <a
                href={`https://supabase.com/dashboard/project/${import.meta.env.VITE_SUPABASE_PROJECT_ID || 'your-project'}/sql/new`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Open SQL Editor
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-[#0B3060] font-bold">3</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#1F2937] mb-2">Paste and Run the Query</h3>
              <p className="text-sm text-[#6B7280]">
                Paste the SQL query in the editor and click "Run" or press Ctrl+Enter
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-[#0B3060] font-bold">4</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#1F2937] mb-2">Verify the Column</h3>
              <p className="text-sm text-[#6B7280] mb-3">
                Come back here and click "Check Column Status" to verify
              </p>
              <button
                onClick={checkColumn}
                disabled={isChecking}
                className="px-4 py-2 bg-[#F7B34C] text-white rounded-lg hover:bg-[#f5a82d] transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {isChecking ? 'Checking...' : 'Re-check Column Status'}
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Success Message */}
      {columnExists && (
        <Card>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  ✅ Column Setup Complete!
                </h3>
                <p className="text-sm text-green-800 mb-3">
                  The <code className="bg-green-200 px-2 py-1 rounded">qr_code_data</code> column has been added to the admins table.
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="/super-admin/generate-admin-qr"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <Zap className="w-4 h-4" />
                    Generate Admin QR Codes
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Info Box */}
      <Card>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#0B3060] mb-2">ℹ️ What this does:</h3>
          <ul className="text-sm text-[#1F2937] space-y-1 list-disc list-inside">
            <li>Adds a new column <code className="bg-blue-200 px-1 rounded">qr_code_data</code> to the <code className="bg-blue-200 px-1 rounded">admins</code> table</li>
            <li>Column type is TEXT to store JSON QR code data</li>
            <li>Uses IF NOT EXISTS so it won't fail if column already exists</li>
            <li>Required for storing unique QR codes for each admin</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
