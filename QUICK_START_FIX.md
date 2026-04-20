# ⚡ QUICK FIX - 3 Steps (5 Minutes)

## What's Wrong

**Schedules always save as "day off" because:**
1. ❌ Backend wasn't sending shift times (FIXED NOW ✅)
2. ❌ Database table wrong structure (YOU MUST FIX ⚠️)

---

## Step 1: Open Supabase (1 min)

🌐 **Go to:** https://supabase.com/dashboard

📁 **Click:** Your project

💾 **Click:** "SQL Editor" (left sidebar)

➕ **Click:** "New query" button

---

## Step 2: Copy & Run SQL (2 min)

**Copy this SQL:**

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

**Paste into SQL Editor**

**Click RUN ▶️**

---

## Step 3: Test in App (2 min)

1. **Refresh app:** `Ctrl+Shift+R` or `Cmd+Shift+R`

2. **Go to:** Manage Schedule page

3. **Save a working schedule:**
   - Click any employee's cell
   - Select "Working Shift"
   - Set times: 08:00 - 17:00
   - Click "Save Schedule"

4. **Verify it works:**
   - Cell shows "08:00 - 17:00" (blue) ✅
   - NOT "OFF" (gray) ❌

5. **Check console (F12):**
   - Should see: `✅ Supabase: Schedule created successfully`
   - Should NOT see: `invalid input syntax for type bigint`

---

## ✅ Done!

**Schedules will now save correctly as working shifts!**

If you still see "day off" after this, open console (F12) and share the error messages.

---

## What Files to Look At

- `COMPLETE_FIX_INSTRUCTIONS.md` - Detailed explanation
- `FIX_DATABASE_NOW.sql` - Just the SQL (same as above)
- `HOW_TO_FIX_ERRORS.md` - Troubleshooting guide
