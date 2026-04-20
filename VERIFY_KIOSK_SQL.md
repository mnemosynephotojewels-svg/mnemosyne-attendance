# 🔍 SQL Queries to Verify Kiosk Mode Saves

Use these SQL queries in **Supabase SQL Editor** to manually verify that Kiosk Mode is saving attendance records correctly.

---

## ✅ Query 1: Check Today's Attendance Records

```sql
-- Shows all attendance records for today across all employees
SELECT 
  id,
  employee_number,
  date,
  time_in,
  time_out,
  status,
  type,
  notes,
  created_at
FROM attendance_records
WHERE date = CURRENT_DATE
ORDER BY created_at DESC;
```

**Expected Result:**
| id | employee_number | date | time_in | time_out | status | type |
|----|-----------------|------|---------|----------|--------|------|
| 123 | EMP-001 | 2026-04-15 | 2026-04-15 10:30:00+00 | null | ON_TIME | PRESENT |

**What to Check:**
- ✅ `time_in` has a timestamp (not null)
- ✅ `status` is either "ON_TIME" or "LATE"
- ✅ `type` is "PRESENT"
- ✅ `notes` says "Time in via Kiosk Mode"

---

## ✅ Query 2: Check Specific Employee Today

```sql
-- Replace 'EMP-001' with your employee number
SELECT 
  id,
  employee_number,
  date,
  time_in,
  time_out,
  status,
  type,
  hours_worked,
  notes,
  created_at,
  updated_at
FROM attendance_records
WHERE employee_number = 'EMP-001'
  AND date = CURRENT_DATE;
```

**Expected Result:**
```
id: 123
employee_number: EMP-001
date: 2026-04-15
time_in: 2026-04-15 10:30:00+00
time_out: null
status: ON_TIME
type: PRESENT
hours_worked: 0
notes: Time in via Kiosk Mode
created_at: 2026-04-15 10:30:05+00
updated_at: 2026-04-15 10:30:05+00
```

**What to Check:**
- ✅ Record exists (not empty)
- ✅ `time_in` matches when you scanned
- ✅ `created_at` is recent (within last few minutes)

---

## ✅ Query 3: Count Attendance by Status (Today)

```sql
-- Shows distribution of attendance statuses today
SELECT 
  status,
  COUNT(*) as count,
  STRING_AGG(employee_number, ', ') as employees
FROM attendance_records
WHERE date = CURRENT_DATE
GROUP BY status
ORDER BY count DESC;
```

**Expected Result:**
| status | count | employees |
|--------|-------|-----------|
| ON_TIME | 5 | EMP-001, EMP-002, EMP-003, EMP-004, EMP-005 |
| LATE | 2 | EMP-006, EMP-007 |

**What to Check:**
- ✅ Your employee's status is correct
- ✅ Count matches number of employees who clocked in

---

## ✅ Query 4: Find Records with TIME IN but No TIME OUT

```sql
-- Useful to see who hasn't clocked out yet
SELECT 
  employee_number,
  date,
  time_in,
  status,
  EXTRACT(HOUR FROM (NOW() - time_in)) as hours_since_time_in
FROM attendance_records
WHERE date = CURRENT_DATE
  AND time_in IS NOT NULL
  AND time_out IS NULL
ORDER BY time_in ASC;
```

**Expected Result:**
| employee_number | date | time_in | status | hours_since_time_in |
|-----------------|------|---------|--------|---------------------|
| EMP-001 | 2026-04-15 | 10:30:00+00 | ON_TIME | 3.5 |
| EMP-002 | 2026-04-15 | 10:45:00+00 | LATE | 3.25 |

