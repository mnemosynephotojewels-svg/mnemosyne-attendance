# 🧪 Leave Schedule Display Testing Guide

## Overview
This guide will help you verify that approved leave requests properly display in the employee's "My Schedule" tab.

---

## 🎯 What Should Happen

When an admin approves an employee's leave request:

1. ✅ **Schedule entries** are created in the `schedules` table with `is_paid_leave: true`
2. ✅ **Attendance records** are created in the `attendance_records` table with `status: 'PAID_LEAVE'`
3. ✅ **Employee's schedule** shows "PAID LEAVE" badges for approved days
4. ✅ **Leave balance** is deducted from the employee's account
5. ✅ **Notification** is sent to the employee

---

## 📋 Step-by-Step Testing

### **STEP 1: Approve a Leave Request (Admin Side)**

1. **Open your browser console** (Press F12, go to "Console" tab)
2. **Log in as an Admin**
3. Navigate to **"Leave Requests"** page
4. Find a **pending leave request** from an employee
5. Click **"Approve"** on the request

**Expected Console Output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 CREATING ATTENDANCE RECORDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ 2026-04-20: PAID_LEAVE (employee_number: EMP001)
   ✅ 2026-04-21: PAID_LEAVE (employee_number: EMP001)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Creating schedule entries for approved leave days...
   📅 2026-04-20: PAID_LEAVE schedule entry
   📅 2026-04-21: PAID_LEAVE schedule entry
💾 Upserting 2 schedule entries...
   ✅ Created schedule for 2026-04-20 (is_paid_leave: true)
   ✅ Created schedule for 2026-04-21 (is_paid_leave: true)
✅ Schedule entries processing complete
🔍 Verifying schedules were saved to database...
✅ Verified 2 schedules in database:
   - 2026-04-20: is_paid_leave=true, is_day_off=false
   - 2026-04-21: is_paid_leave=true, is_day_off=false
🎉 SUCCESS: 2 PAID LEAVE schedule(s) confirmed in database!
✅ LEAVE APPROVAL COMPLETE
```

**✅ PASS Criteria:**
- You see "📅 Creating schedule entries"
- You see "✅ Created schedule for..." for each day
- You see "🎉 SUCCESS: X PAID LEAVE schedule(s) confirmed"

**❌ FAIL Indicators:**
- You see "❌ Failed to insert schedule"
- You see "⚠️ WARNING: No paid leave schedules found in database"
- You don't see schedule creation logs at all

---

### **STEP 2: Check Employee Schedule**

1. **Log out from admin account**
2. **Log in as the employee** whose leave was approved
3. **Open browser console** (F12 → Console)
4. Navigate to **"My Schedule"** tab
5. Click the **"Refresh Schedule"** button

**Expected Console Output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 FETCHING EMPLOYEE SCHEDULE & ATTENDANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Employee Number: EMP001
🌐 Fetching schedules from: https://...
🌐 Fetching attendance from: https://...
✅ Schedule fetched: 15 entries
📋 Detailed schedule data:
   - 2026-04-20: is_paid_leave=true, is_day_off=false, shift=null-null
   - 2026-04-21: is_paid_leave=true, is_day_off=false, shift=null-null
   - 2026-04-22: is_paid_leave=false, is_day_off=false, shift=08:00-17:00
📊 SCHEDULE SUMMARY:
   - Total entries: 15
   - 🏖️ Paid Leave days: 2  ← THIS SHOULD NOT BE 0!
   - 📅 Day Off: 4
   - 💼 Work days: 9
✅ Attendance fetched: 2 records
📋 Attendance records (with approved leaves):
   - 2026-04-20: status=PAID_LEAVE, type=PAID_LEAVE, leave_request_id=abc123
   - 2026-04-21: status=PAID_LEAVE, type=PAID_LEAVE, leave_request_id=abc123
```

**Expected UI:**

You should see:
- **Purple alert banner** at the top saying "X Paid Leave Days Approved"
- **Schedule table** showing rows with:
  - **Shift Schedule:** "Paid Leave (8 hours)" in purple text
  - **Status:** Purple badge saying "🏖️ PAID LEAVE"

**✅ PASS Criteria:**
- Console shows `Paid Leave days: 2` (or however many days were approved)
- Purple "Paid Leave Days Approved" banner appears
- Table rows show "🏖️ PAID LEAVE" badges

**❌ FAIL Indicators:**
- Console shows `Paid Leave days: 0` even though you see schedule entries
- You see warning: "⚠️ NO PAID LEAVE FOUND in schedule data!"
- No purple banner appears
- Table shows "DAY OFF" instead of "PAID LEAVE"

