import React, { useState } from 'react';
import { 
  Rocket, 
  Database, 
  CheckCircle, 
  Copy, 
  Terminal, 
  Server,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  FileCode
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { projectId } from '/utils/supabase/info';

export function DeploymentGuide() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const copyToClipboard = (text: string, stepNumber: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepNumber);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const deploymentSteps = [
    {
      title: 'Open Supabase Dashboard',
      description: 'Navigate to your Supabase project dashboard',
      action: (
        <Button
          onClick={() => window.open(`https://supabase.com/dashboard/project/${projectId}`, '_blank')}
          className="w-full"
        >
          <ExternalLink className="w-4 h-4" />
          Open Dashboard
        </Button>
      ),
      icon: Database
    },
    {
      title: 'Navigate to Edge Functions',
      description: 'In the left sidebar, click on "Edge Functions"',
      icon: Server
    },
    {
      title: 'Find "make-server" Function',
      description: 'Look for the Edge Function named "make-server-df988758" in the list',
      icon: FileCode
    },
    {
      title: 'Deploy the Function',
      description: 'Click the "Deploy" button to deploy the updated server code',
      details: [
        'The Edge Function contains all authentication endpoints',
        'It handles employee, admin, and super admin login',
        'Leave request management with automatic attendance record creation',
        'Full CRUD operations for the system'
      ],
      icon: Rocket
    },
    {
      title: 'Wait for Deployment',
      description: 'The deployment process usually takes 30-60 seconds',
      icon: Terminal
    },
    {
      title: 'Verify Deployment',
      description: 'Once deployed, test the backend connection',
      action: (
        <Button
          onClick={() => window.location.href = '/health'}
          variant="outline"
          className="w-full"
        >
          <CheckCircle className="w-4 h-4" />
          Test Backend Health
        </Button>
      ),
      icon: CheckCircle
    }
  ];

  const codeSnippet = `// Edge Function Server Code
// Location: /supabase/functions/server/index.tsx

Key Endpoints:
- POST /make-server-df988758/employees/login
- POST /make-server-df988758/admins/login  
- POST /make-server-df988758/super-admins/login
- GET  /make-server-df988758/super-admin/list
- POST /make-server-df988758/auth/login (unified)
- GET  /make-server-df988758/health
- POST /make-server-df988758/leave-requests/create
- PUT  /make-server-df988758/leave-requests/:id/status
- GET  /make-server-df988758/leave-requests`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-[#0B3060] to-[#0d2847] px-8 py-6 text-white">
            <div className="flex items-center gap-3">
              <Rocket className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Edge Function Deployment Guide</h1>
                <p className="text-sm text-white/80 mt-1">
                  Deploy the backend server to enable authentication and API endpoints
                </p>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="p-6 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  ⚠️ Deployment Required
                </h3>
                <p className="text-sm text-yellow-700 mb-2">
                  The Edge Function server code has been updated with all necessary endpoints,
                  but it needs to be deployed in the Supabase Dashboard before it will work.
                </p>
                <p className="text-sm text-yellow-700">
                  Follow the steps below to deploy the server and enable all authentication
                  and API functionality.
                </p>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              What's Been Updated
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Complete backend server with all authentication endpoints</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Employee, Admin, and Super Admin login endpoints</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Super Admin account listing endpoint</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Leave request CRUD operations</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Automatic attendance record creation on leave approval</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Health check endpoint for diagnostics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deployment Steps */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Deployment Steps</h2>
            <p className="text-sm text-gray-600 mt-1">
              Follow these steps to deploy the Edge Function server
            </p>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {deploymentSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex gap-4">
                    {/* Step Number */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#0B3060] text-white flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <Icon className="w-5 h-5 text-[#0B3060] mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{step.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                          
                          {step.details && (
                            <ul className="mt-3 space-y-1 text-sm text-gray-600">
                              {step.details.map((detail, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-[#F7B34C]">•</span>
                                  <span>{detail}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {step.action && (
                            <div className="mt-3">
                              {step.action}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* API Endpoints Reference */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">API Endpoints</h2>
              <p className="text-sm text-gray-600 mt-1">
                Available endpoints after deployment
              </p>
            </div>
            <Button
              onClick={() => copyToClipboard(codeSnippet, 99)}
              variant="outline"
              size="sm"
            >
              {copiedStep === 99 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Copy
            </Button>
          </div>

          <div className="p-6">
            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-green-400 font-mono whitespace-pre">
                {codeSnippet}
              </pre>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Terminal className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-blue-900 mb-1">Base URL</p>
                  <code className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-800 font-mono">
                    https://{projectId}.supabase.co/functions/v1/make-server-df988758
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex gap-4">
          <Button
            onClick={() => window.location.href = '/health'}
            className="flex-1"
            size="lg"
          >
            <CheckCircle className="w-5 h-5" />
            Test Backend Health
          </Button>
          <Button
            onClick={() => window.location.href = '/login'}
            variant="outline"
            className="flex-1"
          >
            <ArrowRight className="w-5 h-5" />
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
}