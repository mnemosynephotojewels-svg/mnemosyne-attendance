import React from 'react';
import { useNavigate } from 'react-router';
import { Logo } from '../components/Logo';
import { Users, Shield, Crown, Monitor } from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();

  const buttons = [
    {
      label: 'Universal Login',
      icon: Users,
      onClick: () => navigate('/login'),
      description: 'Login with your credentials (All users)',
      gradient: 'from-blue-500 to-blue-600',
      highlight: true,
    },
    {
      label: 'Kiosk Mode',
      icon: Monitor,
      onClick: () => navigate('/kiosk'),
      description: 'QR code scanning station',
      gradient: 'from-emerald-500 to-emerald-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white rounded-2xl shadow-2xl p-8 sm:p-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo variant="dark" />
          <div className="mt-6 text-center">
            <p className="text-muted-foreground uppercase tracking-wider text-xs font-semibold mb-1">
              Welcome to
            </p>
            <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              Attendance System
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {buttons.map((button, index) => {
            const IconComponent = button.icon;
            return (
              <button
                key={index}
                onClick={button.onClick}
                className="w-full bg-primary hover:bg-primary-light text-white px-6 py-4 rounded-xl transition-all flex items-center gap-4 group shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-base">{button.label}</div>
                  <div className="text-xs text-white/70 mt-0.5">{button.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="mb-4">
            <button
              onClick={() => navigate('/quick-login-fix')}
              className="w-full mb-4 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>🔧</span>
              <span>Quick Login Fix - Create Test Accounts</span>
            </button>
            <p className="text-center text-xs text-gray-500 mb-2">Or use legacy login pages:</p>
            <div className="flex justify-center gap-2 flex-wrap">
              <button
                onClick={() => navigate('/login')}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                Admin
              </button>
              <button
                onClick={() => navigate('/login')}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                Super Admin
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            © 2026 Mnemosyne Creation. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}