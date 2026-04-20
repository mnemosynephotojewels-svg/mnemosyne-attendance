# ⚡ Quick Test: Approved Leave → My Schedule

## 🎯 Goal
Verify that when an admin approves a leave request, it shows up in the employee's "My Schedule" tab.

---

## ✅ Quick Test (2 minutes)

### 1. Approve Leave (Admin)
```
1. Login as Admin
2. Go to "Leave Requests"
3. Approve any pending request
4. Check console for: "🎉 SUCCESS: X PAID LEAVE schedule(s) confirmed"
```

### 2. Check Schedule (Employee)
```
1. Login as that Employee
2. Go to "My Schedule"
3. Click "Refresh Schedule"
4. Look for:
   - Purple banner: "X Paid Leave Days Approved"
   - Table rows with "🏖️ PAID LEAVE" badge
```

---

## 🔍 Console Check Points

### Admin Side (When Approving)
Look for:
```
✅ Created schedule for 2026-04-20 (is_paid_leave: true)
🎉 SUCCESS: 2 PAID LEAVE schedule(s) confirmed in database!
```

### Employee Side (When Viewing Schedule)
Look for:
```
📊 SCHEDULE SUMMARY:
   - 🏖️ Paid Leave days: 2  ← Should NOT be 0!
```

---

## 🐛 Quick Fixes

### ❌ "Paid Leave days: 0"
**Fix:** The `schedules` table is missing the `is_paid_leave` column.

**Solution:**
1. Go to Supabase → Table Editor → `schedules`
2. Add column:
   - Name: `is_paid_leave`
   - Type: `boolean`
   - Default: `false`
   - Nullable: ✅

---

### ❌ "Failed to insert schedule"
Check the error message in console:
- `"column does not exist"` → See fix above
- `"permission denied"` → Check RLS policies

---

## 🧪 API Diagnostic

**Quick health check** (replace YOUR_PROJECT_ID and EMP001):

```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-df988758/diagnostic/leave-schedules/EMP001
```

**Good response:**
```json
{
  "diagnosis": {
    "has_paid_leave_schedules": true,
    "has_paid_leave_attendance": true,
    "recommendation": "OK: Both schedules and attendance records found."
  }
}
```

**Bad response:**
```json
{
  "diagnosis": {
    "has_paid_leave_schedules": false,
    "recommendation": "ISSUE: Attendance records exist but schedules are missing..."
  }
}
```

---

## 📋 Expected Behavior

✅ **What you SHOULD see:**
- Admin approval logs show schedule creation
- Employee schedule shows purple "PAID LEAVE" badges
- Purple banner at top: "X Paid Leave Days Approved"
- Notification sent to employee

❌ **What you should NOT see:**
- "DAY OFF" instead of "PAID LEAVE"
- Console warning: "NO PAID LEAVE FOUND"
- `Paid Leave days: 0` when days were approved

---

## 📞 Need Help?

1. ✅ Read full guide: `LEAVE_SCHEDULE_TESTING.md`
2. ✅ Share console output from both admin and employee sides
3. ✅ Check Supabase edge function logs for errors
