# 🎯 Admin QR Code Setup Guide

## Overview
This guide explains how to generate QR codes for all Team Leader Admin accounts in the Mnemosyne Attendance System.

---

## 📋 Quick Access
Visit the setup page at: **`/admin-qr-setup`**

Example: `http://localhost:5173/admin-qr-setup`

---

## 🗄️ SQL Query

Copy and run this SQL query in your Supabase SQL Editor:

```sql
-- ============================================
-- ADMIN QR CODE SETUP
-- This SQL adds QR code support to the admins table
-- ============================================

-- Step 1: Add qr_code column to admins table if it doesn't exist
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS qr_code TEXT;

-- Step 2: Generate QR codes for all admins using their admin_number
-- The QR code value is simply their admin_number (e.g., 'ADM-001')
UPDATE admins
SET qr_code = admin_number
WHERE qr_code IS NULL OR qr_code = '';

-- Step 3: Verify the update
SELECT 
  admin_number,
  full_name,
  username,
  department,
  qr_code,
  CASE 
    WHEN qr_code IS NOT NULL AND qr_code != '' THEN '✅ QR Code Set'
    ELSE '❌ Missing QR Code'
  END as qr_status
FROM admins
ORDER BY admin_number;
```

---

## 📝 Step-by-Step Instructions

### 1. Open Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to **SQL Editor** from the left sidebar

### 2. Run the SQL Query
- Copy the SQL query above
- Paste it into the SQL Editor
- Click **"Run"** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### 3. Verify Results
After running the query, you should see a table showing:
```
admin_number | full_name      | qr_code  | qr_status
-------------|----------------|----------|---------------
ADM-001      | John Smith     | ADM-001  | ✅ QR Code Set
ADM-002      | Jane Doe       | ADM-002  | ✅ QR Code Set
ADM-003      | Mike Johnson   | ADM-003  | ✅ QR Code Set
```

### 4. Access QR Codes
Each admin can now:
1. Log in to their admin account
2. Go to **Settings → My QR Code**
3. View, download, or print their QR code
4. Use it in Kiosk Mode for attendance

---

## 🔧 Technical Details

### QR Code Format
The QR code stores a simple string containing the admin's employee number:
```
ADM-001
```

### Database Schema
- **Column Name**: `qr_code`
- **Data Type**: `TEXT`
- **Nullable**: Yes
- **Default Value**: NULL
- **Purpose**: Store admin employee number for QR code generation

### Kiosk Mode Integration
When an admin scans their QR code in Kiosk Mode, the system will:

1. ✅ Read the scanned value (e.g., "ADM-001")
2. ✅ Check the `employees` table first
3. ✅ If not found, check the `admins` table
4. ✅ Validate schedule for today
5. ✅ Check if on paid leave
6. ✅ Check if day off
7. ✅ Prevent duplicate time in/out
8. ✅ Record attendance if all validations pass

---

## ✅ What This Enables

After running the SQL query, team leader admins can:

- **View their QR code** in Settings page
- **Download QR code** as PNG image
- **Print QR code** for physical use
- **Use QR code in Kiosk Mode** to clock in/out
- **Track attendance** just like employees
- **Benefit from all validations**:
  - Schedule checking
  - Paid leave detection
  - Day off detection
  - Duplicate prevention

---

## 🎨 How to Use QR Codes

### For Admins:
1. Log in to admin account
2. Navigate to **Settings**
3. Scroll to **"My QR Code"** section
4. Click **"Download QR Code"** to save as PNG
5. Print or save to phone
6. Use at Kiosk Mode terminal

### For Kiosk Mode:
1. Open Kiosk Mode page (`/kiosk`)
2. Position QR code in front of camera
3. System automatically:
   - Recognizes admin
   - Validates schedule
   - Records time in/out
   - Shows success message

---

## 🚀 Expected Results

### Before Running SQL:
- Admins have `qr_code = NULL`
- QR code section shows "Loading..." or error
- Cannot use Kiosk Mode

### After Running SQL:
- Admins have `qr_code = admin_number`
- QR code displays correctly in Settings
- Can download and print QR codes
- Can use Kiosk Mode successfully
- All validations work properly

---

## 🛡️ Security & Privacy

- QR codes only contain the admin_number (e.g., "ADM-001")
- No sensitive data (passwords, personal info) in QR codes
- QR codes are unique per admin
- Can only be used when admin has a valid schedule
- All attendance rules apply (paid leave, day off, duplicates)

---

## 📊 Database Structure

```sql
-- Admins table structure (relevant columns)
CREATE TABLE admins (
  id UUID PRIMARY KEY,
  admin_number TEXT UNIQUE,        -- e.g., 'ADM-001'
  full_name TEXT,
  username TEXT,
  password TEXT,
  department TEXT,
  qr_code TEXT,                    -- Added by this migration
  paid_leave_balance INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🔍 Troubleshooting

### Issue: QR code column already exists
**Solution**: The SQL uses `IF NOT EXISTS`, so it's safe to run multiple times.

### Issue: Some admins missing QR codes
**Solution**: Run the UPDATE query again:
```sql
UPDATE admins
SET qr_code = admin_number
WHERE qr_code IS NULL OR qr_code = '';
```

### Issue: QR code not showing in Settings
**Solution**: 
1. Clear browser cache
2. Log out and log back in
3. Verify the admin has an `admin_number`

### Issue: Kiosk Mode not recognizing admin QR
**Solution**:
1. Ensure the SQL query was run successfully
2. Check that `qr_code = admin_number` in database
3. Verify Kiosk Mode is using the updated code
4. Check browser console for errors

---

## 📱 Next Steps

After completing this setup:

1. ✅ All admins have QR codes
2. ✅ Notify admins to download their QR codes
3. ✅ Test Kiosk Mode with admin QR codes
4. ✅ Verify attendance records are created correctly
5. ✅ Ensure all validations work as expected

---

## 🎯 Summary

This SQL migration enables Team Leader Admins to:
- Have scannable QR codes for attendance
- Use Kiosk Mode just like employees
- Benefit from all attendance validations
- Track their own attendance records

**One-time setup** → **Lifetime benefit** for all current and future admins!

---

## 💡 Pro Tips

1. **Bulk Print**: Download all admin QR codes and print them together
2. **Mobile Access**: Admins can save QR code image to their phones
3. **Backup**: Keep a digital copy of all QR codes in a secure location
4. **Labeling**: Add admin names when printing QR codes for easy identification
5. **Testing**: Test each admin's QR code in Kiosk Mode before deployment

---

## 📞 Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify the SQL query ran successfully in Supabase
3. Ensure the admin has a valid `admin_number`
4. Test with a fresh browser session (clear cache)
5. Check that Kiosk Mode page is updated

---

**Created for Mnemosyne QR Attendance System** 🎯✨
