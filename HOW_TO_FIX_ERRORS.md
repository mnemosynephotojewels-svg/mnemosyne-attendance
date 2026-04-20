# 🚨 HOW TO FIX THE SCHEDULE ERRORS

## ❌ The Errors You're Seeing

```
invalid input syntax for type bigint: "schedule:EMP-1053:2026-04-19"
⚠️ [2026-04-17] Moises: INVALID SCHEDULE DATA - treating as day off
```

## 🔍 What This Means

**Your database table is broken:**
- Table has: `id BIGINT` ❌ (numbers only)
- Code needs: `id TEXT` ✅ (to store "schedule:EMP-1053:2026-04-19")

**What's happening:**
1. You save a schedule ✅
2. KV store saves it ✅ (but with incomplete data)
3. Supabase REJECTS it ❌ (wrong column type)
4. Schedules show as "day off" with null shift times ❌

## ✅ THE FIX (3 Steps)

### Step 1: Open Supabase SQL Editor

1. Go to: **https://supabase.com/dashboard**
2. Click your project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New query"**

### Step 2: Run This SQL

Copy the contents of **`FIX_DATABASE_NOW.sql`** and paste into the SQL Editor, then click **RUN**.

Or copy this:

```sql
DROP TABLE IF EXISTS schedules CASCADE;

CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  employee_number TEXT,
  admin_number TEXT,
  user_type TEXT,
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
```

### Step 3: Refresh and Re-save

1. **Refresh your app** - Press `Ctrl+Shift+R` or `Cmd+Shift+R`
2. **Re-save the broken schedules:**
   - Go to Manage Schedule
   - Click on Moises, Trina, and Aiza's schedules for April 17-20
   - Set the correct shift times
   - Click "Save Schedule"
3. **Verify** - Click "Check Schedules" button and open console (F12)
   - Should see: `✅ Moises: WORKING 08:00:00 - 17:00:00`
   - Should NOT see: `⚠️ INVALID SCHEDULE DATA`

## 🚫 Why Code Can't Fix This

**Database table structure can ONLY be changed with SQL.**

- ❌ Code cannot change `BIGINT` to `TEXT`
- ❌ Editing `.funcignore` or `.deployignore` won't help
- ✅ Only SQL in Supabase dashboard can fix it

## 📊 After Running SQL

**The errors will stop:**
- ✅ No more "invalid input syntax for type bigint"
- ✅ No more "INVALID SCHEDULE DATA"
- ✅ Schedules save to both KV store AND Supabase
- ✅ Shift times display correctly

## ⚠️ CRITICAL

**You MUST run the SQL.** There is no other way to fix this error.

The files you edited (`.funcignore`, `.deployignore`) are not related to this problem. The problem is the database table structure.

---

**Bottom line:** Open Supabase → SQL Editor → Run the SQL → Refresh app → Re-save schedules → Done ✅
