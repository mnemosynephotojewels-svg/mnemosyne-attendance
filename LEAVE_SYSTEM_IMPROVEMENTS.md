# Leave Request System Improvements - Implementation Summary

## What Was Improved

The leave request system has been enhanced to properly handle the 12-day paid leave limit and display approved leaves in employee schedules with clear visual indicators.

## Key Features Implemented

### 1. **12-Day Paid Leave Limit Enforcement** ✅

#### Backend Logic (Already Implemented)
The system automatically handles the 12-day paid leave allowance:
- **Days 1-12**: Marked as `PAID_LEAVE` (8 hours each)
- **Days 13+**: Marked as `ABSENT` (unpaid, 0 compensation)

**Example:**
- Employee has 5 days remaining
- Requests 8 days of leave
- Result when approved:
  - First 5 days → PAID_LEAVE
  - Last 3 days → ABSENT (unpaid)

#### Employee Leave Request Form
Enhanced UI to show real-time warnings:

**Pre-Request Warnings:**
- Visual balance indicator (0-12 days)
- Color-coded progress bar:
  - Green: > 8 days remaining
  - Yellow: 4-8 days remaining  
  - Orange: 1-3 days remaining
  - Red: 0 days remaining

**During Request:**
When selecting dates, the system shows:
```
┌─────────────────────────────────────┐
│  REQUESTED: 8 days                  │
│  AFTER APPROVAL: 0 days remaining   │
│  USAGE: 100% of annual leave        │
└─────────────────────────────────────┘
```

**Unpaid Leave Warning:**
When requesting beyond 12 days:
```
⚠️ UNPAID LEAVE WARNING

You have exceeded your 12-day paid leave allowance.

✅ PAID LEAVE: 5 days
❌ ABSENT (Unpaid): 3 days

⚠️ Important Information:
• The 3 unpaid day(s) will NOT be compensated
• These days will appear as ABSENT in your attendance
• Your schedule will show both paid leave and absent days
```

### 2. **Approved Leaves Display in Schedule** ✅

The Employee Schedule page now:
- **Fetches attendance records** including approved leaves
- **Merges schedules with approved leaves** into a unified view
- **Shows visual indicators** for different day types

#### Schedule Display Features:

**Paid Leave Days:**
```
Date: Apr 15, 2026
Day: Tuesday
Shift: Paid Leave (8 hours)
Status: 🏖️ PAID LEAVE (purple badge)
```

**Absent/Unpaid Days:**
```
Date: Apr 16, 2026
Day: Wednesday
Shift: Absent
Status: ABSENT (red badge)
```

**Regular Work Days:**
```
Date: Apr 17, 2026  
Day: Thursday
Shift: 08:00 AM - 05:00 PM
Status: Work Day (green badge)
```

**Day Off:**
```
Date: Apr 18, 2026
Day: Saturday
Shift: -
Status: DAY OFF (red badge)
```

### 3. **Real-Time Balance Updates** ✅

**Auto-Refresh:**
- Balance refreshes every 30 seconds
- Visual animation when balance changes
- Toast notification when leave is approved

**Balance Change Notification:**
```
✅ Leave approved! 3 day(s) deducted.
   New balance: 9 day(s)
```

**Visual Highlight:**
- Balance number briefly glows in gold
- Shows previous balance for comparison
- Green checkmark animation

## User Experience Flows

### Flow 1: Request Within 12-Day Limit
1. Employee has 10 days remaining
2. Requests 3 days of annual leave (Apr 15-17)
3. System shows:
   - ✅ All 3 days will be PAID LEAVE
   - After approval: 7 days remaining
4. Admin approves the request
5. System automatically:
   - Creates 3 PAID_LEAVE attendance records
   - Deducts 3 days from balance (10 → 7)
   - Updates employee schedule to show paid leave days
6. Employee sees in schedule:
   - Apr 15: 🏖️ PAID LEAVE
   - Apr 16: 🏖️ PAID LEAVE
   - Apr 17: 🏖️ PAID LEAVE

