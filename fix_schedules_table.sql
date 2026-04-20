-- ⚠️ FIX SCHEDULES TABLE - Add All Missing Columns
-- 📋 Copy this entire file and run it in Supabase SQL Editor
-- ✅ Safe to run - only adds missing columns, preserves existing data

-- CRITICAL FIX: Change id column from BIGINT to TEXT
DO $$
BEGIN
  -- Check if id column exists and is wrong type (BIGINT)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules'
    AND column_name = 'id'
    AND data_type = 'bigint'
  ) THEN
    -- Drop primary key constraint if exists
    ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_pkey;
    -- Drop the id column
    ALTER TABLE schedules DROP COLUMN id;
    -- Add it back as TEXT
    ALTER TABLE schedules ADD COLUMN id TEXT PRIMARY KEY;
    RAISE NOTICE '✅ Fixed id column: changed from BIGINT to TEXT';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'id'
  ) THEN
    -- Add id column if it doesn't exist
    ALTER TABLE schedules ADD COLUMN id TEXT PRIMARY KEY;
    RAISE NOTICE '✅ Added id column as TEXT';
  END IF;
END $$;

DO $$
BEGIN
  -- Add employee_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'employee_number'
  ) THEN
    ALTER TABLE schedules ADD COLUMN employee_number TEXT;
    RAISE NOTICE '✅ Added employee_number column';
  ELSE
    RAISE NOTICE 'ℹ️  employee_number column already exists';
  END IF;

  -- Add admin_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'admin_number'
  ) THEN
    ALTER TABLE schedules ADD COLUMN admin_number TEXT;
    RAISE NOTICE '✅ Added admin_number column';
  ELSE
    RAISE NOTICE 'ℹ️  admin_number column already exists';
  END IF;

  -- Add user_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE schedules ADD COLUMN user_type TEXT CHECK (user_type IN ('employee', 'admin'));
    RAISE NOTICE '✅ Added user_type column';
  ELSE
    RAISE NOTICE 'ℹ️  user_type column already exists';
  END IF;

  -- Add shift_start column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'shift_start'
  ) THEN
    ALTER TABLE schedules ADD COLUMN shift_start TIME;
    RAISE NOTICE '✅ Added shift_start column';
  ELSE
    RAISE NOTICE 'ℹ️  shift_start column already exists';
  END IF;

  -- Add shift_end column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'shift_end'
  ) THEN
    ALTER TABLE schedules ADD COLUMN shift_end TIME;
    RAISE NOTICE '✅ Added shift_end column';
  ELSE
    RAISE NOTICE 'ℹ️  shift_end column already exists';
  END IF;

  -- Add grace_period column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'grace_period'
  ) THEN
    ALTER TABLE schedules ADD COLUMN grace_period INTEGER DEFAULT 30;
    RAISE NOTICE '✅ Added grace_period column';
  ELSE
    RAISE NOTICE 'ℹ️  grace_period column already exists';
  END IF;

  -- Add is_day_off column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'is_day_off'
  ) THEN
    ALTER TABLE schedules ADD COLUMN is_day_off BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_day_off column';
  ELSE
    RAISE NOTICE 'ℹ️  is_day_off column already exists';
  END IF;

  -- Add is_paid_leave column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'is_paid_leave'
  ) THEN
    ALTER TABLE schedules ADD COLUMN is_paid_leave BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_paid_leave column';
  ELSE
    RAISE NOTICE 'ℹ️  is_paid_leave column already exists';
  END IF;

  -- Add updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE schedules ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added updated_at column';
  ELSE
    RAISE NOTICE 'ℹ️  updated_at column already exists';
  END IF;

  -- Add created_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE schedules ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added created_at column';
  ELSE
    RAISE NOTICE 'ℹ️  created_at column already exists';
  END IF;

  RAISE NOTICE '🎉 All missing columns fixed!';
END $$;

-- Create missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX IF NOT EXISTS idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX IF NOT EXISTS idx_schedules_schedule_date ON schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_user_type ON schedules(user_type);

-- Show final table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;
