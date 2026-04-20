import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw, Server, Database, Wifi } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from '../../lib/supabaseClient';

export function ServerDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<any>({
    loading: true,
    server: { status: 'checking', message: '', details: null },
    database: { status: 'checking', message: '', details: null },
    cors: { status: 'checking', message: '', details: null },
    environment: { status: 'checking', message: '', details: null }
  });

  const runDiagnostics = async () => {
    setDiagnostics((prev: any) => ({ ...prev, loading: true }));

    const results: any = {
      loading: false,
      server: { status: 'checking', message: '', details: null },
      database: { status: 'checking', message: '', details: null },
      cors: { status: 'checking', message: '', details: null },
      environment: { status: 'checking', message: '', details: null }
    };

    // 1. Check Environment Variables
    console.log('🔍 Checking environment variables...');
    try {
      if (!projectId || projectId === 'undefined' || projectId === '') {
        results.environment = {
          status: 'error',
          message: 'SUPABASE_URL / PROJECT_ID not configured',
          details: { projectId, hasPublicKey: !!publicAnonKey }
        };
      } else if (!publicAnonKey || publicAnonKey === 'undefined' || publicAnonKey === '') {
        results.environment = {
          status: 'error',
          message: 'SUPABASE_ANON_KEY not configured',
          details: { projectId, hasPublicKey: false }
        };
      } else {
        results.environment = {
          status: 'success',
          message: 'Environment variables configured',
          details: {
            projectId,
            supabaseUrl: `https://${projectId}.supabase.co`,
            hasPublicKey: true,
            keyPrefix: publicAnonKey.substring(0, 20) + '...'
          }
        };
      }
    } catch (error: any) {
      results.environment = {
        status: 'error',
        message: 'Failed to check environment',
        details: { error: error.message }
      };
    }

    // 2. Check Server Health Endpoint
    console.log('🔍 Checking server health...');
    const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-df988758/health`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(serverUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        results.server = {
          status: 'success',
          message: 'Server is running',
          details: { status: data.status, url: serverUrl }
        };
      } else {
        results.server = {
          status: 'error',
          message: `Server returned ${response.status}: ${response.statusText}`,
          details: { status: response.status, url: serverUrl }
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        results.server = {
          status: 'error',
          message: 'Server request timed out (10s)',
          details: { error: 'timeout', url: serverUrl }
        };
      } else {
        results.server = {
          status: 'error',
          message: `Cannot reach server: ${error.message}`,
          details: { error: error.message, url: serverUrl }
        };
      }
    }

    // 3. Check Database Connection via Supabase Client
    console.log('🔍 Checking database connection...');
    try {
      if (!supabase) {
        results.database = {
          status: 'error',
          message: 'Supabase client not initialized',
          details: null
        };
      } else {
        const { data, error } = await supabase
          .from('employees')
          .select('count', { count: 'exact', head: true });

        if (error) {
          results.database = {
            status: 'error',
            message: `Database query failed: ${error.message}`,
            details: { error: error.message, code: error.code }
          };
        } else {
          results.database = {
            status: 'success',
            message: 'Database connection working',
            details: { connection: 'active' }
          };
        }
      }
    } catch (error: any) {
      results.database = {
        status: 'error',
        message: `Database connection error: ${error.message}`,
        details: { error: error.message }
      };
    }

    // 4. Check CORS (if server is reachable)
    if (results.server.status === 'success') {
      console.log('🔍 Checking CORS configuration...');
      try {
        const testUrl = `https://${projectId}.supabase.co/functions/v1/make-server-df988758/employees`;
        const response = await fetch(testUrl, {
          method: 'OPTIONS',
          headers: {
            'Origin': window.location.origin,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type, Authorization',
          }
        });

        const corsHeaders = {
          allowOrigin: response.headers.get('Access-Control-Allow-Origin'),
          allowMethods: response.headers.get('Access-Control-Allow-Methods'),
          allowHeaders: response.headers.get('Access-Control-Allow-Headers'),
        };

        if (corsHeaders.allowOrigin === '*' || corsHeaders.allowOrigin === window.location.origin) {
          results.cors = {
            status: 'success',
            message: 'CORS properly configured',
            details: corsHeaders
          };
        } else {
          results.cors = {
            status: 'warning',
            message: 'CORS may be misconfigured',
            details: corsHeaders
          };
        }
      } catch (error: any) {
        results.cors = {
          status: 'warning',
          message: 'Could not verify CORS (server may not support OPTIONS)',
          details: { error: error.message }
        };
      }
    } else {
      results.cors = {
        status: 'skipped',
        message: 'Skipped (server not reachable)',
        details: null
      };
    }

    setDiagnostics(results);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'checking':
        return <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />;
      default:
        return <Activity className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'checking':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#0B3060] rounded-lg">
                <Server className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#0B3060]">Server Diagnostics</h1>
                <p className="text-gray-600">Check backend server and database connectivity</p>
              </div>
            </div>
            <button
              onClick={runDiagnostics}
              disabled={diagnostics.loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${diagnostics.loading ? 'animate-spin' : ''}`} />
              Run Diagnostics
            </button>
          </div>
        </div>

        {/* Diagnostic Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Environment Variables */}
          <div className={`rounded-lg border-2 p-6 ${getStatusColor(diagnostics.environment.status)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-[#0B3060]" />
                <h3 className="text-lg font-bold text-gray-900">Environment Variables</h3>
              </div>
              {getStatusIcon(diagnostics.environment.status)}
            </div>
            <p className="text-gray-700 mb-3">{diagnostics.environment.message}</p>
            {diagnostics.environment.details && (
              <div className="bg-white/50 rounded p-3 text-sm font-mono">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(diagnostics.environment.details, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Server Health */}
          <div className={`rounded-lg border-2 p-6 ${getStatusColor(diagnostics.server.status)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Server className="w-6 h-6 text-[#0B3060]" />
                <h3 className="text-lg font-bold text-gray-900">Server Health</h3>
              </div>
              {getStatusIcon(diagnostics.server.status)}
            </div>
            <p className="text-gray-700 mb-3">{diagnostics.server.message}</p>
            {diagnostics.server.details && (
              <div className="bg-white/50 rounded p-3 text-sm font-mono">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(diagnostics.server.details, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Database Connection */}
          <div className={`rounded-lg border-2 p-6 ${getStatusColor(diagnostics.database.status)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-[#0B3060]" />
                <h3 className="text-lg font-bold text-gray-900">Database Connection</h3>
              </div>
              {getStatusIcon(diagnostics.database.status)}
            </div>
            <p className="text-gray-700 mb-3">{diagnostics.database.message}</p>
            {diagnostics.database.details && (
              <div className="bg-white/50 rounded p-3 text-sm font-mono">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(diagnostics.database.details, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* CORS Configuration */}
          <div className={`rounded-lg border-2 p-6 ${getStatusColor(diagnostics.cors.status)}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Wifi className="w-6 h-6 text-[#0B3060]" />
                <h3 className="text-lg font-bold text-gray-900">CORS Configuration</h3>
              </div>
              {getStatusIcon(diagnostics.cors.status)}
            </div>
            <p className="text-gray-700 mb-3">{diagnostics.cors.message}</p>
            {diagnostics.cors.details && (
              <div className="bg-white/50 rounded p-3 text-sm font-mono">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(diagnostics.cors.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Troubleshooting Guide */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-bold text-[#0B3060] mb-4">Troubleshooting Guide</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">🔴 Server Not Reachable</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Ensure the Supabase Edge Function is deployed</li>
                <li>Check if the project ID is correct in environment variables</li>
                <li>Verify the SUPABASE_URL and SUPABASE_ANON_KEY are set</li>
                <li>The function should be at: <code className="bg-gray-100 px-2 py-1 rounded text-sm">/functions/v1/make-server-df988758</code></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">🟡 Database Connection Issues</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Verify RLS (Row Level Security) policies are properly configured</li>
                <li>Check if the required tables exist: employees, admins, teams, attendance_records</li>
                <li>Ensure the SUPABASE_SERVICE_ROLE_KEY is set in Edge Function</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">🟢 All Systems Operational</h3>
              <p className="text-gray-700">
                If all checks are green, your backend is fully operational and ready to use!
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-lg shadow-md p-6 mt-6 text-white">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://supabase.com/dashboard/project/_/functions"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-colors"
            >
              <h3 className="font-bold mb-2">Deploy Edge Function</h3>
              <p className="text-sm text-white/80">Deploy the backend server to Supabase</p>
            </a>
            <a
              href="https://supabase.com/dashboard/project/_/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-colors"
            >
              <h3 className="font-bold mb-2">API Keys</h3>
              <p className="text-sm text-white/80">View and copy your API keys</p>
            </a>
            <a
              href="https://supabase.com/dashboard/project/_/editor"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 rounded-lg p-4 transition-colors"
            >
              <h3 className="font-bold mb-2">Database Tables</h3>
              <p className="text-sm text-white/80">View and manage database tables</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