### Flow 2: Request Exceeding 12-Day Limit
1. Employee has 2 days remaining
2. Requests 5 days of annual leave (Apr 20-24)
3. System shows warning:
   ```
   ⚠️ UNPAID LEAVE WARNING
   
   ✅ PAID LEAVE: 2 days
   ❌ ABSENT (Unpaid): 3 days
   
   You are using all 2 day(s) of your remaining paid leave.
   The 3 unpaid day(s) will be marked as ABSENT.
   ```
4. Employee confirms understanding
5. Admin approves the request
6. System automatically:
   - First 2 days → PAID_LEAVE (Apr 20-21)
   - Last 3 days → ABSENT (Apr 22-24)
   - Deducts 2 paid days from balance (2 → 0)
7. Employee sees in schedule:
   - Apr 20: 🏖️ PAID LEAVE
   - Apr 21: 🏖️ PAID LEAVE
   - Apr 22: ❌ ABSENT
   - Apr 23: ❌ ABSENT
   - Apr 24: ❌ ABSENT

### Flow 3: Request After Balance Depleted
1. Employee has 0 days remaining
2. Requests 2 days of leave (May 1-2)
3. System shows:
   ```
   ⚠️ BALANCE DEPLETED
   
   ❌ ABSENT (Unpaid): 2 days
   
   You have used all 12 days of your annual paid leave.
   All additional leave requests will be marked as ABSENT.
   ```
4. Employee confirms
5. Admin approves
6. System creates:
   - May 1: ABSENT (unpaid)
   - May 2: ABSENT (unpaid)
7. Employee sees in schedule:
   - May 1: ❌ ABSENT
   - May 2: ❌ ABSENT

## Technical Implementation

### Backend: Leave Approval Logic

Located in `/supabase/functions/server/index.tsx`:

```typescript
// When leave is approved:
const totalDays = // calculate days between start and end
const currentBalance = employee.paid_leave_balance // e.g., 12
const paidDays = Math.min(totalDays, currentBalance) // max 12
const unpaidDays = Math.max(0, totalDays - currentBalance)

// For each day in the leave period:
for (let day of leaveDays) {
  if (paidRecordsCreated < paidDays) {
    // Create PAID_LEAVE record
    status: 'PAID_LEAVE'
    type: 'PAID_LEAVE'
    hours_worked: 8
    paidRecordsCreated++
  } else {
    // Create ABSENT record (unpaid)
    status: 'ABSENT'
    type: 'ABSENT'
    hours_worked: 0
    unpaidRecordsCreated++
  }
}

// Update employee balance
newBalance = currentBalance - paidDays
```

### Frontend: Schedule Merging

Located in `/src/app/pages/EmployeeSchedule.tsx`:

```typescript
// Fetch both schedules and attendance records
const schedules = await fetchSchedules()
const attendance = await fetchAttendance()

// Merge approved leaves into schedule
attendance.forEach(record => {
  if (record.status === 'PAID_LEAVE' || record.status === 'ABSENT') {
    if (record.leave_request_id) {
      // This is an approved leave - add to schedule
      schedules.push({
        schedule_date: record.date,
        is_paid_leave: record.status === 'PAID_LEAVE',
        is_absent: record.status === 'ABSENT'
      })
    }
  }
})

// Display merged schedule
```

### Frontend: Leave Request Warnings

Located in `/src/app/pages/EmployeeLeave.tsx`:

```typescript
// Calculate breakdown
const requestedDays = calculateDuration(startDate, endDate)
const paidDays = Math.min(requestedDays, leaveBalance)
const unpaidDays = Math.max(0, requestedDays - leaveBalance)

// Show warning if unpaid days exist
if (unpaidDays > 0) {
  showWarning({
    title: '⚠️ UNPAID LEAVE WARNING',
    paidDays,
    unpaidDays,
    message: 'The ${unpaidDays} day(s) will be marked as ABSENT'
  })
}
```

## Database Schema Requirements

### employees table
```sql
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12 CHECK (paid_leave_balance >= 0);

CREATE INDEX IF NOT EXISTS idx_employees_leave_balance 
ON employees(paid_leave_balance);
```

