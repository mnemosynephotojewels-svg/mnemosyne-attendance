import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, Clock, X, AlertCircle, Download, Filter, ChevronDown, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { toast } from 'sonner';
import { DayPicker, DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';

// Date range filter presets
type DateRangePreset = 'all_time' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_30_days' | 'last_90_days' | 'custom';

interface EmployeeAttendanceModalProps {
  isOpen: boolean;
  employee: any;
  records: any[];
  dateRangeLabel?: string;
  onClose: () => void;
}

export function EmployeeAttendanceModal({
  isOpen,
  employee,
  records,
  dateRangeLabel = 'All Time',
  onClose
}: EmployeeAttendanceModalProps) {
  if (!isOpen || !employee) return null;

  // Date filter states
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all_time');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined);
  const [filterTab, setFilterTab] = useState<'quick' | 'calendar'>('quick');

  // Get date range based on preset
  const getDateRange = useCallback((): { startDate: Date; endDate: Date } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    let startDate = new Date(today);

    if (dateRangePreset === 'custom' && selectedRange?.from && selectedRange?.to) {
      return {
        startDate: selectedRange.from,
        endDate: selectedRange.to
      };
    }

    switch (dateRangePreset) {
      case 'all_time':
        startDate = new Date('2000-01-01');
        endDate.setFullYear(today.getFullYear() + 1);
        break;
      
      case 'today':
        break;
      
      case 'yesterday':
        startDate.setDate(today.getDate() - 1);
        endDate.setDate(today.getDate() - 1);
        break;
      
      case 'this_week':
        const dayOfWeek = today.getDay();
        startDate.setDate(today.getDate() - dayOfWeek);
        break;
      
      case 'last_week':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        startDate = lastWeekStart;
        endDate.setTime(lastWeekEnd.getTime());
        break;
      
      case 'this_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      
      case 'last_month':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = lastMonthStart;
        endDate.setTime(lastMonthEnd.getTime());
        break;
      
      case 'last_30_days':
        startDate.setDate(today.getDate() - 30);
        break;
      
      case 'last_90_days':
        startDate.setDate(today.getDate() - 90);
        break;
      
      default:
        startDate = new Date('2000-01-01');
        endDate.setFullYear(today.getFullYear() + 1);
    }

    return { startDate, endDate };
  }, [dateRangePreset, selectedRange]);

  // Get label for current date range
  const getFilterLabel = useCallback((): string => {
    if (dateRangePreset === 'all_time') return 'All Time';
    if (dateRangePreset === 'today') return 'Today';
    if (dateRangePreset === 'yesterday') return 'Yesterday';
    if (dateRangePreset === 'this_week') return 'This Week';
    if (dateRangePreset === 'last_week') return 'Last Week';
    if (dateRangePreset === 'this_month') return 'This Month';
    if (dateRangePreset === 'last_month') return 'Last Month';
    if (dateRangePreset === 'last_30_days') return 'Last 30 Days';
    if (dateRangePreset === 'last_90_days') return 'Last 90 Days';
    
    if (dateRangePreset === 'custom' && selectedRange?.from && selectedRange?.to) {
      return `${format(selectedRange.from, 'MMM d')} - ${format(selectedRange.to, 'MMM d, yyyy')}`;
    }
    
    return 'All Time';
  }, [dateRangePreset, selectedRange]);

  // Handle calendar range selection
  const handleRangeSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
    if (range?.from && range?.to) {
      setDateRangePreset('custom');
    }
  };

  // Apply date filter
  const handleApplyDateFilter = () => {
    if (dateRangePreset === 'custom' && (!selectedRange?.from || !selectedRange?.to)) {
      toast.error('Please select both start and end dates');
      return;
    }
    setShowDateFilter(false);
    toast.success(`Filtered to: ${getFilterLabel()}`);
  };

  // Clear date filter
  const handleClearDateFilter = () => {
    setDateRangePreset('all_time');
    setSelectedRange(undefined);
    setShowDateFilter(false);
    toast.info('Showing all records');
  };

  // Filter records by date range
  const filteredRecords = useMemo(() => {
    const { startDate, endDate } = getDateRange();
    
    return records.filter(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }, [records, getDateRange]);

  // Export employee attendance to CSV
  const handleExport = () => {
    try {
      const headers = ['Date', 'Day', 'Check In', 'Check Out', 'Status', 'Leave Type', 'Leave Reason'];
      const csvRows = [headers.join(',')];

      filteredRecords.forEach(record => {
        const date = new Date(record.date);
        const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
        const status = record.status === 'present' ? 'Present' : 
                      record.status === 'paid_leave' ? 'Paid Leave' : 
                      record.status === 'absent' ? 'Absent' : record.status;
        const leaveType = record.leaveInfo?.leaveType ? 
          (record.leaveInfo.leaveType === 'sick_leave' ? 'Sick Leave' :
           record.leaveInfo.leaveType === 'vacation_leave' ? 'Vacation Leave' :
           record.leaveInfo.leaveType === 'emergency_leave' ? 'Emergency Leave' :
           record.leaveInfo.leaveType) : '';
        const leaveReason = record.leaveInfo?.reason ? `"${record.leaveInfo.reason.replace(/"/g, '""')}"` : '';

        csvRows.push([
          dateStr,
          dayStr,
          record.timeIn || '-',
          record.timeOut || '-',
          status,
          leaveType,
          leaveReason
        ].join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const fileName = `${employee.full_name.replace(/\s+/g, '_')}_Attendance_${getFilterLabel().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${filteredRecords.length} records for ${employee.full_name}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export records');
    }
  };

  const presentCount = filteredRecords.filter(r => r.status === 'present').length;
  const paidLeaveCount = filteredRecords.filter(r => r.status === 'paid_leave').length;
  const absentCount = filteredRecords.filter(r => r.status === 'absent').length;

  const quickFilters = [
    { value: 'all_time', label: 'All Time', icon: '🌐' },
    { value: 'today', label: 'Today', icon: '📅' },
    { value: 'yesterday', label: 'Yesterday', icon: '⏮️' },
    { value: 'this_week', label: 'This Week', icon: '📆' },
    { value: 'last_week', label: 'Last Week', icon: '⏪' },
    { value: 'this_month', label: 'This Month', icon: '📊' },
    { value: 'last_month', label: 'Last Month', icon: '📋' },
    { value: 'last_30_days', label: 'Last 30 Days', icon: '🗓️' },
    { value: 'last_90_days', label: 'Last 90 Days', icon: '📈' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur-md p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B3060] via-[#1a4a8a] to-[#0B3060] px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-[#F7B34C] to-[#f5a623] flex items-center justify-center text-[#0B3060] font-bold text-xl shadow-lg">
                  {employee.full_name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
            </div>
            <div className="text-white">
              <h2 className="text-3xl font-bold mb-1">{employee.full_name}</h2>
              <div className="flex items-center gap-3 text-sm text-white/90">
                <span className="px-2 py-1 bg-white/20 rounded-md font-medium">{employee.user_number}</span>
                <span>•</span>
                <span className="font-medium">{employee.team_name}</span>
                <span>•</span>
                <span className="italic">{employee.position || employee.user_type}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:rotate-90 duration-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats & Controls Bar */}
        <div className="px-8 py-5 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Left: Date Label & Stats */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-200">
                <CalendarDays className="w-5 h-5 text-[#0B3060]" />
                <span className="text-sm font-bold text-[#1F2937]">{getFilterLabel()}</span>
              </div>
              
              <div className="h-10 w-px bg-gray-300"></div>
              
              <div className="flex items-center gap-5">
                <div className="flex flex-col items-center px-4 py-2 bg-white rounded-xl shadow-sm">
                  <p className="text-xs text-[#6B7280] uppercase font-semibold mb-0.5">Total</p>
                  <p className="text-2xl font-black text-[#0B3060]">{filteredRecords.length}</p>
                </div>
                <div className="flex flex-col items-center px-4 py-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-100">
                  <p className="text-xs text-green-700 uppercase font-semibold mb-0.5">Present</p>
                  <p className="text-2xl font-black text-green-600">{presentCount}</p>
                </div>
                <div className="flex flex-col items-center px-4 py-2 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-sm border border-blue-100">
                  <p className="text-xs text-blue-700 uppercase font-semibold mb-0.5">Paid Leave</p>
                  <p className="text-2xl font-black text-blue-600">{paidLeaveCount}</p>
                </div>
                <div className="flex flex-col items-center px-4 py-2 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl shadow-sm border border-red-100">
                  <p className="text-xs text-red-700 uppercase font-semibold mb-0.5">Absent</p>
                  <p className="text-2xl font-black text-red-600">{absentCount}</p>
                </div>
              </div>
            </div>
            
            {/* Right: Filter & Export Buttons */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowDateFilter(!showDateFilter)}
                  className="flex items-center gap-2.5 px-5 py-2.5 bg-white border-2 border-[#0B3060] rounded-xl hover:bg-[#0B3060] hover:text-white transition-all duration-300 shadow-sm group"
                >
                  <Filter className="w-5 h-5 text-[#0B3060] group-hover:text-white transition-colors" />
                  <span className="text-sm font-bold text-[#0B3060] group-hover:text-white transition-colors">Filter Date</span>
                  <ChevronDown className={`w-4 h-4 text-[#0B3060] group-hover:text-white transition-all duration-300 ${showDateFilter ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Enhanced Date Filter Dropdown */}
                {showDateFilter && (
                  <div className="absolute top-full right-0 mt-2 w-[380px] bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-[60] overflow-hidden max-h-[420px] flex flex-col">
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
                      <button
                        onClick={() => setFilterTab('quick')}
                        className={`flex-1 px-3 py-1.5 text-xs font-bold transition-all ${
                          filterTab === 'quick'
                            ? 'bg-white text-[#0B3060] border-b-2 border-[#0B3060]'
                            : 'text-gray-500 hover:text-[#0B3060] hover:bg-gray-100'
                        }`}
                      >
                        ⚡ Quick Select
                      </button>
                      <button
                        onClick={() => setFilterTab('calendar')}
                        className={`flex-1 px-3 py-1.5 text-xs font-bold transition-all ${
                          filterTab === 'calendar'
                            ? 'bg-white text-[#0B3060] border-b-2 border-[#0B3060]'
                            : 'text-gray-500 hover:text-[#0B3060] hover:bg-gray-100'
                        }`}
                      >
                        📅 Calendar
                      </button>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <div className="p-2.5">
                        {/* Quick Select Tab */}
                        {filterTab === 'quick' && (
                          <div className="space-y-1.5">
                            {quickFilters.map((filter) => (
                              <button
                                key={filter.value}
                                onClick={() => {
                                  setDateRangePreset(filter.value as DateRangePreset);
                                  setSelectedRange(undefined);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                                  dateRangePreset === filter.value
                                    ? 'bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white shadow-md'
                                    : 'bg-gray-50 text-[#1F2937] hover:bg-gray-100'
                                }`}
                              >
                                <span className="text-sm">{filter.icon}</span>
                                <span className="text-xs font-semibold">{filter.label}</span>
                                {dateRangePreset === filter.value && (
                                  <span className="ml-auto text-xs">✓</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Calendar Tab */}
                        {filterTab === 'calendar' && (
                          <div className="space-y-2">
                            <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-200">
                              <p className="text-[10px] font-semibold text-[#0B3060] text-center">Select Date Range</p>
                            </div>
                            
                            <style>{`
                              .compact-calendar .rdp {
                                --rdp-cell-size: 28px;
                                --rdp-accent-color: #0B3060;
                                --rdp-background-color: #F7B34C;
                                margin: 0;
                                font-size: 11px;
                              }
                              .compact-calendar .rdp-months {
                                justify-content: center;
                              }
                              .compact-calendar .rdp-month {
                                margin: 0;
                              }
                              .compact-calendar .rdp-caption {
                                margin-bottom: 0.3rem;
                                padding: 0;
                              }
                              .compact-calendar .rdp-caption_label {
                                font-size: 0.75rem;
                                font-weight: 700;
                                color: #0B3060;
                              }
                              .compact-calendar .rdp-head {
                                font-size: 9px;
                              }
                              .compact-calendar .rdp-head_cell {
                                font-weight: 600;
                                font-size: 9px;
                                color: #6B7280;
                                text-transform: uppercase;
                                padding: 0.1rem;
                              }
                              .compact-calendar .rdp-cell {
                                padding: 0.5px;
                              }
                              .compact-calendar .rdp-day {
                                border-radius: 0.25rem;
                                font-weight: 500;
                                font-size: 10px;
                                width: 28px;
                                height: 28px;
                                transition: all 0.15s;
                              }
                              .compact-calendar .rdp-day:hover:not(.rdp-day_selected) {
                                background-color: #EFF6FF;
                                transform: scale(1.05);
                              }
                              .compact-calendar .rdp-day_selected {
                                background-color: #0B3060 !important;
                                color: white !important;
                                font-weight: 700;
                              }
                              .compact-calendar .rdp-day_selected:hover {
                                background-color: #1a4a8a !important;
                              }
                              .compact-calendar .rdp-day_range_middle {
                                background-color: #DBEAFE !important;
                                color: #0B3060 !important;
                              }
                              .compact-calendar .rdp-day_today {
                                font-weight: 700;
                                color: #F7B34C;
                              }
                              .compact-calendar .rdp-nav_button {
                                width: 22px;
                                height: 22px;
                                border-radius: 0.25rem;
                                transition: all 0.2s;
                              }
                              .compact-calendar .rdp-nav_button:hover {
                                background-color: #EFF6FF;
                              }
                              .compact-calendar .rdp-nav_button svg {
                                width: 12px;
                                height: 12px;
                              }
                            `}</style>
                            
                            <div className="flex justify-center compact-calendar">
                              <DayPicker
                                mode="range"
                                selected={selectedRange}
                                onSelect={handleRangeSelect}
                                numberOfMonths={1}
                                showOutsideDays={false}
                              />
                            </div>

                            {selectedRange?.from && selectedRange?.to && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                                <p className="text-[10px] font-bold text-green-800 text-center">
                                  ✅ {format(selectedRange.from, 'MMM d')} → {format(selectedRange.to, 'MMM d, yyyy')}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Always Visible */}
                    <div className="flex gap-2 px-2.5 py-2 border-t border-gray-200 bg-white flex-shrink-0">
                      <button
                        onClick={handleClearDateFilter}
                        className="flex-1 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleApplyDateFilter}
                        className="flex-1 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] rounded-lg hover:shadow-lg transition-all"
                      >
                        Apply Filter
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleExport}
                disabled={filteredRecords.length === 0}
                className="flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-[#F7B34C] to-[#f5a623] text-[#0B3060] rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-sm"
              >
                <Download className="w-5 h-5" />
                <span className="text-sm">Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredRecords.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 sticky top-0">
                <tr>
                  <th className="px-8 py-4 text-left text-xs font-bold text-[#0B3060] uppercase tracking-wider">Date</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-[#0B3060] uppercase tracking-wider">Check In</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-[#0B3060] uppercase tracking-wider">Check Out</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-[#0B3060] uppercase tracking-wider">Status</th>
                  <th className="px-8 py-4 text-left text-xs font-bold text-[#0B3060] uppercase tracking-wider">Leave Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((record, index) => (
                  <tr key={record.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#0B3060]" />
                        <span className="text-sm font-semibold text-[#1F2937]">
                          {new Date(record.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-[#1F2937]">{record.timeIn}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className="text-sm font-medium text-gray-600">{record.timeOut || '-'}</span>
                    </td>
                    <td className="px-8 py-4">
                      <StatusBadge status={record.status} size="md" />
                    </td>
                    <td className="px-8 py-4">
                      {record.leaveInfo ? (
                        <div className="text-sm space-y-1 max-w-md">
                          <p className="font-bold text-[#0B3060]">
                            {record.leaveInfo.leaveType === 'sick_leave' ? '🤒 Sick Leave' :
                             record.leaveInfo.leaveType === 'vacation_leave' ? '🏖️ Vacation Leave' :
                             record.leaveInfo.leaveType === 'emergency_leave' ? '🚨 Emergency Leave' :
                             record.leaveInfo.leaveType}
                          </p>
                          {record.leaveInfo.reason && (
                            <p className="text-xs text-gray-600 italic">
                              {record.leaveInfo.reason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-16">
              <AlertCircle className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2 text-gray-700">No Records Found</h3>
              <p className="text-gray-500">
                No attendance records for {employee.full_name} in the selected date range ({getFilterLabel()}).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-4 flex items-center justify-between border-t-2 border-gray-200">
          <span className="text-sm font-semibold text-gray-700">
            Showing <span className="text-[#0B3060] font-black">{filteredRecords.length}</span> record{filteredRecords.length !== 1 ? 's' : ''} 
            {dateRangePreset !== 'all_time' && <span className="text-gray-500"> (filtered from {records.length} total)</span>}
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-[#0B3060] to-[#1a4a8a] text-white rounded-xl hover:shadow-lg font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}