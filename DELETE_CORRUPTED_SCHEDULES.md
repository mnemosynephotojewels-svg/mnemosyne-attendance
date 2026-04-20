# 🧹 DELETE CORRUPTED SCHEDULES

## The Problem

Your schedules for Moises have corrupted data:
```
shift_start: null
shift_end: null
is_day_off: false
```

This is invalid. We need to delete these corrupted schedules so you can save fresh ones.

---

## ✅ FIX (2 Steps)

### Step 1: Delete Corrupted Schedules

**Open browser console** (F12 → Console tab)

**Copy and paste this code, then press Enter:**

```javascript
// Delete corrupted Moises schedules
const projectId = "ozklfhqnvkkfbtqdgvhy";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96a2xmaHFudmtrZmJ0cWRndmh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNTU0OTksImV4cCI6MjA2MDczMTQ5OX0.zBYfEIv7cQOxEShf82RPm0RY71RCPUtaKwfmvuiGrp0";

const dates = ['2026-04-17', '2026-04-18', '2026-04-19', '2026-04-20'];

async function deleteCorruptedSchedules() {
  console.log('🧹 Deleting corrupted schedules for Moises...');
  
  for (const date of dates) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-df988758/schedules/EMP-1053/${date}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );
      
      const result = await response.json();
      console.log(`✅ Deleted ${date}:`, result);
    } catch (error) {
      console.error(`❌ Failed to delete ${date}:`, error);
    }
  }
  
  console.log('✅ Done! Refresh the page now (Ctrl+Shift+R)');
}

deleteCorruptedSchedules();
```

**Wait for "Done!" message**

---

### Step 2: Re-save Correct Schedules

1. **Refresh page** (Ctrl+Shift+R)
2. **Go to Manage Schedule**
3. **For Moises, save schedules again:**
   - April 17: Working 08:00 - 17:00
   - April 18: Working 08:00 - 17:00
   - April 19: Working 08:00 - 17:00
   - April 20: Working 08:00 - 17:00
4. **Refresh page again**
5. **Verify schedules still show correctly** ✅

---

## ⚠️ CRITICAL: Did You Run SQL Fix?

**If you haven't run the SQL fix in Supabase yet, the NEW schedules will also get corrupted!**

**Before re-saving schedules, you MUST:**

1. Go to https://supabase.com/dashboard
2. Click SQL Editor → New query
3. Run this SQL:

```sql
DROP TABLE IF EXISTS schedules CASCADE;

CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  employee_number TEXT,
  admin_number TEXT,
  user_type TEXT,
  schedule_date DATE NOT NULL,
  shift_start TIME,
  shift_end TIME,
  grace_period INTEGER DEFAULT 30,
  is_day_off BOOLEAN DEFAULT FALSE,
  is_paid_leave BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedules_employee_number ON schedules(employee_number);
CREATE INDEX idx_schedules_admin_number ON schedules(admin_number);
CREATE INDEX idx_schedules_schedule_date ON schedules(schedule_date);
```

**Then follow Step 1 and Step 2 above.**

---

## 🔍 What This Does

1. **Deletes corrupted KV store data** for Moises (April 17-20)
2. **Deletes corrupted Supabase data** (if any exists)
3. **Clears the slate** so you can save fresh schedules

**After deletion:**
- Moises schedules will show as empty (+ icons)
- You can save new schedules
- If SQL fix is done, new schedules will save correctly ✅

---

## 📋 Full Process

```
1. Run SQL fix in Supabase (if not done yet)
   ↓
2. Run delete script in browser console
   ↓
3. Refresh page
   ↓
4. Re-save Moises schedules
   ↓
5. Refresh page again
   ↓
6. Verify schedules persist ✅
```

---

**This will fix the corrupted data for Moises.** If other employees also have corrupted schedules, modify the script to include their employee numbers.
