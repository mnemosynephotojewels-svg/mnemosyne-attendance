# 🧪 How to Test Kiosk Schedule Validation

## Quick Test (5 Minutes)

### Prerequisites
1. ✅ You must have run `FIX_SCHEDULES_RUN_NOW.sql` in Supabase
2. ✅ Database structure must be fixed
3. ✅ Clear old data (run `PASTE_IN_CONSOLE.txt` script)

---

## Test Scenario 1: No Schedule (Should Fail)

### Setup (30 seconds)
1. Go to **Manage Schedule** page
2. Find an employee (e.g., Moises)
3. Make sure they have **NO schedule** for today
4. If schedule exists, delete it

### Test (30 seconds)
1. Go to **Kiosk** page
2. Scan employee's QR code (or enter employee number manually)
3. Select **TIME IN**
4. Click **Submit**

### Expected Result ❌
**Screen shows:**
```
❌ NO SCHEDULE
Moises (EMP-1053)
No schedule for today
```

**Toast notification:**
```
Moises has no schedule for today
Please contact your supervisor to add a schedule
```

**Console shows:**
```
❌ No schedule found for today
```

**✅ PASS:** Attendance blocked correctly

---

## Test Scenario 2: Day Off (Should Fail)

### Setup (1 minute)
1. Go to **Manage Schedule** page
2. Click on employee's cell for today
3. Select **"Day Off"**
4. Click **"Save Schedule"**
5. Verify cell shows gray "OFF"

### Test (30 seconds)
1. Go to **Kiosk** page
2. Scan employee's QR code
3. Select **TIME IN**
4. Click **Submit**

### Expected Result ❌
**Screen shows:**
```
❌ DAY OFF
Moises (EMP-1053)
Scheduled as day off
```

**Toast notification:**
```
Moises is scheduled as DAY OFF today
Cannot take attendance on scheduled day off
```

**Console shows:**
```
❌ Today is marked as day off
```

**✅ PASS:** Attendance blocked correctly

---

## Test Scenario 3: Valid Schedule (Should Work)

### Setup (1 minute)
1. Go to **Manage Schedule** page
2. Click on employee's cell for today
3. Select **"Working Shift"**
4. Enter times: **08:00 - 17:00**
5. Click **"Save Schedule"**
6. Verify cell shows blue "08:00 - 17:00"
7. **IMPORTANT:** Refresh page (Ctrl+Shift+R)
8. **Verify schedule still shows** (if turns to "OFF", SQL not run correctly)

### Test (30 seconds)
1. Go to **Kiosk** page
2. Scan employee's QR code
3. Select **TIME IN**
4. Click **Submit**

### Expected Result ✅
**Screen shows:**
```
✅ TIME IN SUCCESS
Moises (EMP-1053)
Employee • Engineering
9:30 AM
```

**Toast notification:**
```
✅ Attendance recorded successfully
```

**Console shows:**
```
✅ Schedule verified: {
  shift_start: "08:00:00",
  shift_end: "17:00:00",
  grace_period: 30
}
✅ Attendance recorded successfully
```

**✅ PASS:** Attendance allowed correctly

---

## Test Scenario 4: Already Timed In (Should Fail)

### Setup
Continue from Test 3 (employee already timed in)

### Test (30 seconds)
1. Scan employee's QR code again
2. Select **TIME IN** (same as before)
3. Click **Submit**

### Expected Result ❌
**Screen shows:**
```
❌ ALREADY TIMED IN
Moises (EMP-1053)
9:30 AM
```

**Toast notification:**
```
Moises already timed in at 9:30 AM
Please select TIME OUT to end the shift
```

**✅ PASS:** Duplicate TIME IN blocked

---

## Test Scenario 5: Valid TIME OUT (Should Work)

### Setup
Continue from Test 4 (employee already timed in)

### Test (30 seconds)
1. Scan employee's QR code again
2. Select **TIME OUT** (different from before)
3. Click **Submit**

### Expected Result ✅
**Screen shows:**
```
✅ TIME OUT SUCCESS
Moises (EMP-1053)
Employee • Engineering
5:30 PM
```

