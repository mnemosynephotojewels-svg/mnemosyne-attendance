# Deploy Edge Function to Supabase

The leave request fix has been applied to the local code, but needs to be deployed to Supabase to take effect.

## Option 1: Manual Deployment via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj

2. Navigate to **Edge Functions** in the left sidebar

3. Find the `make-server-df988758` function

4. Click **Edit** or **Deploy**

5. Copy the entire contents of `/supabase/functions/make-server/index.tsx`

6. Paste it into the editor, replacing the existing code

7. Click **Deploy** or **Save**

8. After deployment, go to **Settings → API** and click **"Reload schema cache"**

## Option 2: Deploy via Supabase CLI

If you have Supabase CLI installed:

```bash
# Navigate to project root
cd /workspaces/default/code

# Deploy the edge function
supabase functions deploy make-server-df988758 --project-ref aoctrfafybrkzupfjbwj
```

## Option 3: Install Supabase CLI and Deploy

```bash
# Install Supabase CLI
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
sudo mv supabase /usr/local/bin/

# Login to Supabase
supabase login

# Deploy the function
cd /workspaces/default/code
supabase functions deploy make-server-df988758 --project-ref aoctrfafybrkzupfjbwj
```

## What Was Fixed

The backend was trying to insert a `user_type` column that doesn't exist in the `leave_requests` table. The fix removes this field from the insert operation.

**Changed in `/supabase/functions/make-server/index.tsx` around line 1517-1525:**

```typescript
// BEFORE (causing error):
if (employee_number) {
  insertData.employee_number = employee_number;
  insertData.user_type = 'employee';  // ❌ This column doesn't exist
} else if (admin_number) {
  insertData.admin_number = admin_number;
  insertData.user_type = 'admin';  // ❌ This column doesn't exist
}

// AFTER (fixed):
if (employee_number) {
  insertData.employee_number = employee_number;
} else if (admin_number) {
  insertData.admin_number = admin_number;
}
```

## After Deployment

1. Test by submitting a leave request
2. Check browser console for success message
3. Verify the leave request appears in the database

If you still see the error after deployment, make sure to:
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh the page (Ctrl+Shift+R)
- Check that you deployed to the correct function name
