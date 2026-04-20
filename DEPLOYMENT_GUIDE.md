# 🚀 Deploy Leave Request Fix - Visual Guide

## ✅ The Fix is Ready!

I've fixed the code locally. Now you just need to deploy it to Supabase.

---

## 📋 Quick Deployment (5 minutes)

### Step 1: Open Supabase Functions
Click this link: [**Open Supabase Functions**](https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/functions)

### Step 2: Find the Function
Look for: **`make-server-df988758`**
Click on it to open the editor.

### Step 3: Copy the Fixed Code
1. Open this file in your code editor:
   ```
   /workspaces/default/code/supabase/functions/make-server/index.tsx
   ```

2. Select **ALL** the text:
   - Press `Ctrl+A` (Windows/Linux) or `Cmd+A` (Mac)

3. Copy it:
   - Press `Ctrl+C` (Windows/Linux) or `Cmd+C` (Mac)

### Step 4: Replace Code in Dashboard
1. In the Supabase dashboard editor:
   - Select all existing code: `Ctrl+A` / `Cmd+A`
   - Paste the new code: `Ctrl+V` / `Cmd+V`

2. Click the **"Deploy"** button (usually green/blue button at the top)

3. Wait for the success message (10-30 seconds)

### Step 5: Reload Schema Cache
1. Click this link: [**Open API Settings**](https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api)

2. Scroll down until you see **"Reload schema cache"** button

3. Click it and wait 5 seconds

### Step 6: Clear Browser Cache & Test
1. **Clear cache:**
   - Press `Ctrl+Shift+Delete` (Windows/Linux) or `Cmd+Shift+Delete` (Mac)
   - Check "Cached images and files"
   - Click "Clear data"

2. **Refresh the page:**
   - Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

3. **Test:**
   - Go to Leave Request page
   - Fill out the form
   - Click "Submit Leave Request"

4. **Expected result:**
   - ✅ "Leave request submitted successfully!"
   - ✅ No errors in browser console
   - ✅ Leave request appears in your history

---

## 🔍 Verify You Have the Correct Code

Before deploying, check this section in your `/supabase/functions/make-server/index.tsx` file around **line 1517**:

### ✅ CORRECT (What you should see):
```typescript
// Set either employee_number or admin_number, not both
if (employee_number) {
  insertData.employee_number = employee_number;
} else if (admin_number) {
  insertData.admin_number = admin_number;
}
```

### ❌ WRONG (Old code causing the error):
```typescript
// Set either employee_number or admin_number, not both
if (employee_number) {
  insertData.employee_number = employee_number;
  insertData.user_type = 'employee';  // ❌ This line causes the error
} else if (admin_number) {
  insertData.admin_number = admin_number;
  insertData.user_type = 'admin';      // ❌ This line causes the error
}
```

If you see the ❌ WRONG version, the file wasn't updated correctly. Let me know and I'll fix it again.

---

## 🆘 Troubleshooting

### "I still see the error after deploying"
1. Make sure you deployed to **`make-server-df988758`** (exact name)
2. Reload schema cache in Settings → API
3. Clear browser cache completely (all time)
4. Hard refresh the page multiple times
5. Check browser console for different error messages

### "I can't find the function in dashboard"
- Make sure you're logged into the correct Supabase account
- Check you're in project: **aoctrfafybrkzupfjbwj**
- Navigate to: Edge Functions (in left sidebar)

### "The deploy button doesn't work"
- Check for syntax errors in the code editor
- Make sure you copied the ENTIRE file
- Try refreshing the dashboard and trying again

### "Still not working"
- Send me the new error message from browser console
- I'll help you debug further

---

## 📞 Need Help?

If you get stuck:
1. Share the error message from browser console (F12 → Console tab)
2. Confirm which step you're on
3. Tell me what you see vs what you expect

The fix is ready - it just needs to be deployed! 🎉
