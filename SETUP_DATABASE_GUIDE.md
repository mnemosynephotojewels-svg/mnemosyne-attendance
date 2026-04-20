# 🔧 DATABASE SETUP GUIDE - Fix Kiosk Mode Saving Issue

## ⚠️ PROBLEM: Kiosk Mode Not Saving

**Symptoms:**
- Kiosk shows "TIME IN SUCCESSFUL" 
- But record doesn't appear in database
- Console shows: `❌❌❌ TABLE INSERT FAILED`
- Error: `relation "attendance_records" does not exist`

**ROOT CAUSE:** The `attendance_records` table doesn't exist in your Supabase database!

---

## ✅ SOLUTION: Create the Table

Follow these steps to create the required database table:

---

## 📝 STEP 1: Open Supabase SQL Editor

1. Go to your **Supabase Dashboard**
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New Query"** button

---

## 📝 STEP 2: Copy the SQL Script

1. Open the file: `/CREATE_ATTENDANCE_TABLE.sql`
2. Copy **ALL** the SQL code
3. Paste it into the Supabase SQL Editor

---

## 📝 STEP 3: Run the SQL Script

1. Click the **"Run"** button (or press Ctrl+Enter)
2. Wait for the script to complete
3. You should see: ✅ **"Success. No rows returned"**

---

## 📝 STEP 4: Verify Table Creation

### **Method 1: Check Table Editor**
1. Go to **"Table Editor"** in Supabase Dashboard
2. Look for **"attendance_records"** table in the list
3. Click on it to see the columns

**Expected Columns:**
| Column Name | Type | Nullable |
|-------------|------|----------|
| id | bigint | NO |
| employee_number | text | NO |
| date | date | NO |
| time_in | timestamptz | YES |
| time_out | timestamptz | YES |
| status | text | YES |
| type | text | YES |
| hours_worked | numeric | YES |
| notes | text | YES |
| leave_request_id | bigint | YES |
| created_at | timestamptz | YES |
| updated_at | timestamptz | YES |

### **Method 2: Run Verification Query**
```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'attendance_records';

-- Should return: attendance_records
```

---

## 📝 STEP 5: Test the Table

Run this test query in SQL Editor:

```sql
-- Test INSERT (simulates TIME IN)
INSERT INTO public.attendance_records 
  (employee_number, date, time_in, status, type, hours_worked, notes)
VALUES
  ('TEST-001', CURRENT_DATE, NOW(), 'ON_TIME', 'PRESENT', 0, 'Test TIME IN')
RETURNING *;
```

**Expected Result:**
```
id | employee_number | date       | time_in              | time_out | status  | type    | hours_worked | notes
---|-----------------|------------|----------------------|----------|---------|---------|--------------|-------------
1  | TEST-001        | 2026-04-15 | 2026-04-15 10:30:00  | null     | ON_TIME | PRESENT | 0            | Test TIME IN
```

✅ **If you see this** → Table is working!

---

## 📝 STEP 6: Test TIME OUT Update

```sql
-- Test UPDATE (simulates TIME OUT)
UPDATE public.attendance_records
SET 
  time_out = NOW(),
  hours_worked = 8.0,
  notes = notes || ' | Test TIME OUT'
WHERE employee_number = 'TEST-001' 
  AND date = CURRENT_DATE
RETURNING *;
```

**Expected Result:**
```
id | employee_number | date       | time_in              | time_out             | hours_worked
---|-----------------|------------|----------------------|----------------------|-------------
1  | TEST-001        | 2026-04-15 | 2026-04-15 10:30:00  | 2026-04-15 18:30:00  | 8.0
```

✅ **If you see this** → Updates are working!

---

## 📝 STEP 7: Clean Up Test Data

```sql
-- Delete test record
DELETE FROM public.attendance_records
WHERE employee_number = 'TEST-001';
```

---

## 📝 STEP 8: Test Kiosk Mode Again

1. **Open Kiosk Mode** → `/kiosk`
2. **Scan Employee QR Code**
3. **Watch for Success Screen**

**Expected Console Logs:**
```
🔄🔄🔄 ATTEMPTING DATABASE INSERT 🔄🔄🔄
   Table: attendance_records
   Record data: {...}
✅✅✅ ATTENDANCE RECORD CREATED SUCCESSFULLY ✅✅✅
   Record ID: 2
   Employee: EMP-001
   Date: 2026-04-15
   Time In: 2026-04-15T10:30:00.000Z
```

✅ **If you see this** → **KIOSK MODE IS NOW SAVING!**

---

## 🔍 STEP 9: Verify in Database

1. Go to **Table Editor** → **attendance_records**
2. Look for the record you just created

**Expected:**
| id | employee_number | date | time_in | time_out | status |
|----|-----------------|------|---------|----------|--------|
| 2 | EMP-001 | 2026-04-15 | 10:30:00 | null | ON_TIME |

✅ **If you see this** → **DATABASE IS SAVING CORRECTLY!**

---

## 🔍 STEP 10: Check Attendance History

1. **Login to Employee Portal** as EMP-001
2. Go to **"Attendance History"** tab

