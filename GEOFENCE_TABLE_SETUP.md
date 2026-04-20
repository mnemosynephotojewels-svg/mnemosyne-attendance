# 🗺️ Geofence Configuration Table Setup

## ⚠️ IMPORTANT: Database Setup Required

The geofence save feature requires a new table in your Supabase database. Follow these steps:

---

## 📋 Step 1: Create the `geofence_config` Table

Go to your Supabase Dashboard → SQL Editor and run this SQL:

```sql
-- Create geofence_config table
CREATE TABLE IF NOT EXISTS geofence_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_latitude DECIMAL(10, 8) NOT NULL,
  center_longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT true,
  location_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE geofence_config IS 'Stores geofence configuration for kiosk mode attendance tracking';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_geofence_config_updated_at
    BEFORE UPDATE ON geofence_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 📋 Step 2: Set Up RLS (Row Level Security)

Run this SQL to configure permissions:

```sql
-- Enable RLS
ALTER TABLE geofence_config ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role has full access to geofence_config"
ON geofence_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Allow authenticated users to read
CREATE POLICY "Authenticated users can read geofence_config"
ON geofence_config
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow anon users to read (for kiosk mode validation)
CREATE POLICY "Anonymous users can read geofence_config"
ON geofence_config
FOR SELECT
TO anon
USING (true);
```

---

## ✅ Step 3: Test the Setup

After creating the table, test it in the SQL Editor:

```sql
-- Test query
SELECT * FROM geofence_config;
```

You should see an empty table with no errors.

---

## 🎯 What This Enables

Once the table is created:

✅ **Super Admin can save geofence settings** to the database  
✅ **Kiosk Mode automatically loads** the geofence configuration  
✅ **Real-time location validation** against the configured area  
✅ **Persistent storage** across all devices and sessions  

---

## 🔧 Troubleshooting

### Error: "relation 'geofence_config' does not exist"

**Solution:** You haven't created the table yet. Run the SQL from Step 1.

### Error: "new row violates row-level security policy"

**Solution:** You need to set up RLS policies. Run the SQL from Step 2.

### Settings Save to localStorage Only

**Solution:** Check that:
1. The table exists (run `SELECT * FROM geofence_config;`)
2. RLS policies are set up correctly
3. Your Supabase credentials are configured

---

## 📊 Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `center_latitude` | DECIMAL(10,8) | Center point latitude |
| `center_longitude` | DECIMAL(11,8) | Center point longitude |
| `radius_meters` | INTEGER | Allowed radius in meters |
| `enabled` | BOOLEAN | Whether geofencing is active |
| `location_name` | TEXT | Optional name for the location |
| `created_at` | TIMESTAMP | When the record was created |
| `updated_at` | TIMESTAMP | Last update timestamp |

---

## 🚀 Next Steps

After creating the table:

1. ✅ Go to **Super Admin Dashboard** → **Geofence Settings**
2. ✅ Click on the map to select a location
3. ✅ Set your desired radius
4. ✅ Click **"Save Configuration"**
5. ✅ You should see: **"Geofence settings saved to database successfully!"**

---

## 💡 How It Works

```
┌─────────────────────────────────────────┐
│  Super Admin Geofence Settings Page     │
│  - Select location on map               │
│  - Set radius (50-500 meters)           │
│  - Enable/Disable geofencing            │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  POST /geofence/config                  │
│  - Validates input                      │
│  - Saves to geofence_config table       │
│  - Returns success/error                │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Kiosk Mode                             │
│  - Loads config on startup              │
│  - Validates employee location          │
│  - Enables/Disables Time In/Out buttons │
└─────────────────────────────────────────┘
```

---

## 🎉 Done!

Once you've created the table, the geofence save feature will work perfectly! 🚀
