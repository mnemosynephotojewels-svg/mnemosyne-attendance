import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Crown, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from '../components/ui/button';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function InitializeSuperAdmin() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [accountDetails, setAccountDetails] = useState<any>(null);

  const createAccount = async () => {
    setIsCreating(true);
    setStatus('creating');
    setErrorMessage('');

    try {
      console.log('🚀 Creating Super Admin Account...');
      console.log('API URL:', `${API_BASE_URL}/admin/create-super-admin`);
      
      const response = await fetch(`${API_BASE_URL}/admin/create-super-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      console.log('Response status:', response.status);
      
      const result = await response.json();
      console.log('Response data:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create account');
      }

      console.log('✅ Super Admin Account Created Successfully!');
      setStatus('success');
      setAccountDetails(result.admin);
      toast.success('Super Admin account created successfully!');
      
    } catch (err) {
      console.error('❌ Error creating account:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatus('error');
      setErrorMessage(errorMsg);
      toast.error(`Failed to create account: ${errorMsg}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-primary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary rounded-full mb-4">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">
              Initialize Super Admin Account
            </h1>
            <p className="text-muted-foreground">
              Create the master administrator account with full system access
            </p>
          </div>

          {/* Status Display */}
          {status === 'idle' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">What will be created:</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Username:</strong> superadmin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Password:</strong> superadmin123</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Full Name:</strong> Super Administrator</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Email:</strong> superadmin@mnemosyne.com</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Access Level:</strong> Full System Access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Status:</strong> Active</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={createAccount}
                disabled={isCreating}
                className="w-full h-14 text-lg"
                size="lg"
              >
                <Crown className="w-6 h-6" />
                Create Super Admin Account
              </Button>
            </div>
          )}

          {status === 'creating' && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">
                Creating Account...
              </h3>
              <p className="text-muted-foreground">
                Please wait while we set up your super admin account
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-900 mb-2">
                  Account Created Successfully! ✓
                </h3>
                <p className="text-green-700 mb-6">
                  Your super admin account is ready to use
                </p>

                {accountDetails && (
                  <div className="bg-white rounded-lg p-4 text-left space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Username:</span>
                      <span className="font-mono font-semibold text-primary">
                        {accountDetails.username}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Password:</span>
                      <span className="font-mono font-semibold text-primary">
                        superadmin123
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Full Name:</span>
                      <span className="font-semibold text-foreground">
                        {accountDetails.full_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Email:</span>
                      <span className="font-semibold text-foreground">
                        {accountDetails.email}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={() => navigate('/login')}
                className="w-full h-12"
                size="lg"
              >
                Go to Super Admin Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-red-900 mb-2 text-center">
                  Account Creation Failed
                </h3>
                <p className="text-red-700 text-center mb-4">
                  {errorMessage}
                </p>
                <div className="bg-white rounded p-3 text-xs text-muted-foreground">
                  <strong>Troubleshooting:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Check your internet connection</li>
                    <li>Verify Supabase is configured correctly</li>
                    <li>Open browser console (F12) for detailed logs</li>
                    <li>Make sure the super_admin table exists in your database</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={createAccount}
                  variant="outline"
                  className="flex-1"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  variant="outline"
                  className="flex-1"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          )}

          {/* Back Button */}
          {status === 'idle' && (
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-6 text-center text-white/80 text-sm">
          <p>
            This account has full access to all system features including admin management,
            employee registration, attendance monitoring, and system settings.
          </p>
        </div>
      </div>
    </div>
  );
}