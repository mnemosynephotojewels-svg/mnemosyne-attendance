import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle, RefreshCw, Server, Database } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function BackendHealthCheck() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [details, setDetails] = useState<any>(null);
  const [rawResponse, setRawResponse] = useState<string>('');

  const checkHealth = async () => {
    setStatus('checking');
    setDetails(null);
    setRawResponse('');

    try {
      console.log('🏥 Checking backend health...');
      console.log('URL:', `${API_BASE_URL}/health`);

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      setRawResponse(responseText);
      console.log('Raw response:', responseText);

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          setDetails({
            status: response.status,
            contentType: response.headers.get('content-type'),
            data,
          });
          setStatus('success');
        } catch (e) {
          setDetails({
            status: response.status,
            contentType: response.headers.get('content-type'),
            error: 'Invalid JSON response',
            text: responseText,
          });
          setStatus('error');
        }
      } else {
        setDetails({
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          text: responseText,
        });
        setStatus('error');
      }
    } catch (error: any) {
      console.error('Health check error:', error);
      setDetails({
        error: error.message,
        type: error.constructor.name,
      });
      setStatus('error');
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0B3060] to-[#0d2847] px-8 py-6 text-white">
            <div className="flex items-center gap-3">
              <Server className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Backend Health Check</h1>
                <p className="text-sm text-white/80 mt-1">Mnemosyne QR Attendance System</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {status === 'checking' && (
                  <>
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    <span className="text-lg font-semibold text-slate-700">Checking backend...</span>
                  </>
                )}
                {status === 'success' && (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-lg font-semibold text-green-700">Backend is running!</span>
                  </>
                )}
                {status === 'error' && (
                  <>
                    <XCircle className="w-6 h-6 text-red-600" />
                    <span className="text-lg font-semibold text-red-700">Backend is not responding</span>
                  </>
                )}
              </div>
              <button
                onClick={checkHealth}
                disabled={status === 'checking'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${status === 'checking' ? 'animate-spin' : ''}`} />
                Recheck
              </button>
            </div>

            {/* Endpoint Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Endpoint Information
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <span className="text-slate-500 w-32">Base URL:</span>
                  <code className="text-slate-700 font-mono text-xs bg-white px-2 py-1 rounded border border-slate-200 flex-1 break-all">
                    {API_BASE_URL}
                  </code>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500 w-32">Health Check:</span>
                  <code className="text-slate-700 font-mono text-xs bg-white px-2 py-1 rounded border border-slate-200 flex-1 break-all">
                    {API_BASE_URL}/health
                  </code>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500 w-32">Project ID:</span>
                  <code className="text-slate-700 font-mono text-xs bg-white px-2 py-1 rounded border border-slate-200">
                    {projectId}
                  </code>
                </div>
              </div>
            </div>

            {/* Details */}
            {details && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Response Details</h3>
                  <pre className="text-xs text-slate-700 overflow-auto bg-white p-3 rounded border border-slate-200 font-mono max-h-64">
                    {JSON.stringify(details, null, 2)}
                  </pre>
                </div>

                {rawResponse && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Raw Response</h3>
                    <pre className="text-xs text-slate-700 overflow-auto bg-white p-3 rounded border border-slate-200 font-mono max-h-64">
                      {rawResponse}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            {status === 'error' && (
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900 mb-2">
                      Backend Server Not Running
                    </h4>
                    <p className="text-sm text-amber-800 mb-3">
                      The Edge Function needs to be deployed. Follow these steps:
                    </p>
                    <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
                      <li>Go to your Supabase Dashboard</li>
                      <li>Navigate to <strong>Edge Functions</strong></li>
                      <li>Deploy the <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">make-server-df988758</code> function</li>
                      <li>Wait for deployment to complete (usually 30-60 seconds)</li>
                      <li>Click the "Recheck" button above</li>
                    </ol>
                    <div className="mt-4 p-3 bg-amber-100 rounded border border-amber-300">
                      <p className="text-xs text-amber-900 font-medium">
                        💡 <strong>Quick Fix:</strong> The Edge Function code is already in your project at:
                      </p>
                      <code className="text-xs text-amber-900 font-mono block mt-1">
                        /supabase/functions/server/index.tsx
                      </code>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={() => window.location.href = '/deployment-guide'}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        📘 View Detailed Deployment Guide
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {status === 'success' && (
              <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-green-900 mb-1">
                      Backend is Ready!
                    </h4>
                    <p className="text-sm text-green-800">
                      The backend server is running and responding correctly. All API endpoints should work now.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}