# ✅ Visual Testing Checklist

## 🎯 Quick Visual Verification Guide

Use this checklist to verify everything is working correctly at a glance.

---

## 📋 Admin Side - Leave Approval

### ✅ **Step 1: Before Approval**
- [ ] I can see the leave request in "Leave Requests" page
- [ ] Leave request shows "Pending" status
- [ ] I can see employee name and dates

### ✅ **Step 2: During Approval**
Open browser console (F12) and click "Approve"

**I should see:**
- [ ] `📅 CREATING ATTENDANCE RECORDS`
- [ ] `📅 Creating schedule entries for approved leave days...`
- [ ] `💾 Upserting X schedule entries...`
- [ ] `✅ Created schedule for [date] (is_paid_leave: true)` (for each day)
- [ ] `🔍 Verifying schedules were saved to database...`
- [ ] `🎉 SUCCESS: X PAID LEAVE schedule(s) confirmed in database!`
- [ ] `✅ LEAVE APPROVAL COMPLETE`

### ✅ **Step 3: After Approval**
- [ ] Green success toast appears
- [ ] Toast says "Added to employee's 'My Schedule' tab!"
- [ ] Leave request status changes to "Approved"
- [ ] Employee's balance decreases

---

## 📋 Employee Side - View Schedule

### ✅ **Step 1: Login & Navigate**
- [ ] Login as the employee whose leave was approved
- [ ] Click on "My Schedule" in the sidebar
- [ ] Page loads without errors

### ✅ **Step 2: Visual Check**

**Purple Alert Banner (Top of Page):**
```
┌─────────────────────────────────────────────┐
│ 🏖️ X Paid Leave Days Approved              │
│ Your approved paid leave days are now       │
│ showing in your schedule below.             │
└─────────────────────────────────────────────┘
```

- [ ] I see the purple banner
- [ ] It shows the correct number of paid leave days
- [ ] Message is clear and helpful

**Schedule Table:**
- [ ] I see the schedule table
- [ ] Leave dates are listed in the table
- [ ] For each leave day, I see:
  - [ ] **Shift Schedule column:** "Paid Leave (8 hours)" in purple text
  - [ ] **Status column:** Purple badge with "🏖️ PAID LEAVE"

### ✅ **Step 3: Console Check**
Open browser console (F12)

**I should see:**
- [ ] `📅 FETCHING EMPLOYEE SCHEDULE & ATTENDANCE`
- [ ] `✅ Schedule fetched: X entries`
- [ ] `📊 SCHEDULE SUMMARY:`
  - [ ] `- 🏖️ Paid Leave days: X` ← **This should NOT be 0!**
  - [ ] Shows counts for day off and work days
- [ ] `✅ Attendance fetched: X records`
- [ ] `📋 Attendance records (with approved leaves):`
  - [ ] Shows entries with `status=PAID_LEAVE`

**⚠️ RED FLAGS:**
- [ ] ❌ `Paid Leave days: 0` (when there should be paid leave)
- [ ] ❌ `⚠️ NO PAID LEAVE FOUND in schedule data!`
- [ ] ❌ Any error messages

### ✅ **Step 4: Debug Mode (Optional)**
- [ ] Click "🐛 Debug" button in top right
- [ ] Debug panel appears showing:
  - [ ] Total Schedules count
  - [ ] Paid Leave count (matches expected)
  - [ ] List of paid leave dates with `is_paid_leave=true`

---

## 🐛 What Should NOT Happen

### ❌ Wrong Status Display
```
❌ WRONG:
┌──────────────────────────────────────────┐
│ Apr 20 │ Mon │ - │ DAY OFF │  ← Should be PAID LEAVE!
└──────────────────────────────────────────┘
```

```
✅ CORRECT:
┌────────────────────────────────────────────────┐
│ Apr 20 │ Mon │ Paid Leave │ 🏖️ PAID LEAVE │
│        │     │ (8 hours)  │                │
└────────────────────────────────────────────────┘
```

### ❌ Missing Banner
If you don't see the purple "Paid Leave Days Approved" banner, something is wrong.

### ❌ Console Warnings
```
⚠️ NO PAID LEAVE FOUND in schedule data!
```
This means schedules exist but without the `is_paid_leave` flag.

---

## 🎨 Color Reference

Make sure you see these exact colors for paid leave:

