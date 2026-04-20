import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Play, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function ManualLoginTest() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testLogin = async () => {
    setTesting(true);
    setResult(null);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 MANUAL LOGIN TEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username:', `"${username}"`);
    console.log('Password:', `"${password}"`);
    console.log('Username length:', username.length);
    console.log('Password length:', password.length);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          username: username,
          password: password
        }),
      });

      const data = await response.json();
      
      console.log('Response status:', response.status);
      console.log('Response data:', data);

      setResult({
        success: data.success,
        status: response.status,
        data: data,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Request error:', error);
      setResult({
        success: false,
        status: 0,
        data: { error: error.message },
        timestamp: new Date().toISOString()
      });
    } finally {
      setTesting(false);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Login
          </button>
        </div>

        {/* Title */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-[#0B3060] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Manual Login Test
          </h1>
          <p className="text-gray-600 mb-6">
            Enter your credentials exactly as they are stored in your database.
          </p>

          {/* Form */}
          <div className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username exactly as stored"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0B3060] focus:ring-2 focus:ring-[#0B3060]/20 outline-none transition-all font-mono text-sm"
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-1">
                Character count: {username.length}
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password exactly as stored"
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:border-[#0B3060] focus:ring-2 focus:ring-[#0B3060]/20 outline-none transition-all font-mono text-sm"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Character count: {password.length}
              </p>
            </div>

            {/* Test Button */}
            <button
              onClick={testLogin}
              disabled={testing || !username || !password}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#0B3060] hover:bg-[#1a4a8a] text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
              {testing ? 'Testing Login...' : 'Test Login'}
            </button>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-yellow-900 mb-2">⚠️ Important Notes:</h3>
              <ul className="text-sm text-yellow-800 space-y-2 list-disc ml-4">
                <li><strong>Passwords are case-sensitive</strong> - "Password123" ≠ "password123"</li>
                <li><strong>Watch for extra spaces</strong> - " admin " ≠ "admin"</li>
                <li><strong>Special characters matter</strong> - "pass@123" ≠ "pass123"</li>
                <li><strong>Check character count</strong> - Shown above each field</li>
                <li><strong>Copy from database</strong> - Use Table Editor to copy exact values</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className={`bg-white/95 backdrop-blur-xl rounded-xl shadow-xl p-6 border-2 ${
            result.success ? 'border-green-300' : 'border-red-300'
          }`}>
            <div className="flex items-start gap-4 mb-4">
              {result.success ? (
                <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {result.success ? '✅ Login Successful!' : '❌ Login Failed'}
                </h3>
                <p className="text-sm text-gray-600">
                  HTTP Status: {result.status} • {result.timestamp}
                </p>
              </div>
            </div>

            {/* Response Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Full Backend Response:</p>
              <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap font-mono bg-white p-3 rounded border border-gray-200">
{JSON.stringify(result.data, null, 2)}
              </pre>
            </div>

            {/* Success Actions */}
            {result.success && (
              <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-900 mb-3">
                  🎉 Great! Your credentials work. You can now log in normally.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 bg-[#0B3060] hover:bg-[#1a4a8a] text-white rounded-lg text-sm font-bold transition-colors"
                >
                  Go to Login Page
                </button>
              </div>
            )}

            {/* Failure Help */}
            {!result.success && (
              <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  💡 Troubleshooting Steps:
                </p>
                <ol className="text-sm text-red-800 space-y-2 list-decimal ml-4">
                  <li>
                    <strong>Check Supabase Logs:</strong>
                    <ul className="mt-1 space-y-1 list-disc ml-4">
                      <li>Go to Supabase Dashboard → Edge Functions → make-server-df988758 → Logs</li>
                      <li>Look for character-by-character password comparison</li>
                      <li>It will show EXACTLY what's different</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Verify Database Values:</strong>
                    <ul className="mt-1 space-y-1 list-disc ml-4">
                      <li>Go to Supabase Dashboard → Table Editor</li>
                      <li>Open your account table (employees/admins/super_admin)</li>
                      <li>Copy the EXACT username and password values</li>
                      <li>Paste them into this form</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Common Issues:</strong>
                    <ul className="mt-1 space-y-1 list-disc ml-4">
                      <li>Password stored as NULL in database</li>
                      <li>Extra spaces at beginning or end</li>
                      <li>Wrong case (uppercase vs lowercase)</li>
                      <li>Different special characters</li>
                    </ul>
                  </li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Helper Tools */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => navigate('/direct-database-test')}
            className="w-full px-4 py-3 bg-green-50 hover:bg-green-100 border-2 border-green-200 text-green-800 rounded-lg font-bold transition-colors"
          >
            📊 View All Database Accounts
          </button>
          <button
            onClick={() => navigate('/login-diagnostic')}
            className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 text-purple-800 rounded-lg font-bold transition-colors"
          >
            🔍 Run Full Diagnostic
          </button>
        </div>
      </div>
    </div>
  );
}
