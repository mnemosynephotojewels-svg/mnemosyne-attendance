# 🏖️ Leave Request → My Schedule Integration

## Overview

This feature ensures that when an admin approves an employee's leave request, the approved leave days automatically appear in the employee's "My Schedule" tab with visual indicators.

---

## 🎯 What It Does

1. **Admin approves leave** → System creates schedule entries with `is_paid_leave: true`
2. **Employee opens "My Schedule"** → Sees purple "PAID LEAVE" badges for approved days
3. **Visual indicators** → Purple banner alerts employee to approved leave
4. **Automatic notification** → Employee is told to check their schedule

---

## 🚀 Quick Start Testing

### For the impatient (2 minutes):

1. **Admin:** Approve a leave request
   - Look for: `🎉 SUCCESS: X PAID LEAVE schedule(s) confirmed` in console
   
2. **Employee:** Open "My Schedule"
   - Look for: Purple banner + purple "🏖️ PAID LEAVE" badges

**Passed?** ✅ You're done!  
**Failed?** 📋 Continue reading below

---

## 📚 Documentation

We've created comprehensive guides for you:

### 1. **Quick Reference** 
📄 [`QUICK_TEST_GUIDE.md`](./QUICK_TEST_GUIDE.md)
- 2-minute testing procedure
- Console check points
- Quick fixes for common issues

### 2. **Visual Checklist**
📄 [`VISUAL_TESTING_CHECKLIST.md`](./VISUAL_TESTING_CHECKLIST.md)
- Step-by-step visual verification
- Screenshots of what you should see
- Color reference guide
- Perfect vs. broken examples

### 3. **Complete Testing Guide**
📄 [`LEAVE_SCHEDULE_TESTING.md`](./LEAVE_SCHEDULE_TESTING.md)
- Detailed troubleshooting
- Database verification methods
- Common problems and solutions
- Support checklist

### 4. **Implementation Details**
📄 [`IMPLEMENTATION_SUMMARY.md`](./IMPLEMENTATION_SUMMARY.md)
- Technical architecture
- Modified files
- Data structures
- Success metrics

---

## 🔍 Diagnostic Tools

### Built-In Console Logging

**Admin Side (during approval):**
```javascript
// Open browser console (F12)
// Look for these messages:
✅ Created schedule for 2026-04-20 (is_paid_leave: true)
🎉 SUCCESS: 3 PAID LEAVE schedule(s) confirmed in database!
```

**Employee Side (viewing schedule):**
```javascript
// Open browser console (F12)
// Look for:
📊 SCHEDULE SUMMARY:
   - 🏖️ Paid Leave days: 3  ← Should NOT be 0!
```

### API Diagnostic Endpoint

Check employee's leave schedules:
```
GET https://YOUR_PROJECT.supabase.co/functions/v1/make-server-df988758/diagnostic/leave-schedules/{EMPLOYEE_NUMBER}
```

Returns:
```json
{
  "diagnosis": {
    "has_paid_leave_schedules": true,
    "has_paid_leave_attendance": true,
    "recommendation": "OK: Both schedules and attendance records found."
  }
}
```

### UI Debug Mode

In the employee's "My Schedule" page:
1. Click **"🐛 Debug"** button (top right)
2. See raw counts and data
3. Verify paid leave count matches expected

---

## ⚠️ Requirements

### Database Schema

The `schedules` table **must** have an `is_paid_leave` column:

```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'schedules' 
  AND column_name = 'is_paid_leave';

-- Add if missing
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS is_paid_leave BOOLEAN DEFAULT false;
```

**How to add via Supabase UI:**
1. Go to Supabase Dashboard
2. Navigate to **Table Editor** → `schedules`
3. Click **"+ New Column"**
4. Settings:
   - Name: `is_paid_leave`
   - Type: `boolean`
   - Default value: `false`
   - Nullable: ✅ Yes
5. Click **"Save"**

---

## 🎨 Visual Indicators

### What Employees See

**Purple Alert Banner:**
```
┌─────────────────────────────────────────────┐
│ 🏖️ 3 Paid Leave Days Approved              │
│ Your approved paid leave days are now       │
│ showing in your schedule below.             │
└─────────────────────────────────────────────┘
```

