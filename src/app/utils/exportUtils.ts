/**
 * Utility functions for exporting attendance data
 */
import * as XLSX from 'xlsx';

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Create header row
  const headerRow = headers.join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape values that contain commas, quotes, or newlines
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  }).join('\n');

  return `${headerRow}\n${dataRows}`;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Download Excel file
 */
export function downloadExcel(workbook: XLSX.WorkBook, filename: string): void {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Format date for filename
 */
export function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Export employee attendance records to CSV
 */
export function exportEmployeeAttendanceToCSV(
  records: any[],
  employeeName: string,
  dateRange?: { startDate: Date; endDate: Date }
): void {
  if (!records || records.length === 0) {
    throw new Error('No records to export');
  }

  // Define headers
  const headers = ['Date', 'Day', 'Check In', 'Check Out', 'Status'];

  // Map records to CSV format
  const csvData = records.map(record => ({
    'Date': new Date(record.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    'Day': new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' }),
    'Check In': record.checkIn || record.timeIn || '-',
    'Check Out': record.checkOut || record.timeOut || '-',
    'Status': formatStatusForExport(record.status)
  }));

  // Convert to CSV
  const csvContent = convertToCSV(csvData, headers);

  // Generate filename
  const today = formatDateForFilename(new Date());
  let filename = `Attendance_${employeeName.replace(/\s+/g, '_')}`;
  
  if (dateRange) {
    const startStr = formatDateForFilename(dateRange.startDate);
    const endStr = formatDateForFilename(dateRange.endDate);
    filename += `_${startStr}_to_${endStr}`;
  } else {
    filename += `_${today}`;
  }
  
  filename += '.csv';

  // Download
  downloadCSV(csvContent, filename);
}

/**
 * Export admin/team leader attendance records to CSV
 */
export function exportAdminAttendanceToCSV(
  records: any[],
  teamName: string,
  dateRange?: { startDate: Date; endDate: Date }
): void {
  if (!records || records.length === 0) {
    throw new Error('No records to export');
  }

  // Define headers
  const headers = ['Employee Number', 'Employee Name', 'Date', 'Day', 'Check In', 'Check Out', 'Status', 'Notes'];

  // Map records to CSV format
  const csvData = records.map(record => ({
    'Employee Number': record.employeeId || record.employee_number || '-',
    'Employee Name': record.employeeName || record.employee_name || '-',
    'Date': new Date(record.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    'Day': new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' }),
    'Check In': record.checkIn || record.timeIn || '-',
    'Check Out': record.checkOut || record.timeOut || '-',
    'Status': formatStatusForExport(record.status),
    'Notes': getRecordNotes(record)
  }));

  // Convert to CSV
  const csvContent = convertToCSV(csvData, headers);

  // Generate filename
  const today = formatDateForFilename(new Date());
  let filename = `Attendance_${teamName.replace(/\s+/g, '_')}_Team`;
  
  if (dateRange) {
    const startStr = formatDateForFilename(dateRange.startDate);
    const endStr = formatDateForFilename(dateRange.endDate);
    filename += `_${startStr}_to_${endStr}`;
  } else {
    filename += `_${today}`;
  }
  
  filename += '.csv';

  // Download
  downloadCSV(csvContent, filename);
}

/**
 * Export super admin attendance records to CSV
 */
export function exportSuperAdminAttendanceToCSV(
  records: any[],
  teamFilter: string = 'All',
  dateRange?: { startDate: Date; endDate: Date }
): void {
  if (!records || records.length === 0) {
    throw new Error('No records to export');
  }

  // Define headers
  const headers = ['Employee Number', 'Employee Name', 'Team', 'Date', 'Day', 'Check In', 'Check Out', 'Status', 'Notes'];

  // Map records to CSV format
  const csvData = records.map(record => ({
    'Employee Number': record.employeeId || record.employee_number || '-',
    'Employee Name': record.employeeName || record.employee_name || '-',
    'Team': record.teamName || record.team_name || '-',
    'Date': new Date(record.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    'Day': new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' }),
    'Check In': record.checkIn || record.timeIn || '-',
    'Check Out': record.checkOut || record.timeOut || '-',
    'Status': formatStatusForExport(record.status),
    'Notes': getRecordNotes(record)
  }));

  // Convert to CSV
  const csvContent = convertToCSV(csvData, headers);

  // Generate filename
  const today = formatDateForFilename(new Date());
  let filename = `Attendance_${teamFilter.replace(/\s+/g, '_')}`;
  
  if (dateRange) {
    const startStr = formatDateForFilename(dateRange.startDate);
    const endStr = formatDateForFilename(dateRange.endDate);
    filename += `_${startStr}_to_${endStr}`;
  } else {
    filename += `_${today}`;
  }
  
  filename += '.csv';

  // Download
  downloadCSV(csvContent, filename);
}

/**
 * Export super admin attendance records to Excel
 */
export function exportSuperAdminAttendanceToExcel(
  records: any[],
  teamFilter: string = 'All',
  dateRange?: { startDate: Date; endDate: Date }
): void {
  if (!records || records.length === 0) {
    throw new Error('No records to export');
  }

  // Map records to Excel format
  const excelData = records.map(record => ({
    'Employee Number': record.employeeId || record.employee_number || '-',
    'Employee Name': record.employeeName || record.employee_name || '-',
    'Team': record.teamName || record.team_name || '-',
    'Date': new Date(record.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    'Day': new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' }),
    'Check In': record.checkIn || record.timeIn || '-',
    'Check Out': record.checkOut || record.timeOut || '-',
    'Status': formatStatusForExport(record.status),
    'Notes': getRecordNotes(record)
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const columnWidths = [
    { wch: 15 }, // Employee Number
    { wch: 25 }, // Employee Name
    { wch: 20 }, // Team
    { wch: 15 }, // Date
    { wch: 10 }, // Day
    { wch: 12 }, // Check In
    { wch: 12 }, // Check Out
    { wch: 15 }, // Status
    { wch: 40 }  // Notes
  ];
  worksheet['!cols'] = columnWidths;

  // Style header row (A1 to I1)
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '0B3060' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };

  // Apply header styles
  const headers = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1'];
  headers.forEach(cell => {
    if (worksheet[cell]) {
      worksheet[cell].s = headerStyle;
    }
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Records');

  // Add metadata sheet
  const metadataSheet = XLSX.utils.aoa_to_sheet([
    ['Report Information'],
    ['Generated:', new Date().toLocaleString('en-US')],
    ['Filter:', teamFilter],
    ['Total Records:', records.length],
    dateRange ? ['Date Range:', `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`] : []
  ]);
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Report Info');

  // Generate filename
  const today = formatDateForFilename(new Date());
  let filename = `Attendance_${teamFilter.replace(/\s+/g, '_')}`;
  
  if (dateRange) {
    const startStr = formatDateForFilename(dateRange.startDate);
    const endStr = formatDateForFilename(dateRange.endDate);
    filename += `_${startStr}_to_${endStr}`;
  } else {
    filename += `_${today}`;
  }
  
  filename += '.xlsx';

  // Download
  downloadExcel(workbook, filename);
}

/**
 * Format status for export
 */
function formatStatusForExport(status: string | null): string {
  if (!status) return 'No Status';
  
  const statusMap: { [key: string]: string } = {
    'present': 'Present',
    'on-time': 'On Time',
    'late': 'Late',
    'absent': 'Absent',
    'early-out': 'Early Out',
    'overtime': 'Overtime',
    'paid_leave': 'Paid Leave',
    'day off': 'Day Off'
  };
  
  return statusMap[status.toLowerCase()] || status;
}

/**
 * Get record notes for export
 */
function getRecordNotes(record: any): string {
  const notes: string[] = [];

  if (record.isCorrected) {
    notes.push('Time Corrected');
  }

  if (record.isPaidLeave) {
    notes.push('Paid Leave');
  }

  if (record.leaveInfo) {
    if (record.leaveInfo.leaveType) {
      notes.push(`Leave Type: ${record.leaveInfo.leaveType}`);
    }
    if (record.leaveInfo.reason) {
      notes.push(`Reason: ${record.leaveInfo.reason}`);
    }
  }

  return notes.join('; ');
}

/**
 * Export employee attendance with hours rendered to CSV
 */
export function exportEmployeeAttendanceWithHoursToCSV(
  records: any[],
  employeeName: string,
  employeeId: string,
  dateRange?: { startDate: Date; endDate: Date }
): void {
  if (!records || records.length === 0) {
    throw new Error('No records to export');
  }

  // Define headers
  const headers = ['Date', 'Day', 'Time In', 'Time Out', 'Hours Rendered', 'Status', 'Leave Details'];

  // Map records to CSV format
  const csvData = records.map(record => ({
    'Date': new Date(record.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    'Day': new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' }),
    'Time In': record.timeIn || '-',
    'Time Out': record.timeOut || '-',
    'Hours Rendered': record.hoursWorked > 0 ? record.hoursWorked.toFixed(2) : '-',
    'Status': formatStatusForExport(record.status),
    'Leave Details': record.leaveInfo ?
      `${record.leaveInfo.leaveType || ''} ${record.leaveInfo.reason ? '- ' + record.leaveInfo.reason : ''}`.trim()
      : '-'
  }));

  // Calculate total hours
  const totalHours = records.reduce((sum, record) => sum + (record.hoursWorked || 0), 0);

  // Add total row
  csvData.push({
    'Date': '',
    'Day': '',
    'Time In': '',
    'Time Out': 'TOTAL HOURS:',
    'Hours Rendered': totalHours.toFixed(2),
    'Status': '',
    'Leave Details': ''
  });

  // Convert to CSV
  const csvContent = convertToCSV(csvData, headers);

  // Generate filename
  const today = formatDateForFilename(new Date());
  let filename = `Attendance_${employeeName.replace(/\s+/g, '_')}_${employeeId}`;

  if (dateRange) {
    const startStr = formatDateForFilename(dateRange.startDate);
    const endStr = formatDateForFilename(dateRange.endDate);
    filename += `_${startStr}_to_${endStr}`;
  } else {
    filename += `_${today}`;
  }

  filename += '.csv';

  // Download
  downloadCSV(csvContent, filename);
}