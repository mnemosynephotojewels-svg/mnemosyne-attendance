# 🚀 Schedule Fix - Quick Start Guide

## What Changed?
Admin and Super Admin schedules now save correctly! The system properly uses `admin_number` for admins and `employee_number` for employees.

## Test It Now

### 1️⃣ Test as Admin (2 minutes)
```
1. Login as admin (e.g., ADM001)
2. Go to "Manage Schedule"
3. You'll see yourself as "Team Leader" with gold avatar
4. Click any date in your row
5. Set time: 9:00 - 17:00
6. Click "Save"
7. Refresh page (F5)
8. ✅ Your schedule should still be there!
```

### 2️⃣ Test as Super Admin (2 minutes)
```
1. Login as super admin
2. Go to "Schedule"
3. Switch to "Admin Schedules" view
4. Pick any admin
5. Save a schedule for them
6. Refresh page (F5)
7. ✅ Schedule should persist!
```

## If It Doesn't Work

### Quick Fix (30 seconds)
1. Open Supabase SQL Editor
2. Copy and paste this:

```sql
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;
```

3. Click "Run"
4. Try saving schedule again
5. ✅ Should work now!

### Comprehensive Fix (2 minutes)
1. Open Supabase SQL Editor
2. Copy entire content of `/FIX_SCHEDULE_RLS.sql`
3. Paste and run
4. ✅ All fixed!

## How to Verify

### Check Browser Console (F12)
Look for these logs when saving:

✅ **Good:**
```
💾 Saving schedule for: {name: "...", userType: "admin", ...}
📤 Sending upsert payload: {admin_number: "ADM001", ...}
```

❌ **Bad:**
```
Error: 42P01 - table does not exist
Error: 42703 - column does not exist
```

### Check Database
```sql
-- Should see admin schedules
SELECT * FROM schedules WHERE admin_number IS NOT NULL LIMIT 5;

-- Should see employee schedules  
SELECT * FROM schedules WHERE employee_number IS NOT NULL LIMIT 5;
```

## Diagnostic Tool

Visit: **`/super-admin/schedule-debug`**

This will automatically:
- ✅ Test if table exists
- ✅ Test saving a schedule
- ✅ Test fetching schedules
- ✅ Detect RLS issues
- ✅ Provide one-click SQL fixes

## Common Issues

### Issue 1: Schedule disappears after refresh
**Cause:** RLS blocking reads
**Fix:** Run `ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;`

### Issue 2: "Column does not exist" error
**Cause:** Missing columns
**Fix:** Run `/FIX_SCHEDULE_RLS.sql`

### Issue 3: Still showing "Schedule updated successfully" but not saving
**Cause:** Backend might be down or misconfigured
**Fix:** Check Supabase logs and edge function deployment

## Files to Reference

| File | Purpose |
|------|---------|
| `/SCHEDULE_FIX_SUMMARY.md` | Detailed explanation of the fix |
| `/SCHEDULE_ADMIN_FIX_COMPLETE.md` | Complete technical documentation |
| `/FIX_SCHEDULE_RLS.sql` | One-click SQL fix |
| `/VERIFY_SCHEDULE_FIX.sql` | Verification queries |

## What Was Fixed

**Before:**
- ❌ Admin schedules saved with wrong field
- ❌ Missing user_type parameter
- ❌ Fetch only looked for employee schedules
- ❌ Admin schedules disappeared after refresh

**After:**
- ✅ Admin schedules use `admin_number` field
- ✅ Correct `user_type` parameter sent
- ✅ Fetch checks both employee and admin schedules
- ✅ All schedules persist correctly

## Architecture

```
┌─────────────────────────────────────────┐
│         ManageSchedule Page             │
├─────────────────────────────────────────┤
│  Team Leader (Admin) │ Employee 1       │
│  🟡 Gold Avatar      │ 🔵 Blue Avatar   │
│  isAdmin: true       │ isAdmin: false   │
└────────┬─────────────┴───────┬──────────┘
         │                     │
         ↓                     ↓
┌────────────────────┐  ┌────────────────┐
│ admin_number: ADM  │  │ employee_number│
│ user_type: admin   │  │ user_type: emp │
└────────┬───────────┘  └──────┬─────────┘
         │                     │
         └─────────┬───────────┘
                   ↓
         ┌──────────────────┐
         │  Supabase DB     │
         │  schedules table │
         └──────────────────┘
```

## Success Checklist

- [ ] Admin can save their own schedule
- [ ] Admin schedule visible after refresh
- [ ] Employee schedules still work
- [ ] Super Admin can save admin schedules
- [ ] Console shows correct user_type
- [ ] Database has admin_number populated
- [ ] No RLS errors in Supabase logs

## Quick Commands

```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'schedules';

-- Disable RLS (quick fix)
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;

-- View recent schedules
SELECT * FROM schedules ORDER BY created_at DESC LIMIT 10;

-- Count schedules by type
SELECT 
  COUNT(*) FILTER (WHERE admin_number IS NOT NULL) AS admin_schedules,
  COUNT(*) FILTER (WHERE employee_number IS NOT NULL) AS employee_schedules
FROM schedules;
```

## Support

If you're still having issues:
1. Run `/VERIFY_SCHEDULE_FIX.sql` 
2. Check browser console for errors
3. Visit `/super-admin/schedule-debug`
4. Check Supabase logs

---

## TL;DR

**What:** Fixed admin schedule saving bug
**How:** Uses correct database fields now
**Test:** Save admin schedule → refresh → still there ✅
**Fix if broken:** Run `/FIX_SCHEDULE_RLS.sql` in Supabase

🎉 **Done!**
