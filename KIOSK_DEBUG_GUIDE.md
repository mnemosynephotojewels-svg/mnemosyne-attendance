# 🔍 Kiosk Mode TIME IN Debug Guide

## ⚠️ Is TIME IN Saving? - Comprehensive Checklist

Follow these steps IN ORDER to diagnose the issue:

---

## ✅ **STEP 1: Check Browser Console Logs**

### What to Do:
1. Open Kiosk Mode
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Clear the console (click 🚫 icon)
5. Scan an employee QR code
6. **Look for these exact log messages:**

### ✅ Expected Success Path:
```
🔍 [Kiosk] QR CODE SCANNED: EMP-001
📍 [Kiosk] Checking geofence restrictions...
✅ [Kiosk] Location check passed, proceeding with attendance...
✅ [Kiosk] Employee found: { ... }
🔄 [Kiosk] Calling attendance API...
   Employee: EMP-001
   Action: IN
   Timestamp: 2026-04-15T10:30:00.000Z

📡 [Kiosk] API Response: { success: true, data: {...}, action: 'IN' }
   Success: true
   Data: { id: 123, employee_number: 'EMP-001', ... }
   
✅ [Kiosk] Attendance recorded successfully!
✅ [Kiosk] Success result prepared: { ... }
✅ [Kiosk] Attendance successfully recorded, will reset in 4 seconds
```

### ❌ If You See Error:
```
❌ [Kiosk] Attendance API returned failure: { success: false, error: '...' }
```

**Copy the entire error object and check what `error` code is:**
- `NO_SCHEDULE` - Should NOT happen anymore (we fixed this)
- `DUPLICATE_TIME_IN` - Already clocked in today
- `DAY_OFF` - Employee has day off today
- `PAID_LEAVE` - Employee has paid leave today
- `GEOFENCE_FAILED` - Outside allowed location

---

## ✅ **STEP 2: Check Supabase Edge Function Logs**

### What to Do:
1. Go to **Supabase Dashboard**
2. Navigate to **Edge Functions** → **server** → **Logs**
3. Filter logs to **last 15 minutes**
4. Look for the attendance record attempt

### ✅ Expected Success Logs:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 RECORDING ATTENDANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Employee Number: EMP-001
   Action: IN
   Timestamp: 2026-04-15T10:30:00.000Z
   Computed Date: 2026-04-15
   Computed Time: 2026-04-15T10:30:00.000Z

📅 [SCHEDULE CHECK] Query result: { schedules: [...], scheduleCount: 1 }
✅ [SCHEDULE CHECK] Schedule found: { ... }
✅ [SCHEDULE CHECK] Validation passed - proceeding with attendance

📊 Existing records for today: []  <-- No existing record (good!)

⏰ TIME IN - Creating new record with status: ON_TIME
📋 [RECORD DATA]: {
  "date": "2026-04-15",
  "employee_number": "EMP-001",
  "time_in": "2026-04-15T10:30:00.000Z",
  "type": "PRESENT",
  "hours_worked": 0,
  "notes": "Time in via Kiosk Mode",
  "status": "ON_TIME"
}

🔄🔄🔄 ATTEMPTING DATABASE INSERT 🔄🔄🔄
   Table: attendance_records
   Fields to insert: date, employee_number, time_in, type, hours_worked, notes, status

✅✅✅ ATTENDANCE RECORD CREATED SUCCESSFULLY ✅✅✅
   Record ID: 123
   Employee: EMP-001
   Date: 2026-04-15
   Time In: 2026-04-15T10:30:00.000Z
   Status: ON_TIME
   Type: PRESENT
```

### ❌ If You See Database Error:
```
❌❌❌ TABLE INSERT FAILED ❌❌❌
   Error message: ...
   Error code: ...
   Error details: ...