**Expected UI:**
| Date | Check In | Check Out | Status |
|------|----------|-----------|--------|
| Apr 15, 2026 | 10:30 AM | - | On Time |

✅ **If you see this** → **UI IS DISPLAYING CORRECTLY!**

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Permission Denied" Error

**Error Message:**
```
permission denied for table attendance_records
```

**Solution:**
Run this SQL to grant permissions:
```sql
GRANT ALL ON public.attendance_records TO service_role;
GRANT ALL ON public.attendance_records TO anon;
GRANT ALL ON public.attendance_records TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.attendance_records_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.attendance_records_id_seq TO anon;
```

---

### Issue 2: "Duplicate Key Violation" Error

**Error Message:**
```
duplicate key value violates unique constraint "unique_employee_date"
```

**Cause:** Employee already has a TIME IN record for today

**Solution:** This is CORRECT behavior! Employee can only TIME IN once per day.

To test again:
- Delete the existing record, OR
- Use a different employee number, OR
- Change the date to tomorrow

---

### Issue 3: RLS Policy Blocking Inserts

**Error Message:**
```
new row violates row-level security policy
```

**Solution:**
Check if RLS policies are too restrictive:
```sql
-- Temporarily disable RLS for testing
ALTER TABLE public.attendance_records DISABLE ROW LEVEL SECURITY;

-- Test kiosk mode again

-- Re-enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
```

If it works with RLS disabled, update policies:
```sql
-- Allow all inserts (for Kiosk Mode via service role)
DROP POLICY IF EXISTS "Service role can insert attendance" ON public.attendance_records;
CREATE POLICY "Service role can insert attendance"
ON public.attendance_records
FOR INSERT
WITH CHECK (true);
```

---

### Issue 4: Table Exists But Columns Missing

**Error Message:**
```
column "time_in" of relation "attendance_records" does not exist
```

**Solution:**
Add missing columns:
```sql
-- Add time_in column
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS time_in TIMESTAMPTZ;

-- Add time_out column
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS time_out TIMESTAMPTZ;

-- Add status column
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS status TEXT;

-- Add type column
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS type TEXT;

-- Add hours_worked column
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS hours_worked NUMERIC(5, 2) DEFAULT 0;

-- Add notes column
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS notes TEXT;
```

---

## ✅ Final Verification Checklist

After completing all steps, verify:

- [ ] **Table exists:** `attendance_records` appears in Table Editor
- [ ] **Columns exist:** All 12 columns are present
- [ ] **Indexes created:** Query performance is optimized
- [ ] **RLS enabled:** Row Level Security is active
- [ ] **Policies active:** INSERT and UPDATE policies exist
- [ ] **Permissions granted:** service_role can insert/update
- [ ] **Test INSERT works:** Can manually insert records via SQL
- [ ] **Test UPDATE works:** Can manually update records via SQL
- [ ] **Kiosk TIME IN works:** Saves to database successfully
- [ ] **Kiosk TIME OUT works:** Updates existing record
- [ ] **Attendance History shows:** Both TIME IN and TIME OUT display

**If all 11 boxes are checked** → ✅ **DATABASE IS FULLY CONFIGURED!**

---

## 🚨 Still Not Working?

If Kiosk Mode still doesn't save after creating the table:

### **Debug Step 1: Check Edge Function Logs**
1. Go to **Supabase Dashboard** → **Edge Functions** → **server**
2. Click **"Logs"** tab
3. Look for error messages

### **Debug Step 2: Check Browser Console**
1. Open Kiosk Mode
2. Open browser console (F12)
3. Scan QR code
4. Look for:
```
❌❌❌ TABLE INSERT FAILED ❌❌❌
   Error message: ...
   Error code: ...
```

### **Debug Step 3: Test Direct API Call**

Run this in browser console:
```javascript
// Test direct API call to attendance endpoint
const response = await fetch('https://YOUR-PROJECT-ID.supabase.co/functions/v1/make-server-df988758/attendance/record', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR-ANON-KEY'
  },
  body: JSON.stringify({
    employee_number: 'TEST-001',
    action: 'IN',
    timestamp: new Date().toISOString()
  })
});

const result = await response.json();
console.log('API Response:', result);
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "employee_number": "TEST-001",
    "date": "2026-04-15",
    "time_in": "2026-04-15T10:30:00.000Z",
    "status": "ON_TIME"
  },
  "action": "IN"
}
```

---

## 📞 Need More Help?

If you're still having issues after following all steps:

1. **Check these files:**
   - `/CREATE_ATTENDANCE_TABLE.sql` - SQL script to create table
   - `/VERIFY_KIOSK_SQL.md` - SQL queries to verify database
   - `/KIOSK_DEBUG_GUIDE.md` - Comprehensive debugging guide

2. **Provide these details:**
   - Error message from Edge Function logs
   - Error message from browser console
   - Screenshot of Table Editor showing `attendance_records` table
   - Result of test SQL INSERT query

---

**Last Updated:** April 15, 2026  
**File:** `/SETUP_DATABASE_GUIDE.md`
