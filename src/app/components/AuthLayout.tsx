import React from 'react';
import { Logo } from '../components/Logo';
import { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  showBackButton?: boolean;
}

export function AuthLayout({ children, title, subtitle, icon: Icon, showBackButton = true }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-primary-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute top-1/3 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back Button */}
        {showBackButton && (
          <button
            onClick={() => navigate('/')}
            className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-medium">Back to Portal Selection</span>
          </button>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <Logo variant="dark" />
            
            <div className="mt-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary-light rounded-2xl mb-4 shadow-lg">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
              <p className="text-muted-foreground text-sm">{subtitle}</p>
            </div>
          </div>

          {/* Form Content */}
          <div>{children}</div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-muted-foreground">
              © 2026 Mnemosyne Creation. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
