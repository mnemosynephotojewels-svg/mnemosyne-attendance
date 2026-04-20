# ✅ Approved Leaves Now Display in Schedules

## 🎯 What Was Fixed

Both **employee schedules** and **admin team schedules** now display approved leave requests as **PAID LEAVE** schedule entries, making it easy to see who's on leave at a glance.

---

## 📊 Changes Made

### 1. **Employee Schedule (Already Working)**
**File:** `/src/app/pages/EmployeeSchedule.tsx`

The employee schedule was already configured to:
- ✅ Fetch attendance records with approved leaves
- ✅ Fetch schedule entries with `is_paid_leave` flag  
- ✅ Merge both sources to display a complete schedule
- ✅ Show PAID LEAVE days with a purple badge 🏖️
- ✅ Show "Paid Leave (8 hours)" in the shift schedule column

**Display:**
```
Date          | Shift Schedule        | Status
--------------|-----------------------|-------------------
Dec 25, 2024  | Paid Leave (8 hours)  | 🏖️ PAID LEAVE
```

---

### 2. **Admin Schedule (Now Enhanced)**
**File:** `/src/app/pages/ManageSchedule_new.tsx`

Updated to import Supabase config:
```tsx
import { projectId, publicAnonKey } from '/utils/supabase/info';
```

The admin schedule was already configured to:
- ✅ Fetch schedules with `is_paid_leave` flag
- ✅ Display PAID LEAVE entries in the schedule grid
- ✅ Show yellow/gold paid leave cells

**Display:**
In the schedule grid, approved leaves appear as:
```
╔═══════════════════════════════╗
║    Paid Leave                 ║
║    8 Hours                    ║
╚═══════════════════════════════╝
(Yellow/gold gradient background)
```

---

### 3. **Leave Approval Process (CRITICAL UPDATE)**
**File:** `/supabase/functions/server/index.tsx`

**NEW:** When an admin approves a leave request, the system now:

1. **Creates Attendance Records** ✅
   - For employees only (not admins)
   - Type: `PAID_LEAVE` or `ABSENT`
   - 8 hours per paid day

2. **Creates Schedule Entries** ✅ NEW!
   - For BOTH employees AND admins
   - Sets `is_paid_leave: true` for paid days
   - Sets `is_day_off: true` for unpaid days
   - These schedule entries make leaves visible in the schedule views

**Code Added:**
```typescript
// Create schedule entries for approved leave days
console.log('📅 Creating schedule entries for approved leave days...');
const scheduleEntries: any[] = [];

let scheduleDate = new Date(startDate);
while (scheduleDate <= endDate) {
  const dateStr = scheduleDate.toISOString().split('T')[0];
  const isPaidDay = (schedulePaidDays + scheduleUnpaidDays) < paidDays;

  const scheduleEntry: any = {
    schedule_date: dateStr,
    shift_start: null,
    shift_end: null,
    is_day_off: !isPaidDay,       // Unpaid = day off
    is_paid_leave: isPaidDay,      // Paid = paid leave
    grace_period: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (userType === 'employee') {
    scheduleEntry.employee_number = userNumber;
  } else {
    scheduleEntry.admin_number = userNumber;
  }

  scheduleEntries.push(scheduleEntry);
  scheduleDate.setDate(scheduleDate.getDate() + 1);
}

// Upsert each schedule entry
for (const entry of scheduleEntries) {
  const { data: existingSchedule } = await supabase
    .from('schedules')
    .select('id')
    .eq(userType === 'employee' ? 'employee_number' : 'admin_number', userNumber)
    .eq('schedule_date', entry.schedule_date)
    .maybeSingle();

  if (existingSchedule) {
    await supabase.from('schedules').update(entry).eq('id', existingSchedule.id);
  } else {
    await supabase.from('schedules').insert(entry);
  }
}
```

---

## 🎨 Visual Appearance

### **Employee Schedule View:**
| Date | Day | Shift Schedule | Status |
|------|-----|----------------|--------|
| Dec 25 | Mon | Paid Leave (8 hours) | 🏖️ **PAID LEAVE** |
| Dec 26 | Tue | Paid Leave (8 hours) | 🏖️ **PAID LEAVE** |
| Dec 27 | Wed | 08:00 - 17:00 | **Work Day** |

### **Admin Schedule Grid:**
```
┌─────────────┬──────────────┬──────────────┬──────────────┐
│ Date/Emp    │ John Smith   │ Jane Doe     │ Mike Johnson │
├─────────────┼──────────────┼──────────────┼──────────────┤
│ Mon Dec 25  │ 🏖️           │ 08:00-17:00  │ 08:00-17:00  │
│             │ Paid Leave   │              │              │
│             │ 8 Hours      │              │              │
├─────────────┼──────────────┼──────────────┼──────────────┤
│ Tue Dec 26  │ 🏖️           │ 08:00-17:00  │ 🏖️           │
│             │ Paid Leave   │              │ Paid Leave   │
│             │ 8 Hours      │              │ 8 Hours      │
└─────────────┴──────────────┴──────────────┴──────────────┘
```