**What to Check:**
- ✅ Employee who just clocked in appears here
- ✅ `time_out` is NULL (hasn't clocked out yet)

---

## ✅ Query 5: Verify Duplicate Prevention

```sql
-- Check if employee has multiple TIME IN records for today (should be 0 or 1)
SELECT 
  employee_number,
  COUNT(*) as time_in_count,
  MAX(time_in) as last_time_in
FROM attendance_records
WHERE date = CURRENT_DATE
  AND time_in IS NOT NULL
GROUP BY employee_number
HAVING COUNT(*) > 1; -- Only show duplicates
```

**Expected Result:**
```
(No rows)
```

**What to Check:**
- ✅ Query returns NO rows (no duplicates)
- ✅ If rows appear, duplicate prevention is not working

---

## ✅ Query 6: Recent 10 Attendance Records (All Time)

```sql
-- Shows most recent attendance records across all dates
SELECT 
  employee_number,
  date,
  time_in,
  time_out,
  status,
  type,
  hours_worked,
  notes,
  created_at
FROM attendance_records
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:**
Shows last 10 records in reverse chronological order

**What to Check:**
- ✅ Most recent record is the one you just created
- ✅ `created_at` timestamp is very recent

---

## ✅ Query 7: Check TIME OUT Updates

```sql
-- After doing TIME OUT, verify it updated the record
SELECT 
  id,
  employee_number,
  date,
  time_in,
  time_out,
  hours_worked,
  updated_at
FROM attendance_records
WHERE employee_number = 'EMP-001'
  AND date = CURRENT_DATE
  AND time_in IS NOT NULL
  AND time_out IS NOT NULL; -- Both should be filled
```

**Expected Result After TIME OUT:**
```
id: 123
employee_number: EMP-001
date: 2026-04-15
time_in: 2026-04-15 10:30:00+00
time_out: 2026-04-15 17:30:00+00  ✅ UPDATED!
hours_worked: 7.0  ✅ CALCULATED!
updated_at: 2026-04-15 17:30:05+00  ✅ MORE RECENT!
```

**What to Check:**
- ✅ `time_out` is filled (not null)
- ✅ `hours_worked` is calculated
- ✅ `updated_at` is more recent than `created_at`

---

## ✅ Query 8: Verify Attendance by Date Range

```sql
-- Check attendance records for a specific date range
SELECT 
  employee_number,
  date,
  time_in,
  time_out,
  status,
  type
FROM attendance_records
WHERE date BETWEEN '2026-04-01' AND '2026-04-30'
  AND employee_number = 'EMP-001'
ORDER BY date DESC;
```

**Expected Result:**
Shows all records for that employee in April 2026

**What to Check:**
- ✅ All days have records
- ✅ No missing dates (unless scheduled day off)

---

## ✅ Query 9: Check Paid Leave vs Regular Attendance

```sql
-- Distinguish between paid leave and regular attendance
SELECT 
  date,
  status,
  type,
  time_in,
  time_out,
  leave_request_id,
  CASE 
    WHEN status = 'PAID_LEAVE' THEN 'Paid Leave Day'
    WHEN time_in IS NOT NULL AND time_out IS NOT NULL THEN 'Full Day Worked'
    WHEN time_in IS NOT NULL AND time_out IS NULL THEN 'Clocked In Only'
    ELSE 'Other'
  END as record_type
FROM attendance_records
WHERE employee_number = 'EMP-001'
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

**Expected Result:**
| date | status | type | time_in | time_out | record_type |
|------|--------|------|---------|----------|-------------|
| 2026-04-15 | ON_TIME | PRESENT | 10:30 | null | Clocked In Only |
| 2026-04-14 | PAID_LEAVE | PAID_LEAVE | null | null | Paid Leave Day |
| 2026-04-13 | ON_TIME | PRESENT | 09:00 | 17:00 | Full Day Worked |

**What to Check:**
- ✅ Regular attendance has `time_in` filled
- ✅ Paid leave records have `status` = 'PAID_LEAVE'

---

## ✅ Query 10: Validate Table Schema

```sql
-- Check if all required columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'attendance_records'
ORDER BY ordinal_position;
```

**Expected Columns:**
| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| id | bigint or uuid | NO |
| employee_number | text or varchar | NO |
| date | date | NO |
| time_in | timestamp with time zone | YES |
| time_out | timestamp with time zone | YES |
| status | text or varchar | YES |
| type | text or varchar | YES |
| hours_worked | numeric or float | YES |
| notes | text | YES |
| leave_request_id | bigint or uuid | YES |
| created_at | timestamp with time zone | YES |
| updated_at | timestamp with time zone | YES |

**What to Check:**
- ✅ All columns exist
- ✅ `time_in` and `time_out` are TIMESTAMP types
- ✅ `employee_number` and `date` are NOT NULL

---

## 🔧 Troubleshooting Queries

### If No Records Appear:

```sql
-- Check if table is completely empty
SELECT COUNT(*) as total_records FROM attendance_records;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'attendance_records';

-- Check if using KV store instead
-- (This requires server access, not directly queryable via SQL)
```

### If Duplicate Records Appear:

```sql
-- Find duplicate TIME IN records for same employee/date
SELECT 
  employee_number,
  date,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as record_ids
FROM attendance_records
WHERE date = CURRENT_DATE
GROUP BY employee_number, date
HAVING COUNT(*) > 1;
```

### If TIME OUT Not Updating:

```sql
-- Check if a new record was created instead of updating
SELECT * FROM attendance_records
WHERE employee_number = 'EMP-001'
  AND date = CURRENT_DATE
ORDER BY created_at DESC;

-- Should show only 1 record with both time_in and time_out
-- If shows 2 records, TIME OUT created new record instead of updating
```

---

## 📊 Quick Verification Script

Run this all at once to get a complete picture:

```sql
-- COMPREHENSIVE VERIFICATION SCRIPT
SELECT 'Today''s Total Records' as metric, COUNT(*)::text as value FROM attendance_records WHERE date = CURRENT_DATE
UNION ALL
SELECT 'Records with TIME IN', COUNT(*)::text FROM attendance_records WHERE date = CURRENT_DATE AND time_in IS NOT NULL
UNION ALL
SELECT 'Records with TIME OUT', COUNT(*)::text FROM attendance_records WHERE date = CURRENT_DATE AND time_out IS NOT NULL
UNION ALL
SELECT 'ON_TIME Status', COUNT(*)::text FROM attendance_records WHERE date = CURRENT_DATE AND status = 'ON_TIME'
UNION ALL
SELECT 'LATE Status', COUNT(*)::text FROM attendance_records WHERE date = CURRENT_DATE AND status = 'LATE'
UNION ALL
SELECT 'PAID_LEAVE Status', COUNT(*)::text FROM attendance_records WHERE date = CURRENT_DATE AND status = 'PAID_LEAVE';
```

**Expected Result:**
| metric | value |
|--------|-------|
| Today's Total Records | 10 |
| Records with TIME IN | 10 |
| Records with TIME OUT | 3 |
| ON_TIME Status | 7 |
| LATE Status | 2 |
| PAID_LEAVE Status | 1 |

---

## ✅ Success Criteria

After running these queries, you should see:

- ✅ **Query 1:** Today's records appear
- ✅ **Query 2:** Specific employee record exists with `time_in` filled
- ✅ **Query 3:** Status distribution looks correct
- ✅ **Query 4:** Employees who haven't clocked out appear
- ✅ **Query 5:** NO duplicates found
- ✅ **Query 6:** Most recent record matches your test
- ✅ **Query 7:** TIME OUT properly updates existing record
- ✅ **Query 10:** All required columns exist

**If all queries pass** → ✅ **KIOSK MODE IS SAVING CORRECTLY!**

---

**Last Updated:** April 15, 2026  
**File:** `/VERIFY_KIOSK_SQL.md`
