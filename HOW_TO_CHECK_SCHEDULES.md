# ✅ How to Check If Schedules Are Displaying Correctly

## 🎯 Quick Check (30 seconds)

### Step 1: Click the "Check Schedules" Button
1. Go to **Manage Schedule** page
2. Look at the top right corner
3. Click the gray **"Check Schedules"** button
4. Open browser console (**F12** → **Console** tab)

### Step 2: Read the Diagnostic Report

You'll see a report like this:

```
🔍 SCHEDULE DIAGNOSTIC REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Admin: Super Admin
Is Super Admin: true
Department: Management
Total Employees Shown: 45
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 2026-04-18: 12 schedules
  ✅ John Smith: WORKING 08:00:00 - 17:00:00
  ✅ Jane Doe: WORKING 09:00:00 - 18:00:00
  🚫 Bob Johnson: DAY OFF
  🏖️  Alice Wilson: PAID LEAVE
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 TOTALS:
  Total schedules: 45
  Working: 30
  Day off: 10
  Paid leave: 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔍 What to Look For

### ✅ Good Signs

**Working Schedule:**
```
✅ John Smith: WORKING 08:00:00 - 17:00:00
```
- Has shift times
- Shows in grid as blue cell with clock icon
- Correct!

**Day Off:**
```
🚫 Jane Doe: DAY OFF
```
- No shift times
- Shows in grid as gray cell with "OFF"
- Correct!

**Paid Leave:**
```
🏖️  Bob Johnson: PAID LEAVE
```
- Shows in grid as yellow gradient cell
- Correct!

### ❌ Bad Signs

**Invalid/Unknown Type:**
```
⚠️  Alice Wilson: UNKNOWN TYPE - {type: undefined, start: null}
```
- This is **BROKEN DATA**
- Needs to be re-saved

**Mismatched Display:**
- Console says: "WORKING 08:00 - 17:00"
- Grid shows: Gray "OFF" cell
- **Problem!** Data not loading correctly

---

## 🔧 Common Issues & Fixes

### Issue 1: Schedule Shows as "DAY OFF" But Should Be Working

**Symptoms:**
- You saved a working schedule (08:00 - 17:00)
- Grid shows gray "OFF" cell
- Console shows: "DAY OFF" or "INVALID SCHEDULE DATA"

**Cause:**
Database not saving properly (shift times are NULL)

**Fix:**
1. Run the SQL fix in Supabase (see below)
2. Re-save the schedule

### Issue 2: No Schedules Showing At All

**Symptoms:**
- Grid is all empty (+ icons)
- Console shows: "Total schedules: 0"

**Cause:**
- Schedules not being fetched
- Or wrong employee numbers

**Fix:**
1. Check browser console for errors
2. Make sure you're logged in correctly
3. Check if database table exists

### Issue 3: Some Schedules Missing

**Symptoms:**
- Console shows: "Total schedules: 45"
- But grid only shows 20

**Cause:**
- Department filter active (super admin)
- Or employee not in current team

**Fix:**
1. Click "All Departments" filter
2. Check if employee is in correct department

---

## 🚨 The SQL Fix (If Database Not Working)

**You'll see this error:**
```
⚠️  Supabase save failed: invalid input syntax for type bigint
```

**What it means:**
Your database table is broken. Schedules are only in KV store (temporary).

**The Fix:**

1. **Open Supabase:**
   - https://supabase.com/dashboard
   - Your project → SQL Editor → New query

2. **Run this SQL:**
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

3. **Click RUN**

4. **Refresh your app** (Ctrl+Shift+R)

---

## 📊 Understanding the Console Logs

When you load the page, you'll see:

### 1. Server Response
```
📥 SCHEDULE DATA RECEIVED FROM SERVER
Total schedules: 45
First 3 schedules (sample):
  1. { date: "2026-04-18", emp: "EMP-1053", shift_start: "08:00:00", ... }
```

**What to check:**
- ✅ `shift_start` and `shift_end` should have values
- ✅ `is_day_off` should be `true` or `false` (not undefined)
- ❌ If `shift_start: null` for working schedule = **PROBLEM**

### 2. Schedule Processing
```
📋 [2026-04-18] John Smith: WORKING 08:00:00 - 17:00:00
📋 [2026-04-18] Jane Doe: DAY OFF
⚠️ [2026-04-18] Bob: INVALID SCHEDULE DATA - treating as day off
```

**What to check:**
- ✅ Green checkmark messages = Good
- ⚠️  Warning messages = **BROKEN DATA** - re-save these

### 3. Summary
```
📊 SCHEDULE SUMMARY
Total schedules loaded: 45
  ✅ Working schedules: 30
  🚫 Day off schedules: 10
  🏖️  Paid leave schedules: 5
  ⚠️  Invalid schedules: 0
```

**What to check:**
- ❌ If "Invalid schedules" > 0 = **PROBLEM**
- ✅ If "Invalid schedules" = 0 = All good!

---

## 🎯 Step-by-Step Verification

### Step 1: Run Diagnostic
Click "Check Schedules" button → Open console (F12)

### Step 2: Check Totals
Look at the summary. Should match what you see in grid.

### Step 3: Find Problems
Look for any ⚠️ warning messages

### Step 4: Fix Problems
- If "invalid input syntax for type bigint" → Run SQL fix
- If "INVALID SCHEDULE DATA" → Re-save those schedules
- If schedules missing → Check department filter

### Step 5: Verify Again
Click "Check Schedules" again → Should be all ✅ green

---

## ✅ Checklist

- [ ] Clicked "Check Schedules" button
- [ ] Opened browser console (F12)
- [ ] Read the diagnostic report
- [ ] Checked for ⚠️ warnings
- [ ] Fixed any database errors (ran SQL)
- [ ] Re-saved any invalid schedules
- [ ] Verified all schedules display correctly

---

## 🆘 Still Having Issues?

If schedules still display incorrectly after following this guide:

1. **Click "Check Schedules"**
2. **Copy the entire console output**
3. **Share it** - The logs will show exactly what's wrong

The diagnostic report contains all the information needed to identify the problem!

---

**Bottom Line:** Use the "Check Schedules" button! It will tell you exactly what's wrong.
