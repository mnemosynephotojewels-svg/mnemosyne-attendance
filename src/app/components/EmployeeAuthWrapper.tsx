import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { PortalLayout } from '../layouts/PortalLayout';
import { Loader2 } from 'lucide-react';

interface EmployeeData {
  employee_number: string;
  username?: string;
  full_name: string;
  email: string;
  phone_number?: string;
  position: string;
  team: string;
  team_id?: number;
  status?: string;
  profile_picture_url?: string;
}

export function EmployeeAuthWrapper() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);

  // Load employee data from localStorage
  const loadEmployeeData = () => {
    // Check if user is logged in
    const sessionData = localStorage.getItem('employeeSession');
    
    if (!sessionData) {
      // Not logged in, redirect to login
      navigate('/login');
      return null;
    }

    try {
      let employee = JSON.parse(sessionData) as EmployeeData;
      
      // Check for updated profile data - ONLY check mnemosyne_employee_profile (NOT shared keys)
      const profileData = localStorage.getItem('mnemosyne_employee_profile');
      
      if (profileData) {
        const profile = JSON.parse(profileData);
        console.log('✅ [EmployeeAuthWrapper] Found updated employee profile data:', profile);
        
        // Merge with session data
        employee = {
          ...employee,
          full_name: profile.full_name || profile.name || employee.full_name,
          username: profile.username || employee.username,
          email: profile.email || employee.email,
          phone_number: profile.phone_number || profile.phone || employee.phone_number,
          profile_picture_url: profile.profile_picture_url || employee.profile_picture_url,
        };
        
        // Update session storage with merged data
        localStorage.setItem('employeeSession', JSON.stringify(employee));
        console.log('✅ [EmployeeAuthWrapper] Updated employeeSession with profile data');
      }
      
      console.log('✅ [EmployeeAuthWrapper] Employee session loaded:', employee.full_name, employee.position);
      return employee;
    } catch (error) {
      console.error('❌ Failed to parse employee session:', error);
      localStorage.removeItem('employeeSession');
      navigate('/login');
      return null;
    }
  };

  // Initial load
  useEffect(() => {
    const employee = loadEmployeeData();
    if (employee) {
      setEmployeeData(employee);
    }
    setIsLoading(false);
  }, [navigate]);

  // Listen for storage changes (when settings are updated)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | Event) => {
      console.log('🔄 Storage changed, reloading employee data...');
      const employee = loadEmployeeData();
      if (employee) {
        setEmployeeData(employee);
        console.log('✅ Employee data refreshed in header');
      }
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom storage events from same tab
    window.addEventListener('localStorageUpdate', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdate', handleStorageChange);
    };
  }, [navigate]);

  if (isLoading || !employeeData) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#0B3060] animate-spin mx-auto mb-4" />
          <p className="text-[#6B7280]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <PortalLayout
      role="employee"
      user={{
        name: employeeData.full_name || employeeData.username,
        position: employeeData.team || employeeData.department || 'Employee',
        employeeNumber: employeeData.employee_number,
        email: employeeData.email,
        team: employeeData.team,
        profilePicture: employeeData.profile_picture_url,
      }}
    />
  );
}