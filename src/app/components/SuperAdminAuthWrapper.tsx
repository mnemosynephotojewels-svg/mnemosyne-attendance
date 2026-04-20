import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { PortalLayout } from '../layouts/PortalLayout';
import { Loader2 } from 'lucide-react';

interface AdminData {
  admin_number: string;
  username: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role: string;
  team?: string;
  team_id?: number;
  access_level?: string;
  status?: string;
  profile_picture_url?: string;
}

export function SuperAdminAuthWrapper() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState<AdminData | null>(null);

  // Load super admin data from localStorage
  const loadSuperAdminData = () => {
    // Check if super admin is logged in
    const sessionData = localStorage.getItem('superAdminSession');
    
    if (!sessionData) {
      // Not logged in, redirect to super admin login
      navigate('/login');
      return null;
    }

    try {
      let admin = JSON.parse(sessionData) as AdminData;
      
      // Check for updated profile data - ONLY check mnemosyne_super_admin_profile (NOT shared keys)
      const profileData = localStorage.getItem('mnemosyne_super_admin_profile');
      
      if (profileData) {
        const profile = JSON.parse(profileData);
        console.log('✅ [SuperAdminAuthWrapper] Found updated super admin profile data:', profile);
        
        // Merge with session data - handle both full_name and fullname, email and email_address
        admin = {
          ...admin,
          full_name: profile.full_name || profile.fullname || profile.name || admin.full_name,
          username: profile.username || admin.username,
          email: profile.email || profile.email_address || admin.email,
          phone_number: profile.phone_number || profile.phone || admin.phone_number,
          profile_picture_url: profile.profile_picture_url || admin.profile_picture_url,
        };
        
        // Update session storage with merged data
        localStorage.setItem('superAdminSession', JSON.stringify(admin));
        console.log('✅ [SuperAdminAuthWrapper] Updated superAdminSession with profile data');
      }
      
      // Handle both full_name and fullname for display
      const displayName = admin.full_name || (admin as any).fullname || admin.username;
      console.log('✅ [SuperAdminAuthWrapper] Super Admin session loaded:', displayName, admin.role);
      return admin;
    } catch (error) {
      console.error('❌ Failed to parse super admin session:', error);
      localStorage.removeItem('superAdminSession');
      navigate('/login');
      return null;
    }
  };

  // Initial load
  useEffect(() => {
    const admin = loadSuperAdminData();
    if (admin) {
      setAdminData(admin);
    }
    setIsLoading(false);
  }, [navigate]);

  // Listen for storage changes (when settings are updated)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | Event) => {
      console.log('🔄 Storage changed, reloading super admin data...');
      const admin = loadSuperAdminData();
      if (admin) {
        setAdminData(admin);
        console.log('✅ Super Admin data refreshed in header');
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

  if (isLoading || !adminData) {
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
      role="super-admin"
      user={{
        name: adminData.full_name || (adminData as any).fullname || adminData.username,
        position: 'Super Admin',
        employeeNumber: adminData.admin_number || (adminData as any).id,
        email: adminData.email || (adminData as any).email_address,
        team: adminData.department || adminData.team || 'Administration', // Map department to team
        profilePicture: adminData.profile_picture_url,
        role: adminData.role,
        access_level: adminData.access_level,
      }}
    />
  );
}