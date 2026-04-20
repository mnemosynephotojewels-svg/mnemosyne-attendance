import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Rocket, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function StartupCheck() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    checkBackend();
  }, []);

  const checkBackend = async () => {
    try {
      const response = await fetch(`${API_URL}/health`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      if (response.ok) {
        setStatus('success');
        // Backend is working, redirect to quick login fix
        setTimeout(() => navigate('/quick-login-fix'), 1000);
      } else {
        setStatus('error');
        startCountdown();
      }
    } catch (error) {
      setStatus('error');
      startCountdown();
    }
  };

  const startCountdown = () => {
    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
        navigate('/one-click-fix');
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center space-y-6">
          {status === 'checking' && (
            <>
              <div className="flex justify-center">
                <Loader2 className="w-16 h-16 text-[#0B3060] animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Checking System Status
              </h2>
              <p className="text-gray-600">
                Please wait while we verify the backend connection...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-green-900">
                All Systems Ready!
              </h2>
              <p className="text-gray-600">
                Redirecting to login...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-red-900">
                Backend Not Deployed
              </h2>
              <p className="text-gray-600">
                The Edge Function needs to be deployed manually. Redirecting to deployment guide in...
              </p>
              <div className="text-5xl font-bold text-[#0B3060]">
                {countdown}
              </div>
              <button
                onClick={() => navigate('/one-click-fix')}
                className="w-full bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              >
                <Rocket className="w-5 h-5" />
                Deploy Now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}