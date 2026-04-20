# 🏖️ How to Fix: Paid Leave Not Showing in My Schedule

## The Problem
You approved a leave request in the Admin panel, but when the employee checks their "My Schedule" tab, the paid leave days don't appear.

---

## ⚡ QUICK FIX (5 minutes)

### Step 1: Open Supabase
1. Go to your Supabase project dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**

### Step 2: Run the Fix
1. Open the file: `QUICK_FIX_PAID_LEAVE_SCHEDULE.sql`
2. **Copy the ENTIRE contents** (all 300+ lines)
3. **Paste into Supabase SQL Editor**
4. Click **"Run"** button (or press Ctrl/Cmd + Enter)

### Step 3: Verify Success
You should see output like:
```
✅ Column is_paid_leave added successfully
✅ Fixed 15 schedule entries for existing approved leaves
✅ PAID LEAVE SCHEDULE FIX COMPLETE!
```

### Step 4: Test It
1. Go to **Employee Portal**
2. Log in as an employee who has approved leave
3. Click **"My Schedule"** tab
4. You should now see:
   - ✅ Purple "🏖️ PAID LEAVE" badges
   - ✅ Paid Leave summary card showing count
   - ✅ List of paid leave dates in purple cards

---

## 🎯 What This Fix Does

The SQL script does 4 things:

### 1️⃣ Adds Missing Column
Adds `is_paid_leave` column to the `schedules` table if it doesn't exist.

### 2️⃣ Creates Approval Function
Creates a database function `approve_leave_request()` that:
- Updates leave status to "approved"
- Deducts days from employee leave balance
- Creates attendance records (PAID_LEAVE or ABSENT)
- **Creates schedule entries with `is_paid_leave = true`** ← Key!

### 3️⃣ Creates Rejection Function  
Creates `reject_leave_request()` for proper leave rejection handling.

### 4️⃣ Fixes Old Approvals
Updates all previously approved leaves to have proper schedule entries with the `is_paid_leave` flag.

---

## 🔍 How to Verify It's Working

### Check the Database:
```sql
-- See if paid leave schedules exist
SELECT 
  employee_number,
  schedule_date,
  is_paid_leave,
  shift_start,
  shift_end
FROM schedules
WHERE is_paid_leave = true
ORDER BY schedule_date DESC;
```

**Expected:** Should show rows where `is_paid_leave = true`

### Check the Frontend:
1. Go to Employee Portal → My Schedule
2. Click **"🐛 Debug"** button (top right)
3. Look at the debug panel:
   - **Paid Leave: X** (should be > 0)
   - **Paid Leave Dates:** (should list dates)

### Check Browser Console:
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Look for:
   ```
   📊 SCHEDULE SUMMARY:
      - Total entries: 14
      - 🏖️ Paid Leave days: 3  ← Should be > 0 if you have approved leaves
   ```

---

## ✅ What You Should See (After Fix)

### In "My Schedule" Tab:

#### 1. Summary Cards (Top)
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Work Days   │ Paid Leave  │ Days Off    │ Total Days  │
│     8       │     3       │     3       │     14      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

#### 2. Paid Leave Detail Card (Purple Section)
```
🏖️ Approved Paid Leave Days

You have 3 paid leave days scheduled. Each day counts as 8 hours of paid time off.

┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  20         │ │  21         │ │  22         │
│ Apr 20, 2026│ │ Apr 21, 2026│ │ Apr 22, 2026│
│ Monday      │ │ Tuesday     │ │ Wednesday   │
│ 8 hours paid│ │ 8 hours paid│ │ 8 hours paid│
└─────────────┘ └─────────────┘ └─────────────┘
```

#### 3. Schedule Table
```
Date          | Day      | Shift Schedule        | Status
--------------|----------|----------------------|------------------
Apr 20, 2026  | Monday   | Paid Leave (8 hours) | 🏖️ PAID LEAVE
Apr 21, 2026  | Tuesday  | Paid Leave (8 hours) | 🏖️ PAID LEAVE
Apr 22, 2026  | Wednesday| Paid Leave (8 hours) | 🏖️ PAID LEAVE
```

---

## 🐛 Troubleshooting

### Issue: Still not showing paid leave

**Solution 1: Clear browser cache**
1. Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard refresh
2. Log out and log back in

**Solution 2: Check if column exists**
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'schedules' 
AND column_name = 'is_paid_leave';
```
Should return 1 row. If not, the column is missing.

**Solution 3: Manually create schedule**
```sql
-- Replace with actual employee number and dates
INSERT INTO schedules (
  employee_number, schedule_date, 
  shift_start, shift_end, is_day_off, is_paid_leave
) VALUES (
  'EMP001', '2026-04-20',
  '08:00', '16:00', false, true
);
```

**Solution 4: Re-approve the leave**
1. Go to Admin Panel → Leave Management
2. Find the approved leave
3. Reject it first
4. Have the employee request it again
5. Approve it again (this will trigger the new function)

---

## 📋 Files Reference

| File | Purpose |
|------|---------|
| `QUICK_FIX_PAID_LEAVE_SCHEDULE.sql` | **Run this one** - Complete fix in one file |
| `CREATE_LEAVE_APPROVAL_FUNCTION.sql` | Detailed version of the stored procedure |
| `VERIFY_SCHEDULES_TABLE.sql` | Check table structure only |
| `FIX_PAID_LEAVE_SCHEDULE_DISPLAY.md` | Detailed explanation guide |

---

## 🎉 Success Criteria

You know it's fixed when:
- [x] Employee sees purple "Paid Leave" summary card
- [x] Count shows correct number of paid leave days
- [x] Purple 🏖️ badges appear in schedule table
- [x] Each leave day shows "Paid Leave (8 hours)"
- [x] No errors in browser console
- [x] Debug mode shows "Paid Leave: X" where X > 0

---

## 🆘 Still Need Help?

1. **Check the browser console** (F12 → Console tab)
   - Look for red errors
   - Look for the schedule fetch logs

2. **Enable debug mode**
   - Click "🐛 Debug" button in My Schedule tab
   - Review the debug information panel

3. **Verify the data exists**
   ```sql
   -- Check approved leaves
   SELECT * FROM leave_requests WHERE status = 'approved';
   
   -- Check schedules created
   SELECT * FROM schedules WHERE is_paid_leave = true;
   
   -- Check attendance records
   SELECT * FROM attendance_records WHERE status = 'PAID_LEAVE';
   ```

4. **Check function exists**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'approve_leave_request';
   ```

If the function doesn't exist, the SQL didn't run properly. Try again.

---

## ⚠️ Important Notes

- The fix is **backward compatible** - it updates old approved leaves too
- The fix runs **automatically** for all future leave approvals
- Each paid leave day = **8 hours** of paid time
- Unpaid days (when balance is exhausted) show as "ABSENT" instead
- The `is_paid_leave` flag is the **critical** piece that makes it work

---

**That's it! Your paid leave should now display properly in the My Schedule tab.** 🎉
