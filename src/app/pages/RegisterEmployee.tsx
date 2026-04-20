import React, { useState, useRef, useEffect } from "react";
import { Card } from "../components/Card";
import {
  UserPlus,
  Lock,
  Upload,
  Copy,
  CheckCircle,
  Shield,
  AlertCircle,
  Key,
  ArrowRight,
  QrCode,
  RefreshCw,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import {
  supabase,
  isSupabaseConfigured,
} from "../../lib/supabaseClient";
import { getTeamIdByName } from "../../lib/teamMapping";
import { addEmployeeToMockStore } from "../../services/employeeService";
import { Employee } from "../../data/mockData";

interface CreatedEmployee {
  employeeNumber: string;
  fullName: string;
  email: string;
  username: string;
  password: string;
  qrCodeUrl: string;
}

export function RegisterEmployee() {
  const [employeeCount, setEmployeeCount] = useState(1050); // Starting from 1050
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [profilePicture, setProfilePicture] = useState<
    string | null
  >(null);
  const [showSuccessModal, setShowSuccessModal] =
    useState(false);
  const [createdEmployee, setCreatedEmployee] =
    useState<CreatedEmployee | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [teamsExist, setTeamsExist] = useState<boolean | null>(null);
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    totalEmployees: number;
    latestEmployee: string | null;
    lastError: string | null;
    lastFetchTime: string | null;
  }>({ totalEmployees: 0, latestEmployee: null, lastError: null, lastFetchTime: null });

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    birthday: "",
    position: "",
    team: "",
    customTeam: "", // Add custom team field for when "Others" is selected
  });

  // Check if teams exist in database
  useEffect(() => {
    const checkTeams = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from("teams")
            .select("id")
            .limit(1);

          if (error) {
            console.error("Error checking teams:", error);
            setTeamsExist(false);
          } else {
            setTeamsExist(data && data.length > 0);
          }
        } catch (error) {
          console.error("Error checking teams:", error);
          setTeamsExist(false);
        }
      }
    };

    checkTeams();
  }, []);

  // Fetch available teams/departments from database
  useEffect(() => {
    fetchAvailableTeams();
  }, []);

  const fetchAvailableTeams = async () => {
    if (!isSupabaseConfigured || !supabase) {
      console.log('ℹ️ Supabase not configured, using default teams');
      return;
    }

    setIsLoadingTeams(true);
    try {
      console.log('🔍 Fetching all available teams/departments from database...');
      
      const { data: teams, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching teams:', error);
        toast.error('Failed to load teams');
        return;
      }

      if (teams && teams.length > 0) {
        // Show ALL teams from database (no filtering)
        console.log(`✅ Found ${teams.length} team(s) in database:`, teams);
        setAvailableTeams(teams);
      } else {
        console.log('ℹ️ No teams found in database');
        setAvailableTeams([]);
      }
    } catch (error) {
      console.error('❌ Exception fetching teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setIsLoadingTeams(false);
    }
  };

  // Fetch the latest employee number from Supabase on mount
  useEffect(() => {
    const fetchLatestEmployeeNumber = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🔍 FETCHING LATEST EMPLOYEE NUMBER FROM DATABASE');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          
          // First, let's see ALL employees in the database
          const { data: allEmployees, error: allError } = await supabase
            .from("employees")
            .select("employee_number, full_name, created_at")
            .order("created_at", { ascending: false });

          console.log('📊 ALL EMPLOYEES IN DATABASE:');
          if (allError) {
            console.error('❌ Error fetching all employees:', allError);
            setDebugInfo({
              totalEmployees: 0,
              latestEmployee: null,
              lastError: `Error fetching employees: ${allError.message}`,
              lastFetchTime: new Date().toISOString(),
            });
            // Keep default starting number
            console.log('Using default starting number: EMP-1050');
          } else if (!allEmployees || allEmployees.length === 0) {
            console.log('⚠️  DATABASE IS EMPTY - No employees found!');
            console.log('Starting fresh from EMP-1050');
            setDebugInfo({
              totalEmployees: 0,
              latestEmployee: null,
              lastError: 'Database is empty - no employees registered yet',
              lastFetchTime: new Date().toISOString(),
            });
            // Reset to starting number
            setEmployeeCount(1050);
            console.log('✅ Employee count set to: 1050 (next will be EMP-1050)');
          } else {
            console.log(`✅ Found ${allEmployees.length} employee(s) in database:`);
            allEmployees.slice(0, 5).forEach((emp, index) => {
              console.log(`   ${index + 1}. ${emp.employee_number} - ${emp.full_name} (Created: ${emp.created_at})`);
            });
            if (allEmployees.length > 5) {
              console.log(`   ... and ${allEmployees.length - 5} more employees`);
            }
            
            // Find the highest employee number
            const employeeNumbers = allEmployees
              .map(emp => {
                const match = emp.employee_number.match(/EMP-(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
              })
              .filter(num => num > 0);
            
            if (employeeNumbers.length > 0) {
              const highestNumber = Math.max(...employeeNumbers);
              const nextNumber = highestNumber + 1;
              
              console.log(`📊 Highest employee number found: EMP-${highestNumber}`);
              console.log(`📊 Next employee number will be: EMP-${nextNumber}`);
              
              // Update the employee count to the next available number
              setEmployeeCount(nextNumber);
              
              setDebugInfo({
                totalEmployees: allEmployees.length,
                latestEmployee: `EMP-${highestNumber}`,
                lastError: null,
                lastFetchTime: new Date().toISOString(),
              });
              
              console.log(`✅ Employee count updated to: ${nextNumber}`);
              console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            } else {
              console.log('⚠️ No valid employee numbers found, starting from 1050');
              setEmployeeCount(1050);
            }
          }
        } catch (error) {
          console.error('❌ Exception fetching employee number:', error);
          console.log('Starting from default: EMP-1050');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          setDebugInfo({
            totalEmployees: 0,
            latestEmployee: null,
            lastError: `Exception: ${error}`,
            lastFetchTime: new Date().toISOString(),
          });
          setEmployeeCount(1050);
        }
      } else {
        console.log('ℹ️ Supabase not configured, using mock employee numbers');
        setEmployeeCount(1050);
      }
    };

    fetchLatestEmployeeNumber();
  }, []); // Empty dependency array means this runs once when component mounts

  // Calculate employee number dynamically based on current count
  const employeeNumber = `EMP-${employeeCount}`;
  
  // Log current employee number for debugging
  console.log(`🔢 Current employee number that will be used: ${employeeNumber}`);

  const handleProfilePictureChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
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
    // Generate a simple but secure password
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(
        Math.floor(Math.random() * chars.length),
      );
    }
    return password;
  };

  // Manual refresh function to re-fetch latest employee number
  const handleRefreshEmployeeNumber = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error('Supabase not configured');
      return;
    }

    setIsFetching(true);
    try {
      console.log('🔄 MANUAL REFRESH: Fetching latest employee number...');
      
      const { data: allEmployees, error: allError } = await supabase
        .from("employees")
        .select("employee_number, full_name, created_at")
        .order("created_at", { ascending: false });

      if (allError) {
        console.error('❌ Error:', allError);
        toast.error(`Error fetching employees: ${allError.message}`);
        setDebugInfo({
          totalEmployees: 0,
          latestEmployee: null,
          lastError: `Error: ${allError.message}`,
          lastFetchTime: new Date().toISOString(),
        });
      } else if (!allEmployees || allEmployees.length === 0) {
        console.log('⚠️ Database is empty');
        toast.info('Database is empty. Starting from EMP-1050');
        setEmployeeCount(1050);
        setDebugInfo({
          totalEmployees: 0,
          latestEmployee: null,
          lastError: 'Database is empty',
          lastFetchTime: new Date().toISOString(),
        });
      } else {
        console.log(`✅ Found ${allEmployees.length} employees`);
        
        const employeeNumbers = allEmployees
          .map(emp => {
            const match = emp.employee_number.match(/EMP-(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter(num => num > 0);
        
        if (employeeNumbers.length > 0) {
          const highestNumber = Math.max(...employeeNumbers);
          const nextNumber = highestNumber + 1;
          
          setEmployeeCount(nextNumber);
          setDebugInfo({
            totalEmployees: allEmployees.length,
            latestEmployee: `EMP-${highestNumber}`,
            lastError: null,
            lastFetchTime: new Date().toISOString(),
          });
          
          toast.success(`✅ Refreshed! Next employee: EMP-${nextNumber}`);
          console.log(`✅ Updated to: EMP-${nextNumber}`);
        } else {
          setEmployeeCount(1050);
          toast.info('No valid employee numbers found. Starting from EMP-1050');
        }
      }
    } catch (error) {
      console.error('❌ Exception:', error);
      toast.error('Failed to refresh employee number');
      setDebugInfo({
        totalEmployees: 0,
        latestEmployee: null,
        lastError: `Exception: ${error}`,
        lastFetchTime: new Date().toISOString(),
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      const defaultPassword = generatePassword();
      
      // CRITICAL: Find the next available unique employee number
      let finalEmployeeNumber = employeeNumber;
      let attemptCount = 0;
      const maxAttempts = 10;
      
      if (isSupabaseConfigured && supabase) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 FINDING NEXT UNIQUE EMPLOYEE NUMBER');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Step 1: Get the highest employee number currently in the database
        const { data: latestData, error: latestError } = await supabase
          .from("employees")
          .select("employee_number")
          .order("employee_number", { ascending: false })
          .limit(1);

        let nextNumber = 1050; // Default starting number
        
        if (latestError) {
          console.error('❌ Error fetching latest employee:', latestError);
        } else if (latestData && latestData.length > 0) {
          const latestEmployeeNumber = latestData[0].employee_number;
          console.log('📊 Latest employee in database:', latestEmployeeNumber);
          
          const match = latestEmployeeNumber.match(/EMP-(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
            console.log(`✅ Will start searching from: EMP-${nextNumber}`);
          }
        } else {
          console.log('ℹ️ No employees found, starting from EMP-1050');
        }
        
        // Step 2: Find the first available number (in case of gaps or duplicates)
        while (attemptCount < maxAttempts) {
          const candidateNumber = `EMP-${nextNumber}`;
          console.log(`🔄 Attempt ${attemptCount + 1}: Checking if ${candidateNumber} is available...`);
          
          // Check if this number already exists
          const { data: existingEmployee, error: checkError } = await supabase
            .from("employees")
            .select("employee_number")
            .eq("employee_number", candidateNumber)
            .maybeSingle();
          
          if (checkError) {
            console.error('⚠️ Error checking for duplicate:', checkError);
            // Continue anyway, the unique constraint will catch it
          }
          
          if (!existingEmployee) {
            // This number is available!
            finalEmployeeNumber = candidateNumber;
            console.log(`✅ FOUND UNIQUE NUMBER: ${finalEmployeeNumber}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            break;
          } else {
            console.log(`⚠️ ${candidateNumber} already exists, trying next number...`);
            nextNumber++;
            attemptCount++;
          }
        }
        
        if (attemptCount >= maxAttempts) {
          toast.error('Unable to generate unique employee number. Please try again.');
          setIsLoading(false);
          return;
        }
      } else {
        // Mock mode
        finalEmployeeNumber = employeeNumber;
      }
      
      const username = finalEmployeeNumber;

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✅ FINAL UNIQUE EMPLOYEE NUMBER: ${finalEmployeeNumber}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Generate unique QR token (UUID v4)
      const qrToken = crypto.randomUUID();

      // Generate QR Code
      let qrCodeDataUrl = "";
      try {
        qrCodeDataUrl = await QRCode.toDataURL(qrToken, {
          width: 300,
          margin: 2,
          color: {
            dark: "#0B3060",
            light: "#FFFFFF",
          },
        });
      } catch (error) {
        console.error("QR Code generation error:", error);
        toast.error("Failed to generate QR code");
        setIsLoading(false);
        return;
      }

      // Check if Supabase is configured
      if (isSupabaseConfigured && supabase) {
        console.log(
          "🔵 SUPABASE MODE ACTIVATED - Saving to database...",
        );

        // Step 1: Upload Profile Picture (if exists)
        let profilePictureUrl = null;
        if (
          profilePicture &&
          fileInputRef.current?.files?.[0]
        ) {
          const file = fileInputRef.current.files[0];
          const fileExt = file.name.split(".").pop();
          const fileName = `${employeeNumber}-${Date.now()}.${fileExt}`;

          console.log("Uploading profile picture:", fileName);

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("avatars")
              .upload(fileName, file, {
                cacheControl: "3600",
                upsert: false,
              });

          if (uploadError) {
            console.error(
              "Error uploading profile picture:",
              uploadError,
            );
            
            // Check if it's a bucket not found error
            if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('bucket')) {
              console.warn('⚠️ Storage bucket "avatars" not found. Employee will be registered without profile picture.');
              toast.warning(
                'Profile picture upload skipped: Storage bucket not configured. Employee will be registered without photo.',
                { duration: 5000 }
              );
            } else {
              toast.error(
                `Failed to upload profile picture: ${uploadError.message}`,
              );
            }
            // Continue without profile picture
            profilePictureUrl = null;
          } else {
            console.log(
              "Profile picture uploaded successfully:",
              uploadData,
            );
            // Get public URL
            const {
              data: { publicUrl },
            } = supabase.storage
              .from("avatars")
              .getPublicUrl(fileName);

            profilePictureUrl = publicUrl;
            console.log("Profile picture URL:", publicUrl);
          }
        }

        // Step 2: Get Team ID from team name
        let teamId: string | null = null;
        let teamName = "";
        
        if (formData.team === "Others" && formData.customTeam) {
          // If "Others" is selected, create a new team with the custom name
          teamName = formData.customTeam;
          console.log(`Creating new team: ${teamName}`);
          
          const { data: newTeam, error: teamError } = await supabase
            .from("teams")
            .insert([
              {
                name: teamName,
                description: `Custom team: ${teamName}`,
              },
            ])
            .select()
            .single();

          if (teamError) {
            console.error("❌ Error creating team:", teamError);
            toast.error(
              `Failed to create team "${teamName}": ${teamError.message}`,
            );
            setIsLoading(false);
            return;
          }

          teamId = newTeam.id;
          console.log("✅ New team created with ID:", teamId);
          toast.success(`Team "${teamName}" created successfully!`);
        } else {
          // Use the selected team name (Production or Messaging)
          teamName = formData.team;
          console.log(`Looking up team ID for: ${teamName}`);
          
          // Find the team by name in the database
          const { data: existingTeam, error: teamError } = await supabase
            .from("teams")
            .select("id, name")
            .ilike("name", teamName)
            .maybeSingle();

          if (teamError) {
            console.error("❌ Error querying team:", teamError);
            toast.error(`Error checking for team: ${teamError.message}`);
            setIsLoading(false);
            return;
          }

          if (!existingTeam) {
            // Team doesn't exist, create it automatically
            console.log(`📝 Team "${teamName}" not found, creating it automatically...`);
            
            const { data: newTeam, error: createError } = await supabase
              .from("teams")
              .insert([
                {
                  name: teamName,
                  description: `${teamName} Team`,
                  created_at: new Date().toISOString()
                },
              ])
              .select()
              .single();

            if (createError) {
              console.error("❌ Error creating team:", createError);
              toast.error(
                `Failed to create team "${teamName}": ${createError.message}. Please select "Others" to create a custom team.`,
              );
              setIsLoading(false);
              return;
            }

            teamId = newTeam.id;
            console.log(`✅ Team "${teamName}" created successfully with ID:`, teamId);
            toast.success(`Team "${teamName}" created successfully!`);
          } else {
            teamId = existingTeam.id;
            console.log("✅ Found existing team with ID:", teamId);
          }
        }

        if (!teamId) {
          toast.error("Please select a team before registering.");
          setIsLoading(false);
          return;
        }

        console.log("Team ID to be used:", teamId);

        // Step 3: Insert Employee into Database
        console.log("Inserting employee into database...");
        const employeePayload = {
          employee_number: finalEmployeeNumber,
          qr_token: qrToken,
          full_name: formData.fullName,
          email: formData.email,
          phone_number: formData.phone,
          birthday: formData.birthday,
          position: formData.position,
          team_id: teamId,
          profile_picture_url: profilePictureUrl,
          password_hash: defaultPassword, // In production, hash this password!
          status: "active",
          created_at: new Date().toISOString(),
        };

        console.log("Employee payload:", employeePayload);

        const { data: employeeData, error: employeeError } =
          await supabase
            .from("employees")
            .insert([employeePayload])
            .select()
            .single();

        if (employeeError) {
          console.error(
            "❌ Error inserting employee:",
            employeeError,
          );
          console.error("Full error details:", JSON.stringify(employeeError, null, 2));
          toast.error(
            `Failed to create employee: ${employeeError.message}`,
            {
              duration: 10000,
            }
          );
          setIsLoading(false);
          return;
        }

        console.log(
          "✅ Employee created successfully in Supabase:",
          employeeData,
        );
        
        // Verify the employee was actually saved
        const { data: verifyData, error: verifyError } = await supabase
          .from('employees')
          .select('*')
          .eq('employee_number', finalEmployeeNumber)
          .single();
        
        if (verifyError) {
          console.error("⚠️ Warning: Could not verify employee was saved:", verifyError);
        } else {
          console.log("✅ VERIFICATION: Employee exists in database:", verifyData);
        }

        // Step 4: Create Audit Log
        const { error: auditError } = await supabase
          .from("activity_logs")
          .insert([
            {
              action_type: "CREATED_EMPLOYEE",
              employee_id: employeeData.id,
              details: {
                employee_number: finalEmployeeNumber,
                full_name: formData.fullName,
                team: formData.team,
                position: formData.position,
              },
              performed_by: "current_admin_id", // Replace with actual admin ID from auth context
              // Don't set created_at - let database use default
            },
          ]);

        if (auditError) {
          console.error(
            "Error creating audit log:",
            auditError,
          );
          // Don't fail the whole operation, just log it
        }

        toast.success(
          "✅ Employee registered successfully in Supabase!",
          {
            duration: 5000,
          },
        );
      } else {
        // MOCK MODE - Supabase not configured, simulate success
        console.log(
          "📦 MOCK MODE: Employee data (not saved to database):",
          {
            employeeNumber,
            qrToken,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            birthday: formData.birthday,
            position: formData.position,
            team: formData.team,
            username,
            password: defaultPassword,
          },
        );

        toast.success(
          "Employee registered successfully! (Mock Mode - Configure Supabase to save to database)",
          {
            duration: 5000,
          },
        );

        // Add employee to mock store
        const newEmployee: Employee = {
          id: employeeNumber,
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          position: formData.position,
          team: formData.team,
          status: "in-office",
          avatar: profilePicture || undefined,
        };
        addEmployeeToMockStore(newEmployee);
      }

      // Show Success Modal (works in both modes)
      const newEmployee: CreatedEmployee = {
        employeeNumber: finalEmployeeNumber,
        fullName: formData.fullName,
        email: formData.email,
        username,
        password: defaultPassword,
        qrCodeUrl: qrCodeDataUrl,
      };

      setCreatedEmployee(newEmployee);
      setShowSuccessModal(true);

      // Reset form
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        birthday: "",
        position: "",
        team: "",
        customTeam: "", // Reset custom team field
      });
      setProfilePicture(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Increment employee count for next registration
      // Extract the number from finalEmployeeNumber and set it + 1
      const match = finalEmployeeNumber.match(/EMP-(\d+)/);
      if (match) {
        const currentNumber = parseInt(match[1], 10);
        setEmployeeCount(currentNumber + 1);
        console.log(`✅ Updated employee counter from ${currentNumber} to ${currentNumber + 1}`);
        
        // Clear the debug error since we successfully registered an employee
        setDebugInfo({
          totalEmployees: debugInfo.totalEmployees + 1,
          latestEmployee: finalEmployeeNumber,
          lastError: null,
          lastFetchTime: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(
        "❌ Unexpected error during employee creation:",
        error,
      );
      toast.error(
        "An unexpected error occurred. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyLoginDetails = () => {
    if (createdEmployee) {
      const details = `🔐 MNEMOSYNE EMPLOYEE LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Employee Name: ${createdEmployee.fullName}
Employee Number: ${createdEmployee.employeeNumber}

USERNAME: ${createdEmployee.username}
PASSWORD: ${createdEmployee.password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Portal URL: https://mnemosyne.attendance.com

IMPORTANT INSTRUCTIONS:
1. Use these credentials to log into your Employee Portal
2. Your personal QR code is already available in your portal
3. Please change your password immediately after first login
4. Keep your QR code accessible for daily attendance

For assistance, contact HR or Admin.`;

      // Try modern Clipboard API first, fallback to legacy method
      if (
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        navigator.clipboard
          .writeText(details)
          .then(() => {
            toast.success("Login details copied to clipboard!");
          })
          .catch(() => {
            // Fallback to legacy method
            fallbackCopyToClipboard(details);
          });
      } else {
        // Fallback to legacy method
        fallbackCopyToClipboard(details);
      }
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    // Create a temporary textarea element
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Make it invisible
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        toast.success("Login details copied to clipboard!");
      } else {
        toast.error("Failed to copy. Please copy manually.");
      }
    } catch (err) {
      console.error("Fallback: Could not copy text", err);
      toast.error("Failed to copy. Please copy manually.");
    }

    document.body.removeChild(textArea);
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    setCreatedEmployee(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <UserPlus className="w-8 h-8 text-slate-700" />
        <h1 className="text-slate-900">
          Register New Employee
        </h1>
      </div>

      {/* Database Warning Banner */}
      {isSupabaseConfigured && teamsExist === false && (
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">
                Database Setup Required
              </h3>
              <p className="text-sm text-red-800 mb-4">
                Your <strong>teams</strong> table is empty or doesn't exist. You need to set up teams in your Supabase database before registering employees.
              </p>
              <a
                href="/setup"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B3060] text-white rounded-lg hover:bg-[#0B3060]/90 transition-colors font-semibold text-sm"
              >
                Go to Database Setup
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* DEBUG INFO BANNER */}
      {isSupabaseConfigured && debugInfo.lastError === 'Database is empty - no employees registered yet' && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-900 mb-2">
                ⚠️ DATABASE IS EMPTY - EMPLOYEES NOT SAVING
              </h3>
              <p className="text-sm text-yellow-800 mb-2">
                <strong>Problem:</strong> No employees found in the database. When you register employees, they're not being saved to Supabase.
              </p>
              <p className="text-sm text-yellow-800 mb-3">
                <strong>Most likely cause:</strong> Row Level Security (RLS) is enabled and blocking database inserts.
              </p>
              <a
                href="/setup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold transition-colors"
              >
                <Database className="w-5 h-5" />
                Fix Database Setup Now
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {debugInfo.lastError && debugInfo.lastError !== 'Database is empty - no employees registered yet' && (
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">
                ❌ DATABASE ERROR
              </h3>
              <p className="text-sm text-red-800 mb-2">
                <strong>Error:</strong> {debugInfo.lastError}
              </p>
              <p className="text-sm text-red-800 font-bold">
                Check the browser console (F12) for more details!
              </p>
            </div>
          </div>
        </div>
      )}

      {debugInfo.totalEmployees > 0 && (
        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">
              <strong>Database Status:</strong> {debugInfo.totalEmployees} employee(s) registered. Latest: {debugInfo.latestEmployee}
            </p>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Auto-Generated Employee Number */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              Employee Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={employeeNumber}
                readOnly
                className="w-full px-4 py-2.5 bg-white border border-blue-300 rounded-lg text-slate-900 font-semibold cursor-not-allowed focus:outline-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-blue-100 px-2.5 py-1 rounded-md">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">
                  AUTO-GENERATED
                </span>
              </div>
            </div>
          </div>

          {/* Profile Picture Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserPlus className="w-8 h-8 text-slate-400" />
                )}
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
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
                >
                  <Upload className="w-4 h-4" />
                  Upload Photo
                </button>
                <p className="text-xs text-slate-500 mt-1.5">
                  JPG, PNG or GIF (max. 2MB)
                </p>
              </div>
            </div>
          </div>

          {/* Employee Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name - Spans 2 columns */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fullName: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-slate-900"
                placeholder="Juan Dela Cruz"
                required
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-slate-900"
                placeholder="juan.delacruz@company.com"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({
                    ...formData,
                    phone: value,
                  });
                }}
                onKeyPress={(e) => {
                  // Prevent non-numeric characters from being typed
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-slate-900"
                placeholder="09123456789"
                maxLength={11}
                required
              />
              <p className="text-xs text-slate-500 mt-1">Enter 11-digit phone number (numbers only)</p>
            </div>

            {/* Birthday */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Birthday <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.birthday}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    birthday: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-slate-900"
                required
              />
            </div>

            {/* Team */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
                <span>
                  Team <span className="text-red-500">*</span>
                </span>
                <button
                  type="button"
                  onClick={fetchAvailableTeams}
                  disabled={isLoadingTeams}
                  className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                  title="Refresh teams list"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingTeams ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </label>
              <select
                value={formData.team}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    team: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-slate-900 bg-white"
                required
                disabled={isLoadingTeams}
              >
                <option value="">
                  {isLoadingTeams ? 'Loading teams...' : 'Select Team...'}
                </option>
                {/* Dynamically loaded teams from database */}
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.name}>
                    {team.name}
                  </option>
                ))}
              </select>
              {availableTeams.length > 0 && (
                <p className="text-xs text-gray-500 mt-1.5">
                  {availableTeams.length} team{availableTeams.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>

            {/* Custom Team Input */}
            {formData.team === "Others" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Custom Team Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customTeam}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customTeam: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-slate-900"
                  placeholder="Enter custom team name"
                  required
                />
              </div>
            )}

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Position <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    position: e.target.value,
                  })
                }
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-slate-900"
                placeholder="Software Developer"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6 border-t border-slate-200">
            <button
              type="submit"
              className="flex items-center gap-2 px-8 py-3 bg-[#0f284d] text-white rounded-lg hover:bg-[#0f284d]/90 transition-colors font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.928l3-2.647z"
                    ></path>
                  </svg>
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Register</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && createdEmployee && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Success Header */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-[#1F2937] mb-2">
                  Employee Account Created Successfully!
                </h2>
                <p className="text-gray-600">
                  The account is now active and ready to use
                </p>
              </div>

              {/* Employee Details */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Employee ID
                    </p>
                    <p className="text-xl font-bold text-[#0B3060]">
                      {createdEmployee.employeeNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">
                      Full Name
                    </p>
                    <p className="text-lg font-semibold text-[#1F2937]">
                      {createdEmployee.fullName}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Email Address
                  </p>
                  <p className="text-[#1F2937] font-medium">
                    {createdEmployee.email}
                  </p>
                </div>
              </div>

              {/* IMPORTANT: Admin Instructions */}
              <div className="bg-red-50 border-2 border-red-400 rounded-lg p-5 mb-6">
                <h3 className="text-lg font-bold text-red-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  IMPORTANT: Next Steps for Admin
                </h3>
                <div className="space-y-2 text-sm text-red-900">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-red-600" />
                    <p className="font-semibold">
                      Copy the login credentials below
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-red-600" />
                    <p className="font-semibold">
                      Share USERNAME and PASSWORD with{" "}
                      {createdEmployee.fullName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-red-600" />
                    <p className="font-semibold">
                      Employee will log into their Employee
                      Portal using these credentials
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-red-600" />
                    <p className="font-semibold">
                      Their QR Code is already waiting in their
                      portal dashboard
                    </p>
                  </div>
                </div>
              </div>

              {/* Login Credentials - PROMINENT */}
              <div className="bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-lg p-6 mb-6 text-white">
                <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                  <Key className="w-6 h-6 text-[#F7B34C]" />
                  LOGIN CREDENTIALS
                </h3>
                <p className="text-sm text-white/80 mb-4">
                  Share these with the employee
                </p>

                <div className="space-y-4 bg-white/10 backdrop-blur-sm rounded-lg p-5">
                  <div>
                    <p className="text-sm text-white/70 mb-1">
                      USERNAME
                    </p>
                    <p className="font-mono font-bold text-2xl text-[#F7B34C]">
                      {createdEmployee.username}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/70 mb-1">
                      PASSWORD
                    </p>
                    <p className="font-mono font-bold text-2xl text-[#F7B34C]">
                      {createdEmployee.password}
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-amber-500 text-[#0B3060] rounded-lg">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Employee must change password after first
                    login
                  </p>
                </div>
              </div>

              {/* QR Code Info */}
              <div className="bg-green-50 border-2 border-green-400 rounded-lg p-5 mb-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-500 rounded-lg">
                    <QrCode className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-900 mb-2">
                      QR Code Status: Generated ✓
                    </h3>
                    <p className="text-sm text-green-800 mb-3">
                      The employee's personal QR code has been
                      created and is automatically available in
                      their Employee Portal dashboard once they
                      log in.
                    </p>
                    {createdEmployee.qrCodeUrl && (
                      <div className="inline-block bg-white p-3 rounded-lg shadow-md">
                        <img
                          src={createdEmployee.qrCodeUrl}
                          alt="Employee QR Code"
                          className="w-32 h-32"
                        />
                        <p className="text-xs text-gray-600 mt-2 text-center">
                          {createdEmployee.employeeNumber}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-green-700 mt-3 font-semibold">
                      → Employee will use this QR code for daily
                      attendance at the kiosk scanner
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={copyLoginDetails}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#F7B34C] text-[#0B3060] rounded-lg hover:bg-[#F7B34C]/90 transition-colors font-bold text-lg shadow-lg"
                >
                  <Copy className="w-5 h-5" />
                  Copy Login Details to Share
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-8 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}