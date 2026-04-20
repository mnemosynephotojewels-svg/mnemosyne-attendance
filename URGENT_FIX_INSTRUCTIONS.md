# 🚨 URGENT: Deploy Leave Request Fix

## ✅ What's Been Fixed

The `user_type` column error has been fixed in your local code. The backend no longer tries to insert this non-existent column.

**Files updated:**
- ✅ `/supabase/functions/server/index.tsx` - Fixed (removed user_type)
- ✅ `/supabase/functions/make-server/index.tsx` - Fixed and ready to deploy

## 🚀 Deploy Now (Choose ONE method)

### Method 1: Supabase Dashboard (FASTEST - 2 minutes)

1. **Open:** https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/functions

2. **Find** the function named `make-server-df988758`

3. **Click** the function name to edit it

4. **Open** `/workspaces/default/code/supabase/functions/make-server/index.tsx` in your code editor

5. **Select All** (Ctrl+A) and **Copy** the entire file contents

6. **Paste** into the Supabase dashboard editor (replacing all existing code)

7. **Click "Deploy"** or "Save and Deploy"

8. **Wait** for deployment to complete (usually 10-30 seconds)

9. **Reload Schema Cache:**
   - Go to https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api
   - Click the **"Reload schema cache"** button
   - Wait 5 seconds

10. **Test:**
    - Clear browser cache (Ctrl+Shift+Delete)
    - Hard refresh (Ctrl+Shift+R)
    - Try submitting a leave request

---

### Method 2: Supabase CLI (Advanced)

```bash
# 1. Login to Supabase
/tmp/supabase login

# 2. Deploy the function
cd /workspaces/default/code
/tmp/supabase functions deploy make-server-df988758 --project-ref aoctrfafybrkzupfjbwj

# 3. Reload schema cache (do this in dashboard)
```

---

## 🔍 Verify the Fix

After deployment, you should see:

✅ **Success message:** "Leave request submitted successfully!"
✅ **No errors** in browser console
✅ **Leave request appears** in the database

If you still see errors:
1. Make sure you deployed to the correct function
2. Clear browser cache completely
3. Check browser console for new error messages
4. Verify schema cache was reloaded

---

## 📋 What Changed (Technical Details)

**Before (causing error):**
```typescript
if (employee_number) {
  insertData.employee_number = employee_number;
  insertData.user_type = 'employee';  // ❌ Column doesn't exist
} else if (admin_number) {
  insertData.admin_number = admin_number;
  insertData.user_type = 'admin';      // ❌ Column doesn't exist
}
```

**After (fixed):**
```typescript
if (employee_number) {
  insertData.employee_number = employee_number;
} else if (admin_number) {
  insertData.admin_number = admin_number;
}
```

The system now determines whether it's an employee or admin request based on which field is populated, without trying to store `user_type` in the database.
