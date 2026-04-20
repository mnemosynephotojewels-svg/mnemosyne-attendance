# ✅ Test: ALL Team Leader Admin Accounts - Leave Balance Update

This guide verifies that leave balance updates work for **ALL team leader admin accounts**, not just ADM-003.

---

## Quick Verification (2 Minutes)

### Step 1: Run SQL to Check All Admins

1. **Go to:** https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/sql/new

2. **Copy and run this SQL:**

```sql
-- Check all admins have the balance column
SELECT
  admin_number,
  full_name,
  department,
  CASE
    WHEN paid_leave_balance IS NULL THEN '❌ NULL (needs fix)'
    ELSE '✅ ' || paid_leave_balance::text
  END as balance_status,
  paid_leave_balance
FROM admins
ORDER BY admin_number;
```

### Expected Results:

✅ **Good - All admins ready:**
```
admin_number | full_name      | department  | balance_status | paid_leave_balance
-------------|----------------|-------------|----------------|-------------------
ADM-001      | John Smith     | Engineering | ✅ 12          | 12
ADM-002      | Jane Doe       | Sales       | ✅ 10          | 10
ADM-003      | Bob Wilson     | Marketing   | ✅ 4           | 4
ADM-004      | Sarah Lee      | HR          | ✅ 12          | 12
```

❌ **Bad - Some admins have NULL:**
```
admin_number | full_name      | balance_status
-------------|----------------|---------------
ADM-001      | John Smith     | ❌ NULL (needs fix)
ADM-002      | Jane Doe       | ❌ NULL (needs fix)
```

**If you see NULL values, run this fix:**
```sql
UPDATE admins 
SET paid_leave_balance = 12 
WHERE paid_leave_balance IS NULL;
```

---

## Complete Test for Multiple Admins

Test with 3 different admin accounts to ensure it works for everyone.

### Test Admin 1 (e.g., ADM-001)

**1. Login as ADM-001**

**2. Go to "My Leave Request" tab**

**3. Open browser console (F12)**

**4. Click refresh button (↻) on Leave Balance card**

**5. Check console output:**

✅ **Success:**
```
✅ Admin leave balance: 12
✅ Column Exists: true
```

❌ **Failed:**
```
🔴 Backend not responding!
Failed to fetch
```

**6. Submit 2-day leave request:**
- Leave type: Sick Leave
- Dates: 2 days
- Reason: Medical appointment

**7. Note current balance:** Should still be **12 / 12** (pending approval)

---

### Test Super Admin Approval

**1. Logout and login as Super Admin**

**2. Go to "Leave Requests" page**

**3. Find ADM-001's 2-day leave request**

**4. Open browser console (F12)**

**5. Click "Approve" button**

**6. Check console for update confirmation:**

✅ **Success - Should see:**
```
📝 Attempting to update admin balance...
   Admin Number: ADM-001
   Current Balance: 12
   New Balance: 10
   Paid Days Deducted: 2

✅ Admin balance updated successfully!
   Updated Admin: John Smith
   New Balance in DB: 10
```

❌ **Failed - Will see:**
```
❌ CRITICAL ERROR: Failed to update admin balance!
Error Message: column "paid_leave_balance" does not exist
```

---

### Test Admin 1 Balance Update

**1. Logout and login as ADM-001**

**2. Go to "My Leave Request" tab**

**3. Wait 10 seconds (auto-refresh) OR click refresh button**

**4. Check Leave Balance card:**

✅ **Success:**
```
10 / 12
days remaining
████████████░░  83%
```

✅ **Console shows:**
```
✅ Admin leave balance: 10
🔄 Balance changed from 12 to 10
```

---

### Test Admin 2 (e.g., ADM-004)

Repeat the same process with a different admin:

**1. Login as ADM-004**
- Submit 3-day leave request
- Check balance: **12 / 12** (pending)

**2. Login as Super Admin**
- Approve ADM-004's 3-day request
- Console shows: **New Balance in DB: 9**

**3. Login as ADM-004**
- Wait 10 seconds or click refresh
- Balance should show: **9 / 12** ✅

---

### Test Admin 3 (e.g., ADM-002)

One more test with different scenario:

**1. Login as ADM-002**
- Submit 5-day leave request
- Check balance: **12 / 12** (pending)

**2. Login as Super Admin**
- REJECT ADM-002's request (not approve)

**3. Login as ADM-002**
- Balance should STAY: **12 / 12** ✅ (no deduction for rejected leave)

---

## Comprehensive SQL Verification

After testing, verify all balances in database:

```sql
-- View all admins with their balances and leave requests
SELECT
  a.admin_number,
  a.full_name,
  a.paid_leave_balance as current_balance,
  COUNT(lr.id) FILTER (WHERE lr.status = 'approved') as approved_leaves,
  COUNT(lr.id) FILTER (WHERE lr.status = 'pending') as pending_leaves,
  COUNT(lr.id) FILTER (WHERE lr.status = 'rejected') as rejected_leaves
FROM admins a
LEFT JOIN leave_requests lr ON a.admin_number = lr.admin_number
GROUP BY a.admin_number, a.full_name, a.paid_leave_balance
ORDER BY a.admin_number;
```

**Expected results after tests:**
```
admin_number | full_name  | current_balance | approved_leaves | pending_leaves | rejected_leaves
-------------|------------|-----------------|-----------------|----------------|----------------
ADM-001      | John Smith | 10              | 1               | 0              | 0
ADM-002      | Jane Doe   | 12              | 0               | 0              | 1
ADM-004      | Sarah Lee  | 9               | 1               | 0              | 0
```

---

## Auto-Refresh Test

Verify that balance updates automatically without manual refresh:

