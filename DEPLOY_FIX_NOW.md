# 🚨 CRITICAL: DEPLOY LEAVE REQUEST FIX NOW

## ⚠️ WHY YOU'RE SEEING THE ERROR

The leave request bug has been **FIXED in your local code**, but the **old buggy code is still running on Supabase servers**. 

**Current Error:** `Could not find the 'user_type' column of 'leave_requests' in the schema cache`

**Why it happens:** The deployed backend is trying to insert a `user_type` column that doesn't exist.

**Solution:** Deploy the fixed code to Supabase (takes 5 minutes).

---

## 🚀 DEPLOY NOW - FOLLOW THESE EXACT STEPS

### Step 1: Open Supabase Dashboard
**Click here:** https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/functions

### Step 2: Find Your Function
- Look for: **`make-server-df988758`**
- Click on it to open the code editor

### Step 3: Open the Fixed Code File
Open this file in VS Code or your editor:
```
/workspaces/default/code/supabase/functions/make-server/index.tsx
```

**How to open in VS Code:**
- Press `Ctrl+P` (Cmd+P on Mac)
- Type: `make-server/index.tsx`
- Press Enter

### Step 4: Copy ALL The Code
1. In the opened file, press `Ctrl+A` (Cmd+A on Mac) to select all
2. Press `Ctrl+C` (Cmd+C on Mac) to copy
3. **Verify:** The file should be ~2,900 lines long

### Step 5: Paste in Supabase Dashboard
1. In the Supabase dashboard editor
2. Press `Ctrl+A` (Cmd+A) to select all existing code
3. Press `Ctrl+V` (Cmd+V) to paste the new code
4. Click the **"Deploy"** button (green/blue button, usually at top right)
5. **Wait 10-30 seconds** for deployment to complete
6. You should see a success message

### Step 6: Reload Schema Cache ⚠️ CRITICAL
**Click here:** https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api

1. Scroll down until you see **"Reload schema cache"** button
2. Click it
3. Wait 5 seconds

### Step 7: Clear Browser Cache & Test
1. Press `Ctrl+Shift+Delete` (Cmd+Shift+Delete on Mac)
2. Check "Cached images and files"
3. Click "Clear data"
4. Go back to your app
5. Press `Ctrl+Shift+R` (Cmd+Shift+R) to hard refresh
6. **Submit a leave request**

---

## ✅ EXPECTED RESULT

You should see:
- ✅ **"Leave request submitted successfully!"**
- ✅ No errors in browser console
- ✅ Leave request appears in your leave history

---

## 🔍 IF STILL NOT WORKING

Double-check these:
- ✅ You deployed to the correct function (`make-server-df988758`)
- ✅ You clicked "Deploy" and saw the success message
- ✅ You reloaded the schema cache
- ✅ You cleared browser cache completely
- ✅ You hard refreshed the page

---

## 📝 TECHNICAL: WHAT WAS FIXED

**File:** `/workspaces/default/code/supabase/functions/make-server/index.tsx`

**Lines ~1517-1524 were changed from:**
```typescript
// Set either employee_number or admin_number, not both
// Also set user_type appropriately
if (employee_number) {
  insertData.employee_number = employee_number;
  insertData.user_type = 'employee';  // ❌ This causes the error
} else if (admin_number) {
  insertData.admin_number = admin_number;
  insertData.user_type = 'admin';      // ❌ This causes the error
}
```

**To:**
```typescript
// Set either employee_number or admin_number, not both
if (employee_number) {
  insertData.employee_number = employee_number;
} else if (admin_number) {
  insertData.admin_number = admin_number;
}
```

The `user_type` column doesn't exist in your `leave_requests` table, so trying to insert it was causing the PGRST204 error.

---

## 🆘 STILL STUCK?

If you've followed ALL the steps above and still see the error:

1. Check the browser console (F12) for the EXACT error message
2. Verify you're looking at the correct project in Supabase
3. Make sure you deployed the function and didn't just save it
4. Try deploying using CLI instead:
   ```bash
   /tmp/supabase login
   cd /workspaces/default/code
   /tmp/supabase functions deploy make-server-df988758 --project-ref aoctrfafybrkzupfjbwj
   ```

---

**THE FIX IS READY. IT JUST NEEDS TO BE UPLOADED TO SUPABASE!**

Follow the steps above and the error will be gone. 🚀
