# 🧹 CLEAR OLD DATA (Required After SQL Fix)

## Why You Still See Errors

**Even after running the SQL, you have OLD corrupted data in:**
1. ✅ Supabase table (now fixed and empty)
2. ❌ KV store (still has corrupted data)
3. ❌ Browser cache (still has old JavaScript)

**We need to clear #2 and #3.**

---

## Step 1: Verify SQL Worked (30 seconds)

**Run this in Supabase SQL Editor:**

Open file: `VERIFY_SQL_WORKED.sql`

Copy and paste into SQL Editor, click RUN.

**Look for:**
- ✅ `id` column should be `text` (not `bigint`)
- ✅ `total_schedules` should be `0`

**If you see `bigint` instead of `text`:**
- The SQL didn't run OR
- You ran it in the wrong database/project

---

## Step 2: Clear KV Store (1 minute)

**In your app, open browser console (F12), paste this:**

```javascript
// Clear all corrupted schedule data from KV store
fetch('https://ozklfhqnvkkfbtqdgvhy.supabase.co/functions/v1/make-server-df988758/schedules/clear-all', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96a2xmaHFudmtrZmJ0cWRndmh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNTU0OTksImV4cCI6MjA2MDczMTQ5OX0.zBYfEIv7cQOxEShf82RPm0RY71RCPUtaKwfmvuiGrp0',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(d => console.log('✅ KV store cleared:', d))
.catch(e => console.error('❌ Error:', e));
```

**Press Enter and wait for "KV store cleared"**

---

## Step 3: Clear Browser Cache (30 seconds)

**Hard refresh:**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Or clear manually:**
1. Press F12 (DevTools)
2. Go to Application tab
3. Click "Clear storage"
4. Click "Clear site data"
5. Close DevTools
6. Refresh page

---

## Step 4: Test (1 minute)

**Now test saving a schedule:**

1. Go to Manage Schedule page
2. Click any employee's cell
3. Select "Working Shift"
4. Enter times: 08:00 - 17:00
5. Click "Save Schedule"
6. **Open console (F12) and look for:**
   ```
   ✅ Supabase: Schedule created successfully
   ```
7. **Refresh page (Ctrl+Shift+R)**
8. **Check: Does schedule STILL show "08:00 - 17:00"?**

---

## ✅ Success Indicators

**In console, you should see:**
```
✅ Supabase: Schedule created successfully
✅ Moises: WORKING 08:00:00 - 17:00:00
```

**You should NOT see:**
```
❌ invalid input syntax for type bigint
⚠️ INVALID SCHEDULE DATA
ℹ️  No schedules found (table is empty)
```

**After refresh:**
- ✅ Schedule STILL shows "08:00 - 17:00"
- ❌ Schedule does NOT turn into "OFF"

---

## ❌ If Still Broken

### Problem 1: SQL didn't actually run

**Run `VERIFY_SQL_WORKED.sql` and check:**
- If `id` is still `bigint`, SQL didn't work
- Make sure you clicked RUN in Supabase
- Make sure you're in the correct project

### Problem 2: Wrong project/database

**Check your Supabase URL:**
- Should be: `ozklfhqnvkkfbtqdgvhy.supabase.co`
- If different, you ran SQL in wrong project

### Problem 3: Browser still cached

**Try incognito window:**
1. Open incognito: `Ctrl + Shift + N`
2. Go to your app
3. Test saving schedule

---

## 📋 Complete Checklist

- [ ] Step 1: Run `VERIFY_SQL_WORKED.sql` → Confirm `id` is `text`
- [ ] Step 2: Run clear script in console → KV store cleared
- [ ] Step 3: Hard refresh browser → Cache cleared
- [ ] Step 4: Save test schedule → See "created successfully"
- [ ] Step 5: Refresh page → Schedule persists ✅

---

## 🎯 After All Steps

**What works:**
- ✅ Schedules save to database
- ✅ Schedules persist after refresh
- ✅ No more errors
- ✅ Clean console logs

**Total time:** 5 minutes

**Then you're done forever!** ✅
