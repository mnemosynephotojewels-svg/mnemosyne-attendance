# 🔧 ADMIN KIOSK MODE FIX GUIDE

## ❌ Problem
Team leader admins can't use Kiosk Mode - getting errors:
- **"Admin not found in database"**
- **"Could not find the 'grace_period' column"**

## ✅ Solution
The database is missing required data for admin attendance tracking. Follow these 3 simple steps:

---

## 📋 STEP 1: Run Diagnostic Tool

1. Open your browser and go to:
   ```
   http://localhost:5173/admin-kiosk-diagnostic
   ```

2. Enter your admin number (e.g., `ADM-001`)

3. Click **"Run Diagnostic"**

4. If you see **"NEEDS FIX"**, continue to Step 2

---

## 🛠️ STEP 2: Run SQL Fix

### Option A: Copy from file (Recommended)

1. Open the file: **`/QUICK_ADMIN_FIX.sql`** (in your project root)

2. Copy ALL the SQL code

3. Go to: **Supabase Dashboard → SQL Editor**

4. Paste and click **"Run"**

### Option B: Paste directly

Go to Supabase SQL Editor and run this:

```sql
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: Add admin_number column to schedules (if missing)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 2: Update ALL admins with QR codes
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UPDATE admins
SET qr_code = json_build_object(
  'type', 'admin',
  'id', admin_number,
  'name', full_name,
  'department', department,
  'timestamp', NOW()::text
)::text;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 3: Create TODAY's schedule for ALL admins
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- First delete any existing schedules for admins today
DELETE FROM schedules 
WHERE admin_number IS NOT NULL 
AND schedule_date = CURRENT_DATE;

-- Then insert fresh schedules for all admins
INSERT INTO schedules (
  admin_number,
  employee_number,
  schedule_date,
  shift_start,
  shift_end,
  is_day_off,
  is_paid_leave,
  grace_period,
  created_at,
  updated_at
)
SELECT 
  admin_number,
  admin_number,
  CURRENT_DATE,
  '08:00:00',
  '17:00:00',
  false,
  false,
  30,
  NOW(),
  NOW()
FROM admins;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICATION: Check if everything is ready
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT 
  a.admin_number,
  a.full_name,
  a.department,
  CASE WHEN a.qr_code IS NOT NULL THEN '✅' ELSE '❌' END as has_qr,
  CASE WHEN s.schedule_date IS NOT NULL THEN '✅' ELSE '❌' END as has_schedule,
  s.shift_start,
  s.shift_end
FROM admins a
LEFT JOIN schedules s ON s.admin_number = a.admin_number AND s.schedule_date = CURRENT_DATE;
```

---

## ✅ STEP 3: Verify the Fix

### 3A: Check Diagnostic Again

1. Go back to: `http://localhost:5173/admin-kiosk-diagnostic`

2. Enter your admin number

3. Click **"Run Diagnostic"**

4. You should see: **"READY FOR KIOSK"** ✅

### 3B: Test Kiosk Mode

1. **Hard refresh** your browser:
   - **Windows:** `Ctrl + Shift + R`
   - **Mac:** `Cmd + Shift + R`

2. Go to: `http://localhost:5173/kiosk`

3. **Scan your admin QR code** (from `/admin/qr-code`)

4. It should work! ✅

---

## 📊 What This Fix Does

1. **Adds `admin_number` column** to schedules table
   - Allows admins to have work schedules

2. **Generates QR codes** for all admins
   - Creates proper JSON format QR data

3. **Creates today's schedule** for all admins
   - Default: 8:00 AM - 5:00 PM
   - Customize times in the SQL if needed

---

## 🔍 Troubleshooting

### Still getting "admin not found"?

**Check these:**

1. ✅ Run the diagnostic tool first
2. ✅ Make sure you ran ALL 3 SQL steps
3. ✅ Hard refresh browser (Ctrl+Shift+R)
4. ✅ Check browser console for errors (F12)

### QR code not scanning?

**Try this:**

1. Go to `/admin/qr-code` page
2. Download a fresh QR code
3. Try scanning again in Kiosk Mode

### Schedule not found?

**The SQL creates today's schedule only.**

To create schedules for other dates, modify the SQL:

```sql
-- Change CURRENT_DATE to specific date
INSERT INTO schedules (...)
SELECT 
  admin_number,
  admin_number,
  '2026-04-17'::DATE,  -- ← Change this date
  '08:00:00',
  '17:00:00',
  ...
```

---

## 📝 Files Reference

| File | Purpose |
|------|---------|
| `/QUICK_ADMIN_FIX.sql` | Simple 3-step SQL fix |
| `/FIX_ADMIN_KIOSK_DATABASE.sql` | Comprehensive fix with explanations |
| `http://localhost:5173/admin-kiosk-diagnostic` | Diagnostic tool |

---

## 🎯 Expected Results After Fix

### Before Fix:
```
❌ Admin not found in database
❌ No QR code
❌ No schedule
```

### After Fix:
```
✅ Admin found in admins table
✅ QR code exists and valid
✅ Schedule exists for today
✅ Kiosk Mode works perfectly
```

---

## 📞 Need More Help?

If you still have issues after following all steps:

1. Check browser console (F12) for errors
2. Look at server logs in Supabase
3. Run the diagnostic tool and share results
4. Check that your admin_number format matches (e.g., ADM-001)

---

## ✨ Success Checklist

- [ ] Ran diagnostic tool - shows "NEEDS FIX"
- [ ] Executed all 3 SQL steps in Supabase
- [ ] Ran diagnostic again - shows "READY"
- [ ] Hard refreshed browser
- [ ] Scanned admin QR code in Kiosk Mode
- [ ] Attendance recorded successfully! 🎉

---

**Good luck! Your admin accounts should now work perfectly in Kiosk Mode.** 🚀