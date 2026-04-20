-- =====================================================
-- LEAVE APPROVAL STORED PROCEDURE
-- =====================================================
-- This function handles the complete leave approval workflow:
-- 1. Updates leave request status to 'approved'
-- 2. Deducts days from employee's leave balance
-- 3. Creates attendance records with PAID_LEAVE status
-- 4. Creates schedule entries with is_paid_leave = true flag
-- 5. Logs the balance change
-- =====================================================

-- Drop existing function if it exists
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

  -- Check if leave request exists
  IF v_employee_number IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Leave request not found'
    );
  END IF;

  -- Get employee name
  SELECT full_name INTO v_employee_name
  FROM employees
  WHERE employee_number = v_employee_number;

  -- Get current leave balance
  SELECT leave_balance INTO v_current_balance
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

  -- Calculate new balance
  v_new_balance := GREATEST(0, v_current_balance - v_total_days);

  -- Update leave request status
  UPDATE leave_requests
  SET 
    status = 'approved',
    approved_by = p_approved_by,
    approved_at = NOW(),
    paid_days = v_paid_days,
    unpaid_days = v_unpaid_days,
    updated_at = NOW()
  WHERE id = p_leave_request_id;

  -- Update employee leave balance
  UPDATE employees
  SET 
    leave_balance = v_new_balance,
    updated_at = NOW()
  WHERE employee_number = v_employee_number;

  -- Log the balance change
  INSERT INTO leave_balance_history (
    employee_number,
    balance_before,
    balance_after,
    change_amount,
    change_type,
    notes,
    created_by,
    leave_request_id
  ) VALUES (
    v_employee_number,
    v_current_balance,
    v_new_balance,
    -(v_paid_days), -- Negative because we're deducting
    CASE 
      WHEN v_unpaid_days > 0 THEN 'paid_leave_approved'
      ELSE 'paid_leave_approved'
    END,
    format('Leave approved: %s to %s (%s paid days, %s unpaid days)', 
      v_start_date::TEXT, 
      v_end_date::TEXT,
      v_paid_days,
      v_unpaid_days
    ),
    p_approved_by,
    p_leave_request_id
  );

  -- Create attendance records and schedules for each day
  v_current_date := v_start_date;
  
  WHILE v_current_date <= v_end_date LOOP
    -- Determine if this day is paid or unpaid
    DECLARE
      v_is_paid_day BOOLEAN;
      v_days_from_start INTEGER;
    BEGIN
      v_days_from_start := v_current_date - v_start_date;
      v_is_paid_day := v_days_from_start < v_paid_days;

      -- Create attendance record
      INSERT INTO attendance_records (
        employee_number,
        date,
        status,
        type,
        time_in,
        time_out,
        hours_worked,
        leave_request_id,
        notes,
        created_at,
        updated_at
      ) VALUES (
        v_employee_number,
        v_current_date,
        CASE WHEN v_is_paid_day THEN 'PAID_LEAVE' ELSE 'ABSENT' END,
        CASE WHEN v_is_paid_day THEN 'PAID_LEAVE' ELSE 'ABSENT' END,
        NULL,
        NULL,
        CASE WHEN v_is_paid_day THEN 8 ELSE 0 END, -- 8 hours for paid leave
        p_leave_request_id,
        CASE 
          WHEN v_is_paid_day THEN 'Approved paid leave'
          ELSE 'Approved unpaid leave (balance exhausted)'
        END,
        NOW(),
        NOW()
      )
      ON CONFLICT (employee_number, date) 
      DO UPDATE SET
        status = EXCLUDED.status,
        type = EXCLUDED.type,
        hours_worked = EXCLUDED.hours_worked,
        leave_request_id = EXCLUDED.leave_request_id,
        notes = EXCLUDED.notes,
        updated_at = NOW();

      -- Create or update schedule entry with is_paid_leave flag
      INSERT INTO schedules (
        employee_number,
        schedule_date,
        shift_start,
        shift_end,
        is_day_off,
        is_paid_leave,
        created_at,
        updated_at
      ) VALUES (
        v_employee_number,
        v_current_date,
        CASE WHEN v_is_paid_day THEN '08:00'::TIME ELSE NULL END,
        CASE WHEN v_is_paid_day THEN '16:00'::TIME ELSE NULL END,
        NOT v_is_paid_day, -- If unpaid, mark as day off
        v_is_paid_day, -- THIS IS THE CRITICAL FLAG
        NOW(),
        NOW()
      )
      ON CONFLICT (employee_number, schedule_date) 
      DO UPDATE SET
        is_paid_leave = EXCLUDED.is_paid_leave,
        is_day_off = EXCLUDED.is_day_off,
        shift_start = EXCLUDED.shift_start,
        shift_end = EXCLUDED.shift_end,
        updated_at = NOW();

    END;

    -- Move to next day
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  -- Build success result
  v_result := json_build_object(
    'success', true,
    'message', format(
      'Leave approved for %s: %s paid days, %s unpaid days. Balance: %s → %s',
      v_employee_name,
      v_paid_days,
      v_unpaid_days,
      v_current_balance,
      v_new_balance
    ),
    'paid_days', v_paid_days,
    'unpaid_days', v_unpaid_days,
    'old_balance', v_current_balance,
    'new_balance', v_new_balance,
    'employee_number', v_employee_number,
    'employee_name', v_employee_name
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Error approving leave: %s', SQLERRM)
    );
END;
$$;

-- =====================================================
-- REJECT LEAVE REQUEST FUNCTION
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
DECLARE
  v_employee_number TEXT;
  v_employee_name TEXT;
BEGIN
  -- Get employee details
  SELECT 
    lr.employee_number,
    e.full_name
  INTO 
    v_employee_number,
    v_employee_name
  FROM leave_requests lr
  JOIN employees e ON lr.employee_number = e.employee_number
  WHERE lr.id = p_leave_request_id;

  -- Check if leave request exists
  IF v_employee_number IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Leave request not found'
    );
  END IF;

  -- Update leave request status
  UPDATE leave_requests
  SET 
    status = 'rejected',
    rejected_by = p_rejected_by,
    rejected_at = NOW(),
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_leave_request_id;

  RETURN json_build_object(
    'success', true,
    'message', format('Leave request rejected for %s', v_employee_name),
    'employee_number', v_employee_number,
    'employee_name', v_employee_name
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', format('Error rejecting leave: %s', SQLERRM)
    );
END;
$$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test that the function exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('approve_leave_request', 'reject_leave_request');

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ Leave approval functions created successfully!';
  RAISE NOTICE '   - approve_leave_request(p_leave_request_id UUID, p_approved_by TEXT)';
  RAISE NOTICE '   - reject_leave_request(p_leave_request_id UUID, p_rejected_by TEXT, p_rejection_reason TEXT)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 These functions will:';
  RAISE NOTICE '   1. Update leave request status';
  RAISE NOTICE '   2. Deduct from employee leave balance';
  RAISE NOTICE '   3. Create attendance records (PAID_LEAVE or ABSENT)';
  RAISE NOTICE '   4. Create schedule entries with is_paid_leave = true';
  RAISE NOTICE '   5. Log all balance changes';
END $$;
