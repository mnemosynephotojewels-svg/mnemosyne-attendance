import { useNavigate } from 'react-router';
import { 
  Rocket, 
  Database, 
  Server,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { projectId } from '/utils/supabase/info';

export function QuickStart() {
  const navigate = useNavigate();

  const steps = [
    {
      number: 1,
      title: 'Deploy Edge Function',
      description: 'Deploy the backend server to Supabase',
      icon: Server,
      color: 'from-blue-500 to-blue-600',
      action: () => navigate('/manual-deployment-guide'),
      actionLabel: 'Deploy Backend',
      status: 'required'
    },
    {
      number: 2,
      title: 'Setup Database',
      description: 'Create tables and initial data',
      icon: Database,
      color: 'from-green-500 to-green-600',
      action: () => navigate('/setup'),
      actionLabel: 'Setup Database',
      status: 'required'
    },
    {
      number: 3,
      title: 'Test Login',
      description: 'Verify everything works',
      icon: CheckCircle,
      color: 'from-purple-500 to-purple-600',
      action: () => navigate('/login-auto-fix'),
      actionLabel: 'Test System',
      status: 'recommended'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] px-8 py-6 text-white">
            <div className="flex items-center gap-3">
              <Rocket className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Quick Start Guide</h1>
                <p className="text-sm text-white/90 mt-1">
                  Get your Mnemosyne QR Attendance System up and running in 3 steps
                </p>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="p-8 bg-yellow-50 border-b border-yellow-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Setup Required</h3>
                <p className="text-sm text-yellow-800">
                  Due to deployment limitations, you need to manually deploy the Edge Function and setup the database before using the system.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-300"
            >
              <div className="p-8">
                <div className="flex items-start gap-6">
                  {/* Step Number */}
                  <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                    {step.number}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                          <step.icon className="w-6 h-6" />
                          {step.title}
                        </h3>
                        <p className="text-gray-600">{step.description}</p>
                      </div>
                      {step.status === 'required' && (
                        <span className="bg-red-100 text-red-800 text-xs font-semibold px-3 py-1 rounded-full">
                          Required
                        </span>
                      )}
                      {step.status === 'recommended' && (
                        <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={step.action}
                      size="lg"
                      className={`bg-gradient-to-r ${step.color} hover:opacity-90`}
                    >
                      <ArrowRight className="w-5 h-5" />
                      {step.actionLabel}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Progress Connector */}
              {index < steps.length - 1 && (
                <div className="flex justify-center">
                  <div className="w-0.5 h-4 bg-gray-200" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* What You'll Get */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 bg-green-50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              What You'll Get
            </h2>
          </div>
          <div className="p-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Employee Portal</h3>
                  <p className="text-sm text-gray-600">QR code, attendance tracking, leave requests</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Admin Portal</h3>
                  <p className="text-sm text-gray-600">Team management, schedule, leave approvals</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Super Admin Portal</h3>
                  <p className="text-sm text-gray-600">Full system control, admin management</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Kiosk Mode</h3>
                  <p className="text-sm text-gray-600">QR scanner for office check-in/out</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Additional Resources</h2>
          </div>
          <div className="p-8">
            <div className="grid md:grid-cols-3 gap-4">
              <Button
                onClick={() => window.open(`https://supabase.com/dashboard/project/${projectId}`, '_blank')}
                variant="outline"
                className="w-full"
              >
                <ExternalLink className="w-4 h-4" />
                Supabase Dashboard
              </Button>
              <Button
                onClick={() => navigate('/diagnostic-hub')}
                variant="outline"
                className="w-full"
              >
                Diagnostic Tools
              </Button>
              <Button
                onClick={() => navigate('/deployment-guide')}
                variant="outline"
                className="w-full"
              >
                Deployment Guide
              </Button>
            </div>
          </div>
        </div>

        {/* Need Help */}
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-3">
            Having trouble? Use our diagnostic tools to identify issues
          </p>
          <Button
            onClick={() => navigate('/diagnostic-hub')}
            variant="outline"
            size="lg"
          >
            Open Diagnostic Hub
          </Button>
        </div>
      </div>
    </div>
  );
}
