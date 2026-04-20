-- =====================================================
-- 🏖️ QUICK FIX: PAID LEAVE SCHEDULE DISPLAY
-- =====================================================
-- Run this entire file in Supabase SQL Editor to fix
-- paid leave not showing in employee "My Schedule" tab
-- =====================================================

-- =====================================================
-- PART 1: Add is_paid_leave column to schedules table
-- =====================================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'schedules' 
    AND column_name = 'is_paid_leave'
  ) INTO v_column_exists;

  IF v_column_exists THEN
    RAISE NOTICE '✅ Column is_paid_leave already exists';
  ELSE
    RAISE NOTICE '➕ Adding is_paid_leave column...';
    ALTER TABLE schedules 
    ADD COLUMN is_paid_leave BOOLEAN NOT NULL DEFAULT false;
    RAISE NOTICE '✅ Column is_paid_leave added successfully';
  END IF;
END $$;

-- =====================================================
-- PART 2: Create approve_leave_request function
-- =====================================================

DROP FUNCTION IF EXISTS approve_leave_request(UUID, TEXT);

CREATE OR REPLACE FUNCTION approve_leave_request(
  p_leave_request_id UUID,
  p_approved_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_number TEXT;
  v_start_date DATE;
  v_end_date DATE;
  v_total_days INTEGER;
  v_current_balance INTEGER;
  v_paid_days INTEGER;
  v_unpaid_days INTEGER;
  v_new_balance INTEGER;
  v_current_date DATE;
  v_employee_name TEXT;
  v_result JSON;
BEGIN
  -- Get leave request details
  SELECT 
    employee_number, 
    start_date, 
    end_date,
    total_days
  INTO 
    v_employee_number, 
    v_start_date, 
    v_end_date,
    v_total_days
  FROM leave_requests
  WHERE id = p_leave_request_id;

  IF v_employee_number IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Leave request not found');
  END IF;

  -- Get employee details
  SELECT full_name, leave_balance 
  INTO v_employee_name, v_current_balance
  FROM employees
  WHERE employee_number = v_employee_number;

  -- Calculate paid vs unpaid days
  IF v_current_balance >= v_total_days THEN
    v_paid_days := v_total_days;
    v_unpaid_days := 0;
  ELSIF v_current_balance > 0 THEN
    v_paid_days := v_current_balance;
    v_unpaid_days := v_total_days - v_current_balance;
  ELSE
    v_paid_days := 0;
    v_unpaid_days := v_total_days;
  END IF;

  v_new_balance := GREATEST(0, v_current_balance - v_total_days);

  -- Update leave request
  UPDATE leave_requests
  SET 
    status = 'approved',
    approved_by = p_approved_by,
    approved_at = NOW(),
    paid_days = v_paid_days,
    unpaid_days = v_unpaid_days,
    updated_at = NOW()
  WHERE id = p_leave_request_id;

  -- Update employee balance
  UPDATE employees
  SET leave_balance = v_new_balance, updated_at = NOW()
  WHERE employee_number = v_employee_number;

  -- Log balance change
  INSERT INTO leave_balance_history (
    employee_number, balance_before, balance_after, change_amount,
    change_type, notes, created_by, leave_request_id
  ) VALUES (
    v_employee_number, v_current_balance, v_new_balance, -(v_paid_days),
    'paid_leave_approved',
    format('Leave approved: %s to %s (%s paid, %s unpaid)', 
      v_start_date, v_end_date, v_paid_days, v_unpaid_days),
    p_approved_by, p_leave_request_id
  );

  -- Create attendance records and schedules
  v_current_date := v_start_date;
  
  WHILE v_current_date <= v_end_date LOOP
    DECLARE
      v_is_paid_day BOOLEAN;
      v_days_from_start INTEGER;
    BEGIN
      v_days_from_start := v_current_date - v_start_date;
      v_is_paid_day := v_days_from_start < v_paid_days;

      -- Create attendance record
      INSERT INTO attendance_records (
        employee_number, date, status, type, hours_worked,
        leave_request_id, notes, created_at, updated_at
      ) VALUES (
        v_employee_number, v_current_date,
        CASE WHEN v_is_paid_day THEN 'PAID_LEAVE' ELSE 'ABSENT' END,
        CASE WHEN v_is_paid_day THEN 'PAID_LEAVE' ELSE 'ABSENT' END,
        CASE WHEN v_is_paid_day THEN 8 ELSE 0 END,
        p_leave_request_id,
        CASE WHEN v_is_paid_day THEN 'Approved paid leave' ELSE 'Unpaid leave' END,
        NOW(), NOW()
      )
      ON CONFLICT (employee_number, date) 
      DO UPDATE SET
        status = EXCLUDED.status,
        type = EXCLUDED.type,
        hours_worked = EXCLUDED.hours_worked,
        leave_request_id = EXCLUDED.leave_request_id,
        notes = EXCLUDED.notes,
        updated_at = NOW();

      -- 🔑 CREATE SCHEDULE WITH is_paid_leave FLAG (THIS IS THE KEY!)
      INSERT INTO schedules (
        employee_number, schedule_date, shift_start, shift_end,
        is_day_off, is_paid_leave, created_at, updated_at
      ) VALUES (
        v_employee_number, v_current_date,
        CASE WHEN v_is_paid_day THEN '08:00'::TIME ELSE NULL END,
        CASE WHEN v_is_paid_day THEN '16:00'::TIME ELSE NULL END,
        NOT v_is_paid_day,
        v_is_paid_day, -- ⭐ THIS IS THE CRITICAL FLAG ⭐
        NOW(), NOW()
      )
      ON CONFLICT (employee_number, schedule_date) 
      DO UPDATE SET
        is_paid_leave = EXCLUDED.is_paid_leave,
        is_day_off = EXCLUDED.is_day_off,
        shift_start = EXCLUDED.shift_start,
        shift_end = EXCLUDED.shift_end,
        updated_at = NOW();

    END;
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'message', format('Leave approved: %s paid days, %s unpaid. Balance: %s → %s',
      v_paid_days, v_unpaid_days, v_current_balance, v_new_balance),
    'paid_days', v_paid_days,
    'unpaid_days', v_unpaid_days,
    'old_balance', v_current_balance,
    'new_balance', v_new_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- =====================================================
-- PART 3: Create reject_leave_request function
-- =====================================================

DROP FUNCTION IF EXISTS reject_leave_request(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION reject_leave_request(
  p_leave_request_id UUID,
  p_rejected_by TEXT,
  p_rejection_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE leave_requests
  SET 
    status = 'rejected',
    rejected_by = p_rejected_by,
    rejected_at = NOW(),
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_leave_request_id;

  RETURN json_build_object('success', true, 'message', 'Leave request rejected');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- =====================================================
-- PART 4: Fix existing approved leaves
-- =====================================================

DO $$
DECLARE
  v_leave RECORD;
  v_current_date DATE;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔧 Fixing existing approved leaves...';
  
  FOR v_leave IN 
    SELECT id, employee_number, start_date, end_date, paid_days, unpaid_days
    FROM leave_requests
    WHERE status = 'approved'
    AND approved_at IS NOT NULL
  LOOP
    v_current_date := v_leave.start_date;
    
    WHILE v_current_date <= v_leave.end_date LOOP
      DECLARE
        v_is_paid_day BOOLEAN;
        v_days_from_start INTEGER;
      BEGIN
        v_days_from_start := v_current_date - v_leave.start_date;
        v_is_paid_day := v_days_from_start < COALESCE(v_leave.paid_days, 0);

        -- Update or create schedule with is_paid_leave flag
        INSERT INTO schedules (
          employee_number, schedule_date, shift_start, shift_end,
          is_day_off, is_paid_leave, created_at, updated_at
        ) VALUES (
          v_leave.employee_number, v_current_date,
          CASE WHEN v_is_paid_day THEN '08:00'::TIME ELSE NULL END,
          CASE WHEN v_is_paid_day THEN '16:00'::TIME ELSE NULL END,
          NOT v_is_paid_day,
          v_is_paid_day,
          NOW(), NOW()
        )
        ON CONFLICT (employee_number, schedule_date) 
        DO UPDATE SET
          is_paid_leave = EXCLUDED.is_paid_leave,
          is_day_off = EXCLUDED.is_day_off,
          shift_start = EXCLUDED.shift_start,
          shift_end = EXCLUDED.shift_end,
          updated_at = NOW();

        v_count := v_count + 1;
      END;
      
      v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ Fixed % schedule entries for existing approved leaves', v_count;
END $$;

-- =====================================================
-- PART 5: Verification
-- =====================================================

-- Show summary
SELECT 
  COUNT(*) as total_schedules,
  COUNT(*) FILTER (WHERE is_paid_leave = true) as paid_leave_count,
  COUNT(*) FILTER (WHERE is_day_off = true) as day_off_count
FROM schedules;

-- Show recent paid leaves
SELECT 
  s.employee_number,
  e.full_name,
  s.schedule_date,
  s.is_paid_leave,
  s.shift_start,
  s.shift_end
FROM schedules s
JOIN employees e ON s.employee_number = e.employee_number
WHERE s.is_paid_leave = true
ORDER BY s.schedule_date DESC
LIMIT 10;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ PAID LEAVE SCHEDULE FIX COMPLETE!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📋 What was done:';
  RAISE NOTICE '   1. ✅ Added is_paid_leave column to schedules table';
  RAISE NOTICE '   2. ✅ Created approve_leave_request() function';
  RAISE NOTICE '   3. ✅ Created reject_leave_request() function';
  RAISE NOTICE '   4. ✅ Fixed existing approved leave schedules';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   1. Go to Employee Portal → My Schedule tab';
  RAISE NOTICE '   2. You should now see approved paid leave days!';
  RAISE NOTICE '   3. Look for purple 🏖️ PAID LEAVE badges';
  RAISE NOTICE '   4. Check the paid leave summary cards';
  RAISE NOTICE '';
  RAISE NOTICE '🐛 If still not working:';
  RAISE NOTICE '   1. Click "🐛 Debug" button in My Schedule';
  RAISE NOTICE '   2. Open browser console (F12) for logs';
  RAISE NOTICE '   3. Click "Refresh Schedule" button';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
