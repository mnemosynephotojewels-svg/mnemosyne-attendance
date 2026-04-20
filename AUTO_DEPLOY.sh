#!/bin/bash

echo "════════════════════════════════════════════════════════════════"
echo "  AUTOMATIC DEPLOYMENT SCRIPT FOR LEAVE REQUEST FIX"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check if Supabase CLI exists
if [ ! -f "/tmp/supabase" ]; then
    echo "❌ Supabase CLI not found. Downloading..."
    curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C /tmp/
    chmod +x /tmp/supabase
    echo "✅ Supabase CLI downloaded"
fi

echo ""
echo "Choose your deployment method:"
echo ""
echo "1. AUTOMATIC (requires Supabase access token)"
echo "2. MANUAL (I'll show you what to copy-paste)"
echo ""
read -p "Enter 1 or 2: " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "Get your access token from:"
    echo "https://supabase.com/dashboard/account/tokens"
    echo ""
    read -p "Paste your Supabase access token here: " token

    if [ -z "$token" ]; then
        echo "❌ No token provided. Exiting."
        exit 1
    fi

    export SUPABASE_ACCESS_TOKEN="$token"

    echo ""
    echo "📦 Deploying to Supabase..."
    echo ""

    cd /workspaces/default/code
    if /tmp/supabase functions deploy make-server-df988758 --project-ref aoctrfafybrkzupfjbwj; then
        echo ""
        echo "✅ ✅ ✅ DEPLOYMENT SUCCESSFUL! ✅ ✅ ✅"
        echo ""
        echo "NEXT STEPS:"
        echo "1. Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api"
        echo "2. Click 'Reload schema cache'"
        echo "3. Clear browser cache (Ctrl+Shift+Delete)"
        echo "4. Refresh page (Ctrl+Shift+R)"
        echo "5. Try submitting a leave request"
        echo ""
        echo "The leave request should now work! 🎉"
    else
        echo ""
        echo "❌ Deployment failed. Trying manual method instead..."
        choice="2"
    fi
fi

if [ "$choice" = "2" ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  MANUAL DEPLOYMENT INSTRUCTIONS"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "STEP 1: Open this URL in your browser"
    echo "→ https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/functions"
    echo ""
    echo "STEP 2: Click on the function named:"
    echo "→ make-server-df988758"
    echo ""
    echo "STEP 3: Copy the entire contents of this file:"
    echo "→ /workspaces/default/code/supabase/functions/make-server/index.tsx"
    echo ""
    echo "File location copied to clipboard (if supported)"
    echo "/workspaces/default/code/supabase/functions/make-server/index.tsx" | xclip -selection clipboard 2>/dev/null || true
    echo ""
    echo "STEP 4: In the Supabase dashboard editor:"
    echo "→ Select all text (Ctrl+A)"
    echo "→ Paste the new code (Ctrl+V)"
    echo "→ Click 'Deploy' button"
    echo ""
    echo "STEP 5: After deployment completes:"
    echo "→ Go to: https://supabase.com/dashboard/project/aoctrfafybrkzupfjbwj/settings/api"
    echo "→ Click 'Reload schema cache' button"
    echo ""
    echo "STEP 6: Test the fix:"
    echo "→ Clear browser cache (Ctrl+Shift+Delete)"
    echo "→ Hard refresh (Ctrl+Shift+R)"
    echo "→ Submit a leave request"
    echo ""
    echo "✅ The error should be fixed!"
    echo ""

    read -p "Press Enter when you've completed the deployment..."
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Deployment process complete!"
echo "════════════════════════════════════════════════════════════════"
