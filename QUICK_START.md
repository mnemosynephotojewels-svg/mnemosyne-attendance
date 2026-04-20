# ⚡ QUICK START - 2 Minute Fix

## ❌ Your Error
```
Could not find a relationship between 'admins' and 'teams'
```

## ✅ The Fix

### **1️⃣ Run SQL** (30 seconds)

Copy this into **Supabase SQL Editor** and click **RUN**:

```sql
-- Add column
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

-- Create schedules
DELETE FROM schedules WHERE admin_number IS NOT NULL AND schedule_date = CURRENT_DATE;

INSERT INTO schedules (admin_number, employee_number, schedule_date)
SELECT admin_number, admin_number, CURRENT_DATE FROM admins;

-- Verify
SELECT 
  a.admin_number,
  CASE WHEN a.qr_code IS NOT NULL THEN '✅' ELSE '❌' END as qr,
  CASE WHEN s.schedule_date IS NOT NULL THEN '✅' ELSE '❌' END as schedule
FROM admins a
LEFT JOIN schedules s ON s.admin_number = a.admin_number AND s.schedule_date = CURRENT_DATE;
```

**Expected result:** All rows show ✅ ✅

---

### **2️⃣ Refresh Browser** (5 seconds)

Press: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

---

### **3️⃣ Test** (30 seconds)

1. Go to: `http://localhost:5173/admin-kiosk-diagnostic`
2. Enter your admin_number
3. Should show: **"READY FOR KIOSK"**

---

## ✅ Done!

The error is now fixed. The code changes were already applied automatically.

**What changed:**
- ✅ Code now uses `department` field (not `teams` table)
- ✅ Database has admin schedules and QR codes
- ✅ Admin QR codes work in kiosk mode

---

## 🔍 What Was Wrong?

**Admins don't have a relationship with the `teams` table.**

- ❌ Old code: `admins.select('full_name, teams(name)')`  
- ✅ New code: `admins.select('full_name, department')`

Admins use a simple `department` text field, not a foreign key to teams.

---

## 📂 Full Details

See `/ERRORS_FIXED.md` for complete technical explanation.

---

**That's it! Your system is fixed.** 🎉
