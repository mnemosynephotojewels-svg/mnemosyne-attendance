# Database Foreign Key Relationship - Optional Enhancement

## Issue Fixed in Code

The error `"Could not find a relationship between 'attendance_records' and 'employees' in the schema cache"` has been **resolved in the application code** by removing dependency on foreign key joins.

The application now:
- ✅ Fetches attendance records without joins
- ✅ Manually maps employee data using `employee_number`
- ✅ Works without foreign key relationships

**No database changes are required** - the app is fully functional now.

---

## Optional: Add Foreign Key (For Advanced Users)

If you want to enable foreign key relationships for future enhancements (optional), you can run this SQL:

### Step 1: Add Foreign Key to `attendance_records`

```sql
-- Option A: If using employee_number as the relationship key
ALTER TABLE attendance_records
ADD CONSTRAINT fk_attendance_employee_number
FOREIGN KEY (employee_number) 
REFERENCES employees(employee_number)
ON DELETE CASCADE;

-- Option B: If using employee_id as the relationship key
-- (Only if your attendance_records table has employee_id column)
ALTER TABLE attendance_records
ADD CONSTRAINT fk_attendance_employee_id
FOREIGN KEY (employee_id) 
REFERENCES employees(id)
ON DELETE CASCADE;
```

### Step 2: Reload Schema Cache

After adding the foreign key:
1. Go to Supabase Dashboard
2. Settings → API
3. Click **"Reload schema cache"**
4. Wait 10 seconds

### Step 3: Verify Relationship

```sql
-- Check if foreign key was created
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'attendance_records';
```

Expected output:
```
constraint_name              | table_name          | column_name     | foreign_table_name | foreign_column_name
fk_attendance_employee_number| attendance_records  | employee_number | employees          | employee_number
```

---

## Benefits of Adding Foreign Key (Optional)

### Without Foreign Key (Current - Working Fine)
```typescript
// Manual mapping required
const { data } = await supabase
  .from('attendance_records')
  .select('*')
  .eq('employee_number', empNum);

// Manually get employee data
const employee = employeeMap.get(data.employee_number);
```

### With Foreign Key (Optional Enhancement)
```typescript
// Can use nested select (more concise)
const { data } = await supabase
  .from('attendance_records')
  .select(`
    *,
    employees(
      employee_number,
      full_name,
      email
    )
  `)
  .eq('employee_number', empNum);

// Employee data automatically included
console.log(data.employees.full_name);
```

---

## Important Notes

1. **Not Required**: The application works perfectly without this foreign key
2. **Data Integrity**: Foreign key adds data integrity constraints
3. **ON DELETE CASCADE**: Deleting an employee will also delete their attendance records
4. **Performance**: May slightly improve query performance with proper indexes

---

## Troubleshooting

### If Foreign Key Creation Fails

**Error: "violates foreign key constraint"**

This means some attendance records have `employee_number` values that don't exist in the `employees` table.

**Solution:**
```sql
-- Find orphaned records
SELECT DISTINCT ar.employee_number
FROM attendance_records ar
LEFT JOIN employees e ON ar.employee_number = e.employee_number
WHERE e.employee_number IS NULL;

-- Option 1: Delete orphaned records
DELETE FROM attendance_records
WHERE employee_number NOT IN (SELECT employee_number FROM employees);

-- Option 2: Create placeholder employees for orphaned records
INSERT INTO employees (employee_number, full_name, status)
SELECT DISTINCT ar.employee_number, 'Unknown Employee', 'inactive'
FROM attendance_records ar
LEFT JOIN employees e ON ar.employee_number = e.employee_number
WHERE e.employee_number IS NULL;

-- Then try adding the foreign key again
```

---

## Summary

- ✅ **Application is working** - no database changes needed
- ✅ **Foreign key is optional** - only for advanced use cases
- ✅ **Code updated** - removed dependency on foreign key joins
- ✅ **No errors** - application runs smoothly

If you want to add the foreign key for future enhancements, follow the steps above. Otherwise, you're all set!
