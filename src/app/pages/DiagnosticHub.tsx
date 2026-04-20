import { useNavigate } from 'react-router';
import { 
  Shield, 
  Wrench, 
  Activity, 
  Key, 
  Rocket,
  Database,
  Settings as SettingsIcon,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';

export function DiagnosticHub() {
  const navigate = useNavigate();

  const tools = [
    {
      title: 'Login Auto-Fix',
      description: 'Automatically diagnose ALL login issues and show you working credentials',
      icon: Wrench,
      color: 'from-red-500 to-red-600',
      path: '/login-auto-fix',
      recommended: true
    },
    {
      title: 'Login Credential Tester',
      description: 'Test your exact username and password step-by-step to identify login issues',
      icon: Key,
      color: 'from-blue-500 to-blue-600',
      path: '/login-credential-tester'
    },
    {
      title: 'Login Diagnostic',
      description: 'Full system diagnostic including backend connection and account management',
      icon: Shield,
      color: 'from-purple-500 to-purple-600',
      path: '/login-diagnostic'
    },
    {
      title: 'Backend Health Check',
      description: 'Check if the Edge Function server is running and responding',
      icon: Activity,
      color: 'from-green-500 to-green-600',
      path: '/health'
    },
    {
      title: 'Deployment Guide',
      description: 'Step-by-step guide to deploy the Edge Function in Supabase Dashboard',
      icon: Rocket,
      color: 'from-orange-500 to-orange-600',
      path: '/deployment-guide'
    },
    {
      title: 'Database Setup',
      description: 'Initialize and configure database tables and schemas',
      icon: Database,
      color: 'from-indigo-500 to-indigo-600',
      path: '/setup'
    },
    {
      title: 'Settings Debug',
      description: 'View system configuration and environment variables',
      icon: SettingsIcon,
      color: 'from-gray-500 to-gray-600',
      path: '/settings-debug'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#0B3060] to-[#0d2847] mb-6">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Diagnostic Hub
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Troubleshoot login issues and verify your Mnemosyne QR Attendance System configuration
          </p>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 mb-8 text-white shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">Can't log in?</h2>
              <p className="text-blue-100 text-sm">
                Start here to diagnose your login credentials
              </p>
            </div>
            <Button
              onClick={() => navigate('/login-credential-tester')}
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              Test Credentials
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>

        {/* Tool Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <div
                key={index}
                onClick={() => navigate(tool.path)}
                className="group relative bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                {/* Recommended Badge */}
                {tool.recommended && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 shadow-md">
                      ⭐ Recommended
                    </span>
                  </div>
                )}

                {/* Icon Header */}
                <div className="p-6 pb-4">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#0B3060] transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6">
                  <div className="flex items-center text-sm font-medium text-[#0B3060] group-hover:text-[#F7B34C] transition-colors">
                    Open Tool
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Hover Effect Border */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#0B3060] rounded-2xl transition-colors pointer-events-none" />
              </div>
            );
          })}
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-white rounded-2xl shadow-md border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Need Help?</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0B3060] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </div>
              <p>
                <strong>First time setup?</strong> Start with the <strong>Deployment Guide</strong> to deploy your Edge Function server
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0B3060] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </div>
              <p>
                <strong>Login not working?</strong> Use the <strong>Login Credential Tester</strong> to verify your exact username and password
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0B3060] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </div>
              <p>
                <strong>Backend issues?</strong> Check the <strong>Backend Health Check</strong> to verify your server is running
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0B3060] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                4
              </div>
              <p>
                <strong>Database problems?</strong> Run <strong>Database Setup</strong> to initialize or reset your database tables
              </p>
            </div>
          </div>
        </div>

        {/* Back to Login */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="lg"
            className="px-8"
          >
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}