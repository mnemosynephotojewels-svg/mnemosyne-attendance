import React, { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function LoginTest() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };

  const testLogin = async () => {
    setLogs([]);
    setResponse(null);

    addLog('🚀 STARTING LOGIN TEST');
    addLog(`API URL: ${API_BASE_URL}/auth/login`);
    addLog(`Username: "${username}"`);
    addLog(`Password length: ${password.length}`);
    addLog(`Public Anon Key (first 20 chars): ${publicAnonKey.substring(0, 20)}...`);

    try {
      const requestBody = {
        username: username,
        password: password
      };

      addLog(`Request body: ${JSON.stringify(requestBody)}`);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      };

      addLog(`Headers: ${JSON.stringify({ ...headers, Authorization: 'Bearer ***' })}`);

      addLog('Sending fetch request...');

      const fetchResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      addLog(`Response status: ${fetchResponse.status} ${fetchResponse.statusText}`);
      addLog(`Response ok: ${fetchResponse.ok}`);
      addLog(`Response headers: ${JSON.stringify(Object.fromEntries(fetchResponse.headers.entries()))}`);

      const responseText = await fetchResponse.text();
      addLog(`Response text (first 500 chars): ${responseText.substring(0, 500)}`);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        addLog(`Response JSON: ${JSON.stringify(responseData, null, 2)}`);
      } catch (e) {
        addLog(`Failed to parse response as JSON: ${e}`);
        responseData = { error: 'Invalid JSON response', raw: responseText };
      }

      setResponse({
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        ok: fetchResponse.ok,
        data: responseData
      });

      if (fetchResponse.ok && responseData.success) {
        addLog('✅ LOGIN SUCCESSFUL!');
        addLog(`User type: ${responseData.userType}`);
        addLog(`User data: ${JSON.stringify(responseData.data)}`);
      } else {
        addLog('❌ LOGIN FAILED');
        addLog(`Error: ${responseData.error || 'Unknown error'}`);
      }

    } catch (error: any) {
      addLog(`❌ EXCEPTION: ${error.message}`);
      addLog(`Error stack: ${error.stack}`);
      setResponse({
        error: error.message,
        stack: error.stack
      });
    }
  };

  const testBackendLogs = () => {
    addLog('📋 To view backend logs:');
    addLog('1. Go to Supabase Dashboard');
    addLog('2. Click "Edge Functions" in sidebar');
    addLog('3. Click "make-server-df988758"');
    addLog('4. Click "Logs" tab');
    addLog('5. Look for the login request with timestamp');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-6">🔍 Login Diagnostic Tool</h1>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Username / Employee ID:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="e.g., EMP001, ADM001, or superadmin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password:</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Enter password"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={testLogin}
                disabled={!username || !password}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Test Login
              </button>

              <button
                onClick={testBackendLogs}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Show Backend Logs Instructions
              </button>

              <button
                onClick={() => {
                  setLogs([]);
                  setResponse(null);
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Frontend Logs */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">📝 Frontend Logs:</h2>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Enter credentials and click "Test Login"</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>

          {/* Response */}
          {response && (
            <div>
              <h2 className="text-lg font-semibold mb-3">📦 Response:</h2>
              <div className="bg-gray-100 p-4 rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">📋 How to Use:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Enter your exact username/employee ID from the database</li>
            <li>Enter your exact password from the database</li>
            <li>Click "Test Login" to see detailed frontend logs</li>
            <li>Click "Show Backend Logs Instructions" to see how to view server logs</li>
            <li>Compare frontend logs with backend logs to identify the issue</li>
          </ol>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-semibold mb-2">🔍 Common Issues:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>401 Unauthorized:</strong> Username or password doesn't match database</li>
              <li><strong>Network error:</strong> Edge Function not deployed or wrong URL</li>
              <li><strong>500 Server error:</strong> Backend code issue - check Edge Function logs</li>
              <li><strong>CORS error:</strong> Missing Authorization header or wrong origin</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="font-semibold mb-2">✅ What to Check in Backend Logs:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Does it show "🔐 UNIFIED LOGIN REQUEST RECEIVED"?</li>
              <li>What username and password did it receive?</li>
              <li>Which tables did it check? (employees, admins, super_admin)</li>
              <li>Did it find any matching records?</li>
              <li>Does the password match character-by-character?</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