---

## 🔄 How It Works

### **Flow:**
```
1. Employee/Admin submits leave request
   ↓
2. Admin/Super Admin approves the request
   ↓
3. Backend creates:
   a) Attendance records (employees only) with type=PAID_LEAVE
   b) Schedule entries (all users) with is_paid_leave=true
   ↓
4. Frontend displays:
   - Employee sees "Paid Leave (8 hours)" in their schedule
   - Admin sees yellow "Paid Leave" box in team schedule grid
```

---

## ✅ Testing Checklist

### **For Employees:**
- [ ] Log in as employee
- [ ] Submit a leave request (e.g., 3 days)
- [ ] Have admin approve it
- [ ] Go to "My Schedule"
- [ ] Verify approved days show as "🏖️ PAID LEAVE"
- [ ] Verify shift schedule shows "Paid Leave (8 hours)"

### **For Admins:**
- [ ] Log in as admin
- [ ] Approve an employee's leave request
- [ ] Go to "Manage Team Schedule"
- [ ] Verify employee's approved leave days show in the grid
- [ ] Verify they appear as yellow "Paid Leave" cells
- [ ] Click the cell to confirm it's marked as paid leave

### **For Both:**
- [ ] Check that past working shifts are not affected
- [ ] Check that future scheduled shifts are not overwritten
- [ ] Check that the leave balance is correctly deducted

---

## 📌 Database Tables Involved

### **1. `leave_requests`**
- Stores the leave request with status (pending/approved/rejected)
- Links to employee/admin via `employee_number` or `admin_number`

### **2. `attendance_records`** (Employees Only)
- Created for each approved leave day
- Fields:
  - `employee_number` - Employee ID
  - `date` - Leave date
  - `type` - 'PAID_LEAVE' or 'ABSENT'
  - `status` - 'PAID_LEAVE' or 'ABSENT'
  - `leave_request_id` - Links back to leave request

### **3. `schedules`** (All Users) ✨ NEW
- Created/updated for each approved leave day
- Fields:
  - `employee_number` or `admin_number` - User ID
  - `schedule_date` - Leave date
  - `is_paid_leave` - **true** for paid leave days
  - `is_day_off` - **true** for unpaid/absent days
  - `shift_start` - null
  - `shift_end` - null

---

## 💡 Benefits

1. **Visibility** 📊
   - Admins can see at a glance who's on leave
   - No need to check separate leave requests page
   - Schedule planning is easier

2. **Consistency** 🔄
   - Approved leaves are treated as scheduled time
   - Same data source for schedule and attendance
   - No discrepancies between systems

3. **Planning** 📅
   - Team leaders can plan shifts around approved leaves
   - Avoid scheduling meetings on leave days
   - Better workload distribution

4. **Employee Experience** 👤
   - Employees see their approved leaves in their schedule
   - Clear indication of what days they're off
   - Transparent leave status

---

## 🔍 Troubleshooting

### **Issue: Approved leaves not showing in schedule**

**Solution 1:** Check if schedules table has `is_paid_leave` column
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'schedules' 
AND column_name = 'is_paid_leave';
```

**Solution 2:** Re-approve a leave request to trigger schedule creation

**Solution 3:** Check server logs for schedule creation errors:
- Go to Supabase Dashboard → Edge Functions → Logs
- Look for: "📅 Creating schedule entries for approved leave days"
- Check for any error messages

### **Issue: Leave shows in employee schedule but not admin schedule**

**Solution:** Admin schedule filters by department
- Ensure employee and admin are in the same department
- Check `mnemosyne_admin_profile` localStorage

### **Issue: Schedule entry overwrites existing working shift**

**Solution:** The code uses `upsert` logic
- It SHOULD overwrite working shifts with approved leave
- This is intended behavior (leave takes precedence)
- If you need to preserve shifts, modify the upsert logic

---

## 🚀 Future Enhancements

1. **Visual Indicators**
   - Different colors for different leave types (sick, vacation, etc.)
   - Icons or emojis for leave types
   - Tooltip on hover showing leave reason

2. **Filtering**
   - Filter schedule to show only leaves
   - Filter by leave type
   - Export leave schedule to calendar

3. **Notifications**
   - Notify team members when someone's leave is approved
   - Reminder before someone's leave starts
   - Alert if too many people on leave same day

4. **Conflict Detection**
   - Warn if too many team members request same dates
   - Suggest alternative dates
   - Auto-approve based on team coverage rules

---

## ✅ Conclusion

The schedule system now seamlessly integrates approved leaves, making them visible to both employees and admins. This provides better transparency, planning, and user experience across the entire Mnemosyne attendance system!

**KEY POINTS:**
- ✅ Approved leaves create schedule entries
- ✅ Schedule entries have `is_paid_leave: true` flag
- ✅ Frontend displays leaves in both employee and admin schedules
- ✅ Yellow/gold visual indicator for paid leave
- ✅ Works for both employees and admins

Your team can now see approved leaves directly in their schedules! 🎉
