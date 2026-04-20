import React from 'react';

interface StatusBadgeProps {
  status: 'present' | 'late' | 'absent' | 'day-off' | 'in-office' | 'on-leave' | 'pending' | 'approved' | 'rejected' | 'no-schedule' | 'on-time' | 'early-out' | 'overtime' | 'paid_leave';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const getStatusStyles = () => {
    const normalizedStatus = status.toLowerCase(); // Normalize to lowercase for comparison
    switch (normalizedStatus) {
      case 'present':
      case 'in-office':
      case 'approved':
      case 'on-time':
      case 'on_time':
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
      case 'late':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' };
      case 'absent':
      case 'rejected':
      case 'early-out':
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
      case 'on-leave':
      case 'day-off':
      case 'paid_leave':
        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
      case 'overtime':
        return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
      case 'no-schedule':
        return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
    }
  };

  const getStatusLabel = () => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'in-office':
        return 'In Office';
      case 'on-leave':
        return 'On Leave';
      case 'day-off':
        return 'Day Off';
      case 'paid_leave':
        return 'Paid Leave';
      case 'no-schedule':
        return 'No Schedule';
      case 'on-time':
      case 'on_time':
        return 'On Time';
      case 'early-out':
        return 'Early Out';
      case 'overtime':
        return 'Overtime';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const styles = getStatusStyles();

  return (
    <span className={`inline-flex items-center justify-center rounded-full font-medium border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses[size]}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
      {getStatusLabel()}
    </span>
  );
}