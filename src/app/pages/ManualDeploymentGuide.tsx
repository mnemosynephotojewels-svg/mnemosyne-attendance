import { useState } from 'react';
import { 
  Upload, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Code,
  Terminal,
  Play,
  Rocket
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function ManualDeploymentGuide() {
  const [copied, setCopied] = useState<string | null>(null);
  const [testingBackend, setTestingBackend] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'working' | 'not-deployed'>('unknown');

  const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const testBackend = async () => {
    setTestingBackend(true);
    try {
      const response = await fetch(`${API_URL}/health`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      if (response.ok) {
        setBackendStatus('working');
        toast.success('✅ Backend is running!');
      } else {
        setBackendStatus('not-deployed');
        toast.error('❌ Backend not responding');
      }
    } catch (error) {
      setBackendStatus('not-deployed');
      toast.error('❌ Cannot connect to backend');
    }
    setTestingBackend(false);
  };

  const supabaseUrl = `https://supabase.com/dashboard/project/${projectId}/functions`;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6 text-white">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Deployment Error - Manual Fix Required</h1>
                <p className="text-sm text-white/90 mt-1">
                  Auto-deployment failed. Follow these steps to deploy manually via Supabase Dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Error Info */}
          <div className="p-8 bg-red-50 border-b border-red-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">What Happened?</h3>
                <p className="text-sm text-red-800 mb-2">
                  The automatic deployment failed with error: <code className="bg-red-100 px-2 py-0.5 rounded">XHR status 0</code>
                </p>
                <p className="text-sm text-red-700">
                  This is a network/CORS issue with the deployment endpoint. <strong>Don't worry!</strong> You can deploy manually in 5 minutes by following the steps below.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Backend Status Check */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-600" />
              Step 0: Check Current Status
            </h2>
          </div>
          <div className="p-8">
            <p className="text-gray-600 mb-4">
              First, let's check if your backend is already deployed:
            </p>
            <Button
              onClick={testBackend}
              disabled={testingBackend}
              size="lg"
              className="w-full sm:w-auto"
            >
              {testingBackend ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Test Backend Connection
                </>
              )}
            </Button>

            {backendStatus === 'working' && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900">✅ Backend is Already Running!</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Your Edge Function is deployed and working. You can skip the manual deployment and go straight to testing your login.
                    </p>
                    <Button
                      onClick={() => window.location.href = '/login-auto-fix'}
                      className="mt-3"
                      size="sm"
                    >
                      Go to Login Auto-Fix
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {backendStatus === 'not-deployed' && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900">❌ Backend Not Deployed</h4>
                    <p className="text-sm text-red-700 mt-1">
                      The Edge Function is not responding. Follow the manual deployment steps below.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Manual Deployment Steps */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 bg-blue-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-blue-600" />
              Manual Deployment Steps (5 Minutes)
            </h2>
          </div>

          <div className="p-8 space-y-8">
            {/* Step 1 */}
            <div className="relative pl-8 pb-8 border-l-2 border-blue-200">
              <div className="absolute -left-4 top-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                1
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">Open Supabase Dashboard</h3>
              <p className="text-gray-600 mb-4">
                Click the button below to open your Supabase Functions page:
              </p>
              <Button
                onClick={() => window.open(supabaseUrl, '_blank')}
                size="lg"
                className="gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Open Supabase Functions Dashboard
              </Button>
              <p className="text-sm text-gray-500 mt-3">
                📝 You'll need to log in to Supabase if you haven't already
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative pl-8 pb-8 border-l-2 border-blue-200">
              <div className="absolute -left-4 top-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                2
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">Create New Function</h3>
              <div className="space-y-3 text-gray-600">
                <p>In the Supabase Dashboard:</p>
                <ol className="list-decimal list-inside space-y-2 pl-4">
                  <li>Click the <strong>"Create a new function"</strong> button</li>
                  <li>Name it: <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">make-server-df988758</code></li>
                  <li>Click <strong>"Create function"</strong></li>
                </ol>
              </div>

              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Important:</strong> The function name MUST be exactly <code className="bg-yellow-100 px-2 py-0.5 rounded">make-server-df988758</code> (with the exact suffix)
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative pl-8 pb-8 border-l-2 border-blue-200">
              <div className="absolute -left-4 top-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                3
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">Copy the Server Code</h3>
              <p className="text-gray-600 mb-4">
                Copy the Edge Function code from your project:
              </p>
              
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <div className="flex items-center gap-2 text-gray-300 text-sm">
                    <Code className="w-4 h-4" />
                    <span>/supabase/functions/server/index.tsx</span>
                  </div>
                  <Button
                    onClick={() => {
                      // In a real implementation, you'd read the actual file content
                      toast.info('Go to /supabase/functions/server/index.tsx in your project');
                    }}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View in Project
                  </Button>
                </div>
                <div className="p-4 text-gray-300 text-sm">
                  <p className="mb-2">👈 Find this file in your Figma Make project file tree</p>
                  <p className="text-gray-400">Path: <code className="text-blue-400">/supabase/functions/server/index.tsx</code></p>
                </div>
              </div>

              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Terminal className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>How to copy:</strong> Open the file <code>/supabase/functions/server/index.tsx</code> in your project, select all the code (Ctrl+A / Cmd+A), and copy it (Ctrl+C / Cmd+C)
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative pl-8 pb-8 border-l-2 border-blue-200">
              <div className="absolute -left-4 top-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                4
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">Paste Code in Supabase</h3>
              <div className="space-y-3 text-gray-600">
                <p>In the Supabase Function editor:</p>
                <ol className="list-decimal list-inside space-y-2 pl-4">
                  <li>Delete the default example code</li>
                  <li>Paste your copied code (Ctrl+V / Cmd+V)</li>
                  <li>The code should start with <code className="bg-gray-100 px-2 py-0.5 rounded">import &#123; Hono &#125; from "npm:hono";</code></li>
                </ol>
              </div>
            </div>

            {/* Step 5 */}
            <div className="relative pl-8 pb-8 border-l-2 border-blue-200">
              <div className="absolute -left-4 top-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                5
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">Configure Environment</h3>
              <p className="text-gray-600 mb-4">
                Your Edge Function needs these environment variables (they should already be set):
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid gap-3 text-sm font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">SUPABASE_URL</span>
                    <span className="text-green-600">✓ Auto-set</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">SUPABASE_SERVICE_ROLE_KEY</span>
                    <span className="text-green-600">✓ Auto-set</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">SUPABASE_ANON_KEY</span>
                    <span className="text-green-600">✓ Auto-set</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <strong>Good news:</strong> These environment variables are automatically provided by Supabase. You don't need to configure anything.
                  </div>
                </div>
              </div>
            </div>

            {/* Step 6 */}
            <div className="relative pl-8">
              <div className="absolute -left-4 top-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                6
              </div>
              <h3 className="font-bold text-gray-900 mb-3 text-lg">Deploy!</h3>
              <div className="space-y-3 text-gray-600">
                <p>Final step:</p>
                <ol className="list-decimal list-inside space-y-2 pl-4">
                  <li>Click the <strong>"Deploy"</strong> button in the Supabase editor</li>
                  <li>Wait for the deployment to complete (~30-60 seconds)</li>
                  <li>Look for a success message ✅</li>
                </ol>
              </div>

              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg">
                <div className="flex items-center gap-3">
                  <Rocket className="w-6 h-6 text-green-600" />
                  <div>
                    <h4 className="font-bold text-green-900">Deployment Complete!</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Once deployed, come back here and test your backend connection.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* After Deployment */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 bg-green-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              After Deployment
            </h2>
          </div>
          <div className="p-8">
            <p className="text-gray-600 mb-6">
              Once you've deployed the Edge Function, test if it's working:
            </p>
            
            <div className="space-y-4">
              <Button
                onClick={testBackend}
                disabled={testingBackend}
                size="lg"
                className="w-full"
              >
                {testingBackend ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Test Backend Connection
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-gray-500">
                If the test is successful, proceed to login testing
              </div>

              <Button
                onClick={() => window.location.href = '/login-auto-fix'}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Go to Login Auto-Fix Tool
              </Button>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Troubleshooting
            </h2>
          </div>
          <div className="p-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">❌ "Function not found" error</h3>
                <p className="text-sm text-gray-600">
                  Make sure the function name is exactly: <code className="bg-gray-100 px-2 py-0.5 rounded">make-server-df988758</code>
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">❌ Deployment fails with syntax errors</h3>
                <p className="text-sm text-gray-600">
                  Make sure you copied the ENTIRE code from <code className="bg-gray-100 px-2 py-0.5 rounded">/supabase/functions/server/index.tsx</code>
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">❌ "Cannot read properties" errors</h3>
                <p className="text-sm text-gray-600">
                  Check that the environment variables are set. They should be automatic, but you can verify in the Function settings.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">✅ Still need help?</h3>
                <p className="text-sm text-gray-600 mb-3">
                  If you're still having issues, check the Supabase Functions logs for detailed error messages.
                </p>
                <Button
                  onClick={() => window.open(`https://supabase.com/dashboard/project/${projectId}/functions`, '_blank')}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Function Logs
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4">
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            Back to Login
          </Button>
          <Button
            onClick={() => window.location.href = '/diagnostic-hub'}
            variant="outline"
          >
            Diagnostic Hub
          </Button>
          <Button
            onClick={() => window.location.href = '/setup'}
            variant="outline"
          >
            Database Setup
          </Button>
        </div>
      </div>
    </div>
  );
}
