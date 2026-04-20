# ✅ Admin Kiosk Mode - Complete Setup Guide

## 🎯 What You Need

For admin QR codes to work in Kiosk Mode, you need:

1. ✅ **Admin exists in `admins` table** with `admin_number` (e.g., ADM-001)
2. ✅ **Admin has a QR code** (we already did this with the SQL)
3. ✅ **Admin has schedules in `schedules` table** using `admin_number` field
4. ✅ **Attendance records use `employee_number`** for both employees and admins

---

## 📋 Step-by-Step Setup

### Step 1: Verify Admin Exists
Run this SQL to check if your admin exists:

```sql
SELECT admin_number, full_name, username, department, qr_code
FROM admins
ORDER BY admin_number;
```

**Expected Result:**
```
admin_number | full_name    | username | department | qr_code
-------------|--------------|----------|------------|--------
ADM-001      | John Smith   | jsmith   | IT         | ADM-001
ADM-002      | Jane Doe     | jdoe     | HR         | ADM-002
```

---

### Step 2: Create Schedule for Admin
Admins need schedules to use Kiosk Mode. Run this SQL to create a schedule:

```sql
-- Create schedule for admin ADM-001 for today
INSERT INTO schedules (
  admin_number,           -- Use admin_number for admins
  employee_number,        -- ALSO set this to admin_number for compatibility
  schedule_date,
  time_in,
  time_out,
  is_day_off,
  is_paid_leave,
  created_at,
  updated_at
) VALUES (
  'ADM-001',              -- The admin's number
  'ADM-001',              -- Same as admin_number
  '2026-04-16',           -- Today's date (change this!)
  '08:00:00',             -- Start time
  '17:00:00',             -- End time
  false,                  -- Not a day off
  false,                  -- Not paid leave
  NOW(),
  NOW()
);
```

**⚠️ IMPORTANT:** Change the date `'2026-04-16'` to TODAY's date!

---

### Step 3: Create Weekly Schedule (Optional)
If you want to create a full week schedule for an admin:

```sql
-- Create schedule for ADM-001 for the next 7 days
INSERT INTO schedules (admin_number, employee_number, schedule_date, time_in, time_out, is_day_off, is_paid_leave, created_at, updated_at)
SELECT 
  'ADM-001',
  'ADM-001',
  (CURRENT_DATE + (n || ' days')::interval)::date,
  '08:00:00',
  '17:00:00',
  false,
  false,
  NOW(),
  NOW()
FROM generate_series(0, 6) AS n;
```

---

### Step 4: Verify Schedule Exists
Run this to check if the admin has a schedule for today:

```sql
SELECT 
  admin_number,
  employee_number,
  schedule_date,
  time_in,
  time_out,
  is_day_off,
  is_paid_leave
FROM schedules
WHERE admin_number = 'ADM-001'
  AND schedule_date = CURRENT_DATE;
```

**Expected Result:**
```
admin_number | employee_number | schedule_date | time_in  | time_out | is_day_off | is_paid_leave
-------------|-----------------|---------------|----------|----------|------------|---------------
ADM-001      | ADM-001         | 2026-04-16    | 08:00:00 | 17:00:00 | false      | false
```

---

## 🔧 Database Schema Requirements

### `admins` Table
```sql
-- The admins table should have:
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_number TEXT UNIQUE NOT NULL,  -- e.g., 'ADM-001'
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  department TEXT,
  qr_code TEXT,                        -- Added by our previous SQL
  paid_leave_balance INTEGER DEFAULT 12,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `schedules` Table
```sql
-- The schedules table should support both employees and admins:
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT,                -- For employees: 'EMP-001', for admins: 'ADM-001'
  admin_number TEXT,                   -- For admins only: 'ADM-001'
  schedule_date DATE NOT NULL,
  time_in TIME,
  time_out TIME,
  is_day_off BOOLEAN DEFAULT false,
  is_paid_leave BOOLEAN DEFAULT false,
  schedule_type TEXT,                  -- 'REGULAR', 'PAID_LEAVE', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**KEY POINT:** For admins, set BOTH `admin_number` AND `employee_number` to the same value (e.g., 'ADM-001')

---

## 🎯 How the Kiosk Mode Works Now

### Flow for Admin QR Code:

1. **Admin scans QR code** containing: `{"type":"admin","id":"ADM-001","name":"John Smith"}`
2. **System extracts** `id = "ADM-001"`
3. **Checks employees table** → Not found
4. **Checks admins table** → ✅ Found! (query: `admins?employee_number=ADM-001`)
5. **Checks schedules table** → ✅ Found! (query: `schedules?admin_number=ADM-001&schedule_date=2026-04-16`)
6. **Validates**:
   - ✅ Has schedule for today?
   - ✅ Not on paid leave?
   - ✅ Not a day off?
   - ✅ Hasn't already timed in/out?
