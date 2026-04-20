# 🚀 QUICK FIX - 3 Minutes to Fix Schedules Table

## The Problem
Your schedules table is missing the `user_type` column (and possibly others). This breaks schedule saving.

## The Solution (3 Simple Steps)

---

## Step 1: Open Supabase SQL Editor (30 seconds)

1. Go to: **https://supabase.com/dashboard**
2. Click on your **Mnemosyne project**
3. Click **"SQL Editor"** in the left menu (looks like `</>`)
4. Click **"New query"** button

---

## Step 2: Copy & Paste the SQL (30 seconds)

**Option A: Copy from the file**
- Open the file: `fix_schedules_table.sql` (in your project root)
- Select all (Ctrl+A / Cmd+A)
- Copy (Ctrl+C / Cmd+C)

**Option B: Copy from below**
```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'employee_number') THEN ALTER TABLE schedules ADD COLUMN employee_number TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'admin_number') THEN ALTER TABLE schedules ADD COLUMN admin_number TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'user_type') THEN ALTER TABLE schedules ADD COLUMN user_type TEXT CHECK (user_type IN ('employee', 'admin')); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'shift_start') THEN ALTER TABLE schedules ADD COLUMN shift_start TIME; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'shift_end') THEN ALTER TABLE schedules ADD COLUMN shift_end TIME; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'grace_period') THEN ALTER TABLE schedules ADD COLUMN grace_period INTEGER DEFAULT 30; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'is_day_off') THEN ALTER TABLE schedules ADD COLUMN is_day_off BOOLEAN DEFAULT FALSE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'is_paid_leave') THEN ALTER TABLE schedules ADD COLUMN is_paid_leave BOOLEAN DEFAULT FALSE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'updated_at') THEN ALTER TABLE schedules ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'created_at') THEN ALTER TABLE schedules ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(); END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX IF NOT EXISTS idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX IF NOT EXISTS idx_schedules_schedule_date ON schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_user_type ON schedules(user_type);
```

Then:
- **Paste** into the SQL Editor (Ctrl+V / Cmd+V)

---

## Step 3: Run & Verify (30 seconds)

1. Click the **green "RUN"** button (or press F5)
2. Wait 2-3 seconds
3. You should see **"Success. No rows returned"** at the bottom
4. Go back to your **Mnemosyne app**
5. **Hard refresh** (Ctrl+Shift+R / Cmd+Shift+R)

---

## ✅ Done! 

The errors should be gone. Try creating a schedule to verify.

---

## 🆘 Still Having Issues?

### Error: "relation schedules does not exist"
Your table doesn't exist at all. Run this instead:

```sql
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
CREATE INDEX idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX idx_schedules_schedule_date ON schedules(schedule_date);
CREATE INDEX idx_schedules_user_type ON schedules(user_type);
```

### Error: "permission denied"
Make sure you're logged into Supabase with the account that owns this project.

### Still seeing errors in the app
1. Open browser console (F12)
2. Look for red error messages
3. Copy the error and ask for help

---

## 📚 Want More Details?
See `FIX_SCHEDULES_TABLE_GUIDE.md` for the full detailed guide.
