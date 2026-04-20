import React, { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';

interface HeaderProps {
  user: {
    name: string;
    position: string;
    avatar?: string;
    profilePicture?: string;
    profile_picture_url?: string;
    employeeNumber?: string;
    email?: string;
    role?: string;
    access_level?: string;
  };
}

export function Header({ user: initialUser }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [user, setUser] = useState(initialUser);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Determine which portal we're in based on the path
  const isAdmin = location.pathname.startsWith('/admin');
  const isSuperAdmin = location.pathname.startsWith('/super-admin');
  const isEmployee = location.pathname.startsWith('/employee');

  // Listen for profile updates from Settings page
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('🔄 Header: Detected storage change, reloading user data');
      
      let sessionKey = '';
      let profileKey = '';
      
      if (isSuperAdmin) {
        sessionKey = 'superAdminSession';
        profileKey = 'mnemosyne_super_admin_profile';
      } else if (isAdmin) {
        sessionKey = 'adminSession';
        profileKey = 'mnemosyne_admin_profile';
      } else if (isEmployee) {
        sessionKey = 'employeeSession';
        profileKey = 'mnemosyne_employee_profile';
      }

      if (sessionKey) {
        // First check the session storage
        const sessionData = localStorage.getItem(sessionKey);
        if (sessionData) {
          try {
            const parsedData = JSON.parse(sessionData);
            // Handle both full_name (employees/admins) and fullname (super_admin)
            const userName = parsedData.full_name || parsedData.fullname || parsedData.name;
            // Handle both email (employees/admins) and email_address (super_admin)
            const userEmail = parsedData.email || parsedData.email_address;
            
            console.log(`✅ Header: Updated user data from ${sessionKey}:`, userName);
            
            // Update user state with latest data
            setUser({
              name: userName || user.name,
              position: getDisplayRole(parsedData),
              profilePicture: parsedData.profile_picture_url,
              employeeNumber: parsedData.employee_number || parsedData.admin_number,
              email: userEmail,
              role: parsedData.role,
              access_level: parsedData.access_level,
            });
          } catch (error) {
            console.error('❌ Header: Error parsing session data:', error);
          }
        }
        
        // Also check profile storage for latest updates
        const profileData = localStorage.getItem(profileKey);
        if (profileData) {
          try {
            const parsedProfile = JSON.parse(profileData);
            // Handle both full_name (employees/admins) and fullname (super_admin)
            const profileName = parsedProfile.full_name || parsedProfile.fullname || parsedProfile.name;
            // Handle both email (employees/admins) and email_address (super_admin)
            const profileEmail = parsedProfile.email || parsedProfile.email_address;
            
            console.log(`✅ Header: Found updated profile data from ${profileKey}:`, profileName);
            
            setUser(prev => ({
              ...prev,
              name: profileName || prev.name,
              profilePicture: parsedProfile.profile_picture_url || prev.profilePicture,
              email: profileEmail || prev.email,
            }));
          } catch (error) {
            console.error('❌ Header: Error parsing profile data:', error);
          }
        }
      }
    };

    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdate', handleStorageChange);
    
    // Initial load to ensure we have the latest data
    handleStorageChange();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdate', handleStorageChange);
    };
  }, [isAdmin, isSuperAdmin, isEmployee]);

  // Get display role name
  const getDisplayRole = (userData: any): string => {
    if (isSuperAdmin) {
      return 'Super Admin';
    } else if (isAdmin) {
      return 'Team Leader';
    } else {
      // For employees, show their team/department instead of position
      return userData.team || userData.department || 'Employee';
    }
  };
  
  const handleNotificationClick = () => {
    if (isAdmin) {
      navigate('/admin/notifications');
    } else if (isSuperAdmin) {
      navigate('/super-admin/notifications');
    }
  };

  const handleLogout = () => {
    console.log('🚪 Logging out and clearing ALL user data...');
    
    // Clear ALL session storage
    localStorage.removeItem('employeeSession');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('superAdminSession');
    
    // Clear ALL profile storage keys to prevent data contamination
    localStorage.removeItem('mnemosyne_employee_profile');
    localStorage.removeItem('mnemosyne_admin_profile');
    localStorage.removeItem('mnemosyne_super_admin_profile');
    
    // Clear settings storage
    localStorage.removeItem('mnemosyne_user_settings');
    
    console.log('✅ All user data cleared successfully');
    console.log('🏠 Redirecting to home page...');
    
    // Show logout toast notification
    toast.success('Logged out successfully', {
      description: 'You have been signed out of your account'
    });
    
    // Always redirect to home page for all user types
    navigate('/');
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get user initials for avatar
  const getUserInitials = () => {
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get profile picture or avatar
  const getProfileImage = () => {
    return user.profilePicture || user.avatar;
  };

  const profileImage = getProfileImage();

  return (
    <header className="h-16 bg-gradient-to-r from-primary to-primary-dark px-4 md:px-6 flex items-center justify-end gap-3 md:gap-6 border-b border-white/10 shadow-lg">
      
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-3 hover:bg-white/10 rounded-xl px-3 py-2 transition-all"
        >
          {profileImage ? (
            <img 
              src={profileImage} 
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-secondary shadow-md"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-semibold text-sm ring-2 ring-secondary shadow-md">
              {getUserInitials()}
            </div>
          )}
          <div className="text-right hidden sm:block">
            <div className="text-white font-semibold text-sm">{user.name}</div>
            <div className="text-white/70 text-xs">{user.position}</div>
          </div>
          <ChevronDown className={`w-4 h-4 text-white/80 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 overflow-hidden">
            {/* User Info */}
            <div className="px-4 py-3 bg-gradient-to-br from-primary/5 to-secondary/5 border-b border-gray-200">
              <div className="font-semibold text-foreground mb-1">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.position}</div>
              {user.employeeNumber && (
                <div className="text-xs text-muted-foreground mt-1 font-medium">ID: {user.employeeNumber}</div>
              )}
              {user.email && (
                <div className="text-xs text-muted-foreground mt-1">{user.email}</div>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}