**Schedule Table Rows:**
- **Shift Schedule:** "Paid Leave (8 hours)" in purple (#8B5CF6)
- **Status:** Purple badge "🏖️ PAID LEAVE"
- **Background:** Light purple (#F3E8FF)

**Example:**
```
┌────────────────────────────────────────────────┐
│ Date       │ Day │ Shift         │ Status      │
├────────────────────────────────────────────────┤
│ Apr 20     │ Mon │ Paid Leave    │ 🏖️ PAID    │
│ 2026       │     │ (8 hours)     │ LEAVE       │
└────────────────────────────────────────────────┘
```

---

## 🐛 Common Issues

### Issue 1: "Paid Leave days: 0" in console
**Cause:** Missing `is_paid_leave` column in schedules table  
**Fix:** Add the column (see Requirements section above)

### Issue 2: Shows "DAY OFF" instead of "PAID LEAVE"
**Cause:** Schedules created with `is_paid_leave: false`  
**Fix:** Re-approve the leave request after adding the column

### Issue 3: No schedules showing at all
**Cause:** Employee has no schedule set up  
**Fix:** Admin needs to create a schedule for the employee first (or this is expected behavior)

### Issue 4: "Failed to insert schedule"
**Cause:** Database error (check console for specific message)  
**Fix:** See error-specific solution in `LEAVE_SCHEDULE_TESTING.md`

---

## 📊 Data Flow

```
┌─────────────┐
│ Admin       │
│ Approves    │
│ Leave       │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Backend: /leave-requests/:id/status     │
├─────────────────────────────────────────┤
│ 1. Create attendance records            │
│    status: 'PAID_LEAVE'                 │
│                                          │
│ 2. Create schedule entries              │
│    is_paid_leave: true                  │
│                                          │
│ 3. Verify in database                   │
│                                          │
│ 4. Update leave balance                 │
│                                          │
│ 5. Send notification                    │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────┐
│ Employee    │
│ Views       │
│ "My         │
│ Schedule"   │
└─────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Frontend: /schedules + /attendance      │
├─────────────────────────────────────────┤
│ 1. Fetch schedules (is_paid_leave)      │
│ 2. Fetch attendance (status)            │
│ 3. Merge data                           │
│ 4. Display purple badges                │
└─────────────────────────────────────────┘
```

---

## ✅ Success Criteria

Everything is working if:

- [x] Admin console shows `🎉 SUCCESS: X PAID LEAVE schedule(s) confirmed`
- [x] Employee console shows `🏖️ Paid Leave days: X` (not 0)
- [x] Employee sees purple banner at top of schedule
- [x] Employee sees purple "🏖️ PAID LEAVE" badges in table
- [x] Employee receives notification to check schedule
- [x] Leave balance decreases correctly
- [x] No error messages in console

---

## 🆘 Getting Help

If you've tried everything and it's still not working:

### Step 1: Run Diagnostics
1. **Console logs** from admin (during approval)
2. **Console logs** from employee (viewing schedule)
3. **API diagnostic** response
4. **Browser console errors** (if any)

### Step 2: Check Database
1. Open Supabase Dashboard
2. Go to Table Editor → `schedules`
3. Verify `is_paid_leave` column exists
4. Filter by employee number
5. Check if entries exist with `is_paid_leave: true`

### Step 3: Review Guides
1. [`VISUAL_TESTING_CHECKLIST.md`](./VISUAL_TESTING_CHECKLIST.md) - Are you seeing what you should?
2. [`LEAVE_SCHEDULE_TESTING.md`](./LEAVE_SCHEDULE_TESTING.md) - Detailed troubleshooting

### Step 4: Check Edge Function Logs
1. Supabase Dashboard → Logs → Edge Functions
2. Look for errors related to:
   - `/leave-requests/:id/status`
   - `/schedules`
   - Schedule creation

---

## 📁 Files Modified

### Backend
- `/supabase/functions/server/index.tsx`
  - Enhanced logging for schedule creation
  - Added verification step
  - Created diagnostic endpoint
  - Updated notifications

### Frontend
- `/src/app/pages/EmployeeSchedule.tsx`
  - Added paid leave detection
  - Added debug mode
  - Added purple alert banner
  - Enhanced console logging

- `/src/app/pages/LeaveRequests.tsx`
  - Updated success messages
  - Mentions schedule in toast

---

## 🔄 Version History

**v1.0** - Initial implementation
- Basic schedule creation
- Display in employee schedule

**v1.1** - Enhanced debugging (Current)
- Comprehensive console logging
- Diagnostic API endpoint
- UI debug mode
- Visual indicators
- Complete testing guides

---

## 📞 Support Resources

1. **Documentation:**
   - Quick Test: `QUICK_TEST_GUIDE.md`
   - Visual Check: `VISUAL_TESTING_CHECKLIST.md`
   - Full Guide: `LEAVE_SCHEDULE_TESTING.md`
   - Tech Details: `IMPLEMENTATION_SUMMARY.md`

2. **Tools:**
   - Diagnostic API endpoint
   - Debug mode in UI
   - Console logging

3. **Database:**
   - Supabase Table Editor
   - Edge Function logs

---

## 🎉 You're All Set!

The system is now fully integrated with comprehensive debugging tools. Follow the quick test guide to verify everything is working, and use the diagnostic tools if you encounter any issues.

**Happy testing! 🚀**
