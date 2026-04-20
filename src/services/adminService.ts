import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * Admin Service
 * Handles admin data operations with automatic fallback between Supabase and mock data
 */

export interface Admin {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: 'admin' | 'super-admin';
  accessLevel: 'standard' | 'full';
  avatar?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  password?: string; // Add password field for Super Admin viewing
}

// Mock initial admins
const mockAdmins: Admin[] = [
  {
    id: 'ADM-001',
    username: 'admin.super',
    name: 'Super Admin',
    email: 'super.admin@mnemosyne.com',
    phone: '+1 234 567 9999',
    department: 'Management',
    role: 'super-admin',
    accessLevel: 'full',
    status: 'active',
  },
  {
    id: 'ADM-002',
    username: 'lisa.anderson',
    name: 'Lisa Anderson',
    email: 'lisa.a@mnemosyne.com',
    phone: '+1 234 567 8907',
    department: 'Human Resources',
    role: 'admin',
    accessLevel: 'standard',
    status: 'active',
  },
];

// In-memory store for new admins when Supabase is not configured
let inMemoryAdmins: Admin[] = [...mockAdmins];

/**
 * Get all admins
 * Returns from Supabase if configured, otherwise returns mock + in-memory data
 */
export const getAllAdmins = async (): Promise<Admin[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📋 FETCHING ALL ADMIN ACCOUNTS');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Fetch ALL records from admins table (no role filtering)
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching admins from Supabase:', error);
        return inMemoryAdmins;
      }

      console.log(`✅ Fetched ${data.length} admin account(s) from database`);
      
      // Log each admin for debugging
      data.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.full_name} (${admin.admin_number}) - Role: ${admin.role} - Department: ${admin.department}`);
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Map Supabase data to our Admin interface
      // Handle different role naming variations
      return data.map(admin => {
        // Normalize role to our interface format
        let normalizedRole: 'admin' | 'super-admin' = 'admin';
        
        const roleStr = (admin.role || '').toLowerCase();
        if (roleStr.includes('super')) {
          normalizedRole = 'super-admin';
        } else {
          // All other roles (Administrator, admin team leader, admin, etc.) are treated as 'admin'
          normalizedRole = 'admin';
        }
        
        return {
          id: admin.admin_number,
          username: admin.username,
          name: admin.full_name,
          email: admin.email,
          phone: admin.phone_number,
          department: admin.department,
          role: normalizedRole,
          accessLevel: admin.access_level,
          avatar: admin.profile_picture_url,
          status: admin.status,
          createdAt: admin.created_at,
          password: admin.password_hash, // Include password for Super Admin viewing
        };
      });
    } catch (error) {
      console.error('❌ Unexpected error fetching admins:', error);
      return inMemoryAdmins;
    }
  }

  // Return mock + in-memory data when Supabase is not configured
  return inMemoryAdmins;
};

/**
 * Add a new admin to the in-memory store (for mock mode)
 */
export const addAdminToMockStore = (admin: Admin): void => {
  inMemoryAdmins = [admin, ...inMemoryAdmins];
};

/**
 * Get a single admin by ID
 */
export const getAdminById = async (id: string): Promise<Admin | null> => {
  const admins = await getAllAdmins();
  return admins.find(admin => admin.id === id) || null;
};

/**
 * Reset in-memory admins to original mock data
 */
export const resetAdmins = (): void => {
  inMemoryAdmins = [...mockAdmins];
};