### attendance_records table
```sql
-- Must have these columns:
- employee_number (text, PRIMARY KEY with date)
- date (date, PRIMARY KEY with employee_number)
- status (text) -- 'PRESENT', 'PAID_LEAVE', 'ABSENT', etc.
- type (text) -- same as status
- leave_request_id (integer) -- links to leave_requests table
- hours_worked (numeric) -- 8 for PAID_LEAVE, 0 for ABSENT
- notes (text)
```

### schedules table
```sql
-- Must have these columns:
- employee_number (text)
- schedule_date (date)
- shift_start (time)
- shift_end (time)
- is_day_off (boolean)
```

## Testing Checklist

### Backend Testing
- [ ] Verify 12-day limit enforcement
- [ ] Test leave approval creates correct PAID_LEAVE records
- [ ] Test leave approval creates correct ABSENT records for days 13+
- [ ] Verify balance deduction only uses paid days
- [ ] Test balance cannot go negative

### Frontend - Leave Request Form
- [ ] Balance displays correctly (0-12)
- [ ] Progress bar shows correct percentage
- [ ] Color changes based on balance (green/yellow/orange/red)
- [ ] Real-time calculation when selecting dates
- [ ] Warning appears when exceeding balance
- [ ] Confirmation dialog shows correct paid/unpaid breakdown
- [ ] Balance updates after approval

### Frontend - Employee Schedule
- [ ] Regular work days display with shift times
- [ ] Approved PAID LEAVE days show with purple badge
- [ ] Approved ABSENT days show with red badge
- [ ] Schedule merges with attendance records correctly
- [ ] Auto-refresh works (30 seconds)
- [ ] Manual sync button works
- [ ] Today's date is highlighted

### Integration Testing
- [ ] Request 5 days with 10 balance → All paid
- [ ] Request 15 days with 12 balance → 12 paid, 3 absent
- [ ] Request 3 days with 0 balance → All absent
- [ ] Approved leaves appear in schedule immediately after sync
- [ ] Balance updates trigger visual notifications
- [ ] Multiple approved leaves all show in schedule

## Known Behaviors

1. **Balance never goes negative**: System prevents negative balances
2. **Unpaid days are not compensated**: ABSENT days have 0 hours_worked
3. **Schedule auto-merges leaves**: Approved leaves automatically appear
4. **Real-time warnings**: System warns before submission if unpaid
5. **Admin approval required**: Leaves don't affect schedule until approved
6. **Leave request linking**: All attendance records link back to leave request ID

## API Endpoints Used

```
GET  /schedules?employee_number=X&start_date=Y&end_date=Z
GET  /attendance/records?employee_number=X&start_date=Y&end_date=Z
GET  /leave-requests/balance?employee_number=X
POST /leave-requests
PUT  /leave-requests/:id/status (approve/reject)
```

## User Messages

### Success Messages
- ✅ "Leave approved! X day(s) deducted. New balance: Y day(s)"
- ✅ "Leave request submitted successfully!"
- ✅ "All days will be paid leave"

### Warning Messages
- ⚠️ "UNPAID LEAVE WARNING - X day(s) will be marked as ABSENT"
- ⚠️ "You are using all X day(s) of your remaining paid leave"
- ⚠️ "Low Balance Warning: You only have X day(s) remaining"

### Error Messages
- ❌ "Balance Depleted: You have used all 12 days of your annual paid leave"
- ❌ "End date must be after start date"

## Future Enhancements (Optional)

1. **Leave History Report**: Show year-to-date leave usage
2. **Calendar View**: Visual calendar with color-coded leave days
3. **Leave Type Limits**: Different limits for sick vs annual leave
4. **Carry-Over**: Allow unused days to carry to next year
5. **Half-Day Leaves**: Support 4-hour leave increments
6. **Team Calendar**: See team members' approved leaves
7. **Email Notifications**: Auto-email on approval/rejection
8. **Blackout Dates**: Prevent requests on certain busy dates
