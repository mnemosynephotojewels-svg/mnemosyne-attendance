# Admin Leave Balance Fix - Complete Guide

## Problem Summary
When a super admin approves a team leader/admin's leave request, the leave balance in "My Leave Request" tab doesn't update immediately or shows 12/12 (default value) instead of the actual balance.

## Root Causes Identified

### 1. **Database Column Missing** ⚠️
The `paid_leave_balance` column might not exist in the `admins` table, causing the system to always return the default value of 12.

### 2. **Refresh Timing Issue**
The frontend was only refreshing the balance:
- Every 30 seconds (too slow)
- When admin submits a new request
- BUT NOT when super admin approves/rejects a request

---

## Fixes Applied ✅

### Backend Improvements (Already in code)
1. ✅ **Notification system** - Admin leave requests now properly notify super admin
2. ✅ **Balance update logic** - Backend correctly deducts from `paid_leave_balance` when leave is approved
3. ✅ **Error handling** - Returns default value (12) if column doesn't exist

### Frontend Improvements (Just Applied)
1. ✅ **Faster auto-refresh** - Reduced from 30s to 10s
2. ✅ **Refresh on request load** - Balance refreshes whenever leave requests are fetched
3. ✅ **Status change detection** - Automatically refreshes when any leave request is approved/rejected
4. ✅ **Better logging** - Enhanced console logs for debugging

---

## How to Fix Completely

### Step 1: Check if Database Column Exists

Run this SQL in Supabase SQL Editor:

```sql
-- Check if paid_leave_balance column exists in admins table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'admins' 
  AND column_name = 'paid_leave_balance';
```

**If the query returns NO ROWS:** The column is missing (this is likely the problem!)

### Step 2: Add the Missing Column

If the column doesn't exist, run this migration:

```sql
-- Add paid_leave_balance column to admins table
ALTER TABLE admins 
ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;

-- Update existing admins to have 12 days of paid leave
UPDATE admins 
SET paid_leave_balance = 12 
WHERE paid_leave_balance IS NULL;

-- Add a check constraint (optional but recommended)
ALTER TABLE admins 
ADD CONSTRAINT paid_leave_balance_non_negative 
CHECK (paid_leave_balance >= 0);
```

### Step 3: Verify the Fix

```sql
-- Check all admins' leave balances
SELECT 
  admin_number,
  full_name,
  department,
  paid_leave_balance
FROM admins
ORDER BY admin_number;
```

You should see all admins with their balances (default 12 or updated values).

### Step 4: Deploy Backend Updates

1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/functions
2. Click **`make-server-df988758`**
3. Copy ALL code from `/workspaces/default/code/supabase/functions/make-server/index.tsx`
4. Paste into dashboard editor
5. Click **Deploy**
6. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api
7. Click **"Reload schema cache"**

---

## Testing the Fix

### Test 1: Check Balance Display
1. Login as team leader/admin
2. Go to "My Leave Request" tab
3. Check if balance shows correctly (not 12/12 if you've used leave)

### Test 2: Submit Leave Request
1. Submit a new leave request as admin
2. Login as super admin
3. Approve the request
4. Go back to admin account
5. **Within 10 seconds**, the balance should update automatically

### Test 3: Manual Refresh
1. Click the refresh icon (↻) on the Leave Balance card
2. Balance should update immediately

---

## What Changed in the Code

### `/src/app/pages/AdminLeave.tsx`

**Before:**
- Auto-refresh every 30 seconds
- Balance only refreshed on mount and manual click

**After:**
- Auto-refresh every 10 seconds (3x faster)
- Balance refreshes when:
  - Page loads
  - Leave requests are loaded/reloaded
  - Any request status changes to approved/rejected
  - User clicks refresh button
  - Admin submits a new request

### `/supabase/functions/server/index.tsx`

**Improvements:**
- Better notification routing (admin → super admin)
- Enhanced logging for debugging
- Proper error handling for missing columns

---

## Expected Behavior After Fix

### Scenario 1: Admin Submits Leave
1. Admin submits 3-day leave request
2. Balance still shows 12 (pending approval)
3. Super admin approves
4. **Admin's balance updates to 9 within 10 seconds**

### Scenario 2: Multiple Requests
1. Admin has 12 days
2. Submits 5-day request (approved) → Balance: 7
3. Submits 3-day request (approved) → Balance: 4
4. Submits 10-day request (approved) → Balance: 0 (last 6 days unpaid)

### Scenario 3: Rejected Request
1. Admin submits 3-day request
2. Super admin rejects
3. **Balance remains unchanged** (no deduction)

---

## Troubleshooting

### Issue: Balance still shows 12/12 after approval
**Cause:** Database column doesn't exist or migration not run  
**Solution:** Run Step 2 SQL migration above

### Issue: Balance not updating immediately
**Cause:** Browser cache or page not auto-refreshing  
**Solution:** 
- Click the refresh button (↻)
- Hard reload page (Ctrl+Shift+R)
- Wait 10 seconds for auto-refresh

### Issue: Error in console about paid_leave_balance
**Cause:** Migration not run or schema cache not reloaded  
**Solution:**
1. Run migration SQL
2. Reload schema cache at: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api

---

## Summary

**What was fixed:**
- ✅ Frontend now refreshes balance more frequently and intelligently
- ✅ Backend properly updates admin balance when leave is approved
- ✅ Better notification system (admin → super admin)
- ✅ Enhanced logging for debugging

**What you need to do:**
1. **Run the SQL migration** to add `paid_leave_balance` column (if missing)
2. **Deploy backend code** to Supabase
3. **Test** by approving an admin leave request

After these steps, the leave balance will update automatically within 10 seconds of approval! 🎉
