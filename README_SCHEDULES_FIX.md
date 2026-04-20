# 📋 Schedules Table Fix - README

## 🎯 What You Need to Do

Your Mnemosyne schedules table needs to be fixed. Choose the guide that fits your needs:

---

## 🚀 Quick Fix (Recommended - 3 minutes)
**File:** `QUICK_FIX_GUIDE.md`

Super simple 3-step guide:
1. Open Supabase SQL Editor
2. Copy & paste the SQL
3. Run it

**Best for:** Users who want the fastest solution

---

## 📖 Detailed Step-by-Step Guide (5 minutes)
**File:** `FIX_SCHEDULES_TABLE_GUIDE.md`

Complete guide with:
- ✅ Screenshots descriptions
- ✅ Troubleshooting section
- ✅ Testing instructions
- ✅ Alternative methods

**Best for:** Users who want detailed instructions

---

## 💾 Just the SQL Script
**File:** `fix_schedules_table.sql`

Pure SQL file you can copy and paste directly into Supabase SQL Editor.

**Best for:** Advanced users who know what they're doing

---

## ⚡ FASTEST Way (Copy This Now!)

1. Go to: https://supabase.com/dashboard
2. Open your project → SQL Editor → New query
3. Paste this and click RUN:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'user_type') THEN 
    ALTER TABLE schedules ADD COLUMN user_type TEXT CHECK (user_type IN ('employee', 'admin')); 
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'shift_end') THEN 
    ALTER TABLE schedules ADD COLUMN shift_end TIME; 
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'grace_period') THEN 
    ALTER TABLE schedules ADD COLUMN grace_period INTEGER DEFAULT 30; 
  END IF;
END $$;
```

4. Refresh your Mnemosyne app (Ctrl+Shift+R)

✅ Done!

---

## 🆘 Help! My Table Doesn't Exist At All

If you get "relation schedules does not exist", run this instead:

```sql
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  employee_number TEXT,
  admin_number TEXT,
  user_type TEXT CHECK (user_type IN ('employee', 'admin')),
  schedule_date DATE NOT NULL,
  shift_start TIME,
  shift_end TIME,
  grace_period INTEGER DEFAULT 30,
  is_day_off BOOLEAN DEFAULT FALSE,
  is_paid_leave BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ How to Know It Worked

After running the SQL and refreshing your app:

1. ❌ Red error banner should disappear
2. ❌ Console errors about "user_type" should be gone
3. ✅ You can create schedules without errors
4. ✅ Schedules save to both KV store AND Supabase

---

## 📞 Still Need Help?

1. Check `FIX_SCHEDULES_TABLE_GUIDE.md` for troubleshooting
2. Open browser console (F12) and copy any error messages
3. Ask for help with the specific error

---

**Last Updated:** 2026-04-18
