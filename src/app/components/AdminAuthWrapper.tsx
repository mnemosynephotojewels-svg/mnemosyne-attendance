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
  team: string;
  team_id?: number;
  access_level?: string;
  status?: string;
  profile_picture_url?: string;
}

export function AdminAuthWrapper() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [adminData, setAdminData] = useState<AdminData | null>(null);

  // Load admin data from localStorage
  const loadAdminData = () => {
    // Check if admin is logged in
    const sessionData = localStorage.getItem('adminSession');
    
    if (!sessionData) {
      // Not logged in, redirect to login
      navigate('/login');
      return null;
    }

    try {
      let admin = JSON.parse(sessionData) as AdminData;
      
      // Check for updated profile data - ONLY check mnemosyne_admin_profile (NOT shared keys)
      const profileData = localStorage.getItem('mnemosyne_admin_profile');
      
      if (profileData) {
        const profile = JSON.parse(profileData);
        console.log('✅ [AdminAuthWrapper] Found updated admin profile data:', profile);
        
        // Merge with session data
        admin = {
          ...admin,
          full_name: profile.full_name || profile.name || admin.full_name,
          username: profile.username || admin.username,
          email: profile.email || admin.email,
          phone_number: profile.phone_number || profile.phone || admin.phone_number,
          profile_picture_url: profile.profile_picture_url || admin.profile_picture_url,
        };
        
        // Update session storage with merged data
        localStorage.setItem('adminSession', JSON.stringify(admin));
        console.log('✅ [AdminAuthWrapper] Updated adminSession with profile data');
      }
      
      console.log('✅ [AdminAuthWrapper] Admin session loaded:', admin.full_name, admin.role);
      return admin;
    } catch (error) {
      console.error('❌ Failed to parse admin session:', error);
      localStorage.removeItem('adminSession');
      navigate('/login');
      return null;
    }
  };

  // Initial load
  useEffect(() => {
    const admin = loadAdminData();
    if (admin) {
      setAdminData(admin);
    }
    setIsLoading(false);
  }, [navigate]);

  // Listen for storage changes (when settings are updated)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | Event) => {
      console.log('🔄 Storage changed, reloading admin data...');
      const admin = loadAdminData();
      if (admin) {
        setAdminData(admin);
        console.log('✅ Admin data refreshed in header');
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
      role="admin"
      user={{
        name: adminData.full_name || adminData.username,
        position: 'Team Leader',
        employeeNumber: adminData.admin_number,
        email: adminData.email,
        team: adminData.department || adminData.team, // Map department to team for consistency
        profilePicture: adminData.profile_picture_url,
        role: adminData.role,
        access_level: adminData.access_level,
      }}
    />
  );
}