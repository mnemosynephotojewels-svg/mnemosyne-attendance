import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { Settings as SettingsIcon, User, Lock, Bell, Globe, Camera, Upload, X, Check, AlertCircle, Loader, Save, RefreshCw, QrCode, Download, Printer, Shield, IdCard, Info } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { QRCodeGenerator } from '../components/QRCodeGenerator';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

// LocalStorage keys
const STORAGE_KEYS = {
  EMPLOYEE_PROFILE: 'mnemosyne_employee_profile',
  ADMIN_PROFILE: 'mnemosyne_admin_profile',
  SUPER_ADMIN_PROFILE: 'mnemosyne_super_admin_profile',
  SETTINGS: 'mnemosyne_user_settings',
};

// Determine user role from URL or context
const getUserRole = (): 'employee' | 'admin' | 'super-admin' => {
  const path = window.location.pathname;
  if (path.includes('/super-admin')) return 'super-admin';
  if (path.includes('/admin')) return 'admin';
  return 'employee';
};

export function Settings() {
  const userRole = getUserRole();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    position: '',
    team: '',
    employee_number: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    leaveRequestNotifications: true,
    attendanceReminders: true,
  });

  const [language, setLanguage] = useState('en');

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  // Get storage key based on role
  const getStorageKey = () => {
    switch (userRole) {
      case 'super-admin':
        return STORAGE_KEYS.SUPER_ADMIN_PROFILE;
      case 'admin':
        return STORAGE_KEYS.ADMIN_PROFILE;
      default:
        return STORAGE_KEYS.EMPLOYEE_PROFILE;
    }
  };

  // Load user data from database and localStorage
  const loadUserData = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Loading user data for role:', userRole);
      
      // First, try to load from the correct session storage
      let sessionKey = '';
      if (userRole === 'super-admin') {
        sessionKey = 'superAdminSession';
      } else if (userRole === 'admin') {
        sessionKey = 'adminSession';
      } else {
        sessionKey = 'employeeSession';
      }

      const sessionData = localStorage.getItem(sessionKey);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        console.log('✅ Loaded session data from', sessionKey, ':', parsed);
        applyUserData(parsed);
      }

      // Also check for updated profile data
      const storageKey = getStorageKey();
      const cachedData = localStorage.getItem(storageKey);
      
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        console.log('✅ Loaded cached user data from', storageKey, ':', parsed);
        applyUserData(parsed);
      }

      // Then fetch from database to ensure we have latest data
      let endpoint = '';
      let userNumber = '';

      // Get user number from the correct session storage
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        
        // For super-admin, use username or id
        if (userRole === 'super-admin') {
          userNumber = parsed.username || parsed.id;
        } else if (userRole === 'admin') {
          userNumber = parsed.admin_number || parsed.employee_number || parsed.id;
        } else {
          userNumber = parsed.employee_number || parsed.admin_number || parsed.id;
        }
        
        console.log('📋 User identifier from session:', userNumber);
        console.log('   - User role:', userRole);
        console.log('   - Checking username:', parsed.username);
        console.log('   - Checking employee_number:', parsed.employee_number);
        console.log('   - Checking admin_number:', parsed.admin_number);
        console.log('   - Checking id:', parsed.id);
        console.log('   - Selected identifier:', userNumber);
      }

      // Fetch fresh data from API
      if (userNumber) {
        if (userRole === 'employee') {
          endpoint = `/employees/${userNumber}`;
        } else if (userRole === 'admin') {
          // Admins are in the admins table
          endpoint = `/admins/${userNumber}`;
        } else if (userRole === 'super-admin') {
          // Super Admins are in the super_admin table
          endpoint = `/super-admins/${userNumber}`;
        }

        console.log('🌐 Fetching from API:', `${API_BASE_URL}${endpoint}`);
        
        // Retry logic for newly created accounts (e.g., quick login)
        let retries = 0;
        const maxRetries = 3;
        let success = false;
        
        while (retries < maxRetries && !success) {
          if (retries > 0) {
            console.log(`🔄 Retry attempt ${retries}/${maxRetries - 1} after 1 second...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          });

          console.log('📡 API Response status:', response.status, response.statusText);

          if (response.ok) {
            const result = await response.json();
            console.log('📦 API Response data:', result);
            
            if (result.success && result.data) {
              console.log('✅ Fetched fresh data from API:', result.data);
              
              // Save to localStorage
              localStorage.setItem(storageKey, JSON.stringify(result.data));
              
              // Apply to state
              applyUserData(result.data);
              success = true;
            } else {
              console.warn('⚠️ API returned success:false or no data:', result);
            }
          } else if (response.status === 404) {
            // User not found in database
            if (retries < maxRetries - 1) {
              console.log('⏳ User not yet in database. Retrying...');
              retries++;
              continue;
            } else {
              // Final retry failed - use session data only (this is OK for Quick Login)
              console.log('✅ Using session data (Quick Login mode)');
              console.log('💡 This is expected behavior for 1-Click Login users.');
              console.log('💡 Your profile is stored locally and will work perfectly!');
              success = true; // Stop retrying
            }
          } else {
            const errorText = await response.text();
            console.error('❌ API fetch failed with status', response.status, ':', errorText);
            console.warn('⚠️ Using cached data instead');
            success = true; // Stop retrying on other errors
          }
          
          if (!success) {
            retries++;
          }
        }
      }

      // Load settings
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setNotificationSettings(settings.notifications || notificationSettings);
        setLanguage(settings.language || 'en');
      }

    } catch (error) {
      console.error('❌ Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply user data to state
  const applyUserData = (data: any) => {
    setUserData(data);
    
    setProfileData({
      username: data.username || data.full_name || data.name || '', // For admins and super admins
      full_name: data.full_name || data.name || '', // All users use full_name now
      email: data.email || '', // All users use email now
      phone: data.phone_number || data.phone || '',
      position: data.position || '',
      team: data.team || data.teams?.name || '', // Handle both formats
      employee_number: data.employee_number || data.admin_number || data.id || '',
    });

    if (data.profile_picture_url) {
      setProfilePictureUrl(data.profile_picture_url);
    }
  };

  // Handle profile picture upload
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('❌ Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('❌ Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicturePreview(reader.result as string);
      toast.success('✅ Image selected! Click "Save Changes" to upload');
    };
    reader.readAsDataURL(file);

    setProfilePictureFile(file);
  };

  // Remove profile picture
  const handleRemoveProfilePicture = () => {
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    setProfilePictureUrl(null);
    toast.info('🗑️ Profile picture removed. Click "Save Changes" to confirm');
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Upload profile picture to Supabase Storage
  const uploadProfilePicture = async (file: File): Promise<string> => {
    console.log('📤 Uploading profile picture to Supabase Storage:', file.name);
    
    if (!isSupabaseConfigured || !supabase) {
      console.warn('⚠️ Supabase not configured, using base64 fallback');
      // Fallback to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          console.log('✅ Profile picture encoded to base64');
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${profileData.employee_number}-${Date.now()}.${fileExt}`;
      
      console.log('📁 Uploading to Supabase Storage bucket: avatars');
      console.log('📁 File name:', fileName);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('❌ Error uploading to Supabase Storage:', uploadError);
        
        // If bucket doesn't exist, fall back to base64
        if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('bucket')) {
          console.warn('⚠️ Storage bucket "avatars" not found, using base64 fallback');
          toast.warning('Storage not configured. Profile picture will be stored locally.', { duration: 4000 });
          
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        }
        
        throw uploadError;
      }

      console.log('✅ File uploaded successfully:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('✅ Public URL generated:', publicUrl);
      return publicUrl;
      
    } catch (error) {
      console.error('❌ Error in uploadProfilePicture:', error);
      
      // Fallback to base64 on any error
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          console.log('✅ Fallback: Profile picture encoded to base64');
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email)) {
        toast.error('❌ Please enter a valid email address');
        return;
      }

      // Validate phone number (numbers only)
      if (profileData.phone) {
        const phoneRegex = /^\d+$/;
        if (!phoneRegex.test(profileData.phone)) {
          toast.error('❌ Phone number must contain numbers only');
          return;
        }
        
        // Optional: Check if phone number has at least 10 digits
        if (profileData.phone.length < 10) {
          toast.error('❌ Phone number must be at least 10 digits');
          return;
        }
      }

      setIsSaving(true);
      console.log('💾 Saving profile changes...');

      // Prepare data - DIFFERENT fields for employees vs admins vs super-admins
      const updateData: any = {};
      
      if (userRole === 'super-admin') {
        // Super admin - only update fields that exist in super_admin table
        // Common fields: username, full_name, password_hash, profile_picture_url
        updateData.full_name = profileData.full_name;
        updateData.username = profileData.username;
        // Note: email, phone_number, department, position don't exist in super_admin table
        // The backend will filter out any non-existent columns
      } else {
        // Employees and admins use: full_name, email
        updateData.full_name = profileData.full_name;
        updateData.email = profileData.email;
        updateData.phone_number = profileData.phone;
        
        // Only include username for admins (not employees)
        if (userRole === 'admin') {
          updateData.username = profileData.username;
        }
      }

      // Handle profile picture upload
      if (profilePictureFile) {
        console.log('📸 Processing profile picture...');
        const uploadedUrl = await uploadProfilePicture(profilePictureFile);
        updateData.profile_picture_url = uploadedUrl;
        console.log('✅ Profile picture uploaded');
      } else if (profilePictureUrl === null && profilePicturePreview === null) {
        // User removed the profile picture
        updateData.profile_picture_url = null;
      }

      // Update in database via API
      const userNumber = profileData.employee_number;
      let endpoint = '';
      
      // Different endpoints for different user types
      if (userRole === 'employee') {
        endpoint = `/employees/${userNumber}`;
      } else if (userRole === 'admin') {
        // Admins are in the admins table
        endpoint = `/admins/${userNumber}`;
      } else if (userRole === 'super-admin') {
        // Super admins are also in the admins table (with role='super_admin')
        endpoint = `/super-admins/${userNumber}`;
      }

      console.log('🌐 Updating via API:', endpoint);
      console.log('📝 Update data:', updateData);

      // IMPORTANT: Only save to localStorage if database update succeeds
      let dbUpdateSuccess = false;
      let dbUpdateError = null;

      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(updateData),
        });

        const result = await response.json();
        
        console.log('📡 API Response:', {
          status: response.status,
          ok: response.ok,
          result: result
        });
        
        if (response.ok && result.success) {
          console.log('✅ DATABASE UPDATE SUCCESSFUL!');
          console.log('   Updated data:', result.data);
          dbUpdateSuccess = true;
          
          // Use the data returned from database as source of truth
          if (result.data) {
            Object.assign(updateData, result.data);
          }
        } else {
          console.error('❌ DATABASE UPDATE FAILED!');
          console.error('   Error:', result.error || result);
          dbUpdateError = result.error || 'Database update failed';
          
          // CRITICAL: For super admin, do NOT proceed if database update fails
          if (userRole === 'super-admin') {
            throw new Error(dbUpdateError);
          }
        }
      } catch (apiError) {
        console.error('❌ API REQUEST FAILED!');
        console.error('   Error:', apiError);
        dbUpdateError = String(apiError);
        
        // CRITICAL: For super admin, throw error to prevent localStorage save
        if (userRole === 'super-admin') {
          throw apiError;
        }
      }

      // ONLY update localStorage if database update was successful
      if (!dbUpdateSuccess) {
        console.error('❌ ABORTING: Database update failed, localStorage will NOT be updated');
        throw new Error(`Database update failed: ${dbUpdateError}`);
      }

      // Update localStorage only after successful database save
      const updatedUserData = {
        ...userData,
        ...updateData,
      };

      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(updatedUserData));
      console.log('✅ Saved to localStorage (after successful DB update):', storageKey);

      // Update current user session
      localStorage.setItem('mnemosyne_current_user', JSON.stringify(updatedUserData));

      // IMPORTANT: Update the session storage based on user role
      if (userRole === 'super-admin') {
        const superAdminSession = localStorage.getItem('superAdminSession');
        if (superAdminSession) {
          const session = JSON.parse(superAdminSession);
          const updatedSession = {
            ...session,
            full_name: updateData.full_name,
            email: updateData.email,
            profile_picture_url: updateData.profile_picture_url,
          };
          // Only include username if it was in the update
          if (updateData.username) {
            updatedSession.username = updateData.username;
          }
          // DO NOT include phone_number, position, department - they don't exist in super_admin table
          localStorage.setItem('superAdminSession', JSON.stringify(updatedSession));
          console.log('✅ Updated superAdminSession:', updatedSession);
        }
      } else if (userRole === 'admin') {
        const adminSession = localStorage.getItem('adminSession');
        if (adminSession) {
          const session = JSON.parse(adminSession);
          const updatedSession = {
            ...session,
            full_name: updateData.full_name,
            email: updateData.email,
            phone_number: updateData.phone_number,
            profile_picture_url: updateData.profile_picture_url,
          };
          // Only include username if it was in the update
          if (updateData.username) {
            updatedSession.username = updateData.username;
          }
          localStorage.setItem('adminSession', JSON.stringify(updatedSession));
          console.log('✅ Updated adminSession:', updatedSession);
        }
      } else if (userRole === 'employee') {
        const employeeSession = localStorage.getItem('employeeSession');
        if (employeeSession) {
          const session = JSON.parse(employeeSession);
          const updatedSession = {
            ...session,
            full_name: updateData.full_name,
            email: updateData.email,
            phone_number: updateData.phone_number,
            profile_picture_url: updateData.profile_picture_url,
          };
          // Employees don't have username field
          localStorage.setItem('employeeSession', JSON.stringify(updatedSession));
          console.log('✅ Updated employeeSession:', updatedSession);
        }
      }

      // Update local state
      setUserData(updatedUserData);
      
      if (profilePicturePreview) {
        setProfilePictureUrl(profilePicturePreview);
        setProfilePicturePreview(null);
        setProfilePictureFile(null);
      }

      // Show appropriate success/warning message
      if (dbUpdateSuccess) {
        toast.success('✅ Profile updated successfully in database!');
        console.log('✅ Profile update complete - SAVED TO DATABASE');
      } else {
        toast.warning(`⚠️ Profile saved locally but database update failed: ${dbUpdateError}`, {
          duration: 5000,
        });
        console.warn('⚠️ Profile update complete - SAVED TO LOCALSTORAGE ONLY');
        console.warn('   Database error:', dbUpdateError);
      }

      // Trigger a page reload to reflect changes everywhere
      setTimeout(() => {
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('localStorageUpdate'));
      }, 100);
      
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      toast.error(error.message || '❌ Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('❌ Passwords do not match!');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      toast.error('❌ Password must be at least 8 characters long');
      return;
    }

    try {
      setIsSaving(true);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔐 CHANGING PASSWORD');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Determine user type and endpoint
      let endpoint = '';
      let updateData: any = {};
      
      if (userRole === 'employee') {
        endpoint = `/employees/${profileData.employee_number}`;
        updateData = { password_hash: passwordData.newPassword };
        console.log('👤 Updating EMPLOYEE password');
      } else if (userRole === 'admin') {
        endpoint = `/admins/${profileData.employee_number}`;
        updateData = { password_hash: passwordData.newPassword };
        console.log('👔 Updating ADMIN password');
      } else if (userRole === 'super-admin') {
        const identifier = profileData.username || profileData.employee_number;
        endpoint = `/super-admins/${identifier}`;
        updateData = { password_hash: passwordData.newPassword };
        console.log('⭐ Updating SUPER ADMIN password');
      }

      console.log('🌐 API Endpoint:', endpoint);
      console.log('📝 Password will be saved to database');

      // Call API to update password in database
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      
      console.log('📡 API Response:', {
        status: response.status,
        ok: response.ok,
        result: result
      });

      if (response.ok && result.success) {
        console.log('✅ PASSWORD SAVED TO DATABASE!');
        console.log('   New password hash stored:', passwordData.newPassword);
        
        // Also update localStorage session
        const storageKey = getStorageKey();
        const sessionData = JSON.parse(localStorage.getItem(storageKey) || '{}');
        sessionData.password_hash = passwordData.newPassword;
        localStorage.setItem(storageKey, JSON.stringify(sessionData));
        console.log('✅ Updated session password in localStorage');

        toast.success('✅ Password updated successfully in database!');
        
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        console.error('❌ DATABASE PASSWORD UPDATE FAILED!');
        console.error('   Error:', result.error || result);
        toast.error(`❌ Failed to update password: ${result.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('❌ Error changing password:', error);
      toast.error('❌ Failed to change password');
    } finally {
      setIsSaving(false);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  };

  // Handle notification update
  const handleNotificationUpdate = async () => {
    try {
      setIsSaving(true);
      console.log('🔔 Updating notification settings...');
      
      // Save to localStorage
      const settings = {
        notifications: notificationSettings,
        language: language,
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      
      console.log('✅ Notification settings saved:', notificationSettings);
      toast.success('✅ Notification preferences updated!');
    } catch (error) {
      console.error('❌ Error updating notifications:', error);
      toast.error('❌ Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle language update
  const handleLanguageUpdate = async () => {
    try {
      setIsSaving(true);
      console.log('🌐 Updating language preference...');
      
      // Save to localStorage
      const settings = {
        notifications: notificationSettings,
        language: language,
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      
      console.log('✅ Language preference saved:', language);
      toast.success('✅ Language preference updated!');
    } catch (error) {
      console.error('❌ Error updating language:', error);
      toast.error('❌ Failed to update language');
    } finally {
      setIsSaving(false);
    }
  };

  // Refresh data from server
  const handleRefresh = () => {
    toast.info('🔄 Refreshing data...');
    loadUserData();
  };

  // Get display picture
  const getDisplayPicture = () => {
    if (profilePicturePreview) return profilePicturePreview;
    if (profilePictureUrl) return profilePictureUrl;
    return null;
  };

  const displayPicture = getDisplayPicture();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#0B3060] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6B7280]">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile Settings */}
      <Card>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-[#0B3060]" />
            <h2 className="text-lg font-semibold text-[#1F2937]">Profile Settings</h2>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Profile Picture Upload */}
            <div className="flex flex-col md:flex-row gap-6 items-start pb-6 border-b">
              {/* Profile Picture Preview */}
              <div className="flex-shrink-0">
                <div className="relative">
                  {displayPicture ? (
                    <div className="relative group">
                      <img
                        src={displayPicture}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-[#0B3060] shadow-lg"
                      />
                      {profilePicturePreview && (
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveProfilePicture}
                        title="Remove profile picture"
                        className="absolute -top-2 -left-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#0B3060] to-[#1a4a8a] flex items-center justify-center text-white text-4xl font-bold border-4 border-[#F7B34C] shadow-lg">
                      {profileData.full_name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Controls */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Profile Picture
                </label>
                <p className="text-xs text-[#6B7280] mb-3">
                  Upload a profile picture to personalize your account. Supported formats: JPG, PNG, GIF. Max size: 5MB
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="px-3 py-1.5 bg-[#0B3060] hover:bg-[#1a4a8a] text-white rounded-md transition-colors text-sm font-medium flex items-center gap-1.5 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {displayPicture ? 'Update Image' : 'Choose Image'}
                  </button>
                </div>
                {profilePicturePreview && (
                  <div className="mt-3 flex items-center gap-2 text-green-600 text-sm bg-green-50 p-2 rounded-lg">
                    <Check className="w-4 h-4" />
                    <span>New image selected (click "Save Changes" to upload)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] transition-all"
                  placeholder="Enter username"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] transition-all"
                  placeholder="Enter full name"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-[#0B3060] focus:border-[#0B3060]'
                  }`}
                  placeholder="Enter email"
                  required
                />
                {profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email) && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Please enter a valid email address
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => {
                    // Only allow numbers
                    const value = e.target.value.replace(/\D/g, '');
                    setProfileData({ ...profileData, phone: value });
                  }}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    profileData.phone && profileData.phone.length < 10
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-[#0B3060] focus:border-[#0B3060]'
                  }`}
                  placeholder="Enter phone number (numbers only)"
                />
                {profileData.phone && profileData.phone.length < 10 && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Phone number must be at least 10 digits
                  </p>
                )}
                {profileData.phone && profileData.phone.length >= 10 && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Valid phone number
                  </p>
                )}
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Position
                </label>
                <input
                  type="text"
                  value={profileData.position}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  placeholder="Position"
                  disabled
                />
              </div>

              {/* Team */}
              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Team
                </label>
                <input
                  type="text"
                  value={profileData.team}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  placeholder="Team"
                  disabled
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] hover:from-[#1a4a8a] hover:to-[#0B3060] text-white rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
              {(profilePicturePreview || 
                profileData.username !== (userData?.username || userData?.full_name || '') ||
                profileData.full_name !== (userData?.full_name || userData?.name || '') ||
                profileData.email !== (userData?.email || '') ||
                profileData.phone !== (userData?.phone_number || userData?.phone || '')) && (
                <div className="text-sm text-yellow-600 flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  You have unsaved changes
                </div>
              )}
            </div>
          </form>

          {/* Change Password Section */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-md font-semibold text-[#1F2937] mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#0B3060]" />
              Change Password
            </h3>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] transition-all"
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] transition-all"
                  placeholder="Enter new password (min. 8 characters)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060] transition-all"
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              {passwordData.newPassword && passwordData.confirmPassword && 
               passwordData.newPassword !== passwordData.confirmPassword && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Passwords do not match</span>
                </div>
              )}

              {passwordData.newPassword && passwordData.newPassword.length > 0 && 
               passwordData.newPassword.length < 8 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-yellow-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Password must be at least 8 characters long</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#0B3060] hover:bg-[#1a4a8a] text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Change Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </Card>

      {/* My QR Code - Admin Only */}
      {userRole === 'admin' && userData && (
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-6">
              <QrCode className="w-6 h-6 text-[#0B3060]" />
              <h2 className="text-lg font-semibold text-[#1F2937]">My QR Code</h2>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
              <p className="text-sm text-[#6B7280] mb-6 text-center">
                Your personal attendance QR code. Scan this code at the kiosk to record your check-in and check-out times.
              </p>

              <div className="flex flex-col items-center justify-center">
                {/* QR Code Generator - Only render if we have valid data */}
                {(userData.admin_number || userData.employee_number || userData.id) && (userData.full_name || userData.username) ? (
                  <>
                    <div className="bg-white p-6 rounded-xl shadow-lg border-4 border-[#0B3060]">
                      <QRCodeGenerator
                        value={JSON.stringify({
                          type: userData.admin_number ? 'admin' : 'employee',
                          id: userData.admin_number || userData.employee_number || userData.id,
                          name: userData.full_name || userData.username,
                          department: userData.department || userData.team || (userData.teams?.name) || 'N/A',
                          timestamp: new Date().toISOString()
                        })}
                        size={220}
                      />
                    </div>

                    {/* Debug Info - Shows what's in the QR code */}
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-md w-full">
                      <p className="text-xs font-mono text-blue-900 break-all">
                        <strong>QR Data:</strong><br/>
                        {JSON.stringify({
                          type: userData.admin_number ? 'admin' : 'employee',
                          id: userData.admin_number || userData.employee_number || userData.id,
                          name: userData.full_name || userData.username,
                          department: userData.department || userData.team || (userData.teams?.name) || 'N/A'
                        }, null, 2)}
                      </p>
                    </div>

                    {/* User Info Below QR Code */}
                    <div className="mt-6 text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-[#0B3060]">
                        <User className="w-5 h-5" />
                        <p className="font-bold text-lg">{userData.full_name || userData.username}</p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-[#6B7280]">
                        <Shield className="w-4 h-4" />
                        <p className="text-sm font-medium">{userData.admin_number ? 'Team Leader' : userData.position || 'Employee'}</p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-[#6B7280]">
                        <IdCard className="w-4 h-4" />
                        <p className="text-sm">ID: {userData.admin_number || userData.employee_number || userData.id}</p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-[#6B7280]">
                        <User className="w-4 h-4" />
                        <p className="text-sm">Department: {userData.department || userData.team || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="mt-8 w-full max-w-md bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-semibold mb-2">How to use:</p>
                          <ol className="list-decimal list-inside space-y-1 text-blue-700">
                            <li>Navigate to a Kiosk terminal</li>
                            <li>Tap "Scan QR Code"</li>
                            <li>Show this QR code to the scanner</li>
                            <li>Your attendance will be recorded automatically</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => {
                          const qrElement = document.querySelector('canvas');
                          if (qrElement) {
                            const url = (qrElement as HTMLCanvasElement).toDataURL('image/png');
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `qr-code-${userData.admin_number || userData.employee_number}.png`;
                            link.click();
                            toast.success('✅ QR Code downloaded!');
                          }
                        }}
                        className="px-5 py-2.5 bg-gradient-to-r from-[#F7B34C] to-[#f5a82d] hover:from-[#f5a82d] hover:to-[#F7B34C] text-[#0B3060] rounded-lg font-semibold transition-all transform hover:scale-105 shadow-md flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download QR Code
                      </button>
                      <button
                        onClick={() => {
                          window.print();
                        }}
                        className="px-5 py-2.5 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] hover:from-[#1a4a8a] hover:to-[#0B3060] text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-md flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print QR Code
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 border-4 border-[#0B3060] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[#6B7280]">Loading QR code data...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}