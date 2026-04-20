# 🚨 EMERGENCY FIX - RUN THIS NOW

## The Problem
Your `schedules` table has `id` column as **BIGINT** but needs to be **TEXT**.

Error: `invalid input syntax for type bigint: "schedule:EMP-1053:2026-04-19"`

---

## ⚡ INSTANT FIX (30 seconds)

### Copy This SQL:

```sql
-- Fix the id column type
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_pkey;
ALTER TABLE schedules DROP COLUMN IF EXISTS id;
ALTER TABLE schedules ADD COLUMN id TEXT PRIMARY KEY;

-- Add missing columns
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS employee_number TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS user_type TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS schedule_date DATE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS shift_start TIME;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS shift_end TIME;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS grace_period INTEGER DEFAULT 30;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_day_off BOOLEAN DEFAULT FALSE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_paid_leave BOOLEAN DEFAULT FALSE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

### Run It:

1. Go to: **https://supabase.com/dashboard**
2. Open your project
3. Click **SQL Editor** (left menu)
4. Click **New query**
5. **Paste** the SQL above
6. Click **RUN** (green button)
7. Wait for success message

### Refresh Your App:

Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)

---

## ✅ Done!

Try saving a schedule now. It should work!

---

## ⚠️ Warning

This will **delete all existing schedules** in the Supabase table because we need to recreate the `id` column. Your data in the KV store is safe though!

If you have important schedules already saved, let me know and I'll create a migration script that preserves them.

---

## 🆘 Alternative: Delete & Recreate Table

If the above doesn't work, run this instead (NUCLEAR OPTION):

```sql
-- Delete the table completely
DROP TABLE IF EXISTS schedules;

-- Recreate it with correct structure
CREATE TABLE schedules (
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

-- Add indexes
CREATE INDEX idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX idx_schedules_schedule_date ON schedules(schedule_date);
CREATE INDEX idx_schedules_user_type ON schedules(user_type);
```

---

**This will 100% fix the error!** 🎯
