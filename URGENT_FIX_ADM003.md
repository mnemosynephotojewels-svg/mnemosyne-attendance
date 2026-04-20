# 🚨 URGENT: Fix ADM-003 Leave Balance Not Updating

## Current Situation

- **Admin:** ADM-003
- **Leave approved:** 8 days
- **Expected balance:** Should be 4/12 (12 - 8 = 4)
- **Actual balance:** Still showing 12/12 ❌
- **Problem:** Backend NOT deployed + Database column missing

---

## Why It's Not Working

When super admin approved the 8-day leave:

```
Super Admin clicks "Approve"
         ↓
Backend tries to update balance
         ↓
❌ FAILS because backend is not deployed
         ↓
Balance stays at 12/12
```

---

## Fix Right Now (5 Minutes)

### STEP 1: Deploy Backend (CRITICAL - Do This First!)

**Without this, NOTHING will work!**

1. **Open this link in new tab:**
   ```
   https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/functions
   ```

2. **You should see a list**. Find and click:
   ```
   make-server-df988758
   ```

3. **In the editor, you'll see existing code**. DELETE ALL OF IT.

4. **Open this file on your computer:**
   ```
   /workspaces/default/code/supabase/functions/make-server/index.tsx
   ```

5. **Select ALL the code** (Ctrl+A or Cmd+A)

6. **Copy it** (Ctrl+C or Cmd+C)

7. **Go back to Supabase** and **Paste** the code (Ctrl+V or Cmd+V)

8. **Look for the green "Deploy" button** at the top right

9. **Click "Deploy"**

10. **Wait 10-30 seconds** for "Deployment successful"

✅ **Done with Step 1!**

---

### STEP 2: Run SQL Migration

**This creates the balance column in the database.**

1. **Open this link in new tab:**
   ```
   https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new
   ```

2. **Copy and paste this SQL:**

```sql
-- Add the missing column
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;

-- Set balance for existing admins
UPDATE admins 
SET paid_leave_balance = 12 
WHERE paid_leave_balance IS NULL;

-- Verify it worked
SELECT admin_number, full_name, paid_leave_balance 
FROM admins 
ORDER BY admin_number;
```

3. **Click "Run"** button

4. **You should see a table** showing all admins with their balances

✅ **Done with Step 2!**

---

### STEP 3: Reload Schema Cache

**CRITICAL: This makes Supabase recognize the new column.**

1. **Open this link:**
   ```
   https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api
   ```

2. **Scroll down** to find "Schema Cache" section

3. **Click "Reload schema cache"** button

4. **Wait for success message**

✅ **Done with Step 3!**

---

### STEP 4: Manually Fix ADM-003 Balance

Since the leave was already approved, we need to manually fix the balance:

1. **Still in SQL Editor**, run this:

```sql
-- Fix ADM-003 balance (12 - 8 days approved = 4 remaining)
UPDATE admins 
SET paid_leave_balance = 4 
WHERE admin_number = 'ADM-003';

-- Verify it worked
SELECT admin_number, full_name, paid_leave_balance 
FROM admins 
WHERE admin_number = 'ADM-003';
```

2. **You should see:** ADM-003 with balance = 4

✅ **Done with Step 4!**

---

### STEP 5: Verify It's Working

1. **Login as ADM-003**

2. **Go to "My Leave Request" tab**

3. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)

4. **Check the Leave Balance card**

5. **Should now show:** **4 / 12 days remaining**

6. **Progress bar** should show 33% (4 out of 12)

---

## Expected Results After Fix

### In Browser Console (F12):

✅ **Success - Should see:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 FETCHING ADMIN LEAVE BALANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin Number: ADM-003
Response status: 200
Response ok: true
📦 Response data: {success: true, data: 4, columnExists: true}
📊 Balance Details:
   - Current Balance: 4
   - Column Exists: true
   - Migration Required: false
✅ Admin leave balance: 4
```

### In Leave Balance Card:

```
┌─────────────────────────┐
│  📅 Leave Balance       │
│     Annual paid days    │
│                         │
│  4 / 12                 │
│  days remaining         │
│  █████░░░░░░░░░░  33%   │
└─────────────────────────┘
```

❌ **Still broken - Will see:**
```
🔴 Backend not responding!
TypeError: Failed to fetch
Balance: 12 / 12 (stuck)
```

---

## Testing Future Leave Requests

After the fix, test with a new request:

1. **Login as another admin** (e.g., ADM-004)
2. **Submit 2-day leave request**
3. **Login as super admin**
4. **Approve the request**
5. **Console should show:**
   ```
   ✅ Admin balance updated successfully!
      New Balance in DB: 10
   ```
6. **Login back as ADM-004**
7. **Within 10 seconds**, balance should show **10 / 12**

---

## Troubleshooting

### Issue: Still shows "Failed to fetch"

**Cause:** Backend not deployed correctly

**Solution:**
1. Go back to Step 1
2. Make sure you clicked "Deploy" button
3. Wait for success message
4. Try again

### Issue: Still shows 12/12 after deployment

**Cause:** SQL migration not run or schema cache not reloaded

**Solution:**
1. Go back to Step 2 - Run SQL
2. Go back to Step 3 - Reload schema cache
3. Go to Step 4 - Manually fix ADM-003
4. Hard refresh browser (Ctrl+Shift+R)

### Issue: Shows 4/12 but then goes back to 12/12

**Cause:** Auto-refresh is re-fetching from database

**Solution:**
- This means it's working!
- If it goes back to 12, check the database with SQL:
  ```sql
  SELECT admin_number, paid_leave_balance FROM admins WHERE admin_number = 'ADM-003';
  ```
- If database shows 12, run Step 4 again

---

## Quick Checklist

Complete these in order:

- [ ] Step 1: Deploy backend to Supabase
- [ ] Step 2: Run SQL migration
- [ ] Step 3: Reload schema cache
- [ ] Step 4: Manually fix ADM-003 balance to 4
- [ ] Step 5: Verify balance shows 4/12
- [ ] Bonus: Test with new leave request

**Time needed: ~5 minutes**

---

## Summary

**The Problem:**
- Backend code NOT deployed → API doesn't exist
- Database column missing → Can't store balance
- Balance already approved → Need manual fix

**The Solution:**
1. Deploy backend (makes API work)
2. Run SQL (creates column)
3. Reload cache (recognizes column)
4. Fix ADM-003 manually (corrects existing approved leave)
5. Test (verify it works going forward)

**After this:** All future leave approvals will update balance automatically! ✅
