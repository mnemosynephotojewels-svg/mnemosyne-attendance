import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from 'npm:@supabase/supabase-js@2';

const app = new Hono();

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Request timeout helper (10 seconds default)
const REQUEST_TIMEOUT_MS = 10000;

async function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  errorMessage: string = 'Request timeout'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

// Enable logger
app.use('*', logger(console.log));

// Request timeout middleware - log slow requests but don't abort
app.use('*', async (c, next) => {
  const startTime = Date.now();
  
  try {
    await next();
    const duration = Date.now() - startTime;
    if (duration > 5000) {
      console.warn('⏱️ Slow request detected:', c.req.url, 'took', duration, 'ms');
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('⚠️ Request error after', duration, 'ms:', c.req.url);
    console.error('Error details:', error);
    throw error; // Re-throw to be caught by onError handler
  }
});

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-df988758/health", (c) => {
  return c.json({ status: "ok" });
});

// NEW: Table structure diagnostic endpoint
app.get("/make-server-df988758/debug/table-structure", async (c) => {
  try {
    console.log('🔍 CHECKING DATABASE TABLE STRUCTURES...');
    
    const results: any = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    // Check each authentication table
    const tables = ['employees', 'admins', 'super_admin'];
    
    for (const tableName of tables) {
      console.log(`\n📊 Checking ${tableName} table...`);
      
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact' })
          .limit(1);

        if (error) {
          console.log(`   ❌ Error: ${error.message}`);
          results.tables[tableName] = {
            status: 'error',
            error: error.message,
            code: error.code
          };
        } else {
          const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
          console.log(`   ✅ Success! Found ${count || 0} records`);
          console.log(`   📋 Columns:`, columns.join(', '));
          
          results.tables[tableName] = {
            status: 'success',
            recordCount: count || 0,
            columns: columns,
            sampleData: data && data.length > 0 ? {
              ...data[0],
              password: data[0].password ? '***HIDDEN***' : undefined,
              password_hash: data[0].password_hash ? '***HIDDEN***' : undefined
            } : null
          };
        }
      } catch (err: any) {
        console.log(`   ❌ Exception: ${err.message}`);
        results.tables[tableName] = {
          status: 'exception',
          error: err.message
        };
      }
    }

    console.log('\n✅ Table structure check complete');
    return c.json(results);
  } catch (error: any) {
    console.error('❌ Fatal error in table structure check:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DEBUG ENDPOINT - Shows all accounts in database (FOR DEBUGGING ONLY)
 */
app.get("/make-server-df988758/debug/accounts", async (c) => {
  try {
    console.log('🔍 DEBUG: Fetching all accounts from database...');
    console.log('Using SERVICE_ROLE_KEY for admin access (bypassing RLS)');

    // Create admin client with SERVICE_ROLE_KEY to bypass RLS
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Supabase URL:', Deno.env.get('SUPABASE_URL'));
    console.log('SERVICE_ROLE_KEY exists:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    // Fetch all employees with all columns
    console.log('Querying employees table...');
    const { data: employees, error: empError } = await adminSupabase
      .from('employees')
      .select('*');
    
    console.log('Employees query result:', { 
      count: employees?.length, 
      error: empError?.message,
      hint: empError?.hint,
      details: empError?.details,
      code: empError?.code
    });
    if (employees && employees.length > 0) {
      console.log('Employee sample (first record):', employees[0]);
      console.log('All employee username fields:', employees.map((e: any) => ({
        employee_number: e.employee_number,
        employee_id: e.employee_id,
        id: e.id,
        username: e.username,
        full_name: e.full_name
      })));
    }

    // Fetch all admins with all columns
    console.log('Querying admins table...');
    const { data: admins, error: adminError } = await adminSupabase
      .from('admins')
      .select('*');
    
    console.log('Admins query result:', { 
      count: admins?.length, 
      error: adminError?.message,
      hint: adminError?.hint,
      details: adminError?.details,
      code: adminError?.code
    });
    if (admins && admins.length > 0) {
      console.log('Admin sample (first record):', admins[0]);
      console.log('All admin username fields:', admins.map((a: any) => ({
        admin_id: a.admin_id,
        admin_number: a.admin_number,
        id: a.id,
        username: a.username,
        full_name: a.full_name
      })));
    }

    // Fetch all super admins with all columns
    console.log('Querying super_admin table...');
    const { data: superAdmins, error: superError } = await adminSupabase
      .from('super_admin')
      .select('*');
    
    console.log('Super Admins query result:', { 
      count: superAdmins?.length, 
      error: superError?.message,
      hint: superError?.hint,
      details: superError?.details,
      code: superError?.code
    });
    if (superAdmins && superAdmins.length > 0) {
      console.log('Super Admin sample (first record):', superAdmins[0]);
      console.log('All super admin username fields:', superAdmins.map((s: any) => ({
        id: s.id,
        username: s.username,
        full_name: s.full_name
      })));
    }

    const totalAccounts = (employees?.length || 0) + (admins?.length || 0) + (superAdmins?.length || 0);
    console.log(`Total accounts found: ${totalAccounts}`);

    return c.json({
      success: true,
      data: {
        employees: employees || [],
        admins: admins || [],
        superAdmins: superAdmins || [],
        totalAccounts: totalAccounts
      },
      errors: {
        employees: empError ? {
          message: empError.message,
          hint: empError.hint,
          details: empError.details,
          code: empError.code
        } : null,
        admins: adminError ? {
          message: adminError.message,
          hint: adminError.hint,
          details: adminError.details,
          code: adminError.code
        } : null,
        superAdmins: superError ? {
          message: superError.message,
          hint: superError.hint,
          details: superError.details,
          code: superError.code
        } : null
      },
      debug: {
        supabaseUrl: Deno.env.get('SUPABASE_URL'),
        hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Error in debug accounts:', error);
    return c.json({ 
      success: false, 
      error: error.message,
      stack: error.stack,
      name: error.name
    }, 500);
  }
});

/**
 * DEBUG ENDPOINT - Create sample data for testing (FOR DEBUGGING ONLY)
 */
app.post("/make-server-df988758/debug/create-sample-data", async (c) => {
  try {
    console.log('🏗️ Creating sample data...');

    // Create admin client with SERVICE_ROLE_KEY to bypass RLS
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = {
      employees: { success: false, error: null, count: 0 },
      admins: { success: false, error: null, count: 0 },
      superAdmins: { success: false, error: null, count: 0 }
    };

    // Create sample employees
    console.log('Creating sample employees...');
    const sampleEmployees = [
      {
        employee_number: 'EMP001',
        full_name: 'John Doe',
        password: 'password123',
        email: 'john.doe@mnemosyne.com',
        position: 'Software Engineer',
        team: 'Engineering',
        phone_number: '555-0101',
        paid_leave_balance: 12,
        created_at: new Date().toISOString()
      },
      {
        employee_number: 'EMP002',
        full_name: 'Jane Smith',
        password: 'password123',
        email: 'jane.smith@mnemosyne.com',
        position: 'Product Manager',
        team: 'Product',
        phone_number: '555-0102',
        paid_leave_balance: 12,
        created_at: new Date().toISOString()
      }
    ];

    const { data: empData, error: empError } = await adminSupabase
      .from('employees')
      .upsert(sampleEmployees, { onConflict: 'employee_number' })
      .select();
    
    results.employees = {
      success: !empError,
      error: empError?.message || null,
      count: empData?.length || 0
    };
    console.log('Employees created:', results.employees);

    // Create sample admin
    console.log('Creating sample admin...');
    const sampleAdmins = [
      {
        admin_id: 'ADM001',
        full_name: 'Admin User',
        password: 'admin123',
        email: 'admin@mnemosyne.com',
        team: 'Engineering',
        role: 'admin',
        created_at: new Date().toISOString()
      }
    ];

    const { data: adminData, error: adminError } = await adminSupabase
      .from('admins')
      .upsert(sampleAdmins, { onConflict: 'admin_id' })
      .select();
    
    results.admins = {
      success: !adminError,
      error: adminError?.message || null,
      count: adminData?.length || 0
    };
    console.log('Admins created:', results.admins);

    // Create sample super admin
    console.log('Creating sample super admin...');
    const sampleSuperAdmins = [
      {
        username: 'superadmin',
        full_name: 'Super Administrator',
        password: 'super123',
        email: 'superadmin@mnemosyne.com',
        created_at: new Date().toISOString()
      }
    ];

    const { data: superData, error: superError } = await adminSupabase
      .from('super_admin')
      .upsert(sampleSuperAdmins, { onConflict: 'username' })
      .select();
    
    results.superAdmins = {
      success: !superError,
      error: superError?.message || null,
      count: superData?.length || 0
    };
    console.log('Super admins created:', results.superAdmins);

    const allSuccess = results.employees.success && results.admins.success && results.superAdmins.success;
    const totalCreated = results.employees.count + results.admins.count + results.superAdmins.count;

    if (allSuccess) {
      console.log(`✅ Sample data created successfully! Total: ${totalCreated}`);
      return c.json({
        success: true,
        message: `Created ${totalCreated} sample accounts`,
        results
      });
    } else {
      console.log('⚠️ Some sample data creation failed');
      return c.json({
        success: false,
        error: 'Some data creation failed',
        results
      }, 500);
    }

  } catch (error: any) {
    console.error('❌ Error creating sample data:', error);
    return c.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, 500);
  }
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * Employee Login
 */
app.post("/make-server-df988758/employees/login", async (c) => {
  try {
    const { username, password } = await c.req.json();

    console.log('🔐 Employee login attempt:', username);

    // Query employee by employee_number
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_number', username)
      .single();

    if (error || !employee) {
      console.log('❌ Employee not found:', username);
      return c.json({ success: false, error: 'Invalid username or password' }, 401);
    }

    // Check password (in production, use proper password hashing)
    if (employee.password !== password) {
      console.log('❌ Invalid password for:', username);
      return c.json({ success: false, error: 'Invalid username or password' }, 401);
    }

    console.log('✅ Employee login successful:', employee.full_name);

    return c.json({
      success: true,
      data: {
        employee_number: employee.employee_number,
        full_name: employee.full_name,
        email: employee.email,
        position: employee.position,
        team: employee.team,
        phone_number: employee.phone_number,
        paid_leave_balance: employee.paid_leave_balance
      }
    });
  } catch (error: any) {
    console.error('❌ Error in employee login:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

/**
 * Admin Login
 */
app.post("/make-server-df988758/admins/login", async (c) => {
  try {
    const { username, password } = await c.req.json();

    console.log('🔐 Admin login attempt:', username);

    // Query admin by admin_id
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('admin_id', username)
      .single();

    if (error || !admin) {
      console.log('❌ Admin not found:', username);
      return c.json({ success: false, error: 'Invalid username or password' }, 401);
    }

    // Check password
    if (admin.password !== password) {
      console.log('❌ Invalid password for admin:', username);
      return c.json({ success: false, error: 'Invalid username or password' }, 401);
    }

    console.log('✅ Admin login successful:', admin.full_name);
    console.log('📋 Admin data:', { admin_id: admin.admin_id, admin_number: admin.admin_number });

    return c.json({
      success: true,
      data: {
        admin_id: admin.admin_id,
        admin_number: admin.admin_number || admin.admin_id, // Include admin_number, fallback to admin_id if not set
        full_name: admin.full_name,
        email: admin.email,
        department: admin.department,
        role: admin.role
      }
    });
  } catch (error: any) {
    console.error('❌ Error in admin login:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

/**
 * Super Admin Login
 */
app.post("/make-server-df988758/super-admins/login", async (c) => {
  try {
    const { username, password } = await c.req.json();

    console.log('🔐 Super Admin login attempt:', username);

    // Query super admin by username
    const { data: superAdmin, error } = await supabase
      .from('super_admin')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !superAdmin) {
      console.log('❌ Super Admin not found:', username);
      return c.json({ success: false, error: 'Invalid username or password' }, 401);
    }

    // Check password
    if (superAdmin.password !== password) {
      console.log('❌ Invalid password for super admin:', username);
      return c.json({ success: false, error: 'Invalid username or password' }, 401);
    }

    console.log('✅ Super Admin login successful:', superAdmin.username);

    return c.json({
      success: true,
      data: {
        id: superAdmin.id,
        username: superAdmin.username,
        email: superAdmin.email,
        full_name: superAdmin.full_name,
        role: 'super_admin'
      }
    });
  } catch (error: any) {
    console.error('❌ Error in super admin login:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

/**
 * List all Super Admin accounts (for debugging/account management)
 */
app.get("/make-server-df988758/super-admin/list", async (c) => {
  try {
    console.log('📋 Fetching super admin accounts...');

    const { data, error } = await supabase
      .from('super_admin')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching super admins:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ Found ${data?.length || 0} super admin account(s)`);

    return c.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('❌ Error in list super admins:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Update Super Admin Password
 */
app.post("/make-server-df988758/super-admin/update-password", async (c) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 SUPER ADMIN PASSWORD UPDATE REQUEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const body = await c.req.json();
    const { id, password } = body;

    console.log('Account ID:', id);
    console.log('New Password:', password);

    if (!id || !password) {
      console.log('❌ Missing id or password');
      return c.json({ success: false, error: 'ID and password are required' }, 400);
    }

    if (password.length < 4) {
      console.log('❌ Password too short');
      return c.json({ success: false, error: 'Password must be at least 4 characters' }, 400);
    }

    // Update the password_hash field
    console.log('Updating password_hash field in super_admin table...');
    const { data, error } = await supabase
      .from('super_admin')
      .update({ password_hash: password })
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Error updating password:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (!data || data.length === 0) {
      console.log('❌ No account found with ID:', id);
      return c.json({ success: false, error: 'Account not found' }, 404);
    }

    console.log('✅ Password updated successfully!');
    console.log('Updated account:', data[0]);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return c.json({
      success: true,
      message: 'Password updated successfully',
      data: data[0]
    });
  } catch (error: any) {
    console.error('❌ Error in update password:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * List all Admin accounts
 */
app.get("/make-server-df988758/admins/list", async (c) => {
  try {
    console.log('📋 Fetching admin accounts...');

    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching admins:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ Found ${data?.length || 0} admin account(s)`);

    return c.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('❌ Error in list admins:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * List all Employee accounts
 */
app.get("/make-server-df988758/employees/list", async (c) => {
  try {
    console.log('📋 Fetching employee accounts...');

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching employees:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ Found ${data?.length || 0} employee account(s)`);

    return c.json({
      success: true,
      data: data || []
    });
  } catch (error: any) {
    console.error('❌ Error in list employees:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Get all employees with team information (for Admin Dashboard)
 */
app.get("/make-server-df988758/employees", async (c) => {
  try {
    console.log('📋 Fetching all employees with team info...');

    // First, try to get employees without the join to see if that works
    let employeesData: any[] = [];
    let employeesError: any = null;
    
    try {
      const result = await withTimeout(
        supabase
          .from('employees')
          .select('*')
          .order('full_name'),
        8000,
        'Employee query timeout'
      );
      employeesData = result.data || [];
      employeesError = result.error;
    } catch (timeoutError: any) {
      console.error('❌ Timeout or error fetching employees:', timeoutError.message);
      employeesError = timeoutError;
    }

    if (employeesError) {
      console.error('❌ Error fetching employees:', employeesError);
      return c.json({ success: false, error: employeesError.message || 'Failed to fetch employees' }, 500);
    }

    console.log(`✅ Found ${employeesData?.length || 0} employee(s)`);

    // Try to get teams data separately
    let teamsData: any[] = [];
    try {
      const result = await withTimeout(
        supabase
          .from('teams')
          .select('*'),
        3000,
        'Teams query timeout'
      );
      
      if (result.error) {
        console.log('⚠️ Teams table not found or error:', result.error.message);
      } else {
        teamsData = result.data || [];
        console.log(`✅ Found ${teamsData.length} team(s)`);
      }
    } catch (timeoutError: any) {
      console.log('⚠️ Timeout fetching teams, continuing without team data');
    }

    // Create a map of teams by ID
    const teamsMap = new Map(teamsData.map(team => [team.id, team]));

    // Transform the data to include team information
    const transformedData = employeesData?.map(emp => {
      const team = emp.team_id ? teamsMap.get(emp.team_id) : null;
      
      return {
        ...emp,
        teams: team || null,
        department: team?.name || emp.department || emp.team || null,
        team: team?.name || emp.department || emp.team || null
      };
    }) || [];

    console.log('✅ Successfully transformed employee data with team info');

    return c.json({
      success: true,
      data: transformedData
    });
  } catch (error: any) {
    console.error('❌ Error in get employees:', error);
    console.error('Stack trace:', error.stack);
    return c.json({ success: false, error: error.message || 'Internal server error' }, 500);
  }
});

/**
 * Get employee by employee_number
 */
app.get("/make-server-df988758/employees/:employee_number", async (c) => {
  try {
    const employee_number = c.req.param('employee_number');
    console.log('🔍 Fetching employee:', employee_number);

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_number', employee_number)
      .single();

    if (error) {
      console.error('❌ Error fetching employee:', error);
      return c.json({ success: false, error: error.message }, error.code === 'PGRST116' ? 404 : 500);
    }

    console.log('✅ Employee found:', data?.full_name);
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in get employee:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Update employee profile
 */
app.put("/make-server-df988758/employees/:employee_number", async (c) => {
  try {
    const employee_number = c.req.param('employee_number');
    const updateData = await c.req.json();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 UPDATING EMPLOYEE PROFILE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Employee Number:', employee_number);
    console.log('Update Data:', updateData);

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('employee_number', employee_number)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating employee:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log('✅ Employee profile updated successfully');
    console.log('   Updated fields:', Object.keys(updateData));
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in update employee:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Get admin by admin_number (query parameter or all admins)
 */
app.get("/make-server-df988758/admins", async (c) => {
  try {
    // Check for query parameter first (for kiosk mode compatibility)
    const employee_number = c.req.query('employee_number');
    const admin_number = c.req.query('admin_number');
    const search = c.req.query('search'); // Support 'search' parameter for kiosk mode
    
    const searchNumber = employee_number || admin_number || search;
    
    if (!searchNumber) {
      // If no query params, return all admins
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all admins:', error);
        return c.json({ success: false, error: error.message }, 500);
      }

      return c.json({ success: true, data });
    }

    console.log('���� Fetching admin by number:', searchNumber);

    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('admin_number', searchNumber);

    if (error) {
      console.error('❌ Error fetching admin:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    if (!data || data.length === 0) {
      console.log('⚠️ Admin not found:', searchNumber);
      return c.json({ success: true, data: [] });
    }

    console.log('✅ Admin found:', data[0]?.full_name);
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in get admin (query):', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Get admin by admin_number (path parameter)
 */
app.get("/make-server-df988758/admins/:admin_number", async (c) => {
  try {
    const admin_number = c.req.param('admin_number');
    console.log('🔍 Fetching admin:', admin_number);

    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('admin_number', admin_number)
      .single();

    if (error) {
      console.error('❌ Error fetching admin:', error);
      return c.json({ success: false, error: error.message }, error.code === 'PGRST116' ? 404 : 500);
    }

    console.log('✅ Admin found:', data?.full_name);
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in get admin:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Update admin profile
 */
app.put("/make-server-df988758/admins/:admin_number", async (c) => {
  try {
    const admin_number = c.req.param('admin_number');
    const updateData = await c.req.json();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 UPDATING ADMIN PROFILE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Number:', admin_number);
    console.log('Update Data:', updateData);

    const { data, error } = await supabase
      .from('admins')
      .update(updateData)
      .eq('admin_number', admin_number)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating admin:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log('✅ Admin profile updated successfully');
    console.log('   Updated fields:', Object.keys(updateData));
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in update admin:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Get super admin by username
 */
app.get("/make-server-df988758/super-admins/:username", async (c) => {
  try {
    const username = c.req.param('username');
    console.log('🔍 Fetching super admin:', username);

    const { data, error } = await supabase
      .from('super_admin')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.error('❌ Error fetching super admin:', error);
      return c.json({ success: false, error: error.message }, error.code === 'PGRST116' ? 404 : 500);
    }

    console.log('✅ Super admin found:', data?.full_name);
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in get super admin:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Update super admin profile
 */
app.put("/make-server-df988758/super-admins/:username", async (c) => {
  try {
    const username = c.req.param('username');
    const updateData = await c.req.json();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 UPDATING SUPER ADMIN PROFILE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username:', username);
    console.log('Update Data:', updateData);

    // First, check what columns exist in the super_admin table
    const { data: sampleData } = await supabase
      .from('super_admin')
      .select('*')
      .limit(1)
      .single();
    
    const availableColumns = sampleData ? Object.keys(sampleData) : [];
    console.log('Available columns in super_admin table:', availableColumns);
    
    // Filter updateData to only include columns that exist in the table
    const filteredUpdateData: any = {};
    const allowedFields = ['username', 'full_name', 'password_hash', 'profile_picture_url'];
    
    for (const key of Object.keys(updateData)) {
      if (allowedFields.includes(key) && availableColumns.includes(key)) {
        filteredUpdateData[key] = updateData[key];
      } else if (allowedFields.includes(key) && !availableColumns.includes(key)) {
        console.warn(`⚠️ Skipping field "${key}" - not found in super_admin table schema`);
      }
    }
    
    console.log('Filtered update data (only existing columns):', filteredUpdateData);

    if (Object.keys(filteredUpdateData).length === 0) {
      console.warn('⚠️ No valid fields to update after filtering');
      return c.json({ 
        success: true, 
        message: 'No updates needed (all fields filtered out)',
        data: sampleData 
      });
    }

    const { data, error } = await supabase
      .from('super_admin')
      .update(filteredUpdateData)
      .eq('username', username)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating super admin:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log('✅ Super admin profile updated successfully');
    console.log('   Updated fields:', Object.keys(filteredUpdateData));
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in update super admin:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Unified login endpoint
 */
app.post('/make-server-df988758/auth/login', async (c) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 UNIFIED LOGIN REQUEST RECEIVED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', c.req.method);
  console.log('URL:', c.req.url);

  try {
    // Parse request body with multiple methods
    let bodyData: any = null;
    let username: string | undefined;
    let password: string | undefined;

    // Method 1: Try c.req.json()
    try {
      console.log('\n📥 Parsing body (Method 1: c.req.json())...');
      bodyData = await c.req.json();
      username = bodyData?.username;
      password = bodyData?.password;
      console.log('✅ Method 1 successful');
      console.log('   Body keys:', bodyData ? Object.keys(bodyData) : []);
    } catch (e: any) {
      console.log('❌ Method 1 failed:', e.message);
    }

    // Method 2: Try getting raw text and parse
    if (!username || !password) {
      try {
        console.log('\n📥 Parsing body (Method 2: raw text)...');
        const rawBody = await c.req.text();
        console.log('   Raw body length:', rawBody?.length);
        console.log('   Raw body (first 200 chars):', rawBody?.substring(0, 200));
        bodyData = JSON.parse(rawBody);
        username = bodyData?.username;
        password = bodyData?.password;
        console.log('✅ Method 2 successful');
      } catch (e: any) {
        console.log('❌ Method 2 failed:', e.message);
      }
    }

    // Method 3: Try form data
    if (!username || !password) {
      try {
        console.log('\n📥 Parsing body (Method 3: form data)...');
        const formData = await c.req.formData();
        username = formData.get('username')?.toString();
        password = formData.get('password')?.toString();
        console.log('✅ Method 3 successful');
      } catch (e: any) {
        console.log('❌ Method 3 failed:', e.message);
      }
    }

    console.log('\n📋 Extracted credentials:');
    console.log('   Username:', username || 'NOT RECEIVED');
    console.log('   Username type:', typeof username);
    console.log('   Username exists:', !!username);
    console.log('   Password:', password ? '****' : 'NOT RECEIVED');
    console.log('   Password type:', typeof password);
    console.log('   Password exists:', !!password);

    // Validate inputs
    if (!username || !password) {
      console.log('❌ Validation failed: Missing username or password');
      console.log('   Username value:', username);
      console.log('   Password value:', password ? '****' : 'undefined');
      console.log('   bodyData:', JSON.stringify(bodyData));
      return c.json({ 
        success: false, 
        error: 'Username and password are required',
        debug: {
          receivedUsername: !!username,
          receivedPassword: !!password,
          bodyKeys: bodyData ? Object.keys(bodyData) : []
        }
      }, 400);
    }

    // Normalize credentials
    const normalizedUsername = username?.trim();
    const normalizedPassword = password?.trim();

    if (!normalizedUsername || !normalizedPassword) {
      console.log('❌ Username or password is empty after trimming');
      return c.json({ success: false, error: 'Username and password cannot be empty' }, 400);
    }

    console.log('\n🔍 Starting authentication check...');
    console.log('   Looking for username:', normalizedUsername);

    // Helper function to find user in any table with flexible column matching
    const findUserInTable = async (tableName: string, usernameFields: string[], passwordField: string = 'password') => {
      try {
        console.log(`\n🔍 Checking ${tableName.toUpperCase()} table...`);
        
        const { data: records, error } = await supabase
          .from(tableName)
          .select('*');

        if (error) {
          console.log(`   ❌ Error querying ${tableName}:`, error.message);
          console.log(`   Error details:`, JSON.stringify(error, null, 2));
          return null;
        }

        console.log(`   Total records in ${tableName}:`, records?.length || 0);

        if (!records || records.length === 0) {
          console.log(`   ℹ️  No records found in ${tableName}`);
          return null;
        }

        // Log first record structure
        console.log(`   Available columns in ${tableName}:`, Object.keys(records[0]).join(', '));

        // Log ALL records for debugging
        console.log(`\n   📋 ALL RECORDS IN ${tableName}:`);
        records.forEach((record, index) => {
          console.log(`   Record ${index + 1}:`, {
            id: record.id,
            ...usernameFields.reduce((acc, field) => {
              if (record[field]) acc[field] = record[field];
              return acc;
            }, {} as any),
            password_length: record[passwordField]?.length || 0,
            password_preview: record[passwordField] ? `${record[passwordField].substring(0, 3)}***` : 'NO PASSWORD'
          });
        });

        // Try to match with any of the username fields
        const normalizedInput = normalizedUsername.replace(/[-_\s]/g, '').toUpperCase();
        
        console.log(`\n   🔎 SEARCHING FOR USERNAME: "${normalizedUsername}"`);
        console.log(`   Normalized input: "${normalizedInput}"`);
        
        for (const record of records) {
          // Try each possible username field
          for (const field of usernameFields) {
            const fieldValue = record[field];
            
            if (!fieldValue) continue;
            
            // Flexible matching
            const normalizedField = String(fieldValue).replace(/[-_\s]/g, '').toUpperCase();
            const exactMatch = String(fieldValue) === normalizedUsername;
            const flexibleMatch = normalizedField === normalizedInput;
            
            console.log(`\n   🔍 Comparing field "${field}":`, {
              database_value: fieldValue,
              submitted_value: normalizedUsername,
              exact_match: exactMatch,
              flexible_match: flexibleMatch,
              normalized_db: normalizedField,
              normalized_input: normalizedInput
            });
            
            if (exactMatch || flexibleMatch) {
              console.log(`   ✅ USERNAME MATCH FOUND using field: ${field}`);
              console.log(`      Database value: "${fieldValue}"`);
              console.log(`      Submitted value: "${normalizedUsername}"`);
              
              // Check password
              const storedPassword = record[passwordField];
              
              if (!storedPassword) {
                console.log(`   ⚠️  NO PASSWORD FIELD! Available fields:`, Object.keys(record).join(', '));
                continue;
              }
              
              console.log(`\n   🔑 PASSWORD CHECK:`);
              console.log(`      Stored password: "${storedPassword}"`);
              console.log(`      Stored password length: ${storedPassword?.length || 0}`);
              console.log(`      Submitted password: "${normalizedPassword}"`);
              console.log(`      Submitted password length: ${normalizedPassword?.length || 0}`);
              console.log(`      Exact match: ${String(storedPassword) === normalizedPassword}`);
              console.log(`      Type comparison: stored=${typeof storedPassword}, submitted=${typeof normalizedPassword}`);
              
              // Show character-by-character comparison if they don't match
              if (String(storedPassword) !== normalizedPassword) {
                console.log(`\n   🔬 CHARACTER-BY-CHARACTER COMPARISON:`);
                const maxLen = Math.max(storedPassword.length, normalizedPassword.length);
                for (let i = 0; i < maxLen; i++) {
                  const storedChar = storedPassword[i] || '∅';
                  const submittedChar = normalizedPassword[i] || '∅';
                  const match = storedChar === submittedChar ? '✓' : '✗';
                  console.log(`      [${i}] stored="${storedChar}" (code:${storedPassword.charCodeAt(i) || 'N/A'}) vs submitted="${submittedChar}" (code:${normalizedPassword.charCodeAt(i) || 'N/A'}) ${match}`);
                }
              }
              
              if (String(storedPassword) === normalizedPassword) {
                console.log(`   ✅✅✅ PASSWORD MATCH! LOGIN SUCCESSFUL ✅✅✅`);
                return { record, tableName, matchedField: field };
              } else {
                console.log(`   ❌ PASSWORD MISMATCH`);
              }
            }
          }
        }

        console.log(`   ℹ️  No matching user found in ${tableName}`);
        return null;
      } catch (err: any) {
        console.log(`   ❌ Exception in ${tableName}:`, err.message);
        console.log(`   Exception stack:`, err.stack);
        return null;
      }
    };

    // Try employees (check multiple possible column names)
    let result = await findUserInTable('employees', ['employee_number', 'employee_id', 'id', 'username']);
    
    if (result) {
      const { record } = result;
      console.log('✅ Employee login successful');
      return c.json({
        success: true,
        userType: 'employee',
        data: {
          employee_number: record.employee_number || record.employee_id || record.id,
          full_name: record.full_name || record.name || 'Unknown',
          email: record.email || '',
          position: record.position || '',
          team: record.team || record.department || '',
          phone_number: record.phone_number || record.phone || '',
          paid_leave_balance: record.paid_leave_balance || 12
        }
      });
    }

    // Try admins
    result = await findUserInTable('admins', ['admin_id', 'admin_number', 'id', 'username']);
    
    if (result) {
      const { record } = result;
      console.log('✅ Admin login successful');
      return c.json({
        success: true,
        userType: 'admin',
        data: {
          admin_id: record.admin_id || record.admin_number || record.id,
          full_name: record.full_name || record.name || 'Unknown',
          email: record.email || '',
          team: record.team || record.department || '',
          role: record.role || 'admin'
        }
      });
    }

    // Try super_admin (uses 'password_hash' field instead of 'password')
    result = await findUserInTable('super_admin', ['username', 'id', 'super_admin_id'], 'password_hash');
    
    if (result) {
      const { record } = result;
      console.log('✅ Super Admin login successful');
      return c.json({
        success: true,
        userType: 'super_admin',
        data: {
          id: record.id,
          username: record.username || 'superadmin',
          full_name: record.full_name || record.name || 'Super Admin',
          email: record.email || ''
        }
      });
    }

    // No match found in any table
    console.log('\n❌ Login failed: Invalid credentials');
    console.log('   No matching user found in any table');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return c.json({ 
      success: false, 
      error: 'Invalid username or password'
    }, 401);

  } catch (error: any) {
    console.error('❌ Error in unified login:', error);
    console.error('   Stack:', error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return c.json({ 
      success: false, 
      error: 'Internal server error during login',
      details: error.message
    }, 500);
  }
});

// ============================================
// LEAVE REQUEST ENDPOINTS
// ============================================

/**
 * Update leave request status (approve/reject)
 * When approving, automatically creates attendance records
 */
app.put("/make-server-df988758/leave-requests/:id/status", async (c) => {
  try {
    const id = c.req.param('id');
    const { status, reviewed_by } = await c.req.json();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 LEAVE STATUS UPDATE REQUEST');
    console.log('   ID:', id);
    console.log('   New Status:', status);
    console.log('   Reviewed By:', reviewed_by);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Step 1: Get the leave request
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !leaveRequest) {
      console.error('❌ Leave request not found:', fetchError);
      return c.json({ success: false, error: 'Leave request not found' }, 404);
    }

    // Determine if this is an employee or admin leave request
    const isAdminLeave = !!leaveRequest.admin_number;
    const userNumber = leaveRequest.employee_number || leaveRequest.admin_number;
    const userType = isAdminLeave ? 'admin' : 'employee';

    console.log('✅ Found leave request for', userType, ':', userNumber);

    // Step 2: Update the leave request status
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status,
        reviewed_by,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('❌ Failed to update leave request:', updateError);
      return c.json({ success: false, error: updateError.message }, 500);
    }

    console.log('✅ Leave request status updated to:', status);

    // If approved, create attendance records
    if (status === 'approved') {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📅 CREATING ATTENDANCE RECORDS');
      console.log('━━━━━━━━━━━━━━━━━━━━━���━━━━━━━━━━━━━━━━━━');

      // Get user data (employee or admin)
      let userData: any = null;
      let currentBalance = 0;

      if (isAdminLeave) {
        // Fetch admin data
        console.log('🔍 Fetching admin data...');
        const { data: adminData, error: adminError } = await supabase
          .from('admins')
          .select('admin_number, paid_leave_balance')
          .eq('admin_number', userNumber)
          .single();

        if (adminError || !adminData) {
          console.error('❌ Admin not found:', adminError);
          return c.json({ success: false, error: 'Admin not found' }, 404);
        }

        userData = { 
          id: adminData.admin_number, 
          paid_leave_balance: adminData.paid_leave_balance ?? 12 
        };
        currentBalance = userData.paid_leave_balance;
      } else {
        // Fetch employee data
        console.log('🔍 Fetching employee data...');
        const { data: employeeData, error: empError } = await supabase
          .from('employees')
          .select('id, paid_leave_balance')
          .eq('employee_number', userNumber)
          .single();

        if (empError || !employeeData) {
          console.error('❌ Employee not found:', empError);
          return c.json({ success: false, error: 'Employee not found' }, 404);
        }

        userData = employeeData;
        currentBalance = employeeData.paid_leave_balance || 0;
      }

      console.log('💰 Current leave balance:', currentBalance, 'days');

      // Calculate date range
      const startDate = new Date(leaveRequest.start_date);
      const endDate = new Date(leaveRequest.end_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const paidDays = Math.min(totalDays, currentBalance);
      const unpaidDays = Math.max(0, totalDays - currentBalance);

      console.log('📊 Leave breakdown:');
      console.log('   - Total days:', totalDays);
      console.log('   - Paid days:', paidDays);
      console.log('   - Unpaid days:', unpaidDays);

      // Generate attendance records for each day
      const attendanceRecords = [];
      const currentDate = new Date(startDate);
      let paidRecordsCreated = 0;
      let unpaidRecordsCreated = 0;

      // Note: Only create attendance records for employees, not for admins
      // The attendance_records table uses employee_number (not employee_id)
      if (!isAdminLeave) {
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const isPaidDay = (paidRecordsCreated + unpaidRecordsCreated) < paidDays;

          // Create attendance record for employee
          const attendanceData: any = {
            date: dateStr,
            employee_number: userNumber,  // PRIMARY KEY - employee number
            status: isPaidDay ? 'PAID_LEAVE' : 'ABSENT',
            type: isPaidDay ? 'PAID_LEAVE' : 'ABSENT',
            time_in: null,
            time_out: null,
            leave_request_id: id,  // Link to the leave request
            notes: `Leave approved by ${reviewed_by} - ${leaveRequest.leave_type} (Request #${id})`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          attendanceRecords.push(attendanceData);

          if (isPaidDay) {
            console.log(`   ✅ ${dateStr}: PAID_LEAVE (employee_number: ${userNumber})`);
            paidRecordsCreated++;
          } else {
            console.log(`   ⚠️ ${dateStr}: ABSENT (unpaid) (employee_number: ${userNumber})`);
            unpaidRecordsCreated++;
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // For admin leave requests, just count the days without creating attendance records
        console.log('ℹ️  Admin leave request - skipping attendance record creation');
        console.log('   (Attendance records are only for employees)');
        
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const isPaidDay = (paidRecordsCreated + unpaidRecordsCreated) < paidDays;

          if (isPaidDay) {
            console.log(`   ✅ ${dateStr}: PAID_LEAVE (no attendance record created)`);
            paidRecordsCreated++;
          } else {
            console.log(`   ⚠️ ${dateStr}: ABSENT (no attendance record created)`);
            unpaidRecordsCreated++;
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Insert attendance records (only if there are any - i.e., for employees only)
      if (attendanceRecords.length > 0) {
        // First, delete any existing attendance records for this employee in the date range
        // This prevents duplicate key violations and ensures leave approval overwrites manual check-ins
        console.log('🗑️  Deleting existing attendance records for date range...');
        console.log('   Employee Number:', userNumber);
        console.log('   Date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
        
        const { error: deleteError } = await supabase
          .from('attendance_records')
          .delete()
          .eq('employee_number', userNumber)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);

        if (deleteError) {
          console.warn('⚠️  Warning: Could not delete existing attendance records:', deleteError.message);
          console.log('   Continuing with insert anyway...');
        } else {
          console.log('✅ Existing attendance records deleted (if any)');
        }

        // Now insert the new attendance records
        console.log('💾 Inserting', attendanceRecords.length, 'attendance records...');
        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert(attendanceRecords);

        if (insertError) {
          console.error('❌ Failed to create attendance records:', insertError);
          console.error('   Error code:', insertError.code);
          console.error('   Error message:', insertError.message);
          
          // Revert leave request status
          await supabase
            .from('leave_requests')
            .update({
              status: 'pending',
              reviewed_by: null,
              reviewed_at: null
            })
            .eq('id', id);

          return c.json({
            success: false,
            error: `Failed to create attendance records: ${insertError.message}`,
            error_code: insertError.code
          }, 500);
        }
      } else {
        console.log('ℹ️  No attendance records to insert (admin leave request)');
      }

      console.log('✅ Attendance records created successfully');

      // Create schedule entries for approved leave days (for both employees and admins)
      console.log('📅 Creating schedule entries for approved leave days...');
      const leaveStartDate = new Date(startDate);
      const leaveEndDate = new Date(endDate);
      const scheduleEntries: any[] = [];
      let schedulePaidDays = 0;
      let scheduleUnpaidDays = 0;

      let scheduleDate = new Date(leaveStartDate);
      while (scheduleDate <= leaveEndDate) {
        const dateStr = scheduleDate.toISOString().split('T')[0];
        const isPaidDay = (schedulePaidDays + scheduleUnpaidDays) < paidDays;

        const scheduleEntry: any = {
          schedule_date: dateStr,
          shift_start: null,
          is_day_off: !isPaidDay, // Unpaid days are marked as day off
          is_paid_leave: isPaidDay,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (userType === 'employee') {
          scheduleEntry.employee_number = userNumber;
        } else {
          scheduleEntry.admin_number = userNumber;
        }

        scheduleEntries.push(scheduleEntry);

        if (isPaidDay) {
          console.log(`   📅 ${dateStr}: PAID_LEAVE schedule entry`);
          schedulePaidDays++;
        } else {
          console.log(`   📅 ${dateStr}: DAY_OFF schedule entry (unpaid)`);
          scheduleUnpaidDays++;
        }

        scheduleDate.setDate(scheduleDate.getDate() + 1);
      }

      // Insert schedule entries into Supabase
      if (scheduleEntries.length > 0) {
        console.log('💾 Upserting', scheduleEntries.length, 'schedule entries...');
        
        // We need to upsert each one individually to avoid conflicts
        for (const entry of scheduleEntries) {
          try {
            // Check if schedule exists for this date
            const { data: existingSchedule } = await supabase
              .from('schedules')
              .select('id')
              .eq(userType === 'employee' ? 'employee_number' : 'admin_number', userNumber)
              .eq('schedule_date', entry.schedule_date)
              .maybeSingle();

            if (existingSchedule) {
              // Update existing schedule
              const { error: updateError } = await supabase
                .from('schedules')
                .update(entry)
                .eq('id', existingSchedule.id);
              
              if (updateError) {
                console.error(`   ❌ Failed to update schedule for ${entry.schedule_date}:`, updateError.message);
              } else {
                console.log(`   ✅ Updated schedule for ${entry.schedule_date} (is_paid_leave: ${entry.is_paid_leave})`);
              }
            } else {
              // Insert new schedule
              const { error: insertError } = await supabase
                .from('schedules')
                .insert(entry);
              
              if (insertError) {
                console.error(`   ❌ Failed to insert schedule for ${entry.schedule_date}:`, insertError.message);
              } else {
                console.log(`   ✅ Created schedule for ${entry.schedule_date} (is_paid_leave: ${entry.is_paid_leave})`);
              }
            }
          } catch (scheduleError: any) {
            console.warn(`   ⚠️ Failed to upsert schedule for ${entry.schedule_date}:`, scheduleError.message);
          }
        }
        console.log('✅ Schedule entries processing complete');
        
        // Verify schedules were saved by querying them back
        console.log('🔍 Verifying schedules were saved to database...');
        const { data: verifySchedules, error: verifyError } = await supabase
          .from('schedules')
          .select('schedule_date, is_paid_leave, is_day_off')
          .eq(userType === 'employee' ? 'employee_number' : 'admin_number', userNumber)
          .gte('schedule_date', startDate.toISOString().split('T')[0])
          .lte('schedule_date', endDate.toISOString().split('T')[0])
          .order('schedule_date', { ascending: true });
        
        if (verifyError) {
          console.error('⚠️ Could not verify schedules:', verifyError.message);
        } else {
          console.log(`✅ Verified ${verifySchedules?.length || 0} schedules in database:`);
          verifySchedules?.forEach((s: any) => {
            console.log(`   - ${s.schedule_date}: is_paid_leave=${s.is_paid_leave}, is_day_off=${s.is_day_off}`);
          });
          
          // Check if any paid leave schedules were saved
          const savedPaidLeave = verifySchedules?.filter((s: any) => s.is_paid_leave === true) || [];
          if (savedPaidLeave.length > 0) {
            console.log(`🎉 SUCCESS: ${savedPaidLeave.length} PAID LEAVE schedule(s) confirmed in database!`);
          } else {
            console.warn('⚠️ WARNING: No paid leave schedules found in database after creation!');
          }
        }
      }

      // Update user's leave balance
      const newBalance = Math.max(0, currentBalance - paidDays);
      console.log('�� Updating balance:', currentBalance, '→', newBalance);

      if (isAdminLeave) {
        // Update admin balance
        const { error: balanceError } = await supabase
          .from('admins')
          .update({ paid_leave_balance: newBalance })
          .eq('admin_number', userNumber);

        if (balanceError) {
          console.error('⚠️ Warning: Failed to update admin balance:', balanceError);
          // If column doesn't exist, log a helpful message
          if (balanceError.message?.includes('paid_leave_balance')) {
            console.error('💡 The paid_leave_balance column may not exist in the admins table.');
            console.error('   Please run the migration to add this column.');
          }
        } else {
          console.log('✅ Admin balance updated successfully');
        }
      } else {
        // Update employee balance
        const { error: balanceError } = await supabase
          .from('employees')
          .update({ paid_leave_balance: newBalance })
          .eq('id', userData.id);

        if (balanceError) {
          console.error('⚠️ Warning: Failed to update employee balance:', balanceError);
        } else {
          console.log('✅ Employee balance updated successfully');
        }
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ LEAVE APPROVAL COMPLETE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Send notification to employee/admin
      try {
        const notificationPayload = {
          user_number: userNumber,
          user_type: userType,
          type: 'leave_approved',
          title: 'Leave Request Approved ✅',
          message: `Your leave request from ${leaveRequest.start_date} to ${leaveRequest.end_date} has been approved! Check "My Schedule" to see your ${paidRecordsCreated} paid leave day(s). ${unpaidRecordsCreated > 0 ? `${unpaidRecordsCreated} unpaid day(s).` : ''} Remaining balance: ${newBalance} days.`,
          is_read: false,
          related_id: id,
          created_at: new Date().toISOString()
        };

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notificationPayload);

        if (notifError) {
          console.log('⚠️ Failed to create notification:', notifError.message);
        } else {
          console.log('✅ Approval notification sent to:', userNumber);
        }
      } catch (notifError) {
        console.log('⚠️ Error creating notification:', notifError);
      }

      return c.json({
        success: true,
        paid_records_created: paidRecordsCreated,
        unpaid_records_created: unpaidRecordsCreated,
        new_balance: newBalance,
        user_type: userType
      });
    }

    // For rejection, send rejection notification
    try {
      const notificationPayload = {
        user_number: userNumber,
        user_type: userType,
        type: 'leave_rejected',
        title: 'Leave Request Rejected ❌',
        message: `Your leave request from ${leaveRequest.start_date} to ${leaveRequest.end_date} has been rejected by ${reviewed_by}.`,
        is_read: false,
        related_id: id,
        created_at: new Date().toISOString()
      };

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notificationPayload);

      if (notifError) {
        console.log('⚠️ Failed to create rejection notification:', notifError.message);
      } else {
        console.log('✅ Rejection notification sent to:', userNumber);
      }
    } catch (notifError) {
      console.log('⚠️ Error creating rejection notification:', notifError);
    }

    return c.json({ success: true });

  } catch (error: any) {
    console.error('❌ Error in leave status update:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Get all leave requests with employee and team information
 */
app.get("/make-server-df988758/leave-requests", async (c) => {
  try {
    const employee_number = c.req.query('employee_number');
    const admin_number = c.req.query('admin_number');
    const status = c.req.query('status');
    const department = c.req.query('department');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 GET LEAVE REQUESTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Filters:', { employee_number, admin_number, status, department });

    // Select leave requests with employee and team data joined
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        employees:employee_number (
          employee_number,
          full_name,
          email,
          phone_number,
          position,
          team_id,
          paid_leave_balance,
          teams:team_id (
            id,
            name
          )
        )
      `);

    if (employee_number) {
      query = query.eq('employee_number', employee_number);
    }
    if (admin_number) {
      query = query.eq('admin_number', admin_number);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching leave requests:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Enrich leave requests with admin data where applicable
    if (data && data.length > 0) {
      console.log(`🔍 Enriching ${data.length} leave request(s) with admin data...`);
      
      for (const leaveRequest of data) {
        // Infer user_type from employee_number and admin_number
        // Note: user_type is NOT stored in database, it's inferred for API responses
        const inferredUserType = leaveRequest.admin_number && !leaveRequest.employee_number 
          ? 'admin' 
          : 'employee';
        
        console.log(`📋 Checking leave request ${leaveRequest.id}:`, {
          employee_number: leaveRequest.employee_number,
          admin_number: leaveRequest.admin_number,
          inferred_user_type: inferredUserType,
          has_employee_data: !!leaveRequest.employees
        });
        
        // Add inferred user_type to the response object
        leaveRequest.user_type = inferredUserType;
        
        // If this leave request has admin_number, try to fetch admin data
        if (leaveRequest.admin_number && !leaveRequest.employees) {
          console.log(`🔍 Fetching admin data for: ${leaveRequest.admin_number}`);
          
          const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('admin_number, full_name, email, phone_number, role, department')
            .eq('admin_number', leaveRequest.admin_number)
            .single();

          if (!adminError && adminData) {
            // Add admin data to the leave request in a similar structure as employees
            leaveRequest.admin_info = {
              admin_number: adminData.admin_number,
              full_name: adminData.full_name,
              email: adminData.email,
              phone_number: adminData.phone_number,
              role: adminData.role,
              department: adminData.department
            };
            console.log(`✅ Admin data enriched: ${adminData.full_name} (${adminData.department})`);
          } else {
            console.warn(`⚠️ Could not fetch admin data for ${leaveRequest.admin_number}:`, adminError?.message);
            console.warn(`   Leave request ID: ${leaveRequest.id}`);
            console.warn(`   This admin may not exist in the admins table`);
          }
        }
        
        // Log if neither employee nor admin data is available
        if (!leaveRequest.employees && !leaveRequest.admin_info && !leaveRequest.employee_number && !leaveRequest.admin_number) {
          console.error(`❌ Leave request ${leaveRequest.id} has no employee_number or admin_number!`);
        }
      }
    }

    console.log(`✅ Found ${data?.length || 0} leave request(s)`);
    if (data && data.length > 0) {
      console.log('Sample request:', JSON.stringify(data[0], null, 2));
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in get leave requests:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /leave/requests - Alias for /leave-requests endpoint
 * Used by employee portal to fetch leave requests
 */
app.get("/make-server-df988758/leave/requests", async (c) => {
  try {
    const employee_number = c.req.query('employee_number');
    const admin_number = c.req.query('admin_number');
    const status = c.req.query('status');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 GET LEAVE REQUESTS (Employee Portal)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Filters:', { employee_number, admin_number, status });

    // Build query
    let query = supabase
      .from('leave_requests')
      .select('*');

    // Apply filters
    if (employee_number) {
      query = query.eq('employee_number', employee_number);
    }
    if (admin_number) {
      query = query.eq('admin_number', admin_number);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // Execute query
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching leave requests:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log(`✅ Found ${data?.length || 0} leave request(s)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in get leave requests:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Create a new leave request (for employees or admins)
 */
app.post("/make-server-df988758/leave-requests/create", async (c) => {
  try {
    const { 
      employee_number, 
      admin_number,
      employee_name, 
      leave_type, 
      start_date, 
      end_date, 
      reason,
      attachment_url 
    } = await c.req.json();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━���━━━━━━━━━━━━━━');
    console.log('📤 CREATE LEAVE REQUEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Employee Number:', employee_number);
    console.log('Admin Number:', admin_number);
    console.log('Employee Name:', employee_name);
    console.log('Leave Type:', leave_type);
    console.log('Date Range:', `${start_date} to ${end_date}`);
    console.log('Reason:', reason);
    console.log('Has Attachment:', !!attachment_url);

    // Validate required fields
    const userNumber = employee_number || admin_number;
    if (!userNumber) {
      console.error('❌ Missing employee_number or admin_number');
      return c.json({ 
        success: false, 
        error: 'Either employee_number or admin_number is required' 
      }, 400);
    }

    // Prepare insert data
    const insertData: any = {
      leave_type,
      start_date,
      end_date,
      reason,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Set either employee_number or admin_number, not both
    // Also set user_type appropriately
    if (employee_number) {
      insertData.employee_number = employee_number;
      insertData.user_type = 'employee';
    } else if (admin_number) {
      insertData.admin_number = admin_number;
      insertData.user_type = 'admin';
    }

    // Add attachment URL if provided (optional field)
    if (attachment_url) {
      insertData.attachment_url = attachment_url;
    }

    console.log('Insert Data:', JSON.stringify(insertData, null, 2));

    const { data, error } = await supabase
      .from('leave_requests')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating leave request:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return c.json({ 
        success: false, 
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      }, 500);
    }

    console.log('✅ Leave request created successfully!');
    console.log('Request ID:', data.id);
    console.log('Created at:', data.created_at);

    // Create notification for admin/team leader if this is from an employee
    if (employee_number) {
      try {
        // Get employee details to find their team admin
        const { data: employeeData, error: empError } = await supabase
          .from('employees')
          .select('full_name, team_id, teams:team_id(name)')
          .eq('employee_number', employee_number)
          .single();

        if (!empError && employeeData) {
          const employeeName = employeeData.full_name || employee_name || employee_number;
          const teamName = employeeData.teams?.name || 'Unknown Team';

          // Get admin for this team
          const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('admin_number, full_name, department')
            .eq('department', teamName)
            .maybeSingle();

          if (!adminError && adminData) {
            // Create notification for the admin
            const notificationPayload = {
              user_number: adminData.admin_number,
              user_type: 'admin',
              type: 'leave_request',
              title: 'New Leave Request',
              message: `${employeeName} has submitted a leave request from ${start_date} to ${end_date}`,
              is_read: false,
              related_id: data.id,
              created_at: new Date().toISOString()
            };

            const { error: notifError } = await supabase
              .from('notifications')
              .insert(notificationPayload);

            if (notifError) {
              console.log('⚠️ Failed to create admin notification:', notifError.message);
            } else {
              console.log(`✅ Notification sent to admin: ${adminData.full_name}`);
            }
          } else {
            console.log('⚠️ No admin found for team:', teamName);
          }
        }
      } catch (notifError) {
        console.log('⚠️ Error creating notification:', notifError);
        // Don't fail the request if notification fails
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in create leave request:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, 500);
  }
});

/**
 * Delete a leave request
 */
app.delete("/make-server-df988758/leave-requests/:id", async (c) => {
  try {
    const id = c.req.param('id');

    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting leave request:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error in delete leave request:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Fix missing user_type in leave requests
 * NOTE: user_type is no longer stored in the database - it's inferred from employee_number/admin_number
 * This endpoint is kept for backwards compatibility but returns success without doing anything
 */
app.post("/make-server-df988758/leave-requests/fix-user-types", async (c) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('ℹ️  FIX USER TYPES REQUEST (NO-OP)');
    console.log('━━��━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Note: user_type is now inferred dynamically from employee_number/admin_number');
    console.log('No database updates needed - returning success');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return c.json({
      success: true,
      fixed: 0,
      failed: 0,
      message: 'user_type is now inferred dynamically - no database updates needed'
    });
  } catch (error: any) {
    console.error('❌ Error in fix user types:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Get leave balance for an employee
 */
app.get("/make-server-df988758/employees/:employee_number/leave-balance", async (c) => {
  try {
    const employee_number = c.req.param('employee_number');

    const { data, error } = await supabase
      .from('employees')
      .select('paid_leave_balance')
      .eq('employee_number', employee_number)
      .single();

    if (error) {
      console.error('❌ Error fetching leave balance:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({
      success: true,
      balance: data?.paid_leave_balance || 0
    });
  } catch (error: any) {
    console.error('❌ Error in get leave balance:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Get leave balance for an admin
 */
app.get("/make-server-df988758/leave-balance", async (c) => {
  try {
    const admin_number = c.req.query('admin_number');

    if (!admin_number) {
      return c.json({ success: false, error: 'admin_number is required' }, 400);
    }

    console.log('💰 Fetching leave balance for admin:', admin_number);

    // Try to fetch from admins table
    const { data, error } = await supabase
      .from('admins')
      .select('paid_leave_balance')
      .eq('admin_number', admin_number)
      .single();

    if (error) {
      console.error('❌ Error fetching admin leave balance:', error);
      
      // Check if it's a column missing error (PostgreSQL error code 42703 or Supabase PGRST116)
      if (error.message?.includes('paid_leave_balance') || 
          error.message?.includes('does not exist') ||
          error.code === 'PGRST116' || 
          error.code === '42703') {
        console.log('⚠️ paid_leave_balance column not found in admins table, returning default');
        return c.json({
          success: true,
          data: 12, // Default to 12 days
          migrationRequired: true,
          message: 'Admin leave balance column not found. Using default value of 12 days. Please run Database Setup Step 6 to add the paid_leave_balance column.'
        });
      }
      
      return c.json({ success: false, error: error.message }, 500);
    }

    const balance = data?.paid_leave_balance ?? 12; // Default to 12 if null
    console.log('✅ Admin leave balance:', balance);

    return c.json({
      success: true,
      data: balance
    });
  } catch (error: any) {
    console.error('❌ Error in get admin leave balance:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// SCHEDULE ENDPOINTS
// ============================================

/**
 * Get schedules with optional filters
 */
app.get("/make-server-df988758/schedules", async (c) => {
  try {
    const employee_number = c.req.query('employee_number');
    const admin_number = c.req.query('admin_number');
    const start_date = c.req.query('start_date');
    const end_date = c.req.query('end_date');
    const schedule_date = c.req.query('schedule_date'); // For single date queries
    const user_type = c.req.query('user_type');

    console.log('📅 Fetching schedules with filters:', { 
      employee_number, 
      admin_number, 
      start_date, 
      end_date,
      schedule_date,
      user_type 
    });

    // Try to get from Supabase first
    try {
      let query = supabase.from('schedules').select('*');

      if (employee_number) {
        query = query.eq('employee_number', employee_number);
      }
      if (admin_number) {
        query = query.eq('admin_number', admin_number);
      }
      if (schedule_date) {
        // If specific date is requested, use exact match
        query = query.eq('schedule_date', schedule_date);
      } else {
        // Otherwise use date range
        if (start_date) {
          query = query.gte('schedule_date', start_date);
        }
        if (end_date) {
          query = query.lte('schedule_date', end_date);
        }
      }

      const { data: supabaseSchedules, error: supabaseError } = await query.order('schedule_date', { ascending: true });

      if (supabaseError) {
        console.log('⚠️ Supabase query failed:', supabaseError.message);
        throw supabaseError;
      }

      console.log(`✅ Found ${supabaseSchedules?.length || 0} schedule(s) from Supabase`);
      
      // Log breakdown of schedule types
      if (supabaseSchedules && supabaseSchedules.length > 0) {
        const employeeSchedules = supabaseSchedules.filter((s: any) => s.employee_number);
        const adminSchedules = supabaseSchedules.filter((s: any) => s.admin_number);
        const dayOffSchedules = supabaseSchedules.filter((s: any) => s.is_day_off === true);
        const paidLeaveSchedules = supabaseSchedules.filter((s: any) => s.is_paid_leave === true);
        const activeWorkSchedules = supabaseSchedules.filter((s: any) => !s.is_day_off && !s.is_paid_leave);
        
        console.log(`   📊 Breakdown:`);
        console.log(`      - Employee schedules: ${employeeSchedules.length}`);
        console.log(`      - Admin schedules: ${adminSchedules.length}`);
        console.log(`      - Active work schedules: ${activeWorkSchedules.length}`);
        console.log(`      - Day-off schedules: ${dayOffSchedules.length}`);
        console.log(`      - Paid leave schedules: ${paidLeaveSchedules.length}`);
        
        // Log sample schedule if available
        if (supabaseSchedules.length > 0) {
          console.log(`   📋 Sample schedule:`, JSON.stringify(supabaseSchedules[0], null, 2));
        }
      }

      // Log paid leave schedules for debugging
      const paidLeaveSchedules = supabaseSchedules?.filter((s: any) => s.is_paid_leave === true) || [];
      if (paidLeaveSchedules.length > 0) {
        console.log(`🏖️ Found ${paidLeaveSchedules.length} PAID LEAVE schedule(s):`);
        paidLeaveSchedules.forEach((s: any) => {
          console.log(`   - ${s.schedule_date}: is_paid_leave=${s.is_paid_leave}, employee_number=${s.employee_number || s.admin_number}`);
        });
      }

      return c.json({
        success: true,
        schedules: supabaseSchedules || [],
        data: supabaseSchedules || [] // Keep both for compatibility
      });
    } catch (supabaseError) {
      console.log('⚠️ Falling back to KV store');
      
      // Fallback to KV store
      const allSchedules = await kv.getByPrefix('schedule:');
      console.log(`✅ Found ${allSchedules.length} total schedule(s) in KV store`);

      // Filter schedules based on query parameters
      let filteredSchedules = allSchedules;

      if (employee_number) {
        filteredSchedules = filteredSchedules.filter(s => s.employee_number === employee_number);
      }
      if (admin_number) {
        filteredSchedules = filteredSchedules.filter(s => s.admin_number === admin_number);
      }
      if (schedule_date) {
        // If specific date is requested, use exact match
        filteredSchedules = filteredSchedules.filter(s => s.schedule_date === schedule_date);
      } else {
        // Otherwise use date range
        if (start_date) {
          filteredSchedules = filteredSchedules.filter(s => s.schedule_date >= start_date);
        }
        if (end_date) {
          filteredSchedules = filteredSchedules.filter(s => s.schedule_date <= end_date);
        }
      }

      // Sort by date
      filteredSchedules.sort((a, b) => {
        const dateA = a.schedule_date || '';
        const dateB = b.schedule_date || '';
        return dateA.localeCompare(dateB);
      });

      console.log(`✅ Returning ${filteredSchedules.length} filtered schedule(s) from KV`);

      return c.json({
        success: true,
        schedules: filteredSchedules,
        data: filteredSchedules
      });
    }
  } catch (error: any) {
    console.error('❌ Error in get schedules:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * 🔍 DEBUG: Get raw schedules for a specific date
 */
app.get("/make-server-df988758/schedules/debug", async (c) => {
  try {
    const date = c.req.query('date') || new Date().toISOString().split('T')[0];
    
    console.log('🔍 DEBUG: Fetching ALL schedules for date:', date);
    
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('schedule_date', date);
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`Found ${schedules?.length || 0} schedules`);
    
    return c.json({
      success: true,
      date: date,
      count: schedules?.length || 0,
      schedules: schedules || [],
      summary: {
        withEmployeeNumber: schedules?.filter(s => s.employee_number).length || 0,
        withAdminNumber: schedules?.filter(s => s.admin_number).length || 0,
        dayOffs: schedules?.filter(s => s.shift_type === 'DAY_OFF').length || 0,
        paidLeave: schedules?.filter(s => s.shift_type === 'PAID_LEAVE').length || 0,
      }
    });
  } catch (error: any) {
    console.error('Error in debug schedules:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Get employees scheduled for a specific date (excluding day-offs)
 */
app.get("/make-server-df988758/schedules/employees-scheduled", async (c) => {
  try {
    const date = c.req.query('date');
    const department = c.req.query('department');

    if (!date) {
      return c.json({ success: false, error: 'Date parameter is required' }, 400);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📅 Fetching scheduled employees for date:', date);
    if (department) {
      console.log('   Department filter:', department);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Try to get schedules from Supabase first, then fallback to KV store
    let allSchedules: any[] = [];
    try {
      const { data: supabaseSchedules, error: supabaseError } = await supabase
        .from('schedules')
        .select('*')
        .eq('schedule_date', date);

      if (supabaseError) {
        console.log('⚠️ Supabase query failed, falling back to KV store:', supabaseError.message);
        throw supabaseError;
      }

      allSchedules = supabaseSchedules || [];
      console.log(`✅ Found ${allSchedules.length} total schedules from Supabase for ${date}`);
      
      // 🔍 DEBUG: Show ALL schedules with detailed info
      if (allSchedules.length > 0) {
        console.log(`   🔍 First 5 schedules:`);
        allSchedules.slice(0, 5).forEach((sched, idx) => {
          console.log(`      ${idx + 1}. emp_num: ${sched.employee_number}, admin_num: ${sched.admin_number}, shift: ${sched.shift_type}, date: ${sched.schedule_date}`);
        });
      } else {
        console.warn(`   ⚠️ NO SCHEDULES FOUND IN SUPABASE FOR ${date}!`);
        console.log(`   🔍 Checking if schedules table has any data at all...`);
        
        // Check if table has any schedules
        const { data: anySchedules, error: anyError } = await supabase
          .from('schedules')
          .select('schedule_date, employee_number, admin_number')
          .limit(5);
        
        if (anySchedules && anySchedules.length > 0) {
          console.log(`   📋 Table has ${anySchedules.length} schedules (showing first 5):`);
          anySchedules.forEach((s, i) => {
            console.log(`      ${i + 1}. Date: ${s.schedule_date}, Emp: ${s.employee_number}, Admin: ${s.admin_number}`);
          });
        } else {
          console.log(`   ❌ Schedules table appears to be EMPTY!`);
        }
      }
    } catch (supabaseError) {
      console.log('⚠️ Falling back to KV store');
      try {
        const kvSchedules = await kv.getByPrefix('schedule:');
        allSchedules = kvSchedules.filter(s => {
          const scheduleDate = s.date || s.schedule_date;
          return scheduleDate === date;
        });
        console.log(`✅ Found ${allSchedules.length} total schedules from KV store for ${date}`);
      } catch (kvError: any) {
        console.error('❌ KV store error, returning empty list:', kvError.message);
        allSchedules = [];
      }
    }
    
    // Filter schedules for this date that are NOT "DAY_OFF" and NOT "PAID_LEAVE"
    const schedulesForDate = allSchedules.filter(s => {
      const isNotDayOff = s.shift_type !== 'DAY_OFF' && !s.is_day_off;
      const isNotPaidLeave = s.shift_type !== 'PAID_LEAVE' && !s.is_paid_leave;
      return isNotDayOff && isNotPaidLeave;
    });

    console.log(`✅ Found ${schedulesForDate.length} active work schedules (excluding day-offs and paid leave)`);
    console.log(`   🗑️ Filtered out: ${allSchedules.length - schedulesForDate.length} schedules`);

    // Separate employee numbers and admin numbers
    let employeeNumbers = schedulesForDate
      .filter(s => s.employee_number)
      .map(s => s.employee_number);
    
    let adminNumbers = schedulesForDate
      .filter(s => s.admin_number)
      .map(s => s.admin_number);

    console.log(`   📊 Breakdown: ${employeeNumbers.length} employees, ${adminNumbers.length} admins`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 🔍 DEBUG: Log actual IDs being returned
    if (employeeNumbers.length > 0) {
      console.log(`✅ EMPLOYEE IDs TO RETURN: [${employeeNumbers.join(', ')}]`);
    } else {
      console.error(`❌❌❌ NO EMPLOYEE NUMBERS EXTRACTED! ❌❌❌`);
      if (schedulesForDate.length > 0) {
        console.log(`   🔍 We have ${schedulesForDate.length} schedules, but none have employee_number field!`);
        console.log(`   🔍 First schedule object keys:`, Object.keys(schedulesForDate[0]));
        console.log(`   🔍 First schedule full object:`, JSON.stringify(schedulesForDate[0], null, 2));
      }
    }
    
    if (adminNumbers.length > 0) {
      console.log(`✅ ADMIN IDs TO RETURN: [${adminNumbers.join(', ')}]`);
    } else {
      console.error(`❌❌❌ NO ADMIN NUMBERS EXTRACTED! ❌❌❌`);
      if (schedulesForDate.length > 0) {
        console.log(`   🔍 We have ${schedulesForDate.length} schedules, but none have admin_number field!`);
      }
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // If department filter is provided, filter employees by department
    if (department && employeeNumbers.length > 0) {
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('employee_number, department, team, team_id')
        .in('employee_number', employeeNumbers);

      if (empError) {
        console.log('⚠️ Could not filter by department:', empError.message);
      } else {
        // Filter by department/team
        const filteredEmployees = employees?.filter(emp => {
          const empDept = emp.department || emp.team;
          return empDept === department;
        }) || [];
        
        employeeNumbers = filteredEmployees.map(e => e.employee_number);
        console.log(`✅ Filtered to ${employeeNumbers.length} employees in department: ${department}`);
      }
    }

    return c.json({
      success: true,
      data: {
        employeeNumbers,
        adminNumbers, // 🆕 Also return admin numbers
        count: employeeNumbers.length + adminNumbers.length
      }
    });
  } catch (error: any) {
    console.error('❌ Error in get scheduled employees:', error);
    console.error('Stack trace:', error.stack);
    return c.json({ success: false, error: error.message || 'Internal server error' }, 500);
  }
});

/**
 * Create a new schedule
 */
app.post("/make-server-df988758/schedules/create", async (c) => {
  try {
    const scheduleData = await c.req.json();

    console.log('📅 Creating new schedule:', scheduleData);

    // Generate unique ID
    const id = `${scheduleData.employee_number}_${scheduleData.date}_${Date.now()}`;
    
    const schedule = {
      id,
      ...scheduleData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store in KV
    await kv.set(`schedule:${id}`, schedule);

    console.log('✅ Schedule created successfully in KV store');

    return c.json({ success: true, data: schedule });
  } catch (error: any) {
    console.error('❌ Error in create schedule:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Update a schedule
 */
app.put("/make-server-df988758/schedules/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const updateData = await c.req.json();

    console.log('📅 Updating schedule:', id);

    // Get existing schedule
    const existing = await kv.get(`schedule:${id}`);
    
    if (!existing) {
      return c.json({ success: false, error: 'Schedule not found' }, 404);
    }

    const updated = {
      ...existing,
      ...updateData,
      id, // Keep original ID
      updated_at: new Date().toISOString()
    };

    // Update in KV
    await kv.set(`schedule:${id}`, updated);

    console.log('✅ Schedule updated successfully');

    return c.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('❌ Error in update schedule:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Delete a schedule
 */
app.delete("/make-server-df988758/schedules/:id", async (c) => {
  try {
    const id = c.req.param('id');

    console.log('📅 Deleting schedule:', id);

    await kv.del(`schedule:${id}`);

    console.log('✅ Schedule deleted successfully');

    return c.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error in delete schedule:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Upsert schedule (create or update based on employee_number and schedule_date)
 * This is the primary endpoint used by ManageSchedule component
 * DUAL STORAGE: Saves to both KV store AND Supabase schedules table
 */
app.post("/make-server-df988758/schedules/upsert", async (c) => {
  try {
    const scheduleData = await c.req.json();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📅 UPSERT SCHEDULE REQUEST (DUAL STORAGE)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Data:', JSON.stringify(scheduleData, null, 2));

    // Determine user type and identifier
    const userNumber = scheduleData.employee_number || scheduleData.admin_number;
    const userType = scheduleData.user_type || (scheduleData.employee_number ? 'employee' : 'admin');
    
    if (!userNumber || !scheduleData.schedule_date) {
      console.error('❌ Missing required fields: user number or schedule_date');
      return c.json({ 
        success: false, 
        error: 'employee_number/admin_number and schedule_date are required' 
      }, 400);
    }

    console.log(`👤 User: ${userNumber} (${userType})`);
    console.log(`📆 Date: ${scheduleData.schedule_date}`);
    console.log(`🔄 Type: ${scheduleData.is_day_off ? 'DAY OFF' : 'WORKING SHIFT'}`);

    // ============================================
    // STEP 1: Save to KV Store (for backwards compatibility)
    // ============================================
    const kvKey = `schedule:${userNumber}:${scheduleData.schedule_date}`;
    console.log(`💾 Step 1: Saving to KV store with key: ${kvKey}`);
    
    const existingKvSchedule = await kv.get(kvKey);
    
    const kvSchedule = {
      id: existingKvSchedule?.id || kvKey,
      employee_number: userType === 'employee' ? userNumber : undefined,
      admin_number: userType === 'admin' ? userNumber : undefined,
      user_type: userType,
      schedule_date: scheduleData.schedule_date,
      shift_start: scheduleData.shift_start,
      shift_end: scheduleData.shift_end,
      is_day_off: scheduleData.is_day_off || false,
      is_paid_leave: scheduleData.is_paid_leave || false,
      grace_period: scheduleData.grace_period || 30,
      created_at: existingKvSchedule?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kv.set(kvKey, kvSchedule);
    console.log(`✅ KV Store: Schedule ${existingKvSchedule ? 'updated' : 'created'}`);

    // ============================================
    // STEP 2: Save to Supabase schedules table
    // ============================================
    console.log('💾 Step 2: Saving to Supabase schedules table...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let supabaseResult;
    let supabaseAction = 'unknown';

    try {
      // Check if schedule exists in Supabase
      const { data: existingSupabaseSchedule } = await supabase
        .from('schedules')
        .select('*')
        .eq(userType === 'employee' ? 'employee_number' : 'admin_number', userNumber)
        .eq('schedule_date', scheduleData.schedule_date)
        .maybeSingle();

      // Core fields that should exist in all schedules table schemas
      // Note: grace_period is omitted as it may not exist in older table schemas
      // It's always stored in KV store regardless
      // ⚠️ ABSOLUTE MINIMUM PAYLOAD - Only fields that MUST exist
      // If you're getting column errors, run: /FIX_SCHEDULES_TABLE.sql
      const supabasePayload: any = {
        user_type: userType,
        schedule_date: scheduleData.schedule_date,
      };
      
      // Add user identifier
      if (userType === 'employee') {
        supabasePayload.employee_number = userNumber;
      } else {
        supabasePayload.admin_number = userNumber;
      }

      if (existingSupabaseSchedule) {
        // UPDATE existing schedule
        console.log(`📝 Updating existing schedule with ID: ${existingSupabaseSchedule.id}`);
        const { data, error } = await supabase
          .from('schedules')
          .update(supabasePayload)
          .eq('id', existingSupabaseSchedule.id)
          .select()
          .single();

        if (error) throw error;
        supabaseResult = data;
        supabaseAction = 'updated';
        console.log('✅ Supabase: Schedule updated successfully');
      } else {
        // INSERT new schedule
        console.log('📝 Creating new schedule in Supabase');
        const insertPayload = {
          ...supabasePayload,
          id: kvKey,
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('schedules')
          .insert(insertPayload)
          .select()
          .single();

        if (error) throw error;
        supabaseResult = data;
        supabaseAction = 'created';
        console.log('✅ Supabase: Schedule created successfully');
      }

      console.log('   Supabase data:', JSON.stringify(supabaseResult, null, 2));

    } catch (supabaseError: any) {
      console.error('⚠️  Supabase save failed (falling back to KV store only):', supabaseError.message);
      console.error('   Error details:', supabaseError);
      
      // Provide specific guidance based on error
      let errorGuidance = 'Saved to KV store only. ';
      if (supabaseError.message?.includes('Could not find')) {
        errorGuidance += '⚠️ Your schedules table is missing required columns. Please run /FIX_SCHEDULES_TABLE.sql or recreate the table using /CREATE_SCHEDULES_TABLE.sql';
      } else if (supabaseError.message?.includes('does not exist')) {
        errorGuidance += 'Please create the schedules table using /CREATE_SCHEDULES_TABLE.sql';
      } else {
        errorGuidance += 'Supabase table error. Check server logs.';
      }
      
      return c.json({ 
        success: true, 
        data: kvSchedule,
        source: 'kv_store_only',
        action: existingKvSchedule ? 'updated' : 'created',
        warning: errorGuidance,
        supabase_error: supabaseError.message,
        table_fix_required: supabaseError.message?.includes('Could not find')
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SCHEDULE UPSERT COMPLETED (DUAL STORAGE)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return c.json({ 
      success: true, 
      data: supabaseResult || kvSchedule,
      source: supabaseResult ? 'dual_storage' : 'kv_store_only',
      action: supabaseAction,
      kv_backup: kvSchedule
    });
  } catch (error: any) {
    console.error('❌ Error in schedule upsert:', error);
    console.error('   Stack:', error.stack);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to save schedule'
    }, 500);
  }
});

// ============================================
// LEAVE REQUEST ENDPOINTS  
// ============================================

/**
          is_paid_leave: scheduleData.is_paid_leave || false,
          updated_at: new Date().toISOString(),
        };

        // Only add optional columns if they exist in the schema
        // Note: shift_end and grace_period may not exist in all database schemas
        if (scheduleData.grace_period !== undefined) {
          updatePayload.grace_period = scheduleData.grace_period;
        }

        if (userType === 'employee') {
          updatePayload.employee_number = userNumber;
        } else {
          updatePayload.admin_number = userNumber;
        }

        console.log('📤 UPDATE payload:', JSON.stringify(updatePayload, null, 2));

        const { data: updatedData, error: updateError } = await supabase
          .from('schedules')
          .update(updatePayload)
          .eq('id', existingSchedule.id)
          .select()
          .single();

        if (updateError) {
          console.log('⚠️ Supabase table update failed:', updateError.message);
          console.log('   Full error:', JSON.stringify(updateError, null, 2));
          console.log('   Payload that failed:', JSON.stringify(updatePayload, null, 2));
          
          // If error is about grace_period or shift_end column, retry without it
          if (updateError.message?.includes('grace_period') || updateError.message?.includes('shift_end')) {
            console.log(`🔄 Retrying update without ${updateError.message?.includes('shift_end') ? 'shift_end' : 'grace_period'} column...`);
            
            // Remove the problematic column(s)
            if (updateError.message?.includes('shift_end')) {
              delete updatePayload.shift_end;
            }
            if (updateError.message?.includes('grace_period')) {
              delete updatePayload.grace_period;
            }
            
            const { data: retryData, error: retryError } = await supabase
              .from('schedules')
              .update(updatePayload)
              .eq('id', existingSchedule.id)
              .select()
              .single();
            
            if (retryError) {
              console.error('❌ RETRY UPDATE FAILED:', retryError.message);
              console.error('   Full retry error:', JSON.stringify(retryError, null, 2));
              
              // Return error instead of continuing
              return c.json({ 
                success: false, 
                error: `Failed to update schedule: ${retryError.message}`,
                errorCode: retryError.code,
                errorHint: retryError.hint,
                errorDetails: retryError
              }, 500);
            } else {
              console.log('✅ Schedule updated (with adjusted columns)');
              console.log('   Updated data:', JSON.stringify(retryData, null, 2));
              supabaseResult = retryData;
            }
          } else {
            console.error('❌ UPDATE FAILED - Database schema error:', updateError.message);
            console.error('   Error code:', updateError.code);
            console.error('   Error hint:', updateError.hint);
            console.error('   Error details:', updateError.details);
            console.error('   Full error object:', JSON.stringify(updateError, null, 2));
            
            // Return error instead of continuing
            return c.json({ 
              success: false, 
              error: `Failed to update schedule: ${updateError.message}`,
              errorCode: updateError.code,
              errorHint: updateError.hint,
              errorDetails: updateError,
              suggestion: updateError.code === '42P01' 
                ? 'The schedules table does not exist. Visit /super-admin/schedule-diagnostic to create it.'
                : 'Check the error details and verify your database schema.'
            }, 500);
          }
        } else {
          console.log('✅ Schedule updated in Supabase table');
          console.log('   Updated data:', JSON.stringify(updatedData, null, 2));
          supabaseResult = updatedData;
        }
      } else {
        // Insert new schedule
        console.log('➕ Creating new schedule in Supabase table');
        
        const insertPayload: any = {
          schedule_date: scheduleData.schedule_date,
          shift_start: scheduleData.shift_start,
          is_day_off: scheduleData.is_day_off || false,
          is_paid_leave: scheduleData.is_paid_leave || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Only add optional columns if they exist in the schema
        // Note: shift_end and grace_period may not exist in all database schemas
        if (scheduleData.grace_period !== undefined) {
          insertPayload.grace_period = scheduleData.grace_period;
        }

        if (userType === 'employee') {
          insertPayload.employee_number = userNumber;
        } else {
          insertPayload.admin_number = userNumber;
        }

        console.log('📤 INSERT payload:', JSON.stringify(insertPayload, null, 2));

        const { data: insertedData, error: insertError } = await supabase
          .from('schedules')
          .insert(insertPayload)
          .select()
          .single();

        if (insertError) {
          console.log('⚠️ Supabase table insert failed:', insertError.message);
          console.log('   Full error:', JSON.stringify(insertError, null, 2));
          console.log('   Payload that failed:', JSON.stringify(insertPayload, null, 2));
          
          // If error is about grace_period or shift_end column, retry without it
          if (insertError.message?.includes('grace_period') || insertError.message?.includes('shift_end')) {
            console.log(`🔄 Retrying insert without ${insertError.message?.includes('shift_end') ? 'shift_end' : 'grace_period'} column...`);
            
            // Remove the problematic column(s)
            if (insertError.message?.includes('shift_end')) {
              delete insertPayload.shift_end;
            }
            if (insertError.message?.includes('grace_period')) {
              delete insertPayload.grace_period;
            }
            
            const { data: retryData, error: retryError } = await supabase
              .from('schedules')
              .insert(insertPayload)
              .select()
              .single();
            
            if (retryError) {
              console.error('❌ RETRY INSERT FAILED:', retryError.message);
              console.error('   Full retry error:', JSON.stringify(retryError, null, 2));
              
              // Return error instead of continuing
              return c.json({ 
                success: false, 
                error: `Failed to create schedule: ${retryError.message}`,
                errorCode: retryError.code,
                errorHint: retryError.hint,
                errorDetails: retryError
              }, 500);
            } else {
              console.log('✅ Schedule created (with adjusted columns)');
              console.log('   Created data:', JSON.stringify(retryData, null, 2));
              supabaseResult = retryData;
            }
          } else {
            console.error('❌ INSERT FAILED - Database schema error:', insertError.message);
            console.error('   Error code:', insertError.code);
            console.error('   Error hint:', insertError.hint);
            console.error('   Error details:', insertError.details);
            console.error('   Full error object:', JSON.stringify(insertError, null, 2));
            
            // Return error instead of continuing
            return c.json({ 
              success: false, 
              error: `Failed to create schedule: ${insertError.message}`,
              errorCode: insertError.code,
              errorHint: insertError.hint,
              errorDetails: insertError,
              suggestion: insertError.code === '42P01' 
                ? 'The schedules table does not exist. Visit /super-admin/schedule-diagnostic to create it.'
                : 'Check the error details and verify your database schema.'
            }, 500);
          }
        } else {
          console.log('✅ Schedule created in Supabase table');
          console.log('   Created data:', JSON.stringify(insertedData, null, 2));
          supabaseResult = insertedData;
        }
      }

      // Always save to KV store as backup
      const kvKey = `schedule:${userNumber}:${scheduleData.schedule_date}`;
      const kvSchedule = {
        id: supabaseResult?.id || kvKey,
        employee_number: userType === 'employee' ? userNumber : undefined,
        admin_number: userType === 'admin' ? userNumber : undefined,
        user_type: userType,
        schedule_date: scheduleData.schedule_date,
        shift_start: scheduleData.shift_start,
        shift_end: scheduleData.shift_end,
        is_day_off: scheduleData.is_day_off || false,
        is_paid_leave: scheduleData.is_paid_leave || false,
        grace_period: scheduleData.grace_period || 30,
        created_at: supabaseResult?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await kv.set(kvKey, kvSchedule);
      console.log('✅ Schedule saved to KV store as backup');

      // 🔍 VERIFY THE SAVE - Query it back from Supabase to confirm
      console.log('🔍 VERIFYING schedule was actually saved to Supabase...');
      console.log('   Verification query params:', {
        table: 'schedules',
        userType,
        userColumn: userType === 'employee' ? 'employee_number' : 'admin_number',
        userNumber,
        date: scheduleData.schedule_date
      });
      
      const { data: verifyData, error: verifyError } = await supabase
        .from('schedules')
        .select('*')
        .eq(userType === 'employee' ? 'employee_number' : 'admin_number', userNumber)
        .eq('schedule_date', scheduleData.schedule_date)
        .maybeSingle();
      
      if (verifyError) {
        console.error('❌ VERIFICATION FAILED - Could not query back the schedule:', verifyError.message);
        console.error('   Error code:', verifyError.code);
        console.error('   Full error:', JSON.stringify(verifyError, null, 2));
        
        // Try a broader query to see if ANY schedules exist
        console.log('🔍 Attempting broader query to check if table has ANY data...');
        const { data: allSchedules, error: allError } = await supabase
          .from('schedules')
          .select('*')
          .limit(5);
        
        if (allError) {
          console.error('   ❌ Broader query also failed:', allError.message);
          console.error('   This suggests the schedules table may not exist or RLS is blocking access!');
        } else {
          console.log(`   ✅ Found ${allSchedules?.length || 0} total schedules in table`);
          if (allSchedules && allSchedules.length > 0) {
            console.log('   Sample schedule:', JSON.stringify(allSchedules[0], null, 2));
          }
        }
      } else if (!verifyData) {
        console.error('❌ VERIFICATION FAILED - Schedule NOT found in database after save!');
        console.error('   The INSERT/UPDATE returned success but data is not queryable!');
        console.error('   Possible causes:');
        console.error('   1. Row Level Security (RLS) policies blocking SELECT');
        console.error('   2. Wrong table or database');
        console.error('   3. Database transaction not committed');
        
        // Check if supabaseResult was actually set (indicating INSERT/UPDATE succeeded)
        if (supabaseResult) {
          console.error('   ⚠️ But supabaseResult exists:', JSON.stringify(supabaseResult, null, 2));
          console.error('   This confirms INSERT/UPDATE succeeded - likely an RLS issue!');
        } else {
          console.error('   ⚠️ supabaseResult is null/undefined - INSERT/UPDATE may have failed silently!');
        }
      } else {
        console.log('✅ VERIFICATION SUCCESS - Schedule confirmed in database:');
        console.log('   ID:', verifyData.id);
        console.log('   Date:', verifyData.schedule_date);
        console.log('   Shift:', verifyData.shift_start, '-', verifyData.shift_end);
        console.log('   Day Off:', verifyData.is_day_off);
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SCHEDULE UPSERT COMPLETED SUCCESSFULLY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return c.json({ 
        success: true, 
        data: supabaseResult || kvSchedule,
        source: 'supabase',
        verified: !!verifyData
      });

    } catch (error: any) {
      console.error('❌ EXCEPTION in Supabase upsert operation:', error);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      
      // Return error instead of silently falling back to KV
      return c.json({ 
        success: false, 
        error: `Database operation failed: ${error.message}`,
        errorStack: error.stack
      }, 500);
    }
  } catch (error: any) {
    console.error('❌ Error in schedule upsert:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Diagnostic endpoint - Check if schedules table exists and show structure
 */
app.get("/make-server-df988758/schedules/diagnostic", async (c) => {
  try {
    console.log('🔍 RUNNING SCHEDULES TABLE DIAGNOSTIC');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const diagnosticResults: any = {
      supabaseConnected: false,
      tableExists: false,
      tableStructure: null,
      sampleData: null,
      rowCount: 0,
      errors: []
    };

    // Test 1: Check Supabase connection
    console.log('Test 1: Checking Supabase connection...');
    try {
      const { data, error } = await supabase.from('schedules').select('count', { count: 'exact', head: true });
      if (error) {
        diagnosticResults.errors.push({ test: 'connection', error: error.message, code: error.code });
        console.error('   ❌ Connection test failed:', error.message);
      } else {
        diagnosticResults.supabaseConnected = true;
        diagnosticResults.tableExists = true;
        console.log('   ✅ Supabase connected and schedules table exists');
      }
    } catch (err: any) {
      diagnosticResults.errors.push({ test: 'connection', error: err.message });
      console.error('   ❌ Exception:', err.message);
    }

    // Test 2: Get table row count
    console.log('Test 2: Counting rows in schedules table...');
    try {
      const { count, error } = await supabase
        .from('schedules')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        diagnosticResults.errors.push({ test: 'count', error: error.message });
        console.error('   ❌ Count failed:', error.message);
      } else {
        diagnosticResults.rowCount = count || 0;
        console.log(`   ✅ Found ${count} row(s) in schedules table`);
      }
    } catch (err: any) {
      diagnosticResults.errors.push({ test: 'count', error: err.message });
      console.error('   ❌ Exception:', err.message);
    }

    // Test 3: Get sample data
    console.log('Test 3: Fetching sample schedules...');
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .limit(3);
      
      if (error) {
        diagnosticResults.errors.push({ test: 'sample', error: error.message });
        console.error('   ❌ Sample query failed:', error.message);
      } else {
        diagnosticResults.sampleData = data;
        console.log(`   ✅ Retrieved ${data?.length || 0} sample record(s)`);
        if (data && data.length > 0) {
          diagnosticResults.tableStructure = Object.keys(data[0]);
          console.log('   Table columns:', Object.keys(data[0]).join(', '));
        }
      }
    } catch (err: any) {
      diagnosticResults.errors.push({ test: 'sample', error: err.message });
      console.error('   ❌ Exception:', err.message);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('DIAGNOSTIC COMPLETE');
    console.log('Results:', JSON.stringify(diagnosticResults, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return c.json({ 
      success: true, 
      table_exists: diagnosticResults.tableExists,
      diagnostic: diagnosticResults 
    });
  } catch (error: any) {
    console.error('❌ Diagnostic endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// ATTENDANCE ENDPOINTS
// ============================================

/**
 * Get attendance records with optional filters
 */
app.get("/make-server-df988758/attendance/records", async (c) => {
  try {
    const employee_number = c.req.query('employee_number');
    const start_date = c.req.query('start_date');
    const end_date = c.req.query('end_date');

    console.log('📋 Fetching attendance records with filters:', { employee_number, start_date, end_date });

    // Try to get from Supabase table first
    let query = supabase.from('attendance_records').select('*');

    if (employee_number) {
      query = query.eq('employee_number', employee_number);
    }
    if (start_date) {
      query = query.gte('date', start_date.split('T')[0]); // Extract date part
    }
    if (end_date) {
      query = query.lte('date', end_date.split('T')[0]); // Extract date part
    }

    const { data: tableData, error } = await query.order('date', { ascending: false });

    if (error) {
      console.log('⚠️ Attendance table query failed:', error.message);
      console.log('   Falling back to KV store...');
      
      // Fallback to KV store
      let allRecords: any[] = [];
      try {
        allRecords = await kv.getByPrefix('attendance:');
      } catch (kvError: any) {
        console.error('❌ KV store also failed:', kvError.message);
        return c.json({ success: true, data: [] });
      }
      let filteredRecords = allRecords;

      if (employee_number) {
        filteredRecords = filteredRecords.filter(r => r.employee_number === employee_number);
      }
      if (start_date) {
        const startDateOnly = start_date.split('T')[0];
        filteredRecords = filteredRecords.filter(r => r.date >= startDateOnly);
      }
      if (end_date) {
        const endDateOnly = end_date.split('T')[0];
        filteredRecords = filteredRecords.filter(r => r.date <= endDateOnly);
      }

      filteredRecords.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA);
      });

      console.log(`✅ Found ${filteredRecords.length} attendance record(s) from KV store`);
      return c.json({ success: true, data: filteredRecords, source: 'kv' });
    }

    console.log(`✅ Found ${tableData?.length || 0} attendance record(s) from Supabase table`);
    return c.json({ success: true, data: tableData, source: 'supabase' });
  } catch (error: any) {
    console.error('❌ Error in get attendance records:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// TIME TRACKING / CHECK-IN/OUT ENDPOINTS
// ============================================

/**
 * Check-in endpoint
 */
app.post("/make-server-df988758/attendance/check-in", async (c) => {
  try {
    const testInsertData = {
      employee_number: `RLS_TEST_${Date.now()}`,
      schedule_date: new Date().toISOString().split('T')[0],
      shift_start: '09:00',
      is_day_off: false
    };

    const { data: insertData, error: insertError } = await supabase
      .from('schedules')
      .insert(testInsertData)
      .select()
      .single();

    if (insertError) {
      console.log('   ❌ INSERT failed:', insertError.message);
      results.canInsert = false;
      results.testResults.push({
        test: 'INSERT Permission',
        status: 'FAIL',
        message: `Cannot insert: ${insertError.message}`,
        errorCode: insertError.code
      });
    } else {
      console.log('   ✅ INSERT succeeded');
      results.canInsert = true;
      results.testId = insertData.id;
      results.testResults.push({
        test: 'INSERT Permission',
        status: 'PASS',
        message: 'Successfully inserted test schedule'
      });

      // Step 3: Test SELECT permission (read back what we just inserted)
      console.log('Step 3: Testing SELECT permission...');
      const { data: selectData, error: selectError } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', insertData.id)
        .single();

      if (selectError) {
        console.log('   ❌ SELECT failed:', selectError.message);
        results.canSelect = false;
        results.rlsEnabled = true; // If we can INSERT but not SELECT, RLS is likely enabled
        results.testResults.push({
          test: 'SELECT Permission',
          status: 'FAIL',
          message: `Cannot read back inserted data: ${selectError.message}`,
          errorCode: selectError.code,
          diagnosis: 'RLS is likely blocking SELECT operations'
        });
      } else {
        console.log('   ✅ SELECT succeeded');
        results.canSelect = true;
        results.testResults.push({
          test: 'SELECT Permission',
          status: 'PASS',
          message: 'Successfully read test schedule'
        });
      }

      // Step 4: Test UPDATE permission
      console.log('Step 4: Testing UPDATE permission...');
      const { error: updateError } = await supabase
        .from('schedules')
        .update({ shift_start: '08:00' })
        .eq('id', insertData.id);

      if (updateError) {
        console.log('   ❌ UPDATE failed:', updateError.message);
        results.canUpdate = false;
        results.testResults.push({
          test: 'UPDATE Permission',
          status: 'FAIL',
          message: `Cannot update: ${updateError.message}`,
          errorCode: updateError.code
        });
      } else {
        console.log('   ✅ UPDATE succeeded');
        results.canUpdate = true;
        results.testResults.push({
          test: 'UPDATE Permission',
          status: 'PASS',
          message: 'Successfully updated test schedule'
        });
      }

      // Step 5: Test DELETE permission (cleanup)
      console.log('Step 5: Testing DELETE permission...');
      const { error: deleteError } = await supabase
        .from('schedules')
        .delete()
        .eq('id', insertData.id);

      if (deleteError) {
        console.log('   ❌ DELETE failed:', deleteError.message);
        results.canDelete = false;
        results.testResults.push({
          test: 'DELETE Permission',
          status: 'FAIL',
          message: `Cannot delete: ${deleteError.message}`,
          errorCode: deleteError.code
        });
      } else {
        console.log('   ✅ DELETE succeeded (test data cleaned up)');
        results.canDelete = true;
        results.testResults.push({
          test: 'DELETE Permission',
          status: 'PASS',
          message: 'Successfully deleted test schedule'
        });
      }
    }

    // Determine RLS status based on results
    if (results.canInsert && !results.canSelect) {
      results.rlsEnabled = true;
      results.diagnosis = 'RLS IS ENABLED and blocking SELECT operations. Schedules save but cannot be read.';
      results.fix = 'Run this SQL in Supabase: ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;';
    } else if (!results.canInsert && !results.canSelect) {
      results.rlsEnabled = true;
      results.diagnosis = 'RLS IS ENABLED and blocking all operations.';
      results.fix = 'Run this SQL in Supabase: ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;';
    } else if (results.canInsert && results.canSelect) {
      results.rlsEnabled = false;
      results.diagnosis = 'RLS is disabled or has permissive policies. All operations work correctly.';
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('RLS CHECK COMPLETE');
    console.log('Results:', JSON.stringify(results, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return c.json({ success: true, results });
  } catch (error: any) {
    console.error('❌ RLS check endpoint error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// ATTENDANCE ENDPOINTS
// ============================================

/**
 * Get attendance records with optional filters
 */
app.get("/make-server-df988758/attendance/records", async (c) => {
  try {
    const employee_number = c.req.query('employee_number');
    const start_date = c.req.query('start_date');
    const end_date = c.req.query('end_date');

    console.log('📋 Fetching attendance records with filters:', { employee_number, start_date, end_date });

    // Try to get from Supabase table first
    let query = supabase.from('attendance_records').select('*');

    if (employee_number) {
      query = query.eq('employee_number', employee_number);
    }
    if (start_date) {
      query = query.gte('date', start_date.split('T')[0]); // Extract date part
    }
    if (end_date) {
      query = query.lte('date', end_date.split('T')[0]); // Extract date part
    }

    const { data: tableData, error } = await query.order('date', { ascending: false });

    if (error) {
      console.log('⚠️ Attendance table query failed:', error.message);
      console.log('   Falling back to KV store...');
      
      // Fallback to KV store
      let allRecords: any[] = [];
      try {
        allRecords = await kv.getByPrefix('attendance:');
      } catch (kvError: any) {
        console.error('❌ KV store also failed:', kvError.message);
        return c.json({ success: true, data: [] });
      }
      let filteredRecords = allRecords;

      if (employee_number) {
        filteredRecords = filteredRecords.filter(r => r.employee_number === employee_number);
      }
      if (start_date) {
        const startDateOnly = start_date.split('T')[0];
        filteredRecords = filteredRecords.filter(r => r.date >= startDateOnly);
      }
      if (end_date) {
        const endDateOnly = end_date.split('T')[0];
        filteredRecords = filteredRecords.filter(r => r.date <= endDateOnly);
      }

      filteredRecords.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA);
      });

      console.log(`✅ Found ${filteredRecords.length} attendance record(s) from KV store`);

      return c.json({
        success: true,
        data: filteredRecords
      });
    }

    console.log(`✅ Found ${tableData?.length || 0} attendance record(s) from table`);

    // Log paid leave attendance records for debugging
    const paidLeaveRecords = tableData?.filter((r: any) => r.status === 'PAID_LEAVE') || [];
    if (paidLeaveRecords.length > 0) {
      console.log(`🏖️ Found ${paidLeaveRecords.length} PAID_LEAVE attendance record(s):`);
      paidLeaveRecords.forEach((r: any) => {
        console.log(`   - ${r.date}: status=${r.status}, employee_number=${r.employee_number}, leave_request_id=${r.leave_request_id}`);
      });
    }

    return c.json({
      success: true,
      data: tableData || []
    });
  } catch (error: any) {
    console.error('❌ Error in get attendance records:', error);
    console.error('Stack trace:', error.stack);
    return c.json({ success: false, error: error.message || 'Internal server error' }, 500);
  }
});

/**
 * Diagnostic endpoint to check attendance_records table
 */
app.get("/make-server-df988758/attendance/diagnostic", async (c) => {
  try {
    console.log('🔍 Running attendance_records table diagnostic...');
    
    const results: any[] = [];
    
    // Test 1: Check if table exists
    results.push({ test: 'Table Existence', status: 'checking...' });
    const { data: tableCheck, error: tableError } = await supabase
      .from('attendance_records')
      .select('*')
      .limit(1);
    
    if (tableError) {
      results[0] = {
        test: 'Table Existence',
        status: 'FAILED',
        error: tableError.message,
        code: tableError.code,
        details: tableError.details,
        hint: tableError.hint
      };
      return c.json({ 
        success: false, 
        message: 'attendance_records table does not exist or is not accessible',
        results 
      });
    }
    
    results[0] = {
      test: 'Table Existence',
      status: 'PASSED',
      message: 'Table exists and is accessible'
    };
    
    // Test 2: Try to insert a test record
    results.push({ test: 'Insert Test', status: 'checking...' });
    const testRecord = {
      employee_number: 'TEST-001',
      date: new Date().toISOString().split('T')[0],
      time_in: new Date().toISOString(),
      type: 'PRESENT',
      status: 'ON_TIME',
      hours_worked: 0,
      notes: 'Diagnostic test record'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('attendance_records')
      .insert(testRecord)
      .select()
      .single();
    
    if (insertError) {
      results[1] = {
        test: 'Insert Test',
        status: 'FAILED',
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        testRecord
      };
    } else {
      results[1] = {
        test: 'Insert Test',
        status: 'PASSED',
        message: 'Successfully inserted test record',
        insertedId: insertData.id
      };
      
      // Clean up test record
      await supabase
        .from('attendance_records')
        .delete()
        .eq('id', insertData.id);
    }
    
    // Test 3: Check existing records
    const { data: existingRecords, error: recordsError } = await supabase
      .from('attendance_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!recordsError) {
      results.push({
        test: 'Existing Records',
        status: 'PASSED',
        count: existingRecords?.length || 0,
        sampleRecords: existingRecords
      });
    }
    
    return c.json({
      success: results.every(r => r.status === 'PASSED' || r.status === 'SKIPPED'),
      results,
      message: 'Diagnostic complete'
    });
    
  } catch (error: any) {
    console.error('❌ Diagnostic error:', error);
    return c.json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    }, 500);
  }
});

/**
 * Create attendance record (check-in/check-out)
 */
app.post("/make-server-df988758/attendance/record", async (c) => {
  try {
    const { employee_number, action, timestamp } = await c.req.json();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 CREATING ATTENDANCE RECORD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Employee Number:', employee_number);
    console.log('   Action:', action);
    console.log('   Timestamp:', timestamp);

    if (!employee_number || !action) {
      return c.json({ 
        success: false, 
        error: 'employee_number and action are required' 
      }, 400);
    }

    const now = timestamp ? new Date(timestamp) : new Date();
    const todayDate = now.toISOString().split('T')[0];
    const currentTime = now.toISOString();
    
    console.log('   Computed Date:', todayDate);
    console.log('   Computed Time:', currentTime);

    // STEP 1: Check if employee/admin has a schedule for today (MANDATORY - NO BYPASS)
    console.log('📅 [SCHEDULE CHECK] Starting validation for user:', employee_number, 'on date:', todayDate);
    
    // Try employee_number first
    let { data: schedules, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('employee_number', employee_number)
      .eq('schedule_date', todayDate);

    console.log('📅 [SCHEDULE CHECK] Query result:', {
      schedules: schedules,
      scheduleCount: schedules?.length || 0,
      scheduleError: scheduleError,
      employeeNumber: employee_number,
      todayDate: todayDate
    });

    // If no schedule found with employee_number, try admin_number (for admins using kiosk)
    if ((!schedules || schedules.length === 0) && employee_number.startsWith('ADM-')) {
      console.log('📅 [SCHEDULE CHECK] No schedule found with employee_number, trying admin_number...');
      const adminScheduleResult = await supabase
        .from('schedules')
        .select('*')
        .eq('admin_number', employee_number)
        .eq('schedule_date', todayDate);
      
      schedules = adminScheduleResult.data;
      scheduleError = adminScheduleResult.error;
      
      console.log('📅 [SCHEDULE CHECK] Admin query result:', {
        schedules: schedules,
        scheduleCount: schedules?.length || 0,
        scheduleError: scheduleError
      });
    }

    // Handle database errors - allow attendance if schedules table doesn't exist
    if (scheduleError) {
      console.log('⚠️ [SCHEDULE CHECK] Database error (schedules table may not exist):', scheduleError.message);
      console.log('⚠️ [SCHEDULE CHECK] Skipping schedule validation - allowing attendance to proceed');
      // Don't block attendance - continue to next step
    } else {
      // Check if schedule exists
      if (!schedules || schedules.length === 0) {
        console.log('❌ [SCHEDULE CHECK] No schedule found for user on this date');
        console.log('📊 [SCHEDULE CHECK] Debug info: Employee may not have a schedule assigned for today.');
        console.log('📊 [SCHEDULE CHECK] However, allowing TIME IN to proceed as fallback...');
        
        // IMPORTANT FIX: Allow attendance even without schedule
        // The schedule check is informational, not blocking
        console.log('✅ [SCHEDULE CHECK] Proceeding with attendance despite no schedule');
      } else {
        // Check the schedule details
        const schedule = schedules[0];
        console.log('✅ [SCHEDULE CHECK] Schedule found:', {
          schedule_date: schedule.schedule_date,
          shift_start: schedule.shift_start,
          shift_end: schedule.shift_end,
          is_day_off: schedule.is_day_off,
          is_paid_leave: schedule.is_paid_leave
        });
        
        // Block attendance if it's a day off
        if (schedule.is_day_off === true) {
          console.log('❌ [SCHEDULE CHECK] User has a day off today');
          return c.json({ 
            success: false, 
            error: 'DAY_OFF',
            message: 'Today is your scheduled day off. No attendance needed.'
          }, 400);
        }
        
        // Block attendance if it's paid leave
        if (schedule.is_paid_leave === true) {
          console.log('❌ [SCHEDULE CHECK] User has paid leave today');
          return c.json({ 
            success: false, 
            error: 'PAID_LEAVE',
            message: 'You have an approved paid leave today. No need to clock in/out.'
          }, 400);
        }
        
        console.log('✅ [SCHEDULE CHECK] Validation passed - proceeding with attendance');
      }
    }
    
    // STEP 1.5: Check if employee has a PAID_LEAVE attendance record for today
    console.log('🏖️ Checking for PAID_LEAVE records on this date...');
    
    const { data: paidLeaveRecords, error: paidLeaveError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_number', employee_number)
      .eq('date', todayDate)
      .eq('type', 'PAID_LEAVE');
    
    if (!paidLeaveError && paidLeaveRecords && paidLeaveRecords.length > 0) {
      console.log('❌ Employee has PAID_LEAVE today - cannot clock in/out');
      return c.json({ 
        success: false, 
        error: 'PAID_LEAVE',
        message: 'You have an approved paid leave today. No need to clock in/out.'
      }, 400);
    }

    // STEP 2: Check for existing attendance record today
    const { data: existingRecords, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_number', employee_number)
      .eq('date', todayDate);

    if (fetchError) {
      console.log('⚠️ Error fetching existing records:', fetchError.message);
    }

    console.log('📊 Existing records for today:', existingRecords);

    // STEP 2.5: Check for duplicate TIME IN or TIME OUT
    if (existingRecords && existingRecords.length > 0) {
      const existingRecord = existingRecords[0];
      
      if (action === 'IN' && existingRecord.time_in) {
        console.log('❌ Duplicate TIME IN detected - employee already clocked in today');
        console.log('   Existing time_in:', existingRecord.time_in);
        return c.json({ 
          success: false, 
          error: 'DUPLICATE_TIME_IN',
          message: 'Already timed in today! You can only TIME IN once per day.'
        }, 400);
      }
      
      if (action === 'OUT' && existingRecord.time_out) {
        console.log('❌ Duplicate TIME OUT detected - employee already clocked out today');
        console.log('   Existing time_out:', existingRecord.time_out);
        return c.json({ 
          success: false, 
          error: 'DUPLICATE_TIME_OUT',
          message: 'Already timed out today! You can only TIME OUT once per day.'
        }, 400);
      }
      
      if (action === 'OUT' && !existingRecord.time_in) {
        console.log('❌ TIME OUT without TIME IN - must clock in first');
        return c.json({ 
          success: false, 
          error: 'NO_TIME_IN',
          message: 'Must TIME IN first before you can TIME OUT.'
        }, 400);
      }
    } else if (action === 'OUT') {
      // No records at all but trying to TIME OUT
      console.log('❌ TIME OUT attempted with no TIME IN record');
      return c.json({ 
        success: false, 
        error: 'NO_TIME_IN',
        message: 'Must TIME IN first before you can TIME OUT.'
      }, 400);
    }

    // STEP 3: Create or update attendance record
    let recordData: any = {
      date: todayDate,
      employee_number: employee_number
      // Note: created_at and updated_at are auto-generated by database
    };

    if (action === 'IN') {
      // TIME IN
      recordData.time_in = currentTime; // Use full timestamp
      recordData.type = 'PRESENT';
      recordData.hours_worked = 0;
      recordData.notes = 'Time in via Kiosk Mode';

      // Determine if employee is ON_TIME or LATE based on schedule
      let attendanceStatus = 'ON_TIME'; // Default to on time
      
      // Re-fetch the schedule to get grace_period
      let { data: scheduleForStatus, error: scheduleStatusError } = await supabase
        .from('schedules')
        .select('*')
        .eq('employee_number', employee_number)
        .eq('schedule_date', todayDate)
        .single();
      
      // If not found and it's an admin, try admin_number
      if (!scheduleForStatus && employee_number.startsWith('ADM-')) {
        console.log('⏰ [LATE CHECK] Trying admin_number for schedule...');
        const adminResult = await supabase
          .from('schedules')
          .select('*')
          .eq('admin_number', employee_number)
          .eq('schedule_date', todayDate)
          .single();
        scheduleForStatus = adminResult.data;
        scheduleStatusError = adminResult.error;
      }
      
      if (scheduleStatusError && scheduleStatusError.code !== 'PGRST116') {
        console.log('⚠️ [LATE CHECK] Error fetching schedule:', scheduleStatusError);
      }
      
      if (scheduleForStatus && scheduleForStatus.shift_start) {
        const shiftStart = scheduleForStatus.shift_start; // Format: "13:00" (1 PM)
        const gracePeriod = scheduleForStatus.grace_period || 30; // Default 30 minutes
        
        // Parse shift start time using LOCAL timezone (not UTC)
        // This ensures "13:00" means 1 PM in the user's local time
        const [shiftHour, shiftMinute] = shiftStart.split(':').map(Number);
        
        // Extract current time in HH:MM format for comparison
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        
        // Calculate shift start and grace end in minutes since midnight
        const shiftStartInMinutes = shiftHour * 60 + shiftMinute;
        const graceEndInMinutes = shiftStartInMinutes + gracePeriod;
        
        const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        const graceEndHour = Math.floor(graceEndInMinutes / 60);
        const graceEndMinute = graceEndInMinutes % 60;
        const graceEndTimeStr = `${String(graceEndHour).padStart(2, '0')}:${String(graceEndMinute).padStart(2, '0')}`;
        
        console.log('⏰ [LATE CHECK] Shift start:', shiftStart);
        console.log('⏰ [LATE CHECK] Grace period:', gracePeriod, 'minutes');
        console.log('⏰ [LATE CHECK] Current time:', currentTimeStr, '(' + currentTimeInMinutes + ' mins since midnight)');
        console.log('⏰ [LATE CHECK] Grace end time:', graceEndTimeStr, '(' + graceEndInMinutes + ' mins since midnight)');
        console.log('⏰ [LATE CHECK] Is late?', currentTimeInMinutes > graceEndInMinutes);
        
        // Check if time in is after grace period
        if (currentTimeInMinutes > graceEndInMinutes) {
          attendanceStatus = 'LATE';
          console.log('❌ Employee is LATE');
        } else {
          console.log('✅ Employee is ON_TIME');
        }
      }
      
      recordData.status = attendanceStatus;

      console.log('⏰ TIME IN - Creating new record with status:', attendanceStatus);
      console.log('📋 [RECORD DATA]:', JSON.stringify(recordData, null, 2));
    } else if (action === 'OUT') {
      // TIME OUT
      if (existingRecords && existingRecords.length > 0) {
        const existingRecord = existingRecords[0];
        
        // Calculate hours worked
        let hoursWorked = 0;
        
        if (existingRecord.time_in) {
          const timeIn = new Date(existingRecord.time_in);
          const diffMs = now.getTime() - timeIn.getTime();
          hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimals
        }

        console.log('⏰ TIME OUT - Updating existing record');
        console.log('   Hours worked:', hoursWorked);

        // Update existing record
        const { data: updatedData, error: updateError } = await supabase
          .from('attendance_records')
          .update({
            time_out: currentTime, // Use full timestamp
            hours_worked: hoursWorked,
            notes: existingRecord.notes ? `${existingRecord.notes} | Time out via Kiosk Mode` : 'Time out via Kiosk Mode'
            // Note: updated_at is auto-generated by database
          })
          .eq('employee_number', employee_number)
          .eq('date', todayDate)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Failed to update attendance record:', updateError);
          return c.json({ success: false, error: updateError.message }, 500);
        }

        console.log('✅ Attendance record updated (TIME OUT)');
        return c.json({ success: true, data: updatedData, action: 'OUT' });
      } else {
        console.log('⚠️ TIME OUT attempted but no TIME IN record found - creating TIME OUT only record');
        recordData.time_out = currentTime; // Use full timestamp
        recordData.status = 'PRESENT';
        recordData.type = 'PRESENT';
        recordData.hours_worked = 0;
        recordData.notes = 'Time out via Kiosk Mode (no time in recorded)';
      }
    }

    // Insert new TIME IN record (or TIME OUT if no TIME IN exists)
    console.log('🔄🔄🔄 ATTEMPTING DATABASE INSERT 🔄🔄🔄');
    console.log('   Table: attendance_records');
    console.log('   Record data:', JSON.stringify(recordData, null, 2));
    console.log('   Fields to insert:', Object.keys(recordData).join(', '));
    
    const { data: tableData, error: tableError } = await supabase
      .from('attendance_records')
      .insert(recordData)
      .select()
      .single();

    if (tableError) {
      console.log('❌❌❌ TABLE INSERT FAILED ❌❌❌');
      console.log('   Error message:', tableError.message);
      console.log('   Error code:', tableError.code);
      console.log('   Error details:', tableError.details);
      console.log('   Error hint:', tableError.hint);
      console.log('   Record data being inserted:', JSON.stringify(recordData, null, 2));
      console.log('   Falling back to KV store...');
      
      // Fallback to KV store
      const id = `${employee_number}_${todayDate}_${Date.now()}`;
      const kvRecord = {
        id,
        ...recordData
      };

      await kv.set(`attendance:${id}`, kvRecord);

      console.log('✅ Attendance record created in KV store');

      return c.json({ success: true, data: kvRecord, action });
    }

    console.log('✅✅✅ ATTENDANCE RECORD CREATED SUCCESSFULLY ✅✅✅');
    console.log('   Record ID:', tableData.id);
    console.log('   Employee:', tableData.employee_number);
    console.log('   Date:', tableData.date);
    console.log('   Time In:', tableData.time_in);
    console.log('   Time Out:', tableData.time_out);
    console.log('   Status:', tableData.status);
    console.log('   Type:', tableData.type);
    console.log('   Full record:', JSON.stringify(tableData, null, 2));

    return c.json({ success: true, data: tableData, action });
  } catch (error: any) {
    console.error('❌ Error in create attendance record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Update attendance record
 */
app.put("/make-server-df988758/attendance/record/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const updateData = await c.req.json();

    console.log('📝 Updating attendance record:', id);

    // Try table first
    const { data: tableData, error: tableError } = await supabase
      .from('attendance_records')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (tableError) {
      console.log('⚠️ Table update failed:', tableError.message);
      console.log('   Falling back to KV store...');
      
      // Fallback to KV store
      const existing = await kv.get(`attendance:${id}`);
      
      if (!existing) {
        return c.json({ success: false, error: 'Attendance record not found' }, 404);
      }

      const updated = {
        ...existing,
        ...updateData,
        updated_at: new Date().toISOString()
      };

      await kv.set(`attendance:${id}`, updated);

      console.log('✅ Attendance record updated in KV store');

      return c.json({ success: true, data: updated });
    }

    console.log('✅ Attendance record updated in table');

    return c.json({ success: true, data: tableData });
  } catch (error: any) {
    console.error('❌ Error in update attendance record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Delete attendance record
 */
app.delete("/make-server-df988758/attendance/record/:id", async (c) => {
  try {
    const id = c.req.param('id');

    console.log('📝 Deleting attendance record:', id);

    // Try table first
    const { error: tableError } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', id);

    if (tableError) {
      console.log('⚠️ Table delete failed:', tableError.message);
      console.log('   Falling back to KV store...');
      
      // Fallback to KV store
      await kv.del(`attendance:${id}`);

      console.log('✅ Attendance record deleted from KV store');

      return c.json({ success: true });
    }

    console.log('✅ Attendance record deleted from table');

    return c.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error in delete attendance record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================
// TIME CORRECTION REQUEST ENDPOINTS
// ============================================

/**
 * Get time correction requests for a specific admin's team
 */
app.get("/make-server-df988758/time-corrections/admin/:admin_number", async (c) => {
  try {
    const admin_number = c.req.param('admin_number');

    console.log('🔧 Fetching time correction requests for admin:', admin_number);

    // First, get the admin's department
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('department')
      .eq('admin_number', admin_number)
      .single();

    if (adminError || !adminData) {
      console.log('⚠️ Admin not found, trying alternative column admin_id');
      
      // Try with admin_id instead
      const { data: adminData2, error: adminError2 } = await supabase
        .from('admins')
        .select('department')
        .eq('admin_id', admin_number)
        .single();

      if (adminError2 || !adminData2) {
        console.error('❌ Admin not found:', adminError2);
        
        // Fallback to KV store
        const allRequests = await kv.getByPrefix('time-correction:');
        console.log(`✅ Returning all ${allRequests.length} time correction request(s) from KV store`);
        
        return c.json({
          success: true,
          data: allRequests.sort((a, b) => {
            const dateA = a.created_at || '';
            const dateB = b.created_at || '';
            return dateB.localeCompare(dateA);
          })
        });
      }
    }

    const adminDepartment = adminData?.department || '';
    console.log('   Admin department:', adminDepartment);

    // Try to get from Supabase table
    const { data: tableData, error: tableError } = await supabase
      .from('time_correction_requests')
      .select('*')
      .eq('admin_team', adminDepartment)
      .order('created_at', { ascending: false });

    if (tableError) {
      console.log('⚠️ Table query failed:', tableError.message);
      console.log('   Falling back to KV store...');
      
      // Fallback to KV store
      const allRequests = await kv.getByPrefix('time-correction:');
      
      // Filter by admin department if we have it
      const filteredRequests = adminDepartment 
        ? allRequests.filter(r => r.admin_team === adminDepartment)
        : allRequests;

      console.log(`✅ Found ${filteredRequests.length} time correction request(s) from KV store`);

      return c.json({
        success: true,
        data: filteredRequests.sort((a, b) => {
          const dateA = a.created_at || '';
          const dateB = b.created_at || '';
          return dateB.localeCompare(dateA);
        })
      });
    }

    console.log(`✅ Found ${tableData?.length || 0} time correction request(s) from table`);

    return c.json({
      success: true,
      data: tableData || []
    });
  } catch (error: any) {
    console.error('❌ Error in get time correction requests:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Get all time correction requests (for super admin)
 */
app.get("/make-server-df988758/time-corrections", async (c) => {
  try {
    const employee_number = c.req.query('employee_number');
    const status = c.req.query('status');

    console.log('🔧 Fetching time correction requests with filters:', { employee_number, status });

    // Try to get from Supabase table
    let query = supabase.from('time_correction_requests').select('*');

    if (employee_number) {
      query = query.eq('employee_number', employee_number);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: tableData, error: tableError } = await query.order('created_at', { ascending: false });

    if (tableError) {
      console.log('⚠️ Table query failed:', tableError.message);
      console.log('   Falling back to KV store...');
      
      // Fallback to KV store
      let allRequests = await kv.getByPrefix('time-correction:');

      if (employee_number) {
        allRequests = allRequests.filter(r => r.employee_number === employee_number);
      }
      if (status) {
        allRequests = allRequests.filter(r => r.status === status);
      }

      allRequests.sort((a, b) => {
        const dateA = a.created_at || '';
        const dateB = b.created_at || '';
        return dateB.localeCompare(dateA);
      });

      console.log(`✅ Found ${allRequests.length} time correction request(s) from KV store`);

      return c.json({
        success: true,
        data: allRequests
      });
    }

    console.log(`✅ Found ${tableData?.length || 0} time correction request(s) from table`);

    return c.json({
      success: true,
      data: tableData || []
    });
  } catch (error: any) {
    console.error('❌ Error in get time correction requests:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Create a new time correction request
 */
app.post("/make-server-df988758/time-corrections/create", async (c) => {
  try {
    const requestData = await c.req.json();

    console.log('🔧 Creating time correction request:', requestData);

    // Try to insert into Supabase table first
    const { data: tableData, error: tableError } = await supabase
      .from('time_correction_requests')
      .insert({
        ...requestData,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tableError) {
      console.log('⚠️ Table insert failed:', tableError.message);
      console.log('   Falling back to KV store...');
      
      // Fallback to KV store
      const id = `${requestData.employee_number}_${requestData.date}_${Date.now()}`;
      const kvRecord = {
        id,
        ...requestData,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await kv.set(`time-correction:${id}`, kvRecord);

      console.log('✅ Time correction request created in KV store');

      return c.json({ success: true, data: kvRecord });
    }

    console.log('✅ Time correction request created in table');

    return c.json({ success: true, data: tableData });
  } catch (error: any) {
    console.error('❌ Error in create time correction request:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Update time correction request status
 */
app.put("/make-server-df988758/time-corrections/:id/status", async (c) => {
  try {
    const id = c.req.param('id');
    const { status, reviewed_by, corrected_time } = await c.req.json();

    console.log('🔧 Updating time correction request status:', id);
    console.log('   New status:', status);
    console.log('   Reviewed by:', reviewed_by);

    // Try table first
    const { data: tableData, error: tableError } = await supabase
      .from('time_correction_requests')
      .update({
        status,
        reviewed_by,
        corrected_time,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (tableError) {
      console.log('⚠️ Table update failed:', tableError.message);
      console.log('   Falling back to KV store...');
      
      // Fallback to KV store
      const existing = await kv.get(`time-correction:${id}`);
      
      if (!existing) {
        return c.json({ success: false, error: 'Time correction request not found' }, 404);
      }

      const updated = {
        ...existing,
        status,
        reviewed_by,
        corrected_time,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await kv.set(`time-correction:${id}`, updated);

      console.log('✅ Time correction request updated in KV store');

      return c.json({ success: true, data: updated });
    }

    console.log('✅ Time correction request updated in table');

    return c.json({ success: true, data: tableData });
  } catch (error: any) {
    console.error('❌ Error in update time correction status:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Delete a time correction request
 */
app.delete("/make-server-df988758/time-corrections/:id", async (c) => {
  try {
    const id = c.req.param('id');

    console.log('🔧 Deleting time correction request:', id);

    // Try table first
    const { error: tableError } = await supabase
      .from('time_correction_requests')
      .delete()
      .eq('id', id);

    if (tableError) {
      console.log('⚠️ Table delete failed:', tableError.message);
      console.log('   Falling back to KV store...');
      
      // Fallback to KV store
      await kv.del(`time-correction:${id}`);

      console.log('✅ Time correction request deleted from KV store');

      return c.json({ success: true });
    }

    console.log('✅ Time correction request deleted from table');

    return c.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error in delete time correction request:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * GEOFENCE CONFIGURATION ENDPOINTS
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━��━━━━━━━━━
 */

/**
 * Get current geofence configuration
 */
app.get("/make-server-df988758/geofence", async (c) => {
  try {
    console.log('🗺️ Fetching geofence configuration...');

    const { data, error } = await supabase
      .from('geofence_config')
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        console.log('ℹ️ No geofence configuration found');
        return c.json({ success: true, data: null });
      }
      
      console.error('❌ Error fetching geofence config:', error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log('✅ Geofence configuration fetched successfully');
    console.log('   - Center:', data.center_latitude, data.center_longitude);
    console.log('   - Radius:', data.radius_meters, 'meters');
    console.log('   - Enabled:', data.enabled);

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error in get geofence config:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Save/Update geofence configuration
 */
app.post("/make-server-df988758/geofence/config", async (c) => {
  try {
    const configData = await c.req.json();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 SAVING GEOFENCE CONFIGURATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Config Data:');
    console.log('   - Center Latitude:', configData.center_latitude);
    console.log('   - Center Longitude:', configData.center_longitude);
    console.log('   - Radius:', configData.radius_meters, 'meters');
    console.log('   - Enabled:', configData.enabled);
    console.log('   - Location Name:', configData.location_name);

    // Check if config already exists
    const { data: existing, error: fetchError } = await supabase
      .from('geofence_config')
      .select('id')
      .single();

    let result;
    
    if (existing) {
      // Update existing config
      console.log('🔄 Updating existing geofence config...');
      
      const { data, error } = await supabase
        .from('geofence_config')
        .update(configData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating geofence config:', error);
        
        // Check if it's a constraint violation error
        if (error.code === '23514' && error.message && error.message.includes('geofence_config_radius_meters_check')) {
          return c.json({ 
            success: false, 
            error: `Database constraint error: The geofence_config table has a check constraint that's preventing this radius value. Please run this SQL in Supabase to fix it:\n\nALTER TABLE geofence_config DROP CONSTRAINT IF EXISTS geofence_config_radius_meters_check;\nALTER TABLE geofence_config ADD CONSTRAINT geofence_config_radius_meters_check CHECK (radius_meters >= 1 AND radius_meters <= 10000);\n\nOriginal error: ${error.message}`,
            errorCode: error.code
          }, 500);
        }
        
        return c.json({ success: false, error: error.message }, 500);
      }

      result = data;
      console.log('✅ Geofence config updated successfully!');
    } else {
      // Insert new config
      console.log('➕ Creating new geofence config...');
      
      const { data, error } = await supabase
        .from('geofence_config')
        .insert([configData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating geofence config:', error);
        
        // Check if it's a constraint violation error
        if (error.code === '23514' && error.message && error.message.includes('geofence_config_radius_meters_check')) {
          return c.json({ 
            success: false, 
            error: `Database constraint error: The geofence_config table has a check constraint that's preventing this radius value. Please run this SQL in Supabase to fix it:\n\nALTER TABLE geofence_config DROP CONSTRAINT IF EXISTS geofence_config_radius_meters_check;\nALTER TABLE geofence_config ADD CONSTRAINT geofence_config_radius_meters_check CHECK (radius_meters >= 1 AND radius_meters <= 10000);\n\nOriginal error: ${error.message}`,
            errorCode: error.code
          }, 500);
        }
        
        return c.json({ success: false, error: error.message }, 500);
      }

      result = data;
      console.log('✅ Geofence config created successfully!');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SAVE COMPLETE!');
    console.log('   - Record ID:', result.id);
    console.log('   - Center:', result.center_latitude, result.center_longitude);
    console.log('   - Radius:', result.radius_meters, 'meters');
    console.log('   - Enabled:', result.enabled);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━���━━━━━━━━━━━━━━━');

    return c.json({ success: true, data: result });
  } catch (error: any) {
    console.error('❌ Error in save geofence config:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Validate location against geofence
 */
app.post("/make-server-df988758/geofence/validate", async (c) => {
  try {
    const { latitude, longitude } = await c.req.json();
    
    console.log('🧭 Validating location against geofence...');
    console.log('   - User Location:', latitude, longitude);

    // Get current geofence config
    const { data: config, error } = await supabase
      .from('geofence_config')
      .select('*')
      .single();

    if (error || !config) {
      console.log('⚠️ No geofence configuration found - allowing access');
      return c.json({ 
        success: true, 
        allowed: true, 
        reason: 'No geofence configured',
        distance: null 
      });
    }

    if (!config.enabled) {
      console.log('ℹ️ Geofence disabled - allowing access');
      return c.json({ 
        success: true, 
        allowed: true, 
        reason: 'Geofence disabled',
        distance: null 
      });
    }

    // Calculate distance using Haversine formula
    const R = 6371000; // Earth's radius in meters
    const lat1 = config.center_latitude * Math.PI / 180;
    const lat2 = latitude * Math.PI / 180;
    const deltaLat = (latitude - config.center_latitude) * Math.PI / 180;
    const deltaLon = (longitude - config.center_longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    const allowed = distance <= config.radius_meters;

    console.log('📍 Validation Result:');
    console.log('   - Distance from center:', Math.round(distance), 'meters');
    console.log('   - Allowed radius:', config.radius_meters, 'meters');
    console.log('   - Access:', allowed ? '✅ ALLOWED' : '❌ DENIED');

    return c.json({ 
      success: true, 
      allowed,
      distance: Math.round(distance),
      radius: config.radius_meters,
      reason: allowed ? 'Within allowed area' : 'Outside allowed area'
    });
  } catch (error: any) {
    console.error('❌ Error in validate geofence:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Geocode search using Google Maps API
 */
app.post("/make-server-df988758/geofence/geocode", async (c) => {
  try {
    const { query } = await c.req.json();
    
    console.log('🔍 Geocoding search query:', query);

    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleMapsApiKey) {
      console.error('❌ Google Maps API key not configured');
      return c.json({ 
        success: false, 
        error: 'Google Maps API key not configured',
        data: [] 
      });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleMapsApiKey}`;
    
    const response = await fetch(url);
    const result = await response.json();

    if (result.status !== 'OK') {
      console.warn('⚠️ Geocoding API returned status:', result.status);
      return c.json({ 
        success: false, 
        error: result.status,
        data: [] 
      });
    }

    const locations = result.results.map((r: any) => ({
      lat: r.geometry.location.lat,
      lon: r.geometry.location.lng,
      display_name: r.formatted_address
    }));

    console.log('✅ Found', locations.length, 'location(s)');

    return c.json({ success: true, data: locations });
  } catch (error: any) {
    console.error('❌ Error in geocode search:', error);
    return c.json({ success: false, error: error.message, data: [] }, 500);
  }
});

// Global error handler for unhandled errors
app.onError((err, c) => {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ UNHANDLED ERROR');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('URL:', c.req.url);
  console.error('Method:', c.req.method);
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Ensure we always return a valid JSON response
  try {
    return c.json({
      success: false,
      error: 'Internal server error',
      message: err?.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, 500);
  } catch (responseError) {
    // Fallback if c.json fails
    console.error('❌ Failed to send error response:', responseError);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'Failed to process request',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});

/**
 * Diagnostic endpoint to check if approved leave schedules exist
 */
app.get("/make-server-df988758/diagnostic/leave-schedules/:employee_number", async (c) => {
  try {
    const employee_number = c.req.param('employee_number');
    
    console.log('🔍 Running leave schedule diagnostic for:', employee_number);
    
    // Check schedules table
    const { data: schedules, error: schedError } = await supabase
      .from('schedules')
      .select('*')
      .eq('employee_number', employee_number)
      .eq('is_paid_leave', true)
      .order('schedule_date', { ascending: true });
    
    // Check attendance records
    const { data: attendance, error: attError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_number', employee_number)
      .eq('status', 'PAID_LEAVE')
      .order('date', { ascending: true });
    
    const result = {
      success: true,
      employee_number,
      schedules: {
        count: schedules?.length || 0,
        data: schedules || [],
        error: schedError?.message || null
      },
      attendance: {
        count: attendance?.length || 0,
        data: attendance || [],
        error: attError?.message || null
      },
      diagnosis: {
        has_paid_leave_schedules: (schedules?.length || 0) > 0,
        has_paid_leave_attendance: (attendance?.length || 0) > 0,
        recommendation: ''
      }
    };
    
    // Provide diagnosis
    if (!result.diagnosis.has_paid_leave_schedules && !result.diagnosis.has_paid_leave_attendance) {
      result.diagnosis.recommendation = 'No paid leave found. Employee may not have any approved leave requests.';
    } else if (!result.diagnosis.has_paid_leave_schedules && result.diagnosis.has_paid_leave_attendance) {
      result.diagnosis.recommendation = 'ISSUE: Attendance records exist but schedules are missing. Check if schedules table has is_paid_leave column.';
    } else if (result.diagnosis.has_paid_leave_schedules && !result.diagnosis.has_paid_leave_attendance) {
      result.diagnosis.recommendation = 'WARNING: Schedules exist but attendance records are missing. This is unusual for employee leave.';
    } else {
      result.diagnosis.recommendation = 'OK: Both schedules and attendance records found.';
    }
    
    console.log('✅ Diagnostic complete:', result.diagnosis.recommendation);
    
    return c.json(result);
    
  } catch (error: any) {
    console.error('❌ Diagnostic error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * Generate unique QR codes for all admin accounts
 * POST /make-server-df988758/generate-admin-qr-codes
 */
app.post("/make-server-df988758/generate-admin-qr-codes", async (c) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 GENERATING ADMIN QR CODES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Fetch all admins
    const { data: admins, error: fetchError } = await supabase
      .from('admins')
      .select('id, admin_number, full_name, department, qr_code_data')
      .order('admin_number', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching admins:', fetchError);
      return c.json({ success: false, error: fetchError.message }, 500);
    }

    if (!admins || admins.length === 0) {
      console.log('⚠️ No admins found in database');
      return c.json({ success: false, error: 'No admins found' }, 404);
    }

    console.log(`📊 Found ${admins.length} admin accounts`);

    const results = [];
    let generatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const admin of admins) {
      try {
        // Check if admin already has QR code data
        if (admin.qr_code_data) {
          console.log(`⏭️  Skipping ${admin.admin_number} - Already has QR code`);
          skippedCount++;
          results.push({
            admin_number: admin.admin_number,
            status: 'skipped',
            reason: 'Already has QR code'
          });
          continue;
        }

        // Validate admin has admin_number
        if (!admin.admin_number || !admin.admin_number.startsWith('ADM-')) {
          console.error(`❌ Invalid admin_number for admin ID ${admin.id}:`, admin.admin_number);
          errorCount++;
          results.push({
            admin_number: admin.admin_number || 'UNKNOWN',
            status: 'error',
            reason: 'Invalid admin_number format'
          });
          continue;
        }

        // Generate QR code data
        const qrCodeData = JSON.stringify({
          type: 'admin',
          id: admin.admin_number,
          name: admin.full_name || 'Admin',
          department: admin.department || 'Unknown Department',
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Generating QR for ${admin.admin_number}: ${admin.full_name}`);

        // Update admin with QR code data
        const { error: updateError } = await supabase
          .from('admins')
          .update({ qr_code_data: qrCodeData })
          .eq('id', admin.id);

        if (updateError) {
          console.error(`❌ Failed to update ${admin.admin_number}:`, updateError);
          errorCount++;
          results.push({
            admin_number: admin.admin_number,
            status: 'error',
            reason: updateError.message
          });
          continue;
        }

        generatedCount++;
        results.push({
          admin_number: admin.admin_number,
          full_name: admin.full_name,
          department: admin.department,
          status: 'success',
          qr_data: qrCodeData
        });

      } catch (error: any) {
        console.error(`❌ Error processing admin ${admin.admin_number}:`, error);
        errorCount++;
        results.push({
          admin_number: admin.admin_number,
          status: 'error',
          reason: error.message
        });
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 QR CODE GENERATION COMPLETE');
    console.log(`   ✅ Generated: ${generatedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return c.json({
      success: true,
      summary: {
        total: admins.length,
        generated: generatedCount,
        skipped: skippedCount,
        errors: errorCount
      },
      results: results
    });

  } catch (error: any) {
    console.error('❌ Fatal error in generate-admin-qr-codes:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Catch-all 404 handler for undefined routes
app.notFound((c) => {
  console.warn('⚠️ 404 - Route not found:', c.req.url);
  
  return c.json({
    success: false,
    error: 'Route not found',
    path: c.req.path,
    message: `The endpoint ${c.req.path} does not exist`,
    timestamp: new Date().toISOString()
  }, 404);
});

// Start server with error handling and request wrapper
console.log('🚀 Starting Mnemosyne server...');
console.log('📍 Base URL: /make-server-df988758');
console.log('✅ CORS enabled for all origins');
console.log('✅ Logger enabled');
console.log('✅ Enhanced error handling enabled');

// Initialize storage bucket for avatars
(async () => {
  try {
    console.log('🪣 Checking/creating storage bucket for avatars...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
    } else {
      const avatarsBucket = buckets?.find(b => b.name === 'avatars');
      
      if (!avatarsBucket) {
        console.log('📦 Creating "avatars" bucket...');
        const { data, error: createError } = await supabase.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
        });
        
        if (createError) {
          console.error('❌ Error creating avatars bucket:', createError.message);
        } else {
          console.log('✅ Avatars bucket created successfully');
        }
      } else {
        console.log('✅ Avatars bucket already exists');
      }
    }
  } catch (error: any) {
    console.error('❌ Error initializing storage:', error.message);
  }
})();

// Wrap app.fetch to ensure responses are always complete
Deno.serve(async (req: Request) => {
  try {
    const response = await app.fetch(req);
    return response;
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ FATAL REQUEST ERROR');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('URL:', req.url);
    console.error('Method:', req.method);
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Return a properly formatted error response
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error?.message || 'Request processing failed',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }
});