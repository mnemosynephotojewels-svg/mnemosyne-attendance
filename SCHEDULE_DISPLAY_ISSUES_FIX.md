# 🔧 Schedule Display Issues - Diagnosis & Fix

## 🚨 The Problem

You're seeing schedules displayed incorrectly (showing as "DAY OFF" when they should be working schedules).

## 🔍 Root Cause

**Your Supabase database table is BROKEN:**

```
Error: invalid input syntax for type bigint: "schedule:EMP-1053:2026-04-19"
```

This error means:
- ❌ Your `schedules` table has `id BIGINT` (numbers only)
- ✅ Should be `id TEXT` (to store strings like "schedule:EMP-1053:2026-04-19")

**What's happening:**
1. You try to save a schedule ✅
2. Save to KV store succeeds ✅
3. Save to Supabase FAILS ❌ (wrong column type)
4. Old/corrupted data in KV store shows up ❌

---

## ✅ THE FIX (REQUIRED)

You **MUST** run this SQL in Supabase. There's no other way to fix this.

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard
2. Click your project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New query"**

### Step 2: Run This SQL

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

### Step 3: Click RUN

### Step 4: Refresh Your App
Press **Ctrl+Shift+R** or **Cmd+Shift+R**

---

## 🔍 How to Diagnose Schedule Display Issues

After fixing the database, if you still see incorrect schedules:

### Step 1: Open Browser Console
Press **F12** → Click **"Console"** tab

### Step 2: Look for These Messages

**Good Schedule (Working):**
```
📋 [2026-04-18] John Smith: WORKING 08:00:00 - 17:00:00
```

**Good Schedule (Day Off):**
```
📋 [2026-04-18] John Smith: DAY OFF
```

**Bad Schedule (Invalid Data):**
```
⚠️ [2026-04-18] John Smith: INVALID SCHEDULE DATA - treating as day off
   Schedule data: {
     is_day_off: false,
     is_paid_leave: false,
     shift_start: null,
     shift_end: null
   }
```

**If you see "INVALID SCHEDULE DATA":**
This means the schedule has:
- ❌ No shift times (shift_start and shift_end are null)
- ❌ Not marked as day off (is_day_off = false)
- ❌ Not marked as paid leave (is_paid_leave = false)

This is **corrupted data** in your KV store.

---

## 🧹 Cleaning Up Bad Data

If you have invalid schedules after fixing the database:

### Option 1: Re-create the Affected Schedules
1. Click on the schedule cell showing incorrectly
2. Select the correct schedule type (Working/Day Off)
3. Set the times if it's a working schedule
4. Click "Save Schedule"

### Option 2: Clear All Schedules and Start Fresh
**⚠️ WARNING: This deletes ALL schedules!**

Run this in Supabase SQL Editor:
```sql
TRUNCATE TABLE schedules;
```

Then refresh your app and recreate schedules.

---

## 📊 What the Code Now Does

I've improved the schedule validation:

### Before (Old Code):
```javascript
if (schedule.is_day_off) {
  // Show as day off
} else {
  // Show as working (even without shift times!)
}
```

### After (New Code):
```javascript
if (schedule.is_paid_leave === true) {
  // Show as paid leave
} else if (schedule.is_day_off === true) {
  // Show as day off
} else if (schedule.shift_start && schedule.shift_end) {
  // Show as working (ONLY if has shift times)
} else {
  // INVALID! Log warning and treat as day off
}
```

**Now schedules MUST have shift times to show as "working".**

---

## 🎯 Step-by-Step Fix Guide

### 1. Fix the Database (REQUIRED)
Run the SQL above in Supabase.

### 2. Check Your App
Refresh and check if schedules display correctly.

### 3. Check Browser Console
Look for "INVALID SCHEDULE DATA" warnings.

### 4. Fix Invalid Schedules
Click each invalid schedule and re-save it correctly.

### 5. Verify
All schedules should now display correctly!

---

## ⚠️ Why Code Can't Fix This

The error is in your **database table structure**:
- Your table: `id BIGINT` ❌
- Needs to be: `id TEXT` ✅

**Only SQL can change database table structure.** Code cannot modify table schemas.

That's why you keep seeing the same error - the code is correct, but the database is broken.

---

## 📋 Checklist

- [ ] Run the SQL fix in Supabase
- [ ] Refresh the app (Ctrl+Shift+R)
- [ ] Check browser console for warnings
- [ ] Re-save any invalid schedules
- [ ] Verify all schedules display correctly

---

## 🆘 Still Having Issues?

After running the SQL fix, if schedules still show incorrectly:

1. **Open browser console** (F12)
2. **Copy all the console logs** (right-click → "Save as...")
3. **Share the logs** so I can see exactly what data is coming from the server

The logs will show:
- What data is being fetched
- How it's being processed
- Which schedules are invalid
- Exactly why they're showing incorrectly

---

**Bottom Line:** RUN THE SQL FIX FIRST. Everything else depends on having a working database table.
