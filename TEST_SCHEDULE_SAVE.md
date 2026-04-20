# 🧪 Test Schedule Save - Diagnostic Guide

## What I Fixed

1. ✅ **Removed** `server/` from `.funcignore` - Your server code is no longer being ignored
2. ✅ **Deleted** `.deployignore` - Server directory can now be deployed

## ⚡ Quick Test

### Step 1: Refresh Your App
1. Go to your Mnemosyne app
2. Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)

### Step 2: Try Saving a Schedule
1. Go to **Admin Portal** → **Manage Schedule**
2. Click on any date/employee cell
3. Set a working shift (e.g., 08:00 - 17:00)
4. Click **"Save Schedule"**

### Step 3: Check the Result

**✅ SUCCESS - You should see:**
- Green toast: "Schedule updated successfully"
- No errors in browser console (F12)

**❌ STILL FAILING - You might see:**
- Error about server connection
- "Failed to save schedule"
- Red error messages

---

## 🔍 If Still Not Working

### Check 1: Is the Server Running?

Open browser console (F12) and run this:

```javascript
const projectId = 'tpgjkgphvwzbcccxjkwj';
const publicAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwZ2prZ3Bodnd6YmNjY3hqa3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxOTE3NzUsImV4cCI6MjA2MDc2Nzc3NX0.m6y0R3LJ8Q2lWKjzvFd8KFBQOE6jNjOk8Hh9QXkPgS8';

fetch(`https://${projectId}.supabase.co/functions/v1/make-server-df988758/health`, {
  headers: { Authorization: `Bearer ${publicAnonKey}` }
})
.then(r => r.json())
.then(data => console.log('✅ Server is running:', data))
.catch(err => console.error('❌ Server error:', err));
```

**Expected result:** `✅ Server is running: {status: "ok"}`

### Check 2: Is Supabase Table Fixed?

You still need to fix the schedules table in Supabase!

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS user_type TEXT;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS shift_end TIME;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS grace_period INTEGER DEFAULT 30;
```

Or use the full fix from `fix_schedules_table.sql`

---

## 🎯 Most Common Issues

### Issue 1: "Could not find 'user_type' column"
**Fix:** Run the SQL fix script (see above or `fix_schedules_table.sql`)

### Issue 2: "Failed to fetch" or Network Error
**Fix:** 
- Check if you're connected to the internet
- Verify Supabase project is running (go to supabase.com/dashboard)
- Check if the project ID is correct

### Issue 3: Schedules save but don't appear
**Fix:**
- Refresh the page
- Check if you're on the correct date range
- Look in browser console for errors

---

## 📊 What Should Happen

When you save a schedule successfully:

1. **Frontend** sends request to server
2. **Server** (at `/supabase/functions/server/index.tsx`) receives it
3. **Server** saves to:
   - ✅ KV Store (always works)
   - ✅ Supabase `schedules` table (if table has correct columns)
4. **Frontend** shows success message
5. **UI** updates immediately

---

## 🆘 Emergency: If Nothing Works

1. Open browser console (F12)
2. Copy any red error messages
3. Check what the error says
4. Common fixes:
   - Network error → Check internet/Supabase status
   - Column error → Run SQL fix script
   - 404 error → Server might not be deployed yet

---

## ✅ Final Checklist

- [ ] Removed `server/` from `.funcignore` ✅ (I did this)
- [ ] Deleted `.deployignore` ✅ (I did this)  
- [ ] Refreshed the app (you need to do this)
- [ ] Ran SQL fix script in Supabase (you need to do this)
- [ ] Tested saving a schedule

---

**After fixing, schedules should save successfully!** 🎉
