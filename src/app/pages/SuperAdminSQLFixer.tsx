import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Copy, CheckCircle, Database, Terminal, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function SuperAdminSQLFixer() {
  const navigate = useNavigate();
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const sqlSteps = [
    {
      title: '1. Create Super Admin Table',
      description: 'This creates the super_admin table with all required columns',
      sql: `-- Create super_admin table
CREATE TABLE IF NOT EXISTS public.super_admin (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_super_admin_username ON public.super_admin(username);`
    },
    {
      title: '2. Disable Row Level Security (RLS)',
      description: 'This allows your app to read/write to the super_admin table',
      sql: `-- Disable RLS on super_admin table
ALTER TABLE public.super_admin DISABLE ROW LEVEL SECURITY;`
    },
    {
      title: '3. Insert Default Super Admin Account',
      description: 'Creates a super admin account with username: superadmin, password: superadmin12345',
      sql: `-- Insert default super admin account
INSERT INTO public.super_admin (username, password_hash)
VALUES ('superadmin', 'superadmin12345')
ON CONFLICT (username) DO NOTHING;`
    },
    {
      title: '4. Verify the Account Was Created',
      description: 'Check if the super admin account exists',
      sql: `-- View all super admin accounts
SELECT * FROM public.super_admin;`
    }
  ];

  const copyToClipboard = (text: string, stepIndex: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepIndex);
    toast.success('SQL copied to clipboard!');
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>

          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Terminal className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#0B3060]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Super Admin SQL Fixer
                </h1>
                <p className="text-gray-600 text-sm">Run these SQL commands in your Supabase dashboard</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-bold text-purple-900 mb-3 flex items-center gap-2">
                <Database className="w-5 h-5" />
                How to Use This Fixer
              </h2>
              <ol className="space-y-2 text-sm text-purple-900">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Open your Supabase Dashboard at <code className="bg-purple-200 px-2 py-0.5 rounded text-xs">supabase.com</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Click on <strong>"SQL Editor"</strong> in the left sidebar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Click <strong>"New Query"</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>Copy each SQL command below (click the copy button) and paste it into the SQL Editor</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  <span>Click <strong>"Run"</strong> to execute each command</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">6</span>
                  <span>After running all commands, go back to the login page and use: <strong>superadmin / superadmin12345</strong></span>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* SQL Steps */}
        <div className="space-y-6">
          {sqlSteps.map((step, index) => (
            <div key={index} className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
              {/* Step Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 sm:p-6">
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-purple-100 text-sm">{step.description}</p>
              </div>

              {/* SQL Code */}
              <div className="p-6">
                <div className="relative">
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                    <code>{step.sql}</code>
                  </pre>
                  
                  {/* Copy Button */}
                  <button
                    onClick={() => copyToClipboard(step.sql, index)}
                    className="absolute top-3 right-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all flex items-center gap-2 text-sm font-semibold shadow-lg"
                  >
                    {copiedStep === index ? (
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
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alternative: All-in-One SQL */}
        <div className="mt-8 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 sm:p-6">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              All-in-One SQL (Run Everything at Once)
            </h3>
            <p className="text-orange-100 text-sm">Copy and run this single command to do everything in one go</p>
          </div>

          <div className="p-6">
            <div className="relative">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono max-h-96">
                <code>{`-- ============================================
-- SUPER ADMIN TABLE SETUP - ALL IN ONE
-- ============================================

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.super_admin (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create index
CREATE INDEX IF NOT EXISTS idx_super_admin_username ON public.super_admin(username);

-- Step 3: Disable RLS
ALTER TABLE public.super_admin DISABLE ROW LEVEL SECURITY;

-- Step 4: Insert default super admin
INSERT INTO public.super_admin (username, password_hash)
VALUES ('superadmin', 'superadmin12345')
ON CONFLICT (username) DO NOTHING;

-- Step 5: Verify it worked
SELECT * FROM public.super_admin;`}</code>
              </pre>
              
              <button
                onClick={() => copyToClipboard(`-- ============================================
-- SUPER ADMIN TABLE SETUP - ALL IN ONE
-- ============================================

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.super_admin (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create index
CREATE INDEX IF NOT EXISTS idx_super_admin_username ON public.super_admin(username);

-- Step 3: Disable RLS
ALTER TABLE public.super_admin DISABLE ROW LEVEL SECURITY;

-- Step 4: Insert default super admin
INSERT INTO public.super_admin (username, password_hash)
VALUES ('superadmin', 'superadmin12345')
ON CONFLICT (username) DO NOTHING;

-- Step 5: Verify it worked
SELECT * FROM public.super_admin;`, 999)}
                className="absolute top-3 right-3 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all flex items-center gap-2 text-sm font-semibold shadow-lg"
              >
                {copiedStep === 999 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy All-in-One SQL
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Final Instructions */}
        <div className="mt-8 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            After Running the SQL
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <p className="font-semibold text-green-900 mb-2">Your Super Admin Credentials:</p>
              <div className="space-y-1 text-green-800 font-mono">
                <p><span className="text-green-600">Username:</span> superadmin</p>
                <p><span className="text-green-600">Password:</span> superadmin12345</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/login')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] hover:from-[#1a4a8a] hover:to-[#0B3060] text-white rounded-xl font-bold transition-all shadow-lg"
              >
                Go to Login Page
              </button>
              <button
                onClick={() => navigate('/view-db-credentials')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-bold transition-all shadow-lg"
              >
                View All Credentials
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}