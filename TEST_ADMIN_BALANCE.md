# ✅ Test: Admin Leave Balance Update System

This guide will verify that the admin leave balance (12 / 12) updates correctly when super admin approves leave requests.

---

## Quick Diagnostic Test

### Step 1: Open Browser Console

1. Login as **team leader/admin**
2. Go to **"My Leave Request"** tab
3. Press **F12** to open console
4. Click the **refresh button (↻)** on the Leave Balance card

### Step 2: Check Console Messages

Look for one of these messages:

---

### ✅ SCENARIO A: Backend Deployed + Database Ready

**Console shows:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 FETCHING ADMIN LEAVE BALANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin Number: ADM001
API URL: https://...supabase.co/functions/v1/make-server-df988758/leave-balance?admin_number=ADM001
Response status: 200
Response ok: true
📦 Response data: {success: true, data: 12, columnExists: true}
📊 Balance Details:
   - Current Balance: 12
   - Column Exists: true
   - Migration Required: undefined
✅ Admin leave balance: 12
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Status:** ✅ **READY TO TEST!**

**Next step:** Test the complete flow (skip to "Complete Flow Test" section)

---

### 🔴 SCENARIO B: Backend NOT Deployed

**Console shows:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ FETCH ERROR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error Type: TypeError
Error Message: Failed to fetch

🔴 BACKEND NOT RESPONDING!

This usually means:
1. Backend code has NOT been deployed to Supabase
```

**Toast notification:**
```
🔴 Backend not responding! Backend code needs to be deployed to Supabase.
```

**Status:** ❌ **BACKEND NOT DEPLOYED**

**Fix:** Follow `/workspaces/default/code/DEPLOY_BACKEND_NOW.md`

**Quick fix:**
1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/functions
2. Click: `make-server-df988758`
3. Copy ALL code from: `/workspaces/default/code/supabase/functions/make-server/index.tsx`
4. Paste and click Deploy
5. Refresh browser

---

### ⚠️ SCENARIO C: Backend Deployed BUT Database Column Missing

**Console shows:**
```
📦 Response data: {success: true, data: 12, columnExists: false, migrationRequired: true}
📊 Balance Details:
   - Current Balance: 12
   - Column Exists: false
   - Migration Required: true

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ DATABASE MIGRATION REQUIRED!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The paid_leave_balance column does NOT exist in admins table!

TO FIX THIS:
1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new
2. Run this SQL:
   ALTER TABLE admins ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;
```

**Toast notification:**
```
⚠️ Database migration required! Balance will always show 12 until migration is run.
```

**Status:** ⚠️ **MIGRATION NEEDED**

**Fix:** Follow `/workspaces/default/code/FIX_ADMIN_BALANCE.sql`

**Quick fix:**
1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new
2. Run this SQL:
   ```sql
   ALTER TABLE admins ADD COLUMN IF NOT EXISTS paid_leave_balance INTEGER DEFAULT 12;
   UPDATE admins SET paid_leave_balance = 12 WHERE paid_leave_balance IS NULL;
   ```
3. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api
4. Click "Reload schema cache"
5. Refresh browser

---

## Complete Flow Test

Once you see **SCENARIO A** (✅ green checkmarks), test the complete flow:

### Test 1: Submit Leave Request

1. **Login as team leader/admin**
2. Go to **"My Leave Request"** tab
3. **Submit a 3-day leave request**
4. Check balance - should still show **12 / 12** (pending approval)

### Test 2: Approve Leave Request

1. **Logout** and login as **super admin**
2. Go to **"Leave Requests"** page
3. Find the admin's leave request
4. Click **"Approve"**
5. Confirm approval

### Test 3: Verify Balance Update

1. **Logout** and login as **team leader/admin** again
2. Go to **"My Leave Request"** tab
3. **Wait 10 seconds** (auto-refresh interval)
4. OR click the **refresh button (↻)**

**Expected result:**
```
9 / 12
days remaining
[Progress bar at 75%]
```

**Console should show:**
```
💰 FETCHING ADMIN LEAVE BALANCE
✅ Admin leave balance: 9
🔄 Balance changed from 12 to 9
```

---

## Troubleshooting by Scenario

### If Balance Still Shows 12/12 After Approval

**Check console. Look for:**

**A. "Column Exists: false"**
- **Problem:** Database column missing
- **Fix:** Run SQL migration
- **File:** `/workspaces/default/code/FIX_ADMIN_BALANCE.sql`

**B. "Failed to fetch"**
- **Problem:** Backend not deployed
- **Fix:** Deploy backend code
- **File:** `/workspaces/default/code/DEPLOY_BACKEND_NOW.md`

**C. "Column Exists: true" but balance not updating**
- **Problem:** Backend update failed
- **Check:** Look for error messages in console when approving
- **Fix:** Check super admin console when approving - should show:
  ```
  ✅ Admin balance updated successfully!
     New Balance in DB: 9
  ```

---

## Expected Console Flow (Complete Success)

### When Admin Clicks Refresh:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 FETCHING ADMIN LEAVE BALANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin Number: ADM001
Response status: 200
📦 Response data: {success: true, data: 12, columnExists: true}
✅ Admin leave balance: 12
```

### When Super Admin Approves Leave:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 UPDATING LEAVE REQUEST STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Balance: 12
New Balance: 9
Paid Days Deducted: 3

📝 Attempting to update admin balance...
✅ Admin balance updated successfully!
   Updated Admin: John Smith
   New Balance in DB: 9
```

### When Admin Refreshes (after approval):
```
💰 FETCHING ADMIN LEAVE BALANCE
✅ Admin leave balance: 9
🔄 Balance changed from 12 to 9
```

---

## Visual Indicators

### Before Approval
```
┌─────────────────────────┐
│  📅 Leave Balance       │
│     Annual paid days    │
│                         │
│  12 / 12                │
│  days remaining         │
│  ████████████████ 100%  │
└─────────────────────────┘
```

### After Approving 3 Days
```
┌─────────────────────────┐
│  📅 Leave Balance       │
│     Annual paid days    │
│                         │
│  9 / 12                 │
│  days remaining         │
│  ████████████░░░░  75%  │
└─────────────────────────┘
```

---

## Quick Reference: All Files

| File | Purpose |
|------|---------|
| `DEPLOY_BACKEND_NOW.md` | How to deploy backend code to Supabase |
| `FIX_ADMIN_BALANCE.sql` | SQL migration to add balance column |
| `HOW_TO_FIX_BALANCE.md` | Complete troubleshooting guide |
| `TEST_ADMIN_BALANCE.md` | This file - testing instructions |

---

## Summary Checklist

- [ ] Open browser console (F12)
- [ ] Click refresh button on Leave Balance card
- [ ] Check which scenario appears (A, B, or C)
- [ ] If Scenario B: Deploy backend
- [ ] If Scenario C: Run SQL migration
- [ ] If Scenario A: Test complete flow
- [ ] Submit 3-day leave as admin
- [ ] Approve as super admin
- [ ] Check balance updates to 9/12 within 10 seconds
- [ ] Verify console shows "Balance changed from 12 to 9"

**If all checkmarks done = System working! ✅**
