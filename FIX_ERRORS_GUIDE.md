# 🔧 FIX: grace_period Column Error

## ❌ Error You're Seeing:
```
Could not find the 'grace_period' column of 'schedules' in the schema cache
```

## ✅ Solutions (Pick ONE)

---

### **Option 1: Add grace_period Column (Recommended)**

This adds the `grace_period` column to your schedules table.

#### Run this SQL in Supabase SQL Editor:

```sql
-- Add the grace_period column
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS grace_period INTEGER DEFAULT 30;

-- Add admin_number column (if not already added)
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- Update admins with QR codes
UPDATE admins
SET qr_code = json_build_object(
  'type', 'admin',
  'id', admin_number,
  'name', full_name,
  'department', department,
  'timestamp', NOW()::text
)::text;

-- Create schedules for admins today
DELETE FROM schedules WHERE admin_number IS NOT NULL AND schedule_date = CURRENT_DATE;

INSERT INTO schedules (
  admin_number, employee_number, schedule_date,
  shift_start, shift_end, is_day_off, is_paid_leave,
  grace_period, created_at, updated_at
)
SELECT 
  admin_number, admin_number, CURRENT_DATE,
  '08:00:00', '17:00:00', false, false,
  30, NOW(), NOW()
FROM admins;
```

**File:** Use `/QUICK_ADMIN_FIX.sql`

---

### **Option 2: Skip grace_period Column (Simple)**

This creates schedules WITHOUT the grace_period column.

#### Run this SQL in Supabase SQL Editor:

```sql
-- Add admin_number column only
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- Update admins with QR codes
UPDATE admins
SET qr_code = json_build_object(
  'type', 'admin',
  'id', admin_number,
  'name', full_name,
  'department', department,
  'timestamp', NOW()::text
)::text;

-- Create schedules for admins today (without grace_period)
DELETE FROM schedules WHERE admin_number IS NOT NULL AND schedule_date = CURRENT_DATE;

INSERT INTO schedules (
  admin_number, employee_number, schedule_date,
  shift_start, shift_end, is_day_off, is_paid_leave,
  created_at, updated_at
)
SELECT 
  admin_number, admin_number, CURRENT_DATE,
  '08:00:00', '17:00:00', false, false,
  NOW(), NOW()
FROM admins;
```

**File:** Use `/SIMPLE_ADMIN_FIX.sql`

---

## 🎯 What I Fixed in the Code

I updated the **server** to automatically handle missing `grace_period` column:

1. ✅ **Conditional grace_period**: Only adds it if provided
2. ✅ **Auto-retry**: If insert fails due to grace_period, retries without it
3. ✅ **Better error handling**: Catches and handles the error gracefully

**This means the server will work with OR without the grace_period column!**

---

## 📋 After Running SQL

1. **Hard refresh** your browser:
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Test Kiosk Mode**:
   - Go to: `http://localhost:5173/kiosk`
   - Scan admin QR code
   - Should work now! ✅

3. **Verify with Diagnostic**:
   - Go to: `http://localhost:5173/admin-kiosk-diagnostic`
   - Enter your admin_number
   - Should show "READY FOR KIOSK" ✅

---

## 🔍 What is grace_period?

**Grace period** = Number of minutes an employee can be late without being marked late.

- **Example**: If grace_period = 30, and work starts at 8:00 AM, employee can arrive until 8:30 AM and still be "On Time"
- **Default**: 30 minutes
- **Optional**: Your system works fine without it

---

## ✨ Verification Checklist

After running the SQL:

- [ ] No more `grace_period` errors in console
- [ ] Admin schedules created for today
- [ ] Admin QR codes exist
- [ ] Kiosk Mode recognizes admin QR codes
- [ ] Attendance records successfully

---

## 📞 Still Having Issues?

1. Check browser console (F12) for new errors
2. Run diagnostic tool: `/admin-kiosk-diagnostic`
3. Verify SQL ran successfully in Supabase
4. Check that admin_number format matches (ADM-001, etc.)

---

## 📂 File Reference

| File | Purpose |
|------|---------|
| `/QUICK_ADMIN_FIX.sql` | **Option 1** - With grace_period |
| `/SIMPLE_ADMIN_FIX.sql` | **Option 2** - Without grace_period |
| `/admin-kiosk-diagnostic` | Diagnostic tool |

---

**Pick Option 1 if you want the grace period feature.**  
**Pick Option 2 if you want the simplest fix.**

Both will work! 🚀
