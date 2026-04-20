# 🔧 How to Fix: Admin Leave Balance Always Shows 12/12

## The Problem

The admin leave balance always shows **"12 / 12 days remaining"** even after super admin approves leave requests. The balance never updates.

**Why:** The `paid_leave_balance` column doesn't exist in the `admins` database table.

---

## The Solution (5 Minutes)

### Step 1: Run the SQL Migration ⚡

**Copy this SQL:**

```sql
-- Add the missing column
ALTER TABLE admins
ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;

-- Set default balance for existing admins
UPDATE admins
SET paid_leave_balance = 12
WHERE paid_leave_balance IS NULL;
```

**Where to run it:**

1. Open: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new
2. Paste the SQL above
3. Click **"Run"** button
4. You should see: "Success. No rows returned"

**OR use the pre-made file:**

Open `/workspaces/default/code/FIX_ADMIN_BALANCE.sql` and copy ALL of it into Supabase SQL Editor.

---

### Step 2: Reload Schema Cache 🔄

**CRITICAL:** After running SQL, you MUST reload the schema cache:

1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api
2. Scroll down to **"Schema Cache"**
3. Click **"Reload schema cache"** button
4. Wait for success message

---

### Step 3: Deploy Backend Code 🚀

1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/functions
2. Click on **`make-server-df988758`**
3. Open file: `/workspaces/default/code/supabase/functions/make-server/index.tsx`
4. **Copy ALL the code** from that file (Ctrl+A, Ctrl+C)
5. **Paste** into Supabase dashboard editor
6. Click **"Deploy"** button
7. Wait for "Deployment successful"

---

### Step 4: Test the Fix ✅

1. **Login as admin** (team leader)
2. Go to **"My Leave Request"** tab
3. **Submit a leave request** (e.g., 3 days)
4. Balance should still show **12 / 12** (pending approval)

5. **Login as super admin**
6. Go to **"Leave Requests"** page
7. **Approve** the admin's leave request

8. **Go back to admin account**
9. Go to **"My Leave Request"** tab
10. **Within 10 seconds**, balance should update to **9 / 12** ✅

---

## How to Know if It's Working

### ✅ Success Indicators:

**In Browser Console (F12):**
```
✅ Admin leave balance: 9
✅ Column Exists: true
✅ Admin balance updated successfully!
   Updated Admin: John Smith
   New Balance in DB: 9
```

**In Leave Balance Card:**
```
9 / 12
days remaining
[Progress bar at 75%]
```

### ❌ Still Broken Indicators:

**In Browser Console (F12):**
```
❌ DATABASE MIGRATION REQUIRED!
❌ The paid_leave_balance column does NOT exist in admins table!
⚠️ Migration Required: true
⚠️ Column Exists: false
```

**In Leave Balance Card:**
```
12 / 12  ← Always stuck at 12
days remaining
[Progress bar at 100%]
```

**Error Toast:**
```
⚠️ Database migration required! Balance will always show 12 until migration is run.
```

---

## Troubleshooting

### Issue: Still shows 12/12 after running SQL

**Solution:**
1. Check browser console (F12)
2. Look for error message about migration
3. Make sure you clicked **"Reload schema cache"**
4. Hard refresh page (Ctrl+Shift+R)

### Issue: Console says "Column Exists: false"

**Solution:**
1. SQL didn't run successfully
2. Re-run the SQL migration
3. Check for SQL errors in Supabase
4. Make sure you're running it on the correct project

### Issue: Console says "Failed to update admin balance"

**Solution:**
1. Backend code not deployed
2. Go through Step 3 again
3. Make sure deployment succeeded
4. Reload schema cache again

### Issue: Balance updates but shows wrong number

**Solution:**
1. Check if admin has multiple approved requests
2. Each approval deducts from balance
3. Run this SQL to check:
   ```sql
   SELECT admin_number, full_name, paid_leave_balance
   FROM admins
   WHERE admin_number = 'YOUR_ADMIN_NUMBER';
   ```

---

## Understanding the Auto-Refresh System

The admin leave balance now refreshes automatically every **10 seconds** and also refreshes when:

1. ✅ Page loads
2. ✅ Leave requests are loaded
3. ✅ Any leave request is approved/rejected
4. ✅ Admin submits a new request
5. ✅ User clicks refresh button (↻)

You don't need to manually refresh anymore - just wait 10 seconds!

---

## Quick Verification Checklist

- [ ] Ran SQL migration in Supabase SQL Editor
- [ ] Clicked "Reload schema cache" in API settings
- [ ] Deployed backend code from make-server/index.tsx
- [ ] Tested: Submit leave request as admin
- [ ] Tested: Approve as super admin
- [ ] Verified: Balance updates within 10 seconds
- [ ] Checked: Browser console shows "Column Exists: true"
- [ ] Confirmed: No error toast about migration required

---

## Need More Help?

**Check the detailed logs:**

1. Open browser console (F12)
2. Submit leave request as admin
3. Approve as super admin
4. Watch the console logs in admin account
5. Look for these messages:

```
💰 FETCHING ADMIN LEAVE BALANCE
📊 Admin record found
✅ Admin leave balance: [number]
```

If you see error messages, copy them and they'll help diagnose the issue!

---

## Summary

The fix is simple:

1. **Run SQL** to add column ➡️ 30 seconds
2. **Reload schema cache** ➡️ 10 seconds
3. **Deploy backend** ➡️ 2 minutes
4. **Test** ➡️ 1 minute

**Total time: ~5 minutes**

After this, the leave balance will update automatically and correctly! 🎉
