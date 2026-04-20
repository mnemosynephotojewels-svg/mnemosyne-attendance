import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Wrench, CheckCircle, AlertCircle, Loader2, Crown, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from '../components/ui/button';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function FixSuperAdminRole() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFix = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔧 Fixing super admin roles...');
      
      const response = await fetch(`${API_BASE_URL}/admin/fix-super-admin-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fix roles: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Fix result:', data);

      if (data.success) {
        setResult(data);
        toast.success(data.message || 'Super admin roles fixed successfully!');
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.error('❌ Error fixing roles:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      toast.error(`Failed to fix roles: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] to-[#1a4d8f] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Back Button */}
        <button
          onClick={() => navigate('/login')}
          className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#F7B34C] to-[#fcd34d] p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Wrench className="w-8 h-8 text-[#0B3060]" />
            </div>
            <h1 className="text-3xl font-bold text-[#0B3060] mb-2">
              Fix Super Admin Role
            </h1>
            <p className="text-[#0B3060]/80">
              Update admin accounts to have the correct super_admin role
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Description */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-900 font-medium mb-2">
                    What does this do?
                  </p>
                  <p className="text-sm text-blue-800">
                    This tool fixes super admin accounts that have <code className="px-1.5 py-0.5 bg-blue-100 rounded">role='admin'</code> instead of <code className="px-1.5 py-0.5 bg-blue-100 rounded">role='super_admin'</code>. It will automatically detect and update all accounts with username "superadmin" or admin_number starting with "SADM".
                  </p>
                </div>
              </div>
            </div>

            {/* Fix Button */}
            {!result && (
              <Button
                onClick={handleFix}
                disabled={isLoading}
                className="w-full h-12"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Fixing roles...
                  </>
                ) : (
                  <>
                    <Wrench className="w-5 h-5" />
                    Fix Super Admin Roles Now
                  </>
                )}
              </Button>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-900 mb-1">Error</p>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Result */}
            {result && result.success && (
              <div className="space-y-6">
                {/* Success Message */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 mb-1">Success!</p>
                      <p className="text-sm text-green-800">{result.message}</p>
                    </div>
                  </div>
                </div>

                {/* Fixed Accounts */}
                {result.fixed && result.fixed.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Fixed Accounts ({result.fixed.length})
                    </h3>
                    <div className="space-y-3">
                      {result.fixed.map((account: any, index: number) => (
                        <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">{account.full_name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {account.username} ({account.admin_number})
                              </p>
                            </div>
                            <Crown className="w-5 h-5 text-[#F7B34C]" />
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="p-2 bg-white rounded border border-gray-200">
                              <p className="text-xs text-muted-foreground mb-1">Old Role</p>
                              <p className="text-sm font-mono text-red-600">{account.old_role}</p>
                            </div>
                            <div className="p-2 bg-white rounded border border-gray-200">
                              <p className="text-xs text-muted-foreground mb-1">New Role</p>
                              <p className="text-sm font-mono text-green-600">{account.new_role}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skipped Accounts */}
                {result.skipped && result.skipped.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Skipped Accounts ({result.skipped.length})
                    </h3>
                    <div className="space-y-2">
                      {result.skipped.map((account: any, index: number) => (
                        <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">{account.username}</p>
                              <p className="text-xs text-muted-foreground">{account.reason || account.error}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate('/login')}
                    className="flex-1"
                    size="lg"
                  >
                    <Crown className="w-5 h-5" />
                    Go to Super Admin Login
                  </Button>
                  <Button
                    onClick={() => {
                      setResult(null);
                      setError(null);
                    }}
                    variant="outline"
                    size="lg"
                  >
                    Fix Again
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-white/60">
            After fixing, please log out and log back in to refresh your session
          </p>
        </div>
      </div>
    </div>
  );
}