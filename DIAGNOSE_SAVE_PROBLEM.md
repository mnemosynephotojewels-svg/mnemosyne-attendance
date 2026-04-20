# 🔍 DIAGNOSE WHY SCHEDULE SAVES AS DAY OFF

## Step 1: Open Browser Console

1. **Press F12** (or right-click → Inspect)
2. **Click "Console" tab**
3. **Click the trash icon** 🗑️ to clear old logs

## Step 2: Save a Schedule (Watch Console)

1. **Go to Manage Schedule**
2. **Click on Moises, April 18**
3. **Select "Working Shift"**
4. **Set times: 08:00 - 17:00**
5. **Click "Save Schedule"**
6. **Watch the console for messages**

## Step 3: What to Look For

### ✅ If SQL Fix Worked (Good):

You should see:
```
💾 Saving schedule for: { name: "Moises", ... }
📤 Sending upsert payload: { shift_start: "08:00", shift_end: "17:00", ... }
✅ Supabase: Schedule created successfully
```

### ❌ If SQL Fix NOT Run Yet (Bad):

You will see:
```
⚠️ Supabase save failed: invalid input syntax for type bigint
Error: invalid input syntax for type bigint: "schedule:EMP-1053:2026-04-18"
```

### ❌ If Different Error:

Copy the ENTIRE error message and tell me what it says.

## Step 4: Tell Me What You See

**Reply with:**
- ✅ "I see: Supabase: Schedule created successfully" = SQL fix worked
- ❌ "I see: invalid input syntax for type bigint" = SQL fix NOT run yet
- ❓ "I see different error: [paste error]" = Different problem

---

## 🚨 IMPORTANT QUESTIONS

### Did you run the SQL in Supabase?

**Answer YES or NO:**
- [ ] YES - I went to Supabase dashboard
- [ ] YES - I clicked SQL Editor
- [ ] YES - I pasted the SQL
- [ ] YES - I clicked RUN
- [ ] YES - I saw "Success" message

**If any answer is NO, that's why it's not working.** You MUST run the SQL.

### Where to run SQL:

**NOT in your app**
**NOT in the code**
**NOT in the terminal**

**ONLY HERE:**
1. Open browser → Go to https://supabase.com/dashboard
2. Click your project
3. Click "SQL Editor" (left sidebar)
4. Click "New query"
5. Paste SQL from `FIX_DATABASE_NOW.sql`
6. Click big RUN button

---

## Quick Check: Is Database Fixed?

Run this in Supabase SQL Editor to check table structure:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'schedules' 
ORDER BY ordinal_position;
```

**Look at the `id` column:**
- ❌ If shows `bigint` → SQL NOT run yet
- ✅ If shows `text` or `character varying` → SQL was run correctly

---

**Please do Step 1-3 above and tell me EXACTLY what you see in console.**
