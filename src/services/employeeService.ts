import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { employees as mockEmployees, Employee } from '../data/mockData';

/**
 * Employee Service
 * Handles employee data operations with automatic fallback between Supabase and mock data
 */

// In-memory store for new employees when Supabase is not configured
let inMemoryEmployees: Employee[] = [...mockEmployees];

/**
 * Get all employees
 * Returns from Supabase if configured, otherwise returns mock + in-memory data
 */
export const getAllEmployees = async (): Promise<Employee[]> => {
  if (isSupabaseConfigured && supabase) {
    try {
      // Fetch employees with team information using JOIN
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          teams:team_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees from Supabase:', error);
        return inMemoryEmployees;
      }

      // Map Supabase data to our Employee interface
      const mappedEmployees = data.map(emp => ({
        id: emp.employee_number,
        name: emp.full_name,
        email: emp.email,
        phone: emp.phone_number,
        position: emp.position,
        team: emp.teams?.name || 'Unknown Team',
        status: emp.status === 'active' ? 'in-office' : 'absent',
        avatar: emp.profile_picture_url,
      }));

      // Remove duplicates based on employee ID
      const uniqueEmployees = mappedEmployees.filter((emp, index, self) =>
        index === self.findIndex((e) => e.id === emp.id)
      );

      return uniqueEmployees;
    } catch (error) {
      console.error('Unexpected error fetching employees:', error);
      return inMemoryEmployees;
    }
  }

  // Return mock + in-memory data when Supabase is not configured
  // Remove duplicates here too
  const uniqueInMemory = inMemoryEmployees.filter((emp, index, self) =>
    index === self.findIndex((e) => e.id === emp.id)
  );
  
  return uniqueInMemory;
};

/**
 * Add a new employee to the in-memory store (for mock mode)
 */
export const addEmployeeToMockStore = (employee: Employee): void => {
  inMemoryEmployees = [employee, ...inMemoryEmployees];
};

/**
 * Get a single employee by ID
 */
export const getEmployeeById = async (id: string): Promise<Employee | null> => {
  const employees = await getAllEmployees();
  return employees.find(emp => emp.id === id) || null;
};

/**
 * Reset in-memory employees to original mock data
 */
export const resetEmployees = (): void => {
  inMemoryEmployees = [...mockEmployees];
};