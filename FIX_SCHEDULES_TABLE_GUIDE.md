# 🔧 Fix Schedules Table - Step-by-Step Guide

## ⚠️ Current Problem
Your `schedules` table exists but is **missing required columns** like:
- `user_type` ❌
- `shift_end` ❌
- `grace_period` ❌
- And possibly others

This causes errors when trying to save schedules.

---

## ✅ Solution: Run the Fix SQL Script

Follow these 4 simple steps:

### Step 1: Copy the SQL Script Below

```sql
-- ⚠️ FIX: Add all missing columns to your schedules table
-- This script is SAFE - it only adds missing columns, won't delete existing data

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
```

### Step 2: Open Supabase Dashboard

1. Go to: **https://supabase.com/dashboard**
2. Log in to your account
3. Select your project for the Mnemosyne system
4. Click **"SQL Editor"** in the left sidebar

### Step 3: Run the SQL Script

1. Click **"New query"** button (top right)
2. **Paste** the SQL script from Step 1 into the editor
3. Click the **"RUN"** button (or press Ctrl+Enter / Cmd+Enter)
4. Wait for the success message

### Step 4: Verify & Refresh

1. You should see messages like:
   ```
   ✅ Added user_type column
   ✅ Added shift_end column
   ✅ Added grace_period column
   🎉 All missing columns fixed!
   ```

2. **Go back to your Mnemosyne app** and **refresh the page**
3. The errors should be gone! ✅

---

## 🧪 Testing After Fix

After running the fix, test the schedule management:

1. Go to **Admin Portal → Manage Schedule**
2. Click on any cell in the schedule grid
3. Set a working shift (e.g., 08:00 - 17:00)
4. Click **"Save Schedule"**
5. You should see: **"Schedule updated successfully"** ✅

---

## ❓ Troubleshooting

### Problem: "relation schedules does not exist"
**Solution:** Your table doesn't exist at all. Use the creation script instead:

<details>
<summary>Click to see table creation script</summary>

```sql
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  employee_number TEXT,
  admin_number TEXT,
  user_type TEXT CHECK (user_type IN ('employee', 'admin')),
  schedule_date DATE NOT NULL,
  shift_start TIME,
  shift_end TIME,
  grace_period INTEGER DEFAULT 30,
  is_day_off BOOLEAN DEFAULT FALSE,
  is_paid_leave BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX IF NOT EXISTS idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX IF NOT EXISTS idx_schedules_schedule_date ON schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_user_type ON schedules(user_type);
```

Run this in SQL Editor, then refresh your app.
</details>

### Problem: "permission denied"
**Solution:** Make sure you're logged in as the **owner** of the Supabase project.

### Problem: Still seeing errors after running the script
**Solution:** 
1. Make sure you clicked **RUN** in the SQL Editor
2. Check for any error messages in red
3. Hard refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)
4. Check the browser console for new errors

---

## 📊 What This Fix Does

✅ **Adds all missing columns** to your existing schedules table  
✅ **Preserves all your existing data** (no data loss)  
✅ **Sets sensible defaults** (e.g., grace_period = 30 minutes)  
✅ **Adds database indexes** for faster queries  
✅ **Makes the script idempotent** (safe to run multiple times)

---

## 🎯 Alternative: Quick Fix via App

If you don't want to use Supabase dashboard:

1. Look for the **🔴 RED ERROR BANNER** at the top of the Manage Schedule page
2. Click **"Show Fix SQL"**
3. Click **"📋 Copy SQL"**
4. Click **"Open Supabase Dashboard"**
5. Paste and run the SQL
6. Click **"🔄 Reload After Fix"**

---

## ✨ Summary

1. ✅ Copy the SQL script above
2. ✅ Open Supabase Dashboard → SQL Editor
3. ✅ Paste and RUN the script
4. ✅ Refresh your Mnemosyne app

**That's it!** Your schedules table will be fixed and all errors will disappear.

---

**Need help?** Check the browser console (F12) for detailed error messages or ask for assistance.
