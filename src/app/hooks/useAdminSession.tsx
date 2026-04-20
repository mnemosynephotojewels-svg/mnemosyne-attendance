import { useState, useEffect } from 'react';

export interface AdminSessionData {
  admin_number: string;
  username: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role: string;
  team: string;
  team_id?: number;
  access_level?: string;
  status?: string;
  profile_picture_url?: string;
}

export function useAdminSession() {
  const [admin, setAdmin] = useState<AdminSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = () => {
    try {
      const sessionData = localStorage.getItem('adminSession');
      if (sessionData) {
        const parsed = JSON.parse(sessionData) as AdminSessionData;
        setAdmin(parsed);
      }
    } catch (error) {
      console.error('Failed to load admin session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('🚪 Admin logging out...');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('mnemosyne_admin_profile');
    localStorage.removeItem('mnemosyne_user_settings');
    setAdmin(null);
    console.log('✅ Admin session cleared');
  };

  return {
    admin,
    isLoading,
    isAuthenticated: !!admin,
    logout,
    refreshSession: loadSession,
  };
}