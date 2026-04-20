# 📋 Supabase Schedules Table Setup Instructions

## ⚠️ IMPORTANT: Manual Setup Required

The Mnemosyne QR Attendance System now saves schedules to **both** the KV store AND a dedicated Supabase `schedules` table for better data management.

However, **you must manually create the `schedules` table** in your Supabase dashboard because Figma Make cannot execute database migrations.

---

## 🔧 How to Create the Schedules Table

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)

### Step 2: Run This SQL Command

Copy and paste the following SQL into the SQL Editor and click **RUN**:

```sql
-- Create schedules table for Mnemosyne QR Attendance System
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX IF NOT EXISTS idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX IF NOT EXISTS idx_schedules_schedule_date ON schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_user_type ON schedules(user_type);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_schedules_employee_date ON schedules(employee_number, schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_admin_date ON schedules(admin_number, schedule_date);

-- Add comments for documentation
COMMENT ON TABLE schedules IS 'Stores employee and admin work schedules, including day-offs and paid leave';
COMMENT ON COLUMN schedules.id IS 'Unique identifier (format: schedule:{user_number}:{date})';
COMMENT ON COLUMN schedules.employee_number IS 'Employee ID if this is an employee schedule';
COMMENT ON COLUMN schedules.admin_number IS 'Admin ID if this is an admin schedule';
COMMENT ON COLUMN schedules.user_type IS 'Type of user: employee or admin';
COMMENT ON COLUMN schedules.schedule_date IS 'The date of the scheduled shift';
COMMENT ON COLUMN schedules.shift_start IS 'Shift start time (e.g., 09:00:00)';
COMMENT ON COLUMN schedules.shift_end IS 'Shift end time (e.g., 17:00:00)';
COMMENT ON COLUMN schedules.grace_period IS 'Grace period in minutes for late check-in (default: 30)';
COMMENT ON COLUMN schedules.is_day_off IS 'True if this is a day-off schedule';
COMMENT ON COLUMN schedules.is_paid_leave IS 'True if this is a paid leave day (auto-created when leave is approved)';
```

### Step 3: Verify Table Creation

Run this query to verify the table was created successfully:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;
```

You should see all the columns listed above.

---

## ✅ What Happens After Setup

Once you create the table:

1. **New schedules** will be saved to BOTH:
   - ✅ KV Store (backwards compatibility)
   - ✅ Supabase `schedules` table (proper database storage)

2. **Reading schedules** will:
   - ✅ Try Supabase table first (primary source)
   - ✅ Fall back to KV store if needed

3. **Error handling**:
   - If the table doesn't exist yet, schedules will still save to KV store
   - You'll see a warning in the response: "Saved to KV store only"

---

## 🔍 Testing the Setup

### Test 1: Check if schedules are being saved

After creating the table, create a new schedule in the Admin or Super Admin portal. Then run this SQL:

```sql
SELECT * FROM schedules ORDER BY created_at DESC LIMIT 10;
```

You should see your newly created schedules!

### Test 2: Check schedule breakdown by type

```sql
SELECT 
  user_type,
  COUNT(*) as total_schedules,
  COUNT(CASE WHEN is_day_off THEN 1 END) as day_offs,
  COUNT(CASE WHEN is_paid_leave THEN 1 END) as paid_leaves,
  COUNT(CASE WHEN NOT is_day_off AND NOT is_paid_leave THEN 1 END) as active_shifts
FROM schedules
GROUP BY user_type;
```

---

## 🚨 Troubleshooting

### Problem: "relation schedules does not exist" error

**Solution**: The table hasn't been created yet. Follow Step 2 above.

### Problem: Schedules not appearing in the table

**Solution**: 
1. Check browser console for errors
2. Look at the server response - it should say `"source": "dual_storage"`
3. If it says `"source": "kv_store_only"`, the table might not exist or there's a permissions issue

### Problem: Old schedules missing

**Solution**: Old schedules are in the KV store. The system reads from both sources, so they should still be visible. To migrate old data to Supabase, you would need to manually copy them.

---

## 📊 Optional: Row Level Security (RLS)

For production use, you may want to enable RLS:

```sql
-- Enable RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (server operations)
CREATE POLICY "Service role has full access" ON schedules
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Optional: Allow authenticated users to read their own schedules
CREATE POLICY "Users can read their own schedules" ON schedules
  FOR SELECT
  TO authenticated
  USING (
    employee_number = auth.jwt() ->> 'employee_number' OR
    admin_number = auth.jwt() ->> 'admin_number'
  );
```

---

## ✨ Summary

- ✅ Run the SQL in Step 2 to create the `schedules` table
- ✅ The system will automatically start using dual storage
- ✅ Old data in KV store will still be accessible
- ✅ New data will be saved to both locations

**Questions?** Check the browser console and server logs for detailed error messages.
