-- COMPLETE FIX: This SQL will fix all user_type errors
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new
--
-- After running this:
-- 1. Go to Settings -> API -> Click "Reload schema cache" (CRITICAL!)
-- 2. Clear browser cache (Ctrl+Shift+Delete)
-- 3. Hard refresh (Ctrl+Shift+R)
-- 4. Test leave request submission

-- Step 1: Drop the column if it exists (fixes wrong type issue)
ALTER TABLE leave_requests DROP COLUMN IF EXISTS user_type CASCADE;

-- Step 2: Add it with the CORRECT type (TEXT, not smallint)
ALTER TABLE leave_requests ADD COLUMN user_type TEXT;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_type ON leave_requests(user_type);

-- Step 4: Populate existing records
UPDATE leave_requests
SET user_type = CASE
    WHEN employee_number IS NOT NULL AND employee_number != '' THEN 'employee'
    WHEN admin_number IS NOT NULL AND admin_number != '' THEN 'admin'
    ELSE NULL
END
WHERE user_type IS NULL;

-- Step 5: Verify the fix
SELECT
    'Column added successfully!' as message,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'leave_requests'
  AND column_name = 'user_type';

-- Step 6: Show a sample record to confirm
SELECT
    'Sample record:' as info,
    employee_number,
    admin_number,
    user_type,
    leave_type,
    status
FROM leave_requests
LIMIT 1;
