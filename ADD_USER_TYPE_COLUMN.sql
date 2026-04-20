-- QUICK FIX: Add the missing user_type column to stop the error
-- This is a temporary workaround until you deploy the proper fix

-- Add user_type column to leave_requests table
ALTER TABLE leave_requests
ADD COLUMN IF NOT EXISTS user_type TEXT;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_type
ON leave_requests(user_type);

-- Update existing records to have user_type based on which field is populated
UPDATE leave_requests
SET user_type = CASE
    WHEN employee_number IS NOT NULL THEN 'employee'
    WHEN admin_number IS NOT NULL THEN 'admin'
    ELSE NULL
END
WHERE user_type IS NULL;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leave_requests'
  AND column_name = 'user_type';
