import React from 'react';
import { useNavigate } from 'react-router';
import { Home, ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <Logo className="text-5xl mb-6" />
        
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-8">
          <div className="text-8xl font-bold text-[#F7B34C] mb-4">404</div>
          <h1 className="text-3xl font-bold text-white mb-3">Page Not Found</h1>
          <p className="text-white/60 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#F7B34C] to-[#e5a23b] hover:from-[#e5a23b] hover:to-[#d49330] text-[#0B3060] rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Go to Home
            </button>
            
            <button
              onClick={() => navigate(-1)}
              className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