- **Text:** Purple (#8B5CF6)
- **Background:** Light purple (#F3E8FF)
- **Border:** Purple border (#C4B5FD)
- **Badge:** Purple with white text

**Other statuses for comparison:**
- **Work Day:** Green badge (#16A34A, #DCFCE7)
- **Day Off:** Red badge (#DC2626, #FEE2E2)

---

## 📊 Example: Perfect Display

### Admin Console (After Approval)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 CREATING ATTENDANCE RECORDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ 2026-04-20: PAID_LEAVE (employee_number: EMP001)
   ✅ 2026-04-21: PAID_LEAVE (employee_number: EMP001)
   ✅ 2026-04-22: PAID_LEAVE (employee_number: EMP001)

📅 Creating schedule entries for approved leave days...
   📅 2026-04-20: PAID_LEAVE schedule entry
   📅 2026-04-21: PAID_LEAVE schedule entry
   📅 2026-04-22: PAID_LEAVE schedule entry
💾 Upserting 3 schedule entries...
   ✅ Created schedule for 2026-04-20 (is_paid_leave: true)
   ✅ Created schedule for 2026-04-21 (is_paid_leave: true)
   ✅ Created schedule for 2026-04-22 (is_paid_leave: true)

🔍 Verifying schedules were saved to database...
✅ Verified 3 schedules in database:
   - 2026-04-20: is_paid_leave=true, is_day_off=false
   - 2026-04-21: is_paid_leave=true, is_day_off=false
   - 2026-04-22: is_paid_leave=true, is_day_off=false
🎉 SUCCESS: 3 PAID LEAVE schedule(s) confirmed in database!
✅ LEAVE APPROVAL COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Employee Console (Viewing Schedule)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 FETCHING EMPLOYEE SCHEDULE & ATTENDANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Employee Number: EMP001
✅ Schedule fetched: 14 entries

📋 Detailed schedule data:
   - 2026-04-20: is_paid_leave=true, is_day_off=false, shift=null-null
   - 2026-04-21: is_paid_leave=true, is_day_off=false, shift=null-null
   - 2026-04-22: is_paid_leave=true, is_day_off=false, shift=null-null
   - 2026-04-23: is_paid_leave=false, is_day_off=false, shift=08:00-17:00

📊 SCHEDULE SUMMARY:
   - Total entries: 14
   - 🏖️ Paid Leave days: 3  ✅ GOOD!
   - 📅 Day Off: 4
   - 💼 Work days: 7

✅ Attendance fetched: 3 records
📋 Attendance records (with approved leaves):
   - 2026-04-20: status=PAID_LEAVE, type=PAID_LEAVE
   - 2026-04-21: status=PAID_LEAVE, type=PAID_LEAVE
   - 2026-04-22: status=PAID_LEAVE, type=PAID_LEAVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Employee UI Display
```
┌─────────────────────────────────────────────┐
│ 🏖️ 3 Paid Leave Days Approved              │
│ Your approved paid leave days are now       │
│ showing in your schedule below.             │
└─────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ Date       │ Day │ Shift Schedule    │ Status      │
├────────────────────────────────────────────────────┤
│ Apr 20     │ Mon │ Paid Leave        │ 🏖️ PAID    │
│ 2026       │     │ (8 hours)         │ LEAVE       │
├────────────────────────────────────────────────────┤
│ Apr 21     │ Tue │ Paid Leave        │ 🏖️ PAID    │
│ 2026       │     │ (8 hours)         │ LEAVE       │
├────────────────────────────────────────────────────┤
│ Apr 22     │ Wed │ Paid Leave        │ 🏖️ PAID    │
│ 2026       │     │ (8 hours)         │ LEAVE       │
└────────────────────────────────────────────────────┘
```

---

## 🔄 Quick Refresh Test

1. [ ] Click "Refresh Schedule" button
2. [ ] Button shows "Refreshing..." with spinning icon
3. [ ] Data reloads
4. [ ] Paid leave still shows correctly
5. [ ] No errors in console

---

## 📱 Responsive Test (Optional)

- [ ] Mobile view: Table is scrollable
- [ ] Tablet view: Layout adjusts properly
- [ ] Desktop view: Full layout displays

---

## ✅ Final Sign-Off

**All checks passed?**
- [ ] ✅ Admin can approve leave successfully
- [ ] ✅ Console shows schedule creation confirmation
- [ ] ✅ Employee sees purple banner
- [ ] ✅ Employee sees purple PAID LEAVE badges
- [ ] ✅ Console shows correct paid leave count
- [ ] ✅ No error messages or warnings
- [ ] ✅ Debug mode shows correct data

**If all boxes are checked:** 🎉 **SYSTEM WORKING PERFECTLY!**

**If any box is unchecked:** 📋 See `LEAVE_SCHEDULE_TESTING.md` for troubleshooting

---

## 📞 Quick Diagnostic

If something doesn't look right:

1. **Open this URL** (replace with your project and employee number):
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/make-server-df988758/diagnostic/leave-schedules/EMP001
   ```

2. **Check the response:**
   - `diagnosis.has_paid_leave_schedules` should be `true`
   - `diagnosis.recommendation` should say "OK"

3. **If recommendation says "ISSUE":**
   - Follow the specific fix in the diagnostic message
   - See `LEAVE_SCHEDULE_TESTING.md` for detailed troubleshooting
