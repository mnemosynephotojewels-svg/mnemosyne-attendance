import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  helperText?: string;
  rightElement?: React.ReactNode;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, icon: Icon, error, helperText, rightElement, className = '', ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Icon className="w-5 h-5" />
            </div>
          )}
          
          <input
            ref={ref}
            className={`
              w-full px-4 py-2.5 rounded-lg border transition-all
              ${Icon ? 'pl-11' : ''}
              ${rightElement ? 'pr-11' : ''}
              ${error 
                ? 'border-destructive focus:ring-destructive/20 focus:border-destructive' 
                : 'border-gray-300 focus:ring-primary/20 focus:border-primary'
              }
              bg-white text-foreground placeholder:text-muted-foreground/60
              disabled:bg-gray-50 disabled:text-muted-foreground disabled:cursor-not-allowed
              focus:outline-none focus:ring-2
              ${className}
            `}
            {...props}
          />
          
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-destructive" />
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