**Toast notification:**
```
✅ Attendance recorded successfully
```

**✅ PASS:** TIME OUT allowed correctly

---

## Common Issues & Solutions

### Issue 1: Everyone Gets "No Schedule"

**Symptoms:**
- All employees blocked with "No schedule for today"
- Even after creating schedules

**Cause:**
- SQL fix not run OR
- Schedules table still broken OR
- Old cached data

**Solution:**
1. Run `VERIFY_SQL_WORKED.sql` in Supabase
2. Check `id` column is `text` (not `bigint`)
3. If `bigint`, run `FIX_SCHEDULES_RUN_NOW.sql` again
4. Clear cache (run `PASTE_IN_CONSOLE.txt` script)
5. Refresh app (Ctrl+Shift+R)
6. Re-create schedules

---

### Issue 2: Schedule Shows in Grid but Kiosk Says "No Schedule"

**Symptoms:**
- Schedule visible in Manage Schedule page
- Kiosk still says "No schedule for today"

**Cause:**
- Schedule only in KV store, not in Supabase database
- Database save failed silently

**Solution:**
1. Open browser console (F12)
2. Save a schedule
3. Look for: `✅ Supabase: Schedule created successfully`
4. If you see error instead, SQL fix not applied correctly
5. Run SQL fix again
6. Clear old data
7. Re-create schedules

---

### Issue 3: Valid Schedule but "Schedule Incomplete"

**Symptoms:**
- Schedule saved as working (08:00 - 17:00)
- Kiosk says "Schedule incomplete - Shift times not set"

**Cause:**
- Database has `shift_start: null` and `shift_end: null`
- Corrupted data from failed saves

**Solution:**
1. Delete the corrupted schedule
2. Run clear cache script (`PASTE_IN_CONSOLE.txt`)
3. Refresh app
4. Create NEW schedule
5. Verify in console: `shift_start` and `shift_end` have values

---

## Debug Checklist

If kiosk validation not working:

**Step 1: Verify Database**
- [ ] Run `VERIFY_SQL_WORKED.sql`
- [ ] Confirm `id` column is `text`
- [ ] Confirm schedules table has data

**Step 2: Verify Schedule**
- [ ] Schedule exists in Manage Schedule grid
- [ ] Schedule persists after refresh
- [ ] Console shows "Supabase: Schedule created successfully"

**Step 3: Verify Kiosk**
- [ ] Open console (F12) before scanning
- [ ] Look for "Checking schedule for today..."
- [ ] Look for schedule query result
- [ ] Check for any errors

**Step 4: Clear Cache**
- [ ] Run `PASTE_IN_CONSOLE.txt` script
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Try in incognito window

---

## Expected Console Logs (Success)

```
🔍 QR CODE SCANNED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Raw data: {"type":"employee","id":"EMP-1053",...}
Selected action: IN

✅ Parsed QR code data: {...}
   QR Type: employee
   QR ID: EMP-1053
   QR Name: Moises

🔍 Verifying user in database...
✅ Employee verified: Moises, Engineering

🔍 Checking schedule for today...
   User ID: EMP-1053
   Date: 2026-04-20

📊 Schedule query result:
   Data: {
     employee_number: "EMP-1053",
     schedule_date: "2026-04-20",
     shift_start: "08:00:00",
     shift_end: "17:00:00",
     is_day_off: false,
     grace_period: 30
   }

✅ Schedule verified: {
  shift_start: "08:00:00",
  shift_end: "17:00:00",
  grace_period: 30
}

🔍 Checking existing attendance for today...
✅ No existing attendance - proceeding with TIME IN

✅ Attendance recorded successfully
```

---

## Summary

**Test all 5 scenarios:**
1. ❌ No schedule → Blocked ✅
2. ❌ Day off → Blocked ✅
3. ✅ Valid schedule → Allowed ✅
4. ❌ Already timed in → Blocked ✅
5. ✅ Valid time out → Allowed ✅

**If all tests pass:**
🎉 Kiosk validation working correctly!

**If any test fails:**
1. Check console for errors
2. Verify database is fixed
3. Clear old data
4. Re-create schedules
5. Try again
