import { AlertTriangle, Database, ExternalLink, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface Props {
  error?: string;
  onDismiss?: () => void;
}

export function SchedulesTableErrorBanner({ error, onDismiss }: Props) {
  const [showSQL, setShowSQL] = useState(false);

  // Check for different error types
  const isColumnError = error?.includes('Could not find');
  const isBigintError = error?.includes('invalid input syntax for type bigint');

  // Only show if there's a database-related error
  if (!error || (!isColumnError && !isBigintError)) {
    return null;
  }

  const fixSQL = isBigintError
    ? `-- 🚨 CRITICAL FIX: id column is BIGINT but needs to be TEXT
-- Copy and run this in Supabase SQL Editor

-- Fix the id column type
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_pkey;
ALTER TABLE schedules DROP COLUMN IF EXISTS id;
ALTER TABLE schedules ADD COLUMN id TEXT PRIMARY KEY;

-- Add missing columns
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS employee_number TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS user_type TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS schedule_date DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS shift_start TIME;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS shift_end TIME;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS grace_period INTEGER DEFAULT 30;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_day_off BOOLEAN DEFAULT FALSE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_paid_leave BOOLEAN DEFAULT FALSE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`
    : `-- ⚠️ FIX: Add all missing columns to your schedules table
-- Copy and run this in Supabase SQL Editor

DO $$
BEGIN
  -- Add employee_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'employee_number'
  ) THEN
    ALTER TABLE schedules ADD COLUMN employee_number TEXT;
    RAISE NOTICE '✅ Added employee_number column';
  END IF;

  -- Add admin_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'admin_number'
  ) THEN
    ALTER TABLE schedules ADD COLUMN admin_number TEXT;
    RAISE NOTICE '✅ Added admin_number column';
  END IF;

  -- Add user_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE schedules ADD COLUMN user_type TEXT CHECK (user_type IN ('employee', 'admin'));
    RAISE NOTICE '✅ Added user_type column';
  END IF;

  -- Add shift_start column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'shift_start'
  ) THEN
    ALTER TABLE schedules ADD COLUMN shift_start TIME;
    RAISE NOTICE '✅ Added shift_start column';
  END IF;

  -- Add shift_end column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'shift_end'
  ) THEN
    ALTER TABLE schedules ADD COLUMN shift_end TIME;
    RAISE NOTICE '✅ Added shift_end column';
  END IF;

  -- Add grace_period column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'grace_period'
  ) THEN
    ALTER TABLE schedules ADD COLUMN grace_period INTEGER DEFAULT 30;
    RAISE NOTICE '✅ Added grace_period column';
  END IF;

  -- Add is_day_off column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'is_day_off'
  ) THEN
    ALTER TABLE schedules ADD COLUMN is_day_off BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_day_off column';
  END IF;

  -- Add is_paid_leave column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'is_paid_leave'
  ) THEN
    ALTER TABLE schedules ADD COLUMN is_paid_leave BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_paid_leave column';
  END IF;

  -- Add updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE schedules ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added updated_at column';
  END IF;

  -- Add created_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE schedules ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added created_at column';
  END IF;

  RAISE NOTICE '🎉 All missing columns fixed!';
END $$;`;

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg shadow-md animate-pulse">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
              <Database className="w-5 h-5" />
              {isBigintError ? '🚨 CRITICAL: ID Column Has Wrong Type' : '⚠️ Schedules Table Missing Required Columns'}
            </h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Dismiss
              </button>
            )}
          </div>

          <p className="text-sm text-red-700 mb-3">
            <strong>Error:</strong> {error}
          </p>

          <p className="text-sm text-gray-700 mb-3">
            {isBigintError ? (
              <>
                Your <code className="bg-red-100 px-2 py-0.5 rounded">schedules</code> table has the <code className="bg-red-100 px-2 py-0.5 rounded">id</code> column
                as <strong className="text-red-700">BIGINT</strong> but it needs to be <strong className="text-green-700">TEXT</strong>.
                This is because schedule IDs are strings like <code className="bg-yellow-100 px-2 py-0.5 rounded">"schedule:EMP-1053:2026-04-18"</code>.
                <br/><br/>
                <strong className="text-red-800">⚠️ WARNING:</strong> Fixing this will delete existing schedules in the Supabase table (KV store data is safe).
              </>
            ) : (
              <>
                Your <code className="bg-red-100 px-2 py-0.5 rounded">schedules</code> table exists but is missing required columns.
                Schedules are being saved to <strong>KV store only</strong> until you fix the table schema.
              </>
            )}
          </p>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setShowSQL(!showSQL)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              {showSQL ? 'Hide' : 'Show'} Fix SQL
            </button>
            
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded font-medium transition-colors flex items-center gap-2"
            >
              Open Supabase Dashboard
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload After Fix
            </button>
          </div>

          {showSQL && (
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-red-900">
                  🔧 Step 1: Copy This SQL
                </h4>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(fixSQL);
                    alert('✅ SQL copied to clipboard!');
                  }}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                >
                  📋 Copy SQL
                </button>
              </div>
              
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
                <pre>{fixSQL}</pre>
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-700">
                <p className="font-semibold text-red-900">📝 Step 2: Run in Supabase</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Go to <strong>Supabase Dashboard → SQL Editor</strong></li>
                  <li>Paste the SQL above</li>
                  <li>Click <strong>RUN</strong></li>
                  <li>Wait for success message</li>
                  <li>Click "Reload After Fix" button above</li>
                </ol>
              </div>

              <div className="mt-4 bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm text-green-800">
                  <strong>✅ After running the SQL:</strong> The errors will disappear and schedules will save to both KV store AND Supabase!
                </p>
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-gray-600 bg-white/50 p-2 rounded">
            <strong>Note:</strong> Your data is safe! Schedules are still being saved to the KV store. 
            The Supabase table just needs the correct schema to enable dual storage.
          </div>
        </div>
      </div>
    </div>
  );
}