**1. Login as any admin (e.g., ADM-005)**

**2. Submit 1-day leave request**

**3. Keep the page open, don't click anything**

**4. In another browser/incognito:**
- Login as Super Admin
- Approve the leave

**5. Go back to admin browser tab**

**6. Watch the balance card**

**7. Within 10 seconds**, balance should update automatically ✅

**Console should show:**
```
💰 FETCHING ADMIN LEAVE BALANCE (auto-refresh)
✅ Admin leave balance: 11
🔄 Balance changed from 12 to 11
```

---

## Test Checklist for Each Admin

Use this checklist for every admin account:

**Admin: ___________**

- [ ] Login as admin
- [ ] Open "My Leave Request" tab
- [ ] Console shows: `✅ Admin leave balance: [number]`
- [ ] Console shows: `✅ Column Exists: true`
- [ ] No error toast appears
- [ ] Submit leave request (X days)
- [ ] Balance stays same (pending approval)
- [ ] Login as super admin
- [ ] Approve the request
- [ ] Console shows: `✅ Admin balance updated successfully!`
- [ ] Console shows: `New Balance in DB: [number]`
- [ ] Login as admin again
- [ ] Wait 10 seconds OR click refresh
- [ ] Balance updates to correct number
- [ ] Progress bar shows correct percentage
- [ ] No error messages in console

**If ALL checkboxes are checked: ✅ Working perfectly!**

---

## Common Issues & Solutions

### Issue: Some admins work, some don't

**Check SQL:**
```sql
-- Find admins with NULL balance
SELECT admin_number, full_name, paid_leave_balance
FROM admins
WHERE paid_leave_balance IS NULL;
```

**Fix:**
```sql
UPDATE admins 
SET paid_leave_balance = 12 
WHERE paid_leave_balance IS NULL;
```

### Issue: Balance updates for new admins but not old ones

**Cause:** Old admins created before migration

**Fix:**
```sql
-- Check all admins
SELECT admin_number, full_name, paid_leave_balance FROM admins;

-- Set default for any with NULL
UPDATE admins SET paid_leave_balance = 12 WHERE paid_leave_balance IS NULL;
```

### Issue: Console shows "Failed to fetch" for some admins

**Cause:** Backend deployment issue

**Solution:**
1. Verify backend is deployed
2. Check browser console for exact error
3. Make sure Supabase function is running
4. Try hard refresh (Ctrl+Shift+R)

---

## Mass Test Script

Test multiple admins quickly with SQL:

```sql
-- Create test leave requests for multiple admins
INSERT INTO leave_requests (admin_number, leave_type, start_date, end_date, reason, status, created_at, updated_at)
VALUES
  ('ADM-001', 'sick', '2026-04-20', '2026-04-21', 'Test 1', 'pending', NOW(), NOW()),
  ('ADM-002', 'vacation', '2026-04-22', '2026-04-24', 'Test 2', 'pending', NOW(), NOW()),
  ('ADM-004', 'emergency', '2026-04-25', '2026-04-26', 'Test 3', 'pending', NOW(), NOW());

-- View all pending admin leave requests
SELECT id, admin_number, leave_type, start_date, end_date, status
FROM leave_requests
WHERE admin_number IS NOT NULL AND status = 'pending'
ORDER BY created_at DESC;
```

---

## Success Indicators

### Visual (in browser):

✅ **Working correctly:**
- Leave Balance card shows correct number
- Progress bar matches percentage
- No red error banners
- No error toasts
- Balance updates within 10 seconds

### Console (F12):

✅ **Working correctly:**
```
✅ Admin leave balance: [correct number]
✅ Column Exists: true
✅ Admin balance updated successfully!
🔄 Balance changed from [old] to [new]
```

### Database:

✅ **Working correctly:**
```sql
SELECT admin_number, paid_leave_balance FROM admins;
```
- All admins have non-NULL balance
- Balances match approved leave deductions
- No errors when querying

---

## Final Verification

Run this complete check:

```sql
-- Complete system health check
SELECT
  'Total Admins' as metric,
  COUNT(*) as value
FROM admins
UNION ALL
SELECT
  'Admins with Balance Column',
  COUNT(*) FILTER (WHERE paid_leave_balance IS NOT NULL)
FROM admins
UNION ALL
SELECT
  'Admins with NULL Balance (PROBLEM)',
  COUNT(*) FILTER (WHERE paid_leave_balance IS NULL)
FROM admins
UNION ALL
SELECT
  'Total Admin Leave Requests',
  COUNT(*)
FROM leave_requests
WHERE admin_number IS NOT NULL
UNION ALL
SELECT
  'Approved Admin Leave Requests',
  COUNT(*)
FROM leave_requests
WHERE admin_number IS NOT NULL AND status = 'approved';
```

**Expected healthy results:**
```
metric                              | value
------------------------------------|------
Total Admins                        | 5
Admins with Balance Column          | 5
Admins with NULL Balance (PROBLEM)  | 0  ← Should be ZERO!
Total Admin Leave Requests          | 10
Approved Admin Leave Requests       | 3
```

If "Admins with NULL Balance" = 0, **ALL admins are ready!** ✅

---

## Summary

**To ensure ALL team leader admin accounts update correctly:**

1. ✅ Run verification SQL to check all admins
2. ✅ Fix any NULL balances
3. ✅ Test with 2-3 different admin accounts
4. ✅ Verify auto-refresh works for all
5. ✅ Check database shows correct balances

**Complete guide:** Use `/workspaces/default/code/VERIFY_ALL_ADMINS.sql` for comprehensive checks

**If all tests pass:** System works for ALL admins! 🎉
