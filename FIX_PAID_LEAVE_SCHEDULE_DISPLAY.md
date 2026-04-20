# 🏖️ Fix Paid Leave Display in My Schedule Tab

## Problem
Approved paid leave is not showing up in the employee's "My Schedule" tab even though the leave was approved.

## Root Cause
The `approve_leave_request` stored procedure in Supabase is either:
1. Missing completely
2. Not creating schedule entries with `is_paid_leave = true` flag
3. The `schedules` table is missing the `is_paid_leave` column

## Solution

Follow these steps **IN ORDER**:

---

## ✅ STEP 1: Verify Schedules Table Structure

Run this SQL in Supabase SQL Editor:

```sql
-- Check if is_paid_leave column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'schedules'
AND column_name = 'is_paid_leave';
```

**If the query returns NO ROWS**, run the SQL file:
```sql
-- Copy and paste the entire contents of VERIFY_SCHEDULES_TABLE.sql
```

Or run this quick fix:
```sql
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS is_paid_leave BOOLEAN NOT NULL DEFAULT false;
```

---

## ✅ STEP 2: Create Leave Approval Stored Procedure

Run this SQL in Supabase SQL Editor:

```sql
-- Copy and paste the entire contents of CREATE_LEAVE_APPROVAL_FUNCTION.sql
```

This will create the `approve_leave_request()` function that:
- ✅ Updates leave status to 'approved'
- ✅ Deducts days from leave balance
- ✅ Creates attendance records with PAID_LEAVE status
- ✅ **Creates schedule entries with is_paid_leave = true** ← THIS IS THE KEY!
- ✅ Logs balance changes

---

## ✅ STEP 3: Verify Function Creation

Run this verification query:

```sql
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'approve_leave_request';
```

**Expected Result:**
```
function_name         | arguments
----------------------|--------------------------------
approve_leave_request | p_leave_request_id uuid, p_approved_by text
```

---

## ✅ STEP 4: Test the Fix

1. **Go to Admin Panel** → Leave Management
2. **Approve a pending leave request**
3. **Wait 5 seconds** for the database to process
4. **Go to Employee Portal** (for that employee)
5. **Click "My Schedule" tab**

### Expected Results:

#### ✅ Summary Cards Should Show:
```
Work Days: [number]    Paid Leave: [number]    Days Off: [number]    Total: 14
```

#### ✅ Paid Leave Section Should Appear:
A purple gradient card showing:
- "Approved Paid Leave Days"
- List of leave dates with:
  - Day number in purple circle
  - Full date (e.g., "Apr 20, 2026")
  - Day name (e.g., "Monday")
  - "8 hours paid" label

#### ✅ Schedule Table Should Show:
Each paid leave day should have:
- **Shift Schedule**: "Paid Leave (8 hours)" (in purple)
- **Status**: Purple badge with "🏖️ PAID LEAVE"

---

## 🔍 Debugging

If paid leave still doesn't show up:

### Debug Step 1: Check Raw Data

```sql
-- Check if schedules were created with is_paid_leave flag
SELECT 
  employee_number,
  schedule_date,
  is_paid_leave,
  is_day_off,
  shift_start,
  shift_end
FROM schedules
WHERE is_paid_leave = true
ORDER BY schedule_date DESC
LIMIT 10;
```

**Expected:** Should show rows with `is_paid_leave = true`

### Debug Step 2: Check Attendance Records

```sql
-- Check if attendance records were created
SELECT 
  employee_number,
  date,
  status,
  type,
  hours_worked,
  leave_request_id
FROM attendance_records
WHERE status = 'PAID_LEAVE'
ORDER BY date DESC
LIMIT 10;
```

**Expected:** Should show rows with `status = 'PAID_LEAVE'` and `hours_worked = 8`

### Debug Step 3: Enable Frontend Debug Mode

1. Go to **Employee Portal** → My Schedule
2. Click the **"🐛 Debug"** button in the top right
3. Look at the debug panel for:
   - **Total Schedules**: Should be > 0
   - **Paid Leave**: Should match approved days
   - **Paid Leave Dates**: Should list all dates with `is_paid_leave=true`

4. Open **Browser Console** (F12) and look for:
   ```
   📊 SCHEDULE SUMMARY:
      - Total entries: 14
      - 🏖️ Paid Leave days: 3  ← Should be > 0
      - 📅 Day Off: X
      - 💼 Work days: X
   ```

---

## 🔧 Manual Fix for Existing Approved Leaves

If you already approved leaves BEFORE running the SQL fix, those old approvals won't have schedules. Run this to fix them:

```sql
-- Recreate schedules for ALL approved leaves
DO $$
DECLARE
  v_leave RECORD;
  v_current_date DATE;
BEGIN
  -- Loop through all approved leaves
  FOR v_leave IN 
    SELECT id, employee_number, start_date, end_date, paid_days
    FROM leave_requests
    WHERE status = 'approved'
  LOOP
    v_current_date := v_leave.start_date;
    
    -- Create schedule for each day
    WHILE v_current_date <= v_leave.end_date LOOP
      INSERT INTO schedules (
        employee_number,
        schedule_date,
        shift_start,
        shift_end,
        is_day_off,
        is_paid_leave,
        created_at,
        updated_at
      ) VALUES (
        v_leave.employee_number,
        v_current_date,
        '08:00'::TIME,
        '16:00'::TIME,
        false,
        true, -- THIS IS THE KEY FLAG
        NOW(),
        NOW()
      )
      ON CONFLICT (employee_number, schedule_date) 
      DO UPDATE SET
        is_paid_leave = true,
        updated_at = NOW();
      
      v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
    
    RAISE NOTICE 'Created schedules for leave request: %', v_leave.id;
  END LOOP;
  
  RAISE NOTICE '✅ All approved leave schedules have been created/updated!';
END $$;
```

---

## 📋 Verification Checklist

- [ ] `is_paid_leave` column exists in `schedules` table
- [ ] `approve_leave_request()` function exists in database
- [ ] Function creates schedules with `is_paid_leave = true`
- [ ] Approved leaves show up in employee "My Schedule" tab
- [ ] Purple "🏖️ PAID LEAVE" badges appear in schedule table
- [ ] Summary cards show correct paid leave count
- [ ] Paid leave detail section appears with date cards

---

## 🎯 Summary

The fix involves:

1. **Database Side**: 
   - Add `is_paid_leave` column to `schedules` table
   - Create `approve_leave_request()` stored procedure
   - Procedure sets `is_paid_leave = true` when creating schedules

2. **Frontend Side**: 
   - Already implemented ✅
   - Detects `is_paid_leave = true` flag
   - Displays purple cards, badges, and summary
   - Shows paid leave in dedicated section

Once the database is fixed, the frontend will automatically display the paid leave schedules!

---

## 🆘 Still Having Issues?

1. Check browser console (F12) for error messages
2. Enable debug mode in My Schedule tab
3. Verify Supabase connection in frontend
4. Check if leave request status is actually "approved"
5. Ensure employee number matches between tables

If all else fails, run the "Manual Fix for Existing Approved Leaves" SQL above to force-create the schedules.
