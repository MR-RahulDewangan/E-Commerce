import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'champagne' | 'outline' | 'success' | 'destructive';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const variants = {
    default:
      'bg-primary text-primary-foreground border-transparent',
    secondary:
      'bg-muted text-foreground border-border',
    champagne:
      'bg-[#F5EFE6] text-luxury-obsidian border-luxury-champagne',
    outline:
      'bg-transparent text-foreground border-border',
    success:
      'bg-emerald-50 text-emerald-800 border-emerald-200',
    destructive:
      'bg-red-50 text-destructive border-red-200',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-sans font-medium uppercase tracking-widest border transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
