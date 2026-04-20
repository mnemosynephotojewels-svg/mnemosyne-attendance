# 🔧 STEP-BY-STEP FIX FOR SCHEDULES TABLE

## ❌ Error You Got:
```
column "shift_start" of relation "schedules" does not exist
```

This means your `schedules` table has **different column names** than expected.

---

## 📋 STEP 1: Check Your Table Structure

**Run this in Supabase SQL Editor:**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;
```

**Look for the time columns.** You might see:
- ✅ `start_time` and `end_time` (most common)
- ✅ `shift_start` and `shift_end`
- ✅ `time_in` and `time_out`
- ✅ Something else

**Write down what you see!**

---

## 🔨 STEP 2: Run the Fix Based on Your Columns

### **If you see: `start_time` and `end_time`**

```sql
-- Add admin_number column
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- Create QR codes
UPDATE admins
SET qr_code = json_build_object(
  'type', 'admin',
  'id', admin_number,
  'name', full_name,
  'department', department,
  'timestamp', NOW()::text
)::text;

-- Create schedules for admins
DELETE FROM schedules WHERE admin_number IS NOT NULL AND schedule_date = CURRENT_DATE;

INSERT INTO schedules (
  admin_number,
  employee_number,
  schedule_date,
  start_time,
  end_time
)
SELECT 
  admin_number,
  admin_number,
  CURRENT_DATE,
  '08:00:00'::TIME,
  '17:00:00'::TIME
FROM admins;
```

---

### **If you see: `shift_start` and `shift_end`**

```sql
-- Add admin_number column
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- Create QR codes
UPDATE admins
SET qr_code = json_build_object(
  'type', 'admin',
  'id', admin_number,
  'name', full_name,
  'department', department,
  'timestamp', NOW()::text
)::text;

-- Create schedules for admins
DELETE FROM schedules WHERE admin_number IS NOT NULL AND schedule_date = CURRENT_DATE;

INSERT INTO schedules (
  admin_number,
  employee_number,
  schedule_date,
  shift_start,
  shift_end
)
SELECT 
  admin_number,
  admin_number,
  CURRENT_DATE,
  '08:00:00'::TIME,
  '17:00:00'::TIME
FROM admins;
```

---

### **If you DON'T see time columns at all**

Use the minimal fix (only creates schedule_date):

```sql
-- Add admin_number column
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- Create QR codes
UPDATE admins
SET qr_code = json_build_object(
  'type', 'admin',
  'id', admin_number,
  'name', full_name,
  'department', department,
  'timestamp', NOW()::text
)::text;

-- Create minimal schedules
DELETE FROM schedules WHERE admin_number IS NOT NULL AND schedule_date = CURRENT_DATE;

INSERT INTO schedules (
  admin_number,
  employee_number,
  schedule_date
)
SELECT 
  admin_number,
  admin_number,
  CURRENT_DATE
FROM admins;
```

---

## ✅ STEP 3: Verify It Worked

```sql
SELECT 
  a.admin_number,
  a.full_name,
  CASE WHEN a.qr_code IS NOT NULL THEN '✅' ELSE '❌' END as has_qr,
  CASE WHEN s.schedule_date IS NOT NULL THEN '✅' ELSE '❌' END as has_schedule
FROM admins a
LEFT JOIN schedules s ON s.admin_number = a.admin_number AND s.schedule_date = CURRENT_DATE;
```

You should see ✅ for both columns!

---

## 🚀 STEP 4: Test Kiosk Mode

1. **Hard refresh browser:** `Ctrl+Shift+R`
2. Go to: `http://localhost:5173/kiosk`
3. Scan admin QR code
4. ✅ Should work!

---

## 📞 Still Having Issues?

**Tell me what columns you saw in Step 1**, and I'll give you the exact SQL to run!

Copy the output from this query:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'schedules'
ORDER BY ordinal_position;
```

---

## 💡 Quick Files Reference

- **`/CHECK_SCHEDULES_TABLE.sql`** - Check your table structure
- **`/MINIMAL_FIX.sql`** - Works with ANY table (no time columns needed)
- **`/UNIVERSAL_FIX.sql`** - Has all options, uncomment the one you need

---

**The key is matching YOUR table's column names!** Once you tell me what columns you have, this will work perfectly. 🎯
