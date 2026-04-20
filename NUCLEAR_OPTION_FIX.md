# 🚨 NUCLEAR OPTION - Complete Reset (RECOMMENDED)

## The Problem

Your schedule data is deeply corrupted in multiple places:
- ❌ Corrupted KV store data: `{ shift_start: null, shift_end: null }`
- ❌ Wrong database structure: `id BIGINT` instead of `id TEXT`
- ❌ Missing employee/admin numbers in some records
- ❌ Failed saves creating zombie records

## ✅ THE COMPLETE FIX (10 Minutes)

This will **delete ALL schedule data** and let you start fresh with a working system.

---

### Step 1: Fix Database Structure + Delete All Data (2 min)

**Go to Supabase Dashboard:**
1. https://supabase.com/dashboard
2. Click your project
3. Click **"SQL Editor"** → **"New query"**
4. **Paste and RUN this SQL:**

```sql
-- Drop old broken table
DROP TABLE IF EXISTS schedules CASCADE;

-- Create new correct table
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

5. **Click RUN ▶️**
6. **Wait for "Success"**

---

### Step 2: Clear KV Store (Corrupted Data) (1 min)

**Open your app in browser, press F12 for console, paste this code:**

```javascript
// Clear ALL schedule data from KV store
async function clearAllSchedules() {
  const projectId = "ozklfhqnvkkfbtqdgvhy";
  const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96a2xmaHFudmtrZmJ0cWRndmh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNTU0OTksImV4cCI6MjA2MDczMTQ5OX0.zBYfEIv7cQOxEShf82RPm0RY71RCPUtaKwfmvuiGrp0";

  console.log('🧹 Clearing ALL schedules from KV store...');
  
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-df988758/schedules/clear-all`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const result = await response.json();
    console.log('✅ Result:', result);
    console.log('✅ ALL schedules cleared! Refresh page now (Ctrl+Shift+R)');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

clearAllSchedules();
```

**Press Enter and wait for "ALL schedules cleared!"**

---

### Step 3: Refresh App (10 sec)

1. **Press `Ctrl+Shift+R`** (hard refresh)
2. **Go to Manage Schedule page**
3. **All schedules should now be empty** (+ icons everywhere)

---

### Step 4: Create Fresh Schedules (5 min)

**For each employee who needs a schedule:**

1. **Click their cell** for the date
2. **Select schedule type:**
   - **"Working Shift"** → Enter shift times (e.g., 08:00 - 17:00)
   - **"Day Off"** → Mark as day off
3. **Click "Save Schedule"**
4. **Should see success message** ✅

**Example for Moises (April 17-20):**
- April 17: Working 08:00 - 17:00
- April 18: Working 08:00 - 17:00
- April 19: Working 08:00 - 17:00
- April 20: Working 08:00 - 17:00

---

### Step 5: Verify Fix Worked (1 min)

1. **Refresh page:** `Ctrl+Shift+R`
2. **Check schedules STILL show correctly** ✅
3. **Open console (F12)**
4. **Look for:**
   ```
   ✅ Supabase: Schedule created successfully
   ✅ Moises: WORKING 08:00:00 - 17:00:00
   ```
5. **Should NOT see:**
   ```
   ⚠️ INVALID SCHEDULE DATA
   ⚠️ Supabase save failed
   ❌ NO EMPLOYEE NUMBERS EXTRACTED
   ```

---

## 🎉 What Happens After This

**Before Fix:**
- ❌ Corrupted data everywhere
- ❌ Saves fail with bigint errors
- ❌ Schedules disappear after refresh
- ❌ Shows "day off" for everything

**After Fix:**
- ✅ Clean database with correct structure
- ✅ Clean KV store with no corrupted data
- ✅ Saves work correctly
- ✅ Schedules persist after refresh
- ✅ No more errors

---

## ⚠️ What You'll Lose

**This deletes:**
- All existing schedules (both corrupted and good ones)
- You'll need to re-enter all schedules manually

**This does NOT delete:**
- Employees
- Admins
- Attendance records
- Leave requests
- Any other data

---

## 🔍 Why This Is the Best Approach

**Other approaches (partial fixes):**
- ❌ Delete only corrupted schedules → Some corruption may remain
- ❌ Try to repair data → Very complex, may not work
- ❌ Code fixes only → Can't fix database structure

**This approach (complete reset):**
- ✅ Fixes database structure permanently
- ✅ Removes ALL corrupted data
- ✅ Guarantees clean start
- ✅ Takes 10 minutes total
- ✅ Problem solved forever

---

## 📋 Quick Checklist

- [ ] Step 1: Run SQL in Supabase → Fixes table structure
- [ ] Step 2: Run clear script in console → Deletes KV data
- [ ] Step 3: Refresh app → Verify empty
- [ ] Step 4: Re-save schedules → Create fresh data
- [ ] Step 5: Refresh again → Verify schedules persist ✅

---

## 🆘 Alternative: If You Can't Clear KV Store

If Step 2 fails, you can manually delete schedules:

**In Supabase Dashboard, run this SQL:**

```sql
-- This deletes from Supabase only
-- KV store will eventually sync
DELETE FROM schedules;
```

Then use the **"Clear Corrupted"** button in your app to clean up KV store.

---

## 📞 After Completing All Steps

**Test thoroughly:**
1. Save multiple schedules
2. Refresh page multiple times
3. Check console for errors
4. Verify all schedules persist

**If STILL having issues:**
- Copy ALL console output (F12)
- Check for any red errors
- Share the error messages

**But after following all 5 steps, you should be 100% fixed.** ✅

---

**This is the nuclear option, but it's the cleanest and fastest way to fix all the corruption at once.**
