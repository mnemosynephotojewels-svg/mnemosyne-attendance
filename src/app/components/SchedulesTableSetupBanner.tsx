import { AlertCircle, Database, CheckCircle, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function SchedulesTableSetupBanner() {
  const [tableStatus, setTableStatus] = useState<'checking' | 'exists' | 'missing'>('checking');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkTableStatus();
  }, []);

  const checkTableStatus = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/schedules/diagnostic`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      
      if (data.success && data.table_exists) {
        setTableStatus('exists');
      } else {
        setTableStatus('missing');
      }
    } catch (error) {
      console.error('Failed to check schedules table status:', error);
      setTableStatus('missing');
    }
  };

  // Don't show anything if table exists
  if (tableStatus === 'exists') {
    return null;
  }

  // Don't show while checking
  if (tableStatus === 'checking') {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-yellow-900 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Schedules Table Setup Required
            </h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-yellow-700 hover:text-yellow-900 font-medium underline"
            >
              {showDetails ? 'Hide Details' : 'Show Setup Instructions'}
            </button>
          </div>

          <p className="text-yellow-800 mb-3">
            Schedules are currently being saved to the <strong>KV store only</strong>. 
            To enable dual storage (KV + Supabase database), you need to manually create the <code className="bg-yellow-100 px-2 py-0.5 rounded">schedules</code> table in Supabase.
          </p>

          {showDetails && (
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg border border-yellow-200 space-y-4">
              <div>
                <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  <span className="bg-yellow-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                  Open Supabase Dashboard
                </h4>
                <p className="text-sm text-gray-700 ml-8">
                  Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    https://supabase.com/dashboard <ExternalLink className="w-3 h-3" />
                  </a> and navigate to <strong>SQL Editor</strong>
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  <span className="bg-yellow-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                  Run This SQL Command
                </h4>
                <div className="ml-8">
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                    <pre>{`CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  employee_number TEXT,
  admin_number TEXT,
  user_type TEXT CHECK (user_type IN ('employee', 'admin')),
  schedule_date DATE NOT NULL,
  shift_start TIME,
  shift_end TIME,
  grace_period INTEGER DEFAULT 30,
  is_day_off BOOLEAN DEFAULT FALSE,
  is_paid_leave BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX IF NOT EXISTS idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX IF NOT EXISTS idx_schedules_schedule_date ON schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_user_type ON schedules(user_type);`}</pre>
                  </div>
                  <button
                    onClick={() => {
                      const sql = `CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  employee_number TEXT,
  admin_number TEXT,
  user_type TEXT CHECK (user_type IN ('employee', 'admin')),
  schedule_date DATE NOT NULL,
  shift_start TIME,
  shift_end TIME,
  grace_period INTEGER DEFAULT 30,
  is_day_off BOOLEAN DEFAULT FALSE,
  is_paid_leave BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX IF NOT EXISTS idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX IF NOT EXISTS idx_schedules_schedule_date ON schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_user_type ON schedules(user_type);`;
                      navigator.clipboard.writeText(sql);
                      alert('SQL copied to clipboard!');
                    }}
                    className="mt-2 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm font-medium transition-colors"
                  >
                    📋 Copy SQL to Clipboard
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                  <span className="bg-yellow-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                  Refresh This Page
                </h4>
                <p className="text-sm text-gray-700 ml-8 mb-2">
                  After running the SQL, refresh this page. This banner will disappear once the table is detected.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="ml-8 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Refresh Page Now
                </button>
              </div>

              <div className="border-t border-yellow-200 pt-3 mt-3">
                <p className="text-xs text-gray-600">
                  📖 For complete setup instructions and troubleshooting, see <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">/SUPABASE_SCHEDULES_TABLE_SETUP.md</code> in your project files.
                </p>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1.5 rounded">
              <CheckCircle className="w-4 h-4" />
              <span>Schedules are still working (saved to KV store)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