```

**This indicates a database problem!** Common causes:
- Missing columns in `attendance_records` table
- RLS (Row Level Security) policies blocking insert
- Data type mismatch
- Unique constraint violation

---

## ✅ **STEP 3: Check Database Directly**

### What to Do:
1. Go to **Supabase Dashboard**
2. Navigate to **Table Editor**
3. Open **attendance_records** table
4. Filter by today's date: `date = 2026-04-15`
5. Look for the employee's record

### ✅ What to Look For:
```
| id  | employee_number | date       | time_in              | time_out | status  | type    |
|-----|-----------------|------------|----------------------|----------|---------|---------|
| 123 | EMP-001        | 2026-04-15 | 2026-04-15 10:30:00 | null     | ON_TIME | PRESENT |
```

### ❌ If Record is Missing:
The insert failed! Check:
1. **RLS Policies** - Make sure `attendance_records` table allows INSERT
2. **Table Schema** - Verify all required columns exist
3. **Edge Function Logs** - Check for error messages

---

## ✅ **STEP 4: Verify Database Schema**

### Required Columns in `attendance_records`:
```sql
-- Run this query in Supabase SQL Editor:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;
```

### ✅ Expected Columns:
| Column Name      | Data Type                | Nullable |
|------------------|--------------------------|----------|
| id               | bigint / uuid            | NO       |
| employee_number  | text / varchar           | NO       |
| date             | date                     | NO       |
| time_in          | timestamp with time zone | YES      |
| time_out         | timestamp with time zone | YES      |
| status           | text / varchar           | YES      |
| type             | text / varchar           | YES      |
| hours_worked     | numeric / float          | YES      |
| notes            | text                     | YES      |
| created_at       | timestamp with time zone | YES      |
| updated_at       | timestamp with time zone | YES      |

### ❌ If Columns are Missing:
Add them using SQL:
```sql
ALTER TABLE attendance_records 
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS hours_worked numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text;
```

---

## ✅ **STEP 5: Check RLS Policies**

### What to Do:
1. Go to **Supabase Dashboard**
2. Navigate to **Authentication** → **Policies**
3. Find **attendance_records** table
4. Check if **INSERT** is allowed

### ✅ Required Policy:
```sql
-- Allow INSERT from Edge Functions (service role)
-- This policy should exist:
CREATE POLICY "Allow service role to insert attendance"
ON attendance_records
FOR INSERT
TO service_role
WITH CHECK (true);
```

### ❌ If Policy is Missing:
The Edge Function (which uses service role) cannot insert! Add the policy:
```sql
-- Run in Supabase SQL Editor:
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access"
ON attendance_records
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

## ✅ **STEP 6: Test Manual Insert**

### What to Do:
Test if you can manually insert a record:

```sql
-- Run in Supabase SQL Editor:
INSERT INTO attendance_records (
  employee_number,
  date,
  time_in,
  type,
  status,
  hours_worked,
  notes
) VALUES (
  'TEST-001',
  CURRENT_DATE,
  NOW(),
  'PRESENT',
  'ON_TIME',
  0,
  'Manual test insert'
) RETURNING *;
```

### ✅ If Successful:
The table structure is fine! The issue is likely:
- Edge Function code error
- RLS policy blocking Edge Function
- Network/timeout issue

### ❌ If Fails:
Check the error message - it will tell you exactly what's wrong (missing column, constraint violation, etc.)

---

## 🔧 **STEP 7: Common Issues & Solutions**

### Issue 1: "Already timed in today"
**Cause:** Duplicate TIME IN check is working
**Solution:** Check if employee already has a `time_in` record for today
**Fix:** If it's a mistake, delete the existing record and try again

### Issue 2: "No schedule today"
**Cause:** Old code (should be fixed now)
**Solution:** Make sure you've deployed the updated backend
**Check:** Edge Function logs should say "Proceeding with attendance despite no schedule"

### Issue 3: "Outside allowed location"
**Cause:** Geofence check failing
**Solution:** 
- Move closer to the office location
- OR disable geofencing in admin settings
- OR increase the allowed radius

### Issue 4: Record appears in logs but not in database
**Cause:** RLS policy blocking INSERT
**Solution:** Check STEP 5 above and add the service_role policy

### Issue 5: "Table insert failed - column does not exist"
**Cause:** Missing column in database
**Solution:** Check STEP 4 and add missing columns

---

## 📞 **What to Report Back**

If TIME IN is still not saving, please provide:

1. ✅ **Browser Console Logs** (full output after scanning QR)
2. ✅ **Supabase Edge Function Logs** (from the time of scan)
3. ✅ **Database Query Result:**
   ```sql
   SELECT * FROM attendance_records 
   WHERE employee_number = 'YOUR_EMPLOYEE_NUMBER' 
   AND date = CURRENT_DATE;
   ```
4. ✅ **Schema Check Result:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'attendance_records';
   ```
5. ✅ **RLS Policies Check:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'attendance_records';
   ```

---

## 🎯 **Quick Test**

**Fastest way to test if TIME IN is saving:**

1. Open **Kiosk Mode**
2. Open **Browser Console (F12)**
3. Scan QR Code
4. Immediately go to **Supabase Table Editor** → **attendance_records**
5. Refresh the table
6. **Look for new record with today's date**

✅ If record appears → **IT'S WORKING!**
❌ If no record → **Follow this debug guide**

---

## 📝 Summary of What We Fixed

1. ✅ Removed blocking when no schedule exists
2. ✅ Added duplicate TIME IN/OUT detection
3. ✅ Enhanced error logging throughout
4. ✅ Added better user feedback
5. ✅ Comprehensive validation before database insert

The system should now:
- ✅ Allow TIME IN even without schedule
- ✅ Block duplicate TIME IN
- ✅ Block TIME OUT without TIME IN
- ✅ Respect geofence settings
- ✅ Respect day off / paid leave settings
- ✅ Save to database properly

---

**Last Updated:** April 15, 2026
**File:** `/KIOSK_DEBUG_GUIDE.md`
