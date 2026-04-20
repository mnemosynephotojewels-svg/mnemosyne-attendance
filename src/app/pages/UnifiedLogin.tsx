import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LogIn, Eye, EyeOff, UserCircle, Key, AlertCircle, Loader2, Monitor, Sparkles, ChevronRight, Lock, Wrench, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/button';
import { Database } from 'lucide-react';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-df988758`;

export function UnifiedLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Auto-fill credentials from ViewAccounts page
  useEffect(() => {
    const autofillUsername = localStorage.getItem('autofill_username');
    const autofillPassword = localStorage.getItem('autofill_password');
    
    if (autofillUsername && autofillPassword) {
      console.log('✅ Auto-filling credentials from ViewAccounts');
      setUsername(autofillUsername);
      setPassword(autofillPassword);
      
      // Clear the autofill data
      localStorage.removeItem('autofill_username');
      localStorage.removeItem('autofill_password');
      
      toast.success('Credentials loaded! Click Login to continue.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 LOGIN ATTEMPT STARTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username:', username);
    console.log('Password length:', password?.length);

    // Validation
    if (!username || !username.trim() || !password || !password.trim()) {
      setError('Please enter both username and password');
      toast.error('Please enter both username and password');
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    setIsLoading(true);

    try {
      // DIRECT SUPABASE DATABASE LOGIN - No backend needed!
      console.log('🔍 Checking credentials in Supabase database...');

      if (!supabase) {
        setError('Database connection not available');
        toast.error('Database connection not available');
        setIsLoading(false);
        return;
      }

      // Strategy: Try all three tables and see which one matches
      let loginSuccess = false;

      // Try Employee login first
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('1️⃣ CHECKING EMPLOYEES TABLE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_number', trimmedUsername)
        .eq('password_hash', trimmedPassword)
        .maybeSingle();

      console.log('Employee query completed');
      console.log('- Found data:', employeeData ? 'YES' : 'NO');
      console.log('- Error:', employeeError ? employeeError.message : 'NONE');
      
      if (employeeData && !employeeError) {
        console.log('✅✅✅ EMPLOYEE LOGIN SUCCESS! ✅✅✅');
        console.log('Employee details:', {
          employee_number: employeeData.employee_number,
          full_name: employeeData.full_name,
          email: employeeData.email
        });
        
        // Clear all old sessions
        localStorage.removeItem('adminSession');
        localStorage.removeItem('superAdminSession');
        localStorage.setItem('employeeSession', JSON.stringify(employeeData));
        
        toast.success(`Welcome back, ${employeeData.full_name}!`);
        setIsLoading(false);
        navigate('/employee');
        return;
      }

      // Try Admin login
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('2️⃣ CHECKING ADMINS TABLE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('admin_number', trimmedUsername)
        .eq('password_hash', trimmedPassword)
        .maybeSingle();

      console.log('Admin query completed');
      console.log('- Found data:', adminData ? 'YES' : 'NO');
      console.log('- Error:', adminError ? adminError.message : 'NONE');

      if (adminData && !adminError) {
        console.log('✅✅✅ ADMIN LOGIN SUCCESS! ✅✅✅');
        console.log('Admin details:', {
          admin_number: adminData.admin_number,
          full_name: adminData.full_name,
          email: adminData.email
        });
        
        // Clear all old sessions
        localStorage.removeItem('employeeSession');
        localStorage.removeItem('superAdminSession');
        localStorage.removeItem('mnemosyne_employee_profile');
        localStorage.removeItem('mnemosyne_super_admin_profile');
        
        // Set admin session and profile
        localStorage.setItem('adminSession', JSON.stringify(adminData));
        localStorage.setItem('mnemosyne_admin_profile', JSON.stringify(adminData));
        
        toast.success(`Welcome back, ${adminData.full_name}!`);
        setIsLoading(false);
        navigate('/admin');
        return;
      }

      // Try Super Admin login
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('3️⃣ CHECKING SUPER_ADMIN TABLE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // First, let's see what's actually in the super_admin table
      const { data: allSuperAdmins, error: allSuperAdminError } = await supabase
        .from('super_admin')
        .select('*');
      
      console.log('🔍 ALL SUPER ADMINS IN DATABASE:');
      if (allSuperAdmins && allSuperAdmins.length > 0) {
        allSuperAdmins.forEach((sa, index) => {
          console.log(`\n--- Super Admin ${index + 1} ---`);
          console.log('ID:', sa.id);
          console.log('Username:', sa.username);
          console.log('Password Hash:', sa.password_hash);
          console.log('Full Name:', sa.full_name);
          console.log('Email:', sa.email);
          console.log('Status:', sa.status);
          console.log('All fields:', sa);
        });
      } else {
        console.log('⚠️ NO SUPER ADMINS FOUND IN DATABASE!');
      }
      console.log('');
      
      const { data: superAdminData, error: superAdminError } = await supabase
        .from('super_admin')
        .select('*')
        .eq('username', trimmedUsername)
        .eq('password_hash', trimmedPassword)
        .maybeSingle();

      console.log('Super Admin query completed');
      console.log('- Found data:', superAdminData ? 'YES' : 'NO');
      console.log('- Error:', superAdminError ? superAdminError.message : 'NONE');
      
      // ALSO try without password to see if username exists
      const { data: usernameCheck, error: usernameError } = await supabase
        .from('super_admin')
        .select('*')
        .eq('username', trimmedUsername)
        .maybeSingle();
        
      if (usernameCheck) {
        console.log('✅ Username EXISTS in super_admin table!');
        console.log('Stored password_hash:', usernameCheck.password_hash);
        console.log('Entered password:', trimmedPassword);
        console.log('Match:', usernameCheck.password_hash === trimmedPassword);
      } else {
        console.log('❌ Username NOT FOUND in super_admin table');
      }

      if (superAdminData && !superAdminError) {
        console.log('✅✅✅ SUPER ADMIN LOGIN SUCCESS! ✅✅✅');
        console.log('Super Admin details:', {
          username: superAdminData.username,
          full_name: superAdminData.full_name,
          email: superAdminData.email
        });
        
        // Clear all old sessions
        localStorage.removeItem('employeeSession');
        localStorage.removeItem('adminSession');
        localStorage.setItem('superAdminSession', JSON.stringify(superAdminData));
        
        toast.success(`Welcome back, ${superAdminData.full_name || superAdminData.username}!`);
        setIsLoading(false);
        navigate('/super-admin');
        return;
      }

      // If we get here, login failed in all three tables
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ LOGIN FAILED - NO MATCH IN ANY TABLE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Credentials entered:');
      console.log('- Username:', trimmedUsername);
      console.log('- Password:', trimmedPassword);
      console.log('');
      console.log('Error details:');
      console.log('- Employee error:', employeeError?.message || 'No match found');
      console.log('- Admin error:', adminError?.message || 'No match found');
      console.log('- Super Admin error:', superAdminError?.message || 'No match found');
      console.log('');
      console.log('💡 TROUBLESHOOTING TIPS:');
      console.log('1. Check if the username exists in database');
      console.log('2. Verify password is EXACTLY correct (case-sensitive)');
      console.log('3. Go to /view-db-credentials to see all valid accounts');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      setError('Invalid username or password. Please check your credentials and try again.');
      toast.error('Invalid username or password. Check console for details.');

    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ UNEXPECTED ERROR DURING LOGIN');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      setError(`Login error: ${error.message}`);
      toast.error(`Login error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3060] via-[#0d2847] to-[#0a1e3d] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#F7B34C]/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#F7B34C]/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(#F7B34C 1px, transparent 1px), linear-gradient(90deg, #F7B34C 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
        
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#F7B34C]/40 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-[#F7B34C]/40 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-[#F7B34C]/40 rounded-full animate-ping" style={{ animationDuration: '5s', animationDelay: '2s' }} />
      </div>

      {/* Kiosk Mode Floating Button */}
      <button
        onClick={() => navigate('/kiosk')}
        className="fixed top-6 right-6 z-50 group"
        title="Switch to Kiosk Mode"
      >
        <div className="relative">
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-[#F7B34C] rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-all duration-300" />
          
          {/* Button Content */}
          <div className="relative bg-gradient-to-br from-[#F7B34C] to-[#e6a03c] text-[#0B3060] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[#F7B34C]/50">
            <Monitor className="w-5 h-5" />
            <span className="font-bold text-sm hidden sm:inline">Kiosk Mode</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
          </div>

          {/* Badge */}
          <div className="absolute -top-2 -right-2 bg-gradient-to-br from-green-400 to-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>QR</span>
          </div>
        </div>
      </button>

      {/* Main Login Card */}
      <div className="relative w-full max-w-[480px]">
        {/* Card Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F7B34C]/20 via-white/20 to-[#F7B34C]/20 rounded-[32px] blur-2xl" />
        
        {/* Card */}
        <div className="relative bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl overflow-hidden">
          {/* Top Decorative Bar */}
          <div className="h-2 bg-gradient-to-r from-[#0B3060] via-[#F7B34C] to-[#0B3060]" />
          
          <div className="p-8 sm:p-10">
            {/* Logo and Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="mb-6 relative">
                <div className="absolute inset-0 bg-[#F7B34C]/20 rounded-full blur-2xl" />
                <div className="relative">
                  <Logo variant="dark" />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#0B3060] via-[#1a4a8a] to-[#0B3060] bg-clip-text text-transparent" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Welcome Back
                </h1>
                <p className="text-gray-600 text-base flex items-center gap-2 justify-center">
                  <Lock className="w-4 h-4 text-[#F7B34C]" />
                  Secure Access to Mnemosyne
                </p>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 bg-gradient-to-r from-red-50 to-red-50/50 border-2 border-red-200 rounded-2xl p-4 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-md">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-red-900 mb-1">Authentication Error</h4>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-[#0B3060]" />
                  Username
                </label>
                <div className={`relative group transition-all duration-300 ${focusedField === 'username' ? 'scale-[1.02]' : ''}`}>
                  <div className={`absolute inset-0 bg-gradient-to-r from-[#0B3060]/20 to-[#F7B34C]/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${focusedField === 'username' ? 'opacity-100' : ''}`} />
                  <div className={`relative flex items-center bg-white border-2 rounded-xl transition-all duration-300 shadow-sm ${
                    focusedField === 'username' 
                      ? 'border-[#0B3060] shadow-lg shadow-[#0B3060]/20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className={`pl-4 pr-3 transition-colors duration-300 ${focusedField === 'username' ? 'text-[#0B3060]' : 'text-gray-400'}`}>
                      <UserCircle className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your username or ID"
                      disabled={isLoading}
                      autoComplete="username"
                      className="flex-1 py-3.5 pr-4 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 disabled:opacity-50 font-medium"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1 pl-1">
                  <span className="w-1 h-1 bg-gray-400 rounded-full" />
                  Employee ID (EMP001) • Admin (ADM001) • Super Admin username
                </p>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#0B3060]" />
                  Password
                </label>
                <div className={`relative group transition-all duration-300 ${focusedField === 'password' ? 'scale-[1.02]' : ''}`}>
                  <div className={`absolute inset-0 bg-gradient-to-r from-[#0B3060]/20 to-[#F7B34C]/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${focusedField === 'password' ? 'opacity-100' : ''}`} />
                  <div className={`relative flex items-center bg-white border-2 rounded-xl transition-all duration-300 shadow-sm ${
                    focusedField === 'password' 
                      ? 'border-[#0B3060] shadow-lg shadow-[#0B3060]/20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className={`pl-4 pr-3 transition-colors duration-300 ${focusedField === 'password' ? 'text-[#0B3060]' : 'text-gray-400'}`}>
                      <Key className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter your password"
                      disabled={isLoading}
                      autoComplete="current-password"
                      className="flex-1 py-3.5 pr-4 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 disabled:opacity-50 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="px-4 text-gray-400 hover:text-[#0B3060] transition-colors duration-300 group/btn"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 group-hover/btn:scale-110 transition-transform duration-300" />
                      ) : (
                        <Eye className="w-5 h-5 group-hover/btn:scale-110 transition-transform duration-300" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full group mt-6"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#0B3060] via-[#F7B34C] to-[#0B3060] rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
                <div className="relative bg-gradient-to-r from-[#0B3060] via-[#1a4a8a] to-[#0B3060] hover:from-[#1a4a8a] hover:via-[#0B3060] hover:to-[#1a4a8a] text-white py-4 rounded-xl font-bold transition-all duration-300 shadow-xl group-hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-base group-hover:scale-[1.02]">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Signing you in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-300" />
                      <span>Sign In to Continue</span>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all duration-300" />
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 space-y-3">
              {/* Quick Access Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/view-db-credentials')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[#0B3060] bg-gradient-to-r from-[#F7B34C]/10 to-[#F7B34C]/20 hover:from-[#F7B34C]/20 hover:to-[#F7B34C]/30 border border-[#F7B34C]/40 rounded-lg transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
                >
                  <Database className="w-4 h-4" />
                  <span>View Database Credentials</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => navigate('/super-admin-diagnostic')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 border border-purple-500 rounded-lg transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Fix Super Admin</span>
                </button>
              </div>
              
              {/* Bottom Info */}
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-500">
                  Having trouble logging in?
                </p>
                <p className="text-xs text-gray-400">
                  Contact your system administrator for assistance
                </p>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-400">
                    © 2026 Mnemosyne Creation. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}