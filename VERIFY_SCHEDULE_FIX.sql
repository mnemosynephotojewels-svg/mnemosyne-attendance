-- ============================================
-- VERIFY SCHEDULE ADMIN FIX
-- Run this in Supabase SQL Editor to verify
-- ============================================

-- 1️⃣ Check if schedules table exists and has proper columns
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'schedules'
ORDER BY ordinal_position;

-- Expected columns:
-- - employee_number (TEXT, nullable)
-- - admin_number (TEXT, nullable)
-- - schedule_date (DATE, not null)
-- - shift_start (TIME, nullable)
-- - shift_end (TIME, nullable)
-- - is_day_off (BOOLEAN)
-- - grace_period (INTEGER, nullable)

-- 2️⃣ Check RLS status (should be false or have permissive policies)
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'schedules';

-- 3️⃣ Check RLS policies (should allow all operations or be empty)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'schedules';

-- 4️⃣ Check all schedules (last 20)
SELECT 
  id,
  employee_number,
  admin_number,
  schedule_date,
  shift_start,
  shift_end,
  is_day_off,
  is_paid_leave,
  grace_period,
  created_at
FROM schedules
ORDER BY created_at DESC
LIMIT 20;

-- 5️⃣ Check admin schedules specifically
SELECT 
  admin_number AS "Admin ID",
  schedule_date AS "Date",
  shift_start AS "Start",
  shift_end AS "End",
  is_day_off AS "Day Off",
  created_at AS "Created"
FROM schedules
WHERE admin_number IS NOT NULL
ORDER BY schedule_date DESC;

-- 6️⃣ Check employee schedules specifically
SELECT 
  employee_number AS "Employee ID",
  schedule_date AS "Date",
  shift_start AS "Start",
  shift_end AS "End",
  is_day_off AS "Day Off",
  created_at AS "Created"
FROM schedules
WHERE employee_number IS NOT NULL
ORDER BY schedule_date DESC;

-- 7️⃣ Count schedules by type
SELECT 
  'Total Schedules' AS type,
  COUNT(*) AS count
FROM schedules
UNION ALL
SELECT 
  'Admin Schedules' AS type,
  COUNT(*) AS count
FROM schedules
WHERE admin_number IS NOT NULL
UNION ALL
SELECT 
  'Employee Schedules' AS type,
  COUNT(*) AS count
FROM schedules
WHERE employee_number IS NOT NULL
UNION ALL
SELECT 
  'Day Off Schedules' AS type,
  COUNT(*) AS count
FROM schedules
WHERE is_day_off = true
UNION ALL
SELECT 
  'Working Schedules' AS type,
  COUNT(*) AS count
FROM schedules
WHERE is_day_off = false AND shift_start IS NOT NULL;

-- ============================================
-- INTERPRETATION GUIDE
-- ============================================

/*
✅ GOOD SIGNS:
- Query 1: Shows all expected columns
- Query 2: rls_enabled = false OR
- Query 3: Shows permissive policy allowing all operations
- Query 4: Shows recent schedules with both employee_number and admin_number
- Query 5: Shows admin schedules with admin_number populated
- Query 6: Shows employee schedules with employee_number populated

❌ BAD SIGNS:
- Query 1: Missing employee_number or admin_number columns
- Query 2: rls_enabled = true AND
- Query 3: Shows restrictive policies OR no policies at all
- Query 4: Empty results or only shows one type of schedule
- Query 5: Empty results even though you saved admin schedules
- Query 6: Empty results even though you saved employee schedules

🔧 FIXES:

If RLS is blocking (Query 2 shows rls_enabled = true and Query 3 shows no policies):
*/

-- FIX: Disable RLS entirely
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;

-- OR FIX: Keep RLS but add permissive policy
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on schedules" ON schedules;

CREATE POLICY "Allow all operations on schedules"
ON schedules
FOR ALL
USING (true)
WITH CHECK (true);

/*
If columns are missing:
*/

-- Add missing columns if needed
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS employee_number TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS grace_period INTEGER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX IF NOT EXISTS idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(schedule_date);

-- ============================================
-- TEST SCHEDULE SAVE
-- Try inserting a test schedule to verify writes work
-- ============================================

-- Test insert for admin
INSERT INTO schedules (
  admin_number,
  schedule_date,
  shift_start,
  shift_end,
  is_day_off,
  created_at,
  updated_at
) VALUES (
  'TEST_ADMIN_001',
  CURRENT_DATE,
  '09:00',
  '17:00',
  false,
  NOW(),
  NOW()
);

-- Test insert for employee
INSERT INTO schedules (
  employee_number,
  schedule_date,
  shift_start,
  shift_end,
  is_day_off,
  created_at,
  updated_at
) VALUES (
  'TEST_EMP_001',
  CURRENT_DATE,
  '08:00',
  '16:00',
  false,
  NOW(),
  NOW()
);

-- Verify test inserts worked
SELECT * FROM schedules 
WHERE (admin_number = 'TEST_ADMIN_001' OR employee_number = 'TEST_EMP_001')
  AND schedule_date = CURRENT_DATE;

-- Clean up test data
DELETE FROM schedules 
WHERE (admin_number = 'TEST_ADMIN_001' OR employee_number = 'TEST_EMP_001')
  AND schedule_date = CURRENT_DATE;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

-- Check if everything is set up correctly
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'schedules' 
        AND column_name IN ('employee_number', 'admin_number', 'grace_period')
      GROUP BY table_name
      HAVING COUNT(*) = 3
    ) THEN '✅ All required columns exist'
    ELSE '❌ Missing required columns'
  END AS column_check,
  
  CASE 
    WHEN (
      SELECT rowsecurity FROM pg_tables 
      WHERE tablename = 'schedules' AND schemaname = 'public'
    ) = false THEN '✅ RLS is disabled (recommended for now)'
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'schedules' 
        AND permissive = 'PERMISSIVE'
        AND cmd = 'ALL'
    ) THEN '✅ RLS is enabled with permissive policy'
    ELSE '⚠️ RLS is enabled but may block queries'
  END AS rls_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM schedules WHERE admin_number IS NOT NULL
    ) THEN CONCAT('✅ ', (SELECT COUNT(*) FROM schedules WHERE admin_number IS NOT NULL), ' admin schedules found')
    ELSE '⚠️ No admin schedules found (try saving one first)'
  END AS admin_schedules_check,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM schedules WHERE employee_number IS NOT NULL
    ) THEN CONCAT('✅ ', (SELECT COUNT(*) FROM schedules WHERE employee_number IS NOT NULL), ' employee schedules found')
    ELSE '⚠️ No employee schedules found (try saving one first)'
  END AS employee_schedules_check;