---

## 🐛 Troubleshooting

### Problem 1: "No paid leave schedules found in database"

**Cause:** The `schedules` table is missing the `is_paid_leave` column

**Solution:**
1. Go to your Supabase dashboard
2. Navigate to **Table Editor** → `schedules` table
3. Check if there's an `is_paid_leave` column
4. If missing, add it:
   - Column name: `is_paid_leave`
   - Type: `boolean`
   - Default value: `false`
   - Nullable: ✅ Yes

---

### Problem 2: "Failed to insert schedule for [date]"

**Cause:** Database error when creating schedule entries

**Check console for error message:**
- If it says "column does not exist" → See Problem 1
- If it says "duplicate key" → Schedule already exists, should update instead
- If it says "permission denied" → Check Supabase RLS policies

---

### Problem 3: Schedules created but `Paid Leave days: 0`

**Cause:** Schedules created with `is_paid_leave: false` or `null`

**Debug:**
1. Check the detailed schedule log in console
2. Look for: `is_paid_leave=false` or `is_paid_leave=null`
3. If you see this, the backend isn't setting the flag correctly

**Quick Fix:**
- Check lines 1293-1298 in `/supabase/functions/server/index.tsx`
- Verify `is_paid_leave: isPaidDay` is being set

---

### Problem 4: Employee sees nothing in schedule

**Possible causes:**
- Employee has no schedule set up at all (normal if admin hasn't created one)
- Network error fetching schedule
- Wrong employee number being used

**Debug:**
1. Check console for "Employee Number: XXXXX"
2. Verify this matches the employee's actual number
3. Check for network errors in console
4. Try the "Refresh Schedule" button

---

## 📊 Database Verification

### Option 1: Use Diagnostic API (Easiest)

Open this URL in your browser (replace `EMP001` with the employee number):

```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-df988758/diagnostic/leave-schedules/EMP001
```

You'll get a JSON response like:

```json
{
  "success": true,
  "employee_number": "EMP001",
  "schedules": {
    "count": 2,
    "data": [
      {
        "schedule_date": "2026-04-20",
        "is_paid_leave": true,
        "is_day_off": false
      }
    ]
  },
  "attendance": {
    "count": 2,
    "data": [
      {
        "date": "2026-04-20",
        "status": "PAID_LEAVE"
      }
    ]
  },
  "diagnosis": {
    "has_paid_leave_schedules": true,
    "has_paid_leave_attendance": true,
    "recommendation": "OK: Both schedules and attendance records found."
  }
}
```

**What to look for:**
- ✅ `schedules.count` > 0
- ✅ `attendance.count` > 0
- ✅ `diagnosis.recommendation` says "OK"

---

### Option 2: Manual Database Check

If you want to verify directly in Supabase:

1. Go to **Supabase Dashboard** → **Table Editor**
2. Open the `schedules` table
3. Filter by `employee_number` = the employee's number
4. Look for rows where:
   - `schedule_date` matches the approved leave dates
   - `is_paid_leave` = `true` ✅
5. Also check `attendance_records` table:
   - Filter by `employee_number`
   - Look for `status` = `PAID_LEAVE`

---

## ✅ Success Checklist

- [ ] Admin approval shows "🎉 SUCCESS: X PAID LEAVE schedule(s) confirmed"
- [ ] Employee schedule shows `Paid Leave days: X` (not 0)
- [ ] Purple "Paid Leave Days Approved" banner appears
- [ ] Table shows "🏖️ PAID LEAVE" badges on correct dates
- [ ] Employee receives notification to check schedule
- [ ] Leave balance was deducted correctly

---

## 🆘 Still Not Working?

If you've followed all steps and it's still not working:

1. **Share the full console output** from:
   - Admin side (when approving)
   - Employee side (when viewing schedule)

2. **Check Supabase logs:**
   - Go to Supabase Dashboard → Logs → Edge Functions
   - Look for errors related to `/schedules` or `/leave-requests`

3. **Verify table structure:**
   - `schedules` table has `is_paid_leave` column (boolean)
   - `attendance_records` table has `status` column (text)
   - `leave_requests` table has `status` column (text)

4. **Try a fresh leave request:**
   - Create a NEW leave request
   - Approve it
   - Check if it displays

---

## 📝 Notes

- Schedules refresh every 30 seconds if auto-update is enabled
- Paid leave always counts as 8 hours per day
- Unpaid days (when balance runs out) show as "ABSENT" instead
- The system checks both `schedules` table AND `attendance_records` for maximum compatibility
