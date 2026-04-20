import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../components/Card';
import { Shield, Lock, Upload, Copy, CheckCircle, AlertCircle, Key, ArrowRight, UserCog, User, Mail, Phone, Building2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { addAdminToMockStore } from '../../services/adminService';

interface CreatedAdmin {
  adminNumber: string;
  fullName: string;
  email: string;
  username: string;
  password: string;
  role: string;
}

export function RegisterAdmin() {
  const [adminCount, setAdminCount] = useState(1); // Starting from ADM-001
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState<CreatedAdmin | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    customDepartment: '', // Add custom department field for when "Others" is selected
    team_id: '', // Add team_id field
    role: 'admin', // Default role
    accessLevel: 'standard', // standard or full
  });

  const adminNumber = `ADM-${String(adminCount).padStart(3, '0')}`;

  // Fetch the latest admin number from Supabase on mount
  useEffect(() => {
    const fetchLatestAdminNumber = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🔍 FETCHING LATEST ADMIN NUMBER FROM DATABASE');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          // Fetch all admins from the database
          const { data: allAdmins, error: allError } = await supabase
            .from('admins')
            .select('admin_number, full_name, created_at')
            .order('created_at', { ascending: false });

          console.log('📊 ALL ADMINS IN DATABASE:');
          if (allError) {
            console.error('❌ Error fetching all admins:', allError);
            console.log('Using default starting number: ADM-001');
          } else if (!allAdmins || allAdmins.length === 0) {
            console.log('⚠️  DATABASE IS EMPTY - No admins found!');
            console.log('Starting fresh from ADM-001');
            setAdminCount(1);
            console.log('✅ Admin count set to: 1 (next will be ADM-001)');
          } else {
            console.log(`✅ Found ${allAdmins.length} admin(s) in database:`);
            allAdmins.slice(0, 5).forEach((admin, index) => {
              console.log(`   ${index + 1}. ${admin.admin_number} - ${admin.full_name} (Created: ${admin.created_at})`);
            });
            if (allAdmins.length > 5) {
              console.log(`   ... and ${allAdmins.length - 5} more admins`);
            }
            
            // Find the highest admin number
            const adminNumbers = allAdmins
              .map(admin => {
                const match = admin.admin_number.match(/ADM-(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
              })
              .filter(num => num > 0);
            
            if (adminNumbers.length > 0) {
              const highestNumber = Math.max(...adminNumbers);
              const nextNumber = highestNumber + 1;
              
              console.log(`📊 Highest admin number found: ADM-${String(highestNumber).padStart(3, '0')}`);
              console.log(`📊 Next admin number will be: ADM-${String(nextNumber).padStart(3, '0')}`);
              
              // Update the admin count to the next available number
              setAdminCount(nextNumber);
              
              console.log(`✅ Admin count updated to: ${nextNumber}`);
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            } else {
              console.log('⚠️ No valid admin numbers found, starting from 1');
              setAdminCount(1);
            }
          }
        } catch (error) {
          console.error('❌ Exception fetching admin number:', error);
          console.log('Starting from default: ADM-001');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          setAdminCount(1);
        }
      } else {
        console.log('ℹ️ Supabase not configured, using mock admin numbers');
      }
    };

    fetchLatestAdminNumber();
  }, []);

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePassword = () => {
    // Generate a simple password for admin
    // For simplicity and debugging, using a standard format
    return 'admin123';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    
    try {
      const defaultPassword = generatePassword();
      
      // CRITICAL: Find the next available unique admin number
      let finalAdminNumber = adminNumber;
      let attemptCount = 0;
      const maxAttempts = 10;
      
      if (isSupabaseConfigured && supabase) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 FINDING NEXT UNIQUE ADMIN NUMBER');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Get the highest admin number currently in the database
        const { data: latestData, error: latestError } = await supabase
          .from('admins')
          .select('admin_number')
          .order('admin_number', { ascending: false })
          .limit(1);

        let nextNumber = 1; // Default starting number
        
        if (latestError) {
          console.error('❌ Error fetching latest admin:', latestError);
        } else if (latestData && latestData.length > 0) {
          const latestAdminNumber = latestData[0].admin_number;
          console.log('📊 Latest admin in database:', latestAdminNumber);
          
          const match = latestAdminNumber.match(/ADM-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
            console.log(`✅ Will start searching from: ADM-${String(nextNumber).padStart(3, '0')}`);
          }
        } else {
          console.log('ℹ️ No admins found, starting from ADM-001');
        }
        
        // Find the first available number
        while (attemptCount < maxAttempts) {
          const candidateNumber = `ADM-${String(nextNumber).padStart(3, '0')}`;
          console.log(`🔄 Attempt ${attemptCount + 1}: Checking if ${candidateNumber} is available...`);
          
          // Check if this number already exists
          const { data: existingAdmin, error: checkError } = await supabase
            .from('admins')
            .select('admin_number')
            .eq('admin_number', candidateNumber)
            .maybeSingle();
          
          if (checkError) {
            console.error('⚠️ Error checking for duplicate:', checkError);
          }
          
          if (!existingAdmin) {
            // This number is available!
            finalAdminNumber = candidateNumber;
            console.log(`✅ FOUND UNIQUE NUMBER: ${finalAdminNumber}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            break;
          } else {
            console.log(`⚠️ ${candidateNumber} already exists, trying next number...`);
            nextNumber++;
            attemptCount++;
          }
        }
        
        if (attemptCount >= maxAttempts) {
          toast.error('Unable to generate unique admin number. Please try again.');
          setIsLoading(false);
          return;
        }
      } else {
        // Mock mode
        finalAdminNumber = adminNumber;
      }
      
      // Simplified username format: just "admin" or "admin2", "admin3" etc.
      // Extract the number from finalAdminNumber
      const numMatch = finalAdminNumber.match(/ADM-(\d+)/);
      const adminNum = numMatch ? parseInt(numMatch[1], 10) : 1;
      const username = adminNum === 1 ? 'admin' : `admin${adminNum}`;

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✅ FINAL UNIQUE ADMIN NUMBER: ${finalAdminNumber}`);
      console.log(`✅ USERNAME: ${username}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      // Check if Supabase is configured
      if (isSupabaseConfigured && supabase) {
        // SUPABASE MODE - Real database integration
        
        // Determine the final department name
        // If "Others" is selected, use the custom department name
        const finalDepartment = formData.department === 'Others' ? formData.customDepartment : formData.department;
        
        // Get team_id based on department (map department name to team name)
        let teamId = null;
        if (finalDepartment) {
          // First, try to find existing team
          const { data: existingTeam, error: findTeamError } = await supabase
            .from('teams')
            .select('id')
            .ilike('name', finalDepartment)
            .maybeSingle();
          
          if (existingTeam) {
            // Team exists, use it
            teamId = existingTeam.id;
            console.log('✅ Found existing team:', finalDepartment, 'with ID:', teamId);
          } else {
            // Team doesn't exist, create it automatically
            console.log(`📝 Creating new team: ${finalDepartment}`);
            
            const { data: newTeam, error: createTeamError } = await supabase
              .from('teams')
              .insert([
                {
                  name: finalDepartment,
                  description: `${finalDepartment} Department Team`,
                  created_at: new Date().toISOString()
                }
              ])
              .select()
              .single();
            
            if (createTeamError) {
              console.error('❌ Error creating team:', createTeamError);
              toast.warning(`Could not create team "${finalDepartment}". Admin will be created without team assignment.`);
              teamId = null;
            } else {
              teamId = newTeam.id;
              console.log('✅ Created new team:', finalDepartment, 'with ID:', teamId);
              toast.success(`Team "${finalDepartment}" created successfully!`);
            }
          }
        }
        
        // Step 1: Upload Profile Picture (if exists)
        let profilePictureUrl = null;
        if (profilePicture && fileInputRef.current?.files?.[0]) {
          const file = fileInputRef.current.files[0];
          const fileExt = file.name.split('.').pop();
          const fileName = `${adminNumber}-${Date.now()}.${fileExt}`;
          
          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Error uploading profile picture:', uploadError);
            toast.error('Failed to upload profile picture');
          } else {
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('avatars')
              .getPublicUrl(fileName);
            
            profilePictureUrl = publicUrl;
          }
        }

        // Step 2: Insert Admin into Database
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 INSERTING ADMIN INTO DATABASE');
        console.log('Admin Number:', finalAdminNumber);
        console.log('Username:', username);
        console.log('Full Name:', formData.fullName);
        console.log('Email:', formData.email);
        console.log('Department:', finalDepartment);
        console.log('Role:', formData.role);
        console.log('Access Level:', formData.accessLevel);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .insert([
            {
              admin_number: finalAdminNumber,
              username: username,
              full_name: formData.fullName,
              email: formData.email,
              phone_number: formData.phone,
              department: finalDepartment,
              role: formData.role,
              access_level: formData.accessLevel,
              profile_picture_url: profilePictureUrl,
              password_hash: defaultPassword, // In production, hash this password!
              status: 'active',
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (adminError) {
          console.error('Error inserting admin:', adminError);
          toast.error(`Failed to create admin: ${adminError.message}`);
          return;
        }

        // Step 3: Create Audit Log
        const { error: auditError } = await supabase
          .from('activity_logs')
          .insert([
            {
              action_type: 'CREATED_ADMIN',
              admin_id: adminData.id,
              details: {
                admin_number: finalAdminNumber,
                full_name: formData.fullName,
                role: formData.role,
                access_level: formData.accessLevel
              },
              performed_by: 'current_super_admin_id', // Replace with actual super admin ID from auth context
              created_at: new Date().toISOString()
            }
          ]);

        if (auditError) {
          console.error('Error creating audit log:', auditError);
          // Don't fail the whole operation, just log it
        }

        toast.success('Admin account created successfully in Supabase!');
      } else {
        // MOCK MODE - Supabase not configured, simulate success
        const finalDepartment = formData.department === 'Others' ? formData.customDepartment : formData.department;
        
        console.log('📦 MOCK MODE: Admin data (not saved to database):', {
          adminNumber,
          username,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          department: finalDepartment,
          role: formData.role,
          accessLevel: formData.accessLevel,
          password: defaultPassword
        });
        
        toast.success('Admin account created successfully! (Mock Mode - Not saved to database)');
        
        // Add admin to mock store
        const newAdmin = {
          id: adminNumber,
          username: username,
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          department: finalDepartment,
          role: formData.role as 'admin' | 'super-admin',
          accessLevel: formData.accessLevel as 'standard' | 'full',
          avatar: profilePicture || undefined,
          status: 'active' as const,
        };
        addAdminToMockStore(newAdmin);
      }

      // Show Success Modal (works in both modes)
      const newAdmin: CreatedAdmin = {
        adminNumber: finalAdminNumber,
        fullName: formData.fullName,
        email: formData.email,
        username,
        password: defaultPassword,
        role: formData.role === 'super_admin' ? 'Super Administrator' : 'Team Leader',
      };

      setCreatedAdmin(newAdmin);
      setShowSuccessModal(true);
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        department: '',
        customDepartment: '', // Reset custom department
        team_id: '', // Reset team_id
        role: 'admin',
        accessLevel: 'standard',
      });
      setProfilePicture(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Increment admin count for next registration
      setAdminCount(prev => prev + 1);

    } catch (error) {
      console.error('Unexpected error during admin creation:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyLoginDetails = () => {
    if (createdAdmin) {
      const details = `🛡️ MNEMOSYNE ADMIN LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Administrator: ${createdAdmin.fullName}
Admin ID: ${createdAdmin.adminNumber}
Role: ${createdAdmin.role}

USERNAME: ${createdAdmin.username}
PASSWORD: ${createdAdmin.password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Portal URL: https://mnemosyne.attendance.com/admin

IMPORTANT SECURITY INSTRUCTIONS:
1. Use these credentials to log into the Admin Portal
2. MUST change password immediately after first login
3. Do not share credentials with unauthorized personnel
4. Enable two-factor authentication if available
5. Contact Super Admin for any access issues

This is a privileged account with administrative access.`;
      
      // Try modern Clipboard API first, fallback to legacy method
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(details)
          .then(() => {
            toast.success('Admin login details copied to clipboard!');
          })
          .catch(() => {
            fallbackCopyToClipboard(details);
          });
      } else {
        fallbackCopyToClipboard(details);
      }
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success('Admin login details copied to clipboard!');
      } else {
        toast.error('Failed to copy. Please copy manually.');
      }
    } catch (err) {
      console.error('Fallback: Could not copy text', err);
      toast.error('Failed to copy. Please copy manually.');
    }
    
    document.body.removeChild(textArea);
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    setCreatedAdmin(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#0B3060] rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Register Admin</h1>
          </div>
          <p className="text-sm text-gray-500 ml-14">Create a new administrator account</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit}>
            {/* Admin ID Section */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Admin ID</label>
                  <p className="text-2xl font-bold text-[#0B3060] mt-1">{adminNumber}</p>
                </div>
                <div className="px-3 py-1 bg-gray-100 rounded-full">
                  <span className="text-xs font-medium text-gray-600">Auto-generated</span>
                </div>
              </div>
            </div>

            {/* Profile Picture */}
            <div className="p-6 border-b border-gray-100">
              <label className="text-sm font-medium text-gray-700 mb-3 block">Profile Picture</label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Choose Image
                  </button>
                  <p className="text-xs text-gray-500 mt-1.5">JPG or PNG, max 2MB</p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="p-6 space-y-5">
              {/* Full Name */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  Full Name
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/10 focus:border-[#0B3060] transition-all text-gray-900"
                  placeholder="Enter full name"
                  required
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    Email
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/10 focus:border-[#0B3060] transition-all text-gray-900"
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    Phone Number
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setFormData({ ...formData, phone: value });
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/10 focus:border-[#0B3060] transition-all text-gray-900"
                    placeholder="09123456789"
                    maxLength={11}
                    required
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  Department
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/10 focus:border-[#0B3060] transition-all text-gray-900 bg-white"
                  required
                >
                  <option value="">Select department</option>
                  <option value="Production">Production</option>
                  <option value="Messaging">Messaging</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Custom Department */}
              {formData.department === 'Others' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    Custom Department
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customDepartment}
                    onChange={(e) => setFormData({ ...formData, customDepartment: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B3060]/10 focus:border-[#0B3060] transition-all text-gray-900"
                    placeholder="Enter department name"
                    required
                  />
                </div>
              )}

              {/* Role */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-gray-400" />
                  Admin Role
                  <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#0B3060] transition-all">
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={formData.role === 'admin'}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          role: e.target.value,
                          accessLevel: 'standard'
                        });
                      }}
                      className="mt-0.5 w-4 h-4 text-[#0B3060] focus:ring-[#0B3060]"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Team Leader</p>
                      <p className="text-xs text-gray-500 mt-0.5">Manages assigned team, attendance & schedules</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#0B3060] transition-all">
                    <input
                      type="radio"
                      name="role"
                      value="super_admin"
                      checked={formData.role === 'super_admin'}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          role: e.target.value,
                          accessLevel: 'full'
                        });
                      }}
                      className="mt-0.5 w-4 h-4 text-[#0B3060] focus:ring-[#0B3060]"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Super Administrator</p>
                      <p className="text-xs text-gray-500 mt-0.5">Full system access and control</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-xl">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.928l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    Create Admin Account
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && createdAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
            {/* Success Icon */}
            <div className="p-8 text-center border-b border-gray-100">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                Admin Created Successfully
              </h2>
              <p className="text-sm text-gray-500">Account is now active</p>
            </div>

            {/* Admin Details */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Admin ID</p>
                  <p className="font-semibold text-gray-900">{createdAdmin.adminNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Role</p>
                  <p className="font-semibold text-gray-900">{createdAdmin.role}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Full Name</p>
                <p className="font-medium text-gray-900">{createdAdmin.fullName}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="font-medium text-gray-900">{createdAdmin.email}</p>
              </div>

              {/* Credentials */}
              <div className="p-4 bg-[#0B3060] rounded-lg text-white space-y-3">
                <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                  <Key className="w-4 h-4 text-[#F7B34C]" />
                  <h3 className="font-semibold">Login Credentials</h3>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">Username</p>
                  <p className="font-mono font-bold text-[#F7B34C]">{createdAdmin.username}</p>
                </div>
                <div>
                  <p className="text-xs text-white/60 mb-1">Password</p>
                  <p className="font-mono font-bold text-[#F7B34C]">{createdAdmin.password}</p>
                </div>
              </div>

              {/* Warning */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900">Password must be changed after first login</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 rounded-b-2xl">
              <button
                onClick={copyLoginDetails}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-medium"
              >
                <Copy className="w-4 h-4" />
                Copy Details
              </button>
              <button
                onClick={handleCloseModal}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
