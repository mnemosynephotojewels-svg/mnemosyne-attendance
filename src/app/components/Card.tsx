import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'bordered' | 'accent';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  headerActions?: React.ReactNode;
}

export function Card({ 
  children, 
  className = '', 
  title, 
  icon, 
  variant = 'default',
  padding = 'md',
  headerActions
}: CardProps) {
  const variantClasses = {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-md border border-gray-100',
    bordered: 'bg-white border-2 border-primary/10',
    accent: 'bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20',
  };

  const paddingClasses = {
    none: '',
    sm: title ? 'p-4' : '',
    md: title ? 'p-6' : '',
    lg: title ? 'p-8' : '',
  };

  const contentPaddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`rounded-xl transition-shadow hover:shadow-lg ${variantClasses[variant]} ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && <div className="text-muted">{icon}</div>}
            <h3 className="font-semibold text-foreground text-lg">{title}</h3>
          </div>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className={title ? contentPaddingClasses[padding] : paddingClasses[padding]}>
        {children}
      </div>
    </div>
  );
}