7. **Records attendance** → Creates record in `attendance` table with `employee_number=ADM-001`
8. **Shows success** → "TIME IN SUCCESSFUL" or "TIME OUT SUCCESSFUL"

---

## 🚀 Quick Test

### Test Admin QR Code in Kiosk Mode:

1. **Create schedule for today:**
```sql
INSERT INTO schedules (admin_number, employee_number, schedule_date, time_in, time_out, is_day_off, is_paid_leave, created_at, updated_at)
VALUES ('ADM-001', 'ADM-001', CURRENT_DATE, '08:00:00', '17:00:00', false, false, NOW(), NOW());
```

2. **Log in as admin** (ADM-001)
3. **Go to Settings** → My QR Code
4. **Open Kiosk Mode** in another tab: `/kiosk`
5. **Scan the QR code**
6. **Success!** You should see "TIME IN SUCCESSFUL"

---

## ❌ Common Errors & Solutions

### Error: "admin ADM-001 not found in the database"
**Problem:** Admin doesn't exist in the admins table  
**Solution:** Check if admin exists:
```sql
SELECT * FROM admins WHERE admin_number = 'ADM-001';
```

### Error: "You don't have a work schedule today"
**Problem:** No schedule for admin on today's date  
**Solution:** Create schedule for today:
```sql
INSERT INTO schedules (admin_number, employee_number, schedule_date, time_in, time_out, is_day_off, is_paid_leave, created_at, updated_at)
VALUES ('ADM-001', 'ADM-001', CURRENT_DATE, '08:00:00', '17:00:00', false, false, NOW(), NOW());
```

### Error: "User not found. Invalid QR code."
**Problem:** QR code format is wrong or database lookup failed  
**Solution:** 
1. Check browser console for detailed logs
2. Verify QR code contains: `{"type":"admin","id":"ADM-001",...}`
3. Ensure admin exists with correct admin_number

---

## 📊 Verify Everything Works

Run this comprehensive check:

```sql
-- 1. Check admin exists
SELECT 'Admin Exists' as check_name, 
       CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM admins WHERE admin_number = 'ADM-001'

UNION ALL

-- 2. Check admin has QR code
SELECT 'QR Code Set' as check_name,
       CASE WHEN qr_code IS NOT NULL THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM admins WHERE admin_number = 'ADM-001'

UNION ALL

-- 3. Check admin has schedule today
SELECT 'Schedule Today' as check_name,
       CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM schedules 
WHERE admin_number = 'ADM-001' 
  AND schedule_date = CURRENT_DATE;
```

**Expected Output:**
```
check_name      | status
----------------|--------
Admin Exists    | ✅ PASS
QR Code Set     | ✅ PASS
Schedule Today  | ✅ PASS
```

If all 3 checks pass, your admin can use Kiosk Mode! 🎉

---

## 🔄 Create Schedule for All Admins

To create schedules for ALL admins for the next 7 days:

```sql
-- Generate schedules for all admins for the next week
INSERT INTO schedules (admin_number, employee_number, schedule_date, time_in, time_out, is_day_off, is_paid_leave, created_at, updated_at)
SELECT 
  a.admin_number,
  a.admin_number,  -- Set employee_number same as admin_number
  (CURRENT_DATE + (n || ' days')::interval)::date,
  '08:00:00',
  '17:00:00',
  -- Saturday and Sunday are day off
  CASE WHEN EXTRACT(DOW FROM (CURRENT_DATE + (n || ' days')::interval)::date) IN (0, 6) THEN true ELSE false END,
  false,
  NOW(),
  NOW()
FROM admins a
CROSS JOIN generate_series(0, 6) AS n
WHERE NOT EXISTS (
  -- Don't create duplicate schedules
  SELECT 1 FROM schedules s
  WHERE s.admin_number = a.admin_number
    AND s.schedule_date = (CURRENT_DATE + (n || ' days')::interval)::date
);
```

This will:
- Create schedules for all admins
- Set weekends (Saturday/Sunday) as day off
- Avoid duplicate schedules
- Cover the next 7 days

---

## ✅ Final Checklist

Before using Kiosk Mode, ensure:

- [ ] Admin exists in `admins` table with unique `admin_number`
- [ ] Admin has `qr_code` field set (same as `admin_number`)
- [ ] Admin has schedule for TODAY in `schedules` table
- [ ] Schedule has `admin_number` AND `employee_number` both set
- [ ] Schedule is not marked as `is_day_off` or `is_paid_leave`
- [ ] Kiosk Mode page is loaded and camera is working
- [ ] Admin QR code displays correctly in Settings → My QR Code

---

## 🎉 Success!

Once everything is set up, admins can:
- ✅ View their QR code in Settings
- ✅ Download/print their QR code
- ✅ Use Kiosk Mode to clock in/out
- ✅ See their name and role on success
- ✅ Track attendance just like employees
- ✅ Benefit from all validations (schedule, leave, day off, duplicates)

**Admins now work exactly like employees in Kiosk Mode!** 🚀✨
