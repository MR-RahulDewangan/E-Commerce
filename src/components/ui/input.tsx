import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-11 w-full bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground border border-border transition-colors duration-150',
          'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
