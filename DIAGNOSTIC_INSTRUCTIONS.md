# 🔍 Admin Kiosk Diagnostic Tool - QUICK FIX

I've created a **diagnostic tool** that will tell you EXACTLY what's wrong!

---

## 📋 Step 1: Run the Diagnostic

1. **Open this URL in your browser:**
   ```
   http://localhost:5173/admin-kiosk-diagnostic
   ```
   
   Or if deployed:
   ```
   https://your-app-url.com/admin-kiosk-diagnostic
   ```

2. **Enter your admin number** (e.g., `ADM-001`)

3. **Click "Run Diagnostic"**

4. **The tool will show you:**
   - ✅ What's working
   - ❌ What's broken
   - 🔧 SQL commands to fix it

---

## 📊 What the Diagnostic Checks

The tool automatically checks:

1. ✅ **Admin exists in database**
2. ✅ **Admin has QR code**
3. ✅ **QR code matches admin number**
4. ✅ **Schedule exists for today**
5. ✅ **Schedule is not a day off**
6. ✅ **Schedule is not paid leave**
7. ✅ **Admin profile in browser storage**

---

## 🔧 The Tool Will Give You SQL Commands

If something is missing, the tool will show you the **EXACT SQL** to run in Supabase.

For example:
```sql
-- If QR code is missing:
UPDATE admins SET qr_code = admin_number WHERE admin_number = 'ADM-001';

-- If schedule is missing:
INSERT INTO schedules (admin_number, employee_number, schedule_date, time_in, time_out, is_day_off, is_paid_leave, created_at, updated_at)
VALUES ('ADM-001', 'ADM-001', CURRENT_DATE, '08:00:00', '17:00:00', false, false, NOW(), NOW());
```

---

## 🚀 Quick Steps

### Method 1: Use the Diagnostic Tool (RECOMMENDED)

1. Go to `/admin-kiosk-diagnostic`
2. Enter your admin number
3. Click "Run Diagnostic"
4. Copy the SQL commands shown
5. Run them in Supabase SQL Editor
6. Try Kiosk Mode again

### Method 2: Manual Check

If you can't access the diagnostic tool, run this SQL manually:

```sql
-- Check what admin numbers you have
SELECT admin_number, full_name, username, qr_code FROM admins;

-- Check what admin number is logged in
-- (This will show in the diagnostic tool's results)
```

Then replace `ADM-001` with your actual admin number.

---

## ❓ Common Questions

### Q: What if I don't know my admin number?

**A:** Run this SQL in Supabase:
```sql
SELECT admin_number, full_name, username FROM admins;
```

This will show all admins and their numbers.

### Q: What if the diagnostic says "Admin not found"?

**A:** Your admin might not be registered yet. Check:
1. Have you registered the admin in the system?
2. Are you using the correct admin number?
3. Run: `SELECT * FROM admins;` to see all admins

### Q: What if multiple things are failing?

**A:** The diagnostic tool will give you SQL commands for each issue. Run them **in order**:
1. First: Fix QR code
2. Second: Fix schedule
3. Third: Test again

### Q: Do I need to log in to use the diagnostic?

**A:** No! The diagnostic tool works without login. Just go to `/admin-kiosk-diagnostic` directly.

---

## 🎯 After Running the Diagnostic

Once all tests show ✅ PASS:

1. **Refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Log in as the admin**
3. **Go to `/kiosk`**
4. **Scan the admin QR code**
5. **Success!** 🎉

---

## 📞 Still Not Working?

If the diagnostic shows all tests passing but Kiosk Mode still doesn't work:

1. **Open browser console (F12)**
2. **Look for error messages**
3. **Take a screenshot**
4. **Share the screenshot and the full diagnostic results**

The diagnostic tool shows everything we need to debug the issue!

---

## 🔗 Quick Links

- **Diagnostic Tool:** `/admin-kiosk-diagnostic`
- **Kiosk Mode:** `/kiosk`
- **Admin Settings:** `/admin/settings`
- **Supabase Dashboard:** Your Supabase project URL

---

## ✅ Expected Diagnostic Results

When everything is working, you should see:

```
Summary
-------
3-7  Passed
0    Failed
0-1  Warnings

✅ Admin Exists in Database
✅ Admin Has QR Code
✅ QR Code Matches Admin Number
✅ Schedule Exists (admin_number query)
✅ Schedule Exists (employee_number query)
✅ Schedule Not Day Off
✅ Schedule Not Paid Leave
✅ Admin Profile in LocalStorage
```

If you see this, your admin can use Kiosk Mode! 🎉
