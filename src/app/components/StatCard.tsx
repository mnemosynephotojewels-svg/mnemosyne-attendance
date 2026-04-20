import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = 'default',
  subtitle,
  trend,
  className = ''
}: StatCardProps) {
  const variantStyles = {
    default: {
      card: 'bg-white border-gray-200',
      icon: 'bg-gray-100 text-gray-600',
      value: 'text-gray-900',
      title: 'text-gray-600',
    },
    primary: {
      card: 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20',
      icon: 'bg-primary text-white',
      value: 'text-primary',
      title: 'text-primary/80',
    },
    success: {
      card: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200',
      icon: 'bg-green-500 text-white',
      value: 'text-green-700',
      title: 'text-green-600',
    },
    warning: {
      card: 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200',
      icon: 'bg-yellow-500 text-white',
      value: 'text-yellow-700',
      title: 'text-yellow-600',
    },
    danger: {
      card: 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200',
      icon: 'bg-red-500 text-white',
      value: 'text-red-700',
      title: 'text-red-600',
    },
    info: {
      card: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
      icon: 'bg-blue-500 text-white',
      value: 'text-blue-700',
      title: 'text-blue-600',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className={`rounded-xl border p-6 transition-all hover:shadow-lg ${styles.card} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium mb-1 ${styles.title}`}>{title}</p>
          <div className="flex items-end gap-2">
            <p className={`text-3xl font-bold ${styles.value}`}>{value}</p>
            {trend && (
              <span className={`text-sm font-medium mb-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${styles.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
