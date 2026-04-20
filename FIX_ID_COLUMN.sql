-- 🔧 FIX: Change schedules.id column from BIGINT to TEXT
-- This fixes the error: invalid input syntax for type bigint

-- Step 1: Drop the existing id column (if it's BIGINT)
-- Step 2: Add it back as TEXT
-- Step 3: Make it the primary key

DO $$
BEGIN
  -- Check if id column exists and is wrong type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules'
    AND column_name = 'id'
    AND data_type = 'bigint'
  ) THEN
    -- Drop primary key constraint if exists
    ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_pkey;

    -- Drop the id column
    ALTER TABLE schedules DROP COLUMN IF EXISTS id;

    -- Add it back as TEXT
    ALTER TABLE schedules ADD COLUMN id TEXT PRIMARY KEY;

    RAISE NOTICE '✅ Fixed id column: changed from BIGINT to TEXT';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'schedules'
    AND column_name = 'id'
    AND data_type = 'text'
  ) THEN
    RAISE NOTICE 'ℹ️  id column is already TEXT - no fix needed';
  ELSE
    -- id column doesn't exist, add it
    ALTER TABLE schedules ADD COLUMN id TEXT PRIMARY KEY;
    RAISE NOTICE '✅ Added id column as TEXT';
  END IF;
END $$;

-- Add all other missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'employee_number') THEN
    ALTER TABLE schedules ADD COLUMN employee_number TEXT;
    RAISE NOTICE '✅ Added employee_number column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'admin_number') THEN
    ALTER TABLE schedules ADD COLUMN admin_number TEXT;
    RAISE NOTICE '✅ Added admin_number column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'user_type') THEN
    ALTER TABLE schedules ADD COLUMN user_type TEXT CHECK (user_type IN ('employee', 'admin'));
    RAISE NOTICE '✅ Added user_type column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'schedule_date') THEN
    ALTER TABLE schedules ADD COLUMN schedule_date DATE NOT NULL;
    RAISE NOTICE '✅ Added schedule_date column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'shift_start') THEN
    ALTER TABLE schedules ADD COLUMN shift_start TIME;
    RAISE NOTICE '✅ Added shift_start column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'shift_end') THEN
    ALTER TABLE schedules ADD COLUMN shift_end TIME;
    RAISE NOTICE '✅ Added shift_end column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'grace_period') THEN
    ALTER TABLE schedules ADD COLUMN grace_period INTEGER DEFAULT 30;
    RAISE NOTICE '✅ Added grace_period column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'is_day_off') THEN
    ALTER TABLE schedules ADD COLUMN is_day_off BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_day_off column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'is_paid_leave') THEN
    ALTER TABLE schedules ADD COLUMN is_paid_leave BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_paid_leave column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'created_at') THEN
    ALTER TABLE schedules ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added created_at column';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'updated_at') THEN
    ALTER TABLE schedules ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added updated_at column';
  END IF;
END $$;

-- Create indexes
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
