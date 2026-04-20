import { useState, useEffect } from 'react';

export interface EmployeeSessionData {
  employee_number: string;
  full_name: string;
  email: string;
  phone_number?: string;
  position: string;
  team: string;
  team_id?: number;
  status?: string;
  profile_picture_url?: string;
  leave_balance?: number;
}

export function useEmployeeSession() {
  const [employee, setEmployee] = useState<EmployeeSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = () => {
    try {
      const sessionData = localStorage.getItem('employeeSession');
      if (sessionData) {
        const parsed = JSON.parse(sessionData) as EmployeeSessionData;
        setEmployee(parsed);
      }
    } catch (error) {
      console.error('Failed to load employee session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('🚪 Employee logging out...');
    localStorage.removeItem('employeeSession');
    localStorage.removeItem('mnemosyne_employee_profile');
    localStorage.removeItem('mnemosyne_user_settings');
    setEmployee(null);
    console.log('✅ Employee session cleared');
  };

  return {
    employee,
    isLoading,
    isAuthenticated: !!employee,
    logout,
    refreshSession: loadSession,
  };
}