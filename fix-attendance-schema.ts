/**
 * FIX ATTENDANCE RECORDS SCHEMA
 *
 * This script adds the missing employee_number column to attendance_records table
 *
 * Run this with: npx tsx fix-attendance-schema.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aoctrfafybrkzupfjbwj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvY3RyZmFmeWJya3p1cGZqYndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI1OTcyNCwiZXhwIjoyMDU0ODM1NzI0fQ.JlnrKr9LdkrEIRiQvdUMdFt3CFLPfNOXr1VFonvd9EM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAttendanceSchema() {
  console.log('🔧 Starting schema fix for attendance_records...\n');

  // Step 1: Check current schema
  console.log('Step 1: Checking current schema...');
  const { data: currentColumns, error: checkError } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'attendance_records'
        ORDER BY ordinal_position;
      `
    });

  if (checkError) {
    console.error('❌ Error checking schema:', checkError);
    console.log('\n⚠️  The RPC method might not exist. You need to run the SQL directly in Supabase.');
    printManualInstructions();
    return;
  }

  console.log('Current columns:', currentColumns);

  // Step 2: Add the missing column
  console.log('\nStep 2: Adding employee_number column...');
  const { error: alterError } = await supabase
    .rpc('exec_sql', {
      query: `
        ALTER TABLE attendance_records
        ADD COLUMN IF NOT EXISTS employee_number TEXT;
      `
    });

  if (alterError) {
    console.error('❌ Error adding column:', alterError);
    printManualInstructions();
    return;
  }

  console.log('✅ Column added successfully!');

  // Step 3: Add index
  console.log('\nStep 3: Adding index...');
  const { error: indexError } = await supabase
    .rpc('exec_sql', {
      query: `
        CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_number
        ON attendance_records(employee_number);
      `
    });

  if (indexError) {
    console.error('⚠️  Index creation failed:', indexError);
  } else {
    console.log('✅ Index added successfully!');
  }

  console.log('\n✅ Schema fix complete!');
  console.log('\n⚠️  IMPORTANT: You MUST reload the schema cache now!');
  console.log('Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api');
  console.log('Click: "Reload schema cache" button\n');
}

function printManualInstructions() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📋 MANUAL FIX INSTRUCTIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new\n');

  console.log('2. Copy and paste this SQL:\n');
  console.log('   -- Add missing column');
  console.log('   ALTER TABLE attendance_records');
  console.log('   ADD COLUMN IF NOT EXISTS employee_number TEXT;\n');
  console.log('   -- Add index');
  console.log('   CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_number');
  console.log('   ON attendance_records(employee_number);\n');
  console.log('   -- Verify');
  console.log('   SELECT column_name, data_type');
  console.log('   FROM information_schema.columns');
  console.log('   WHERE table_name = \'attendance_records\'');
  console.log('   AND column_name = \'employee_number\';\n');

  console.log('3. Click "RUN" button\n');

  console.log('4. RELOAD SCHEMA CACHE (CRITICAL!):');
  console.log('   Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api');
  console.log('   Click: "Reload schema cache"\n');

  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run the fix
fixAttendanceSchema().catch(console.error);
