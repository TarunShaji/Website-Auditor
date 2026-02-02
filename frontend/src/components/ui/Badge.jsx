import React from 'react';

export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-primary/20 text-primary border border-primary/30',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-red-500/20 text-red-400 border border-red-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    ai: 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-glow-purple',
    outline: 'border border-border bg-transparent text-muted-foreground',
  };

  return (
    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant] || variants.default} ${className}`}>
      {children}
    </div>
  );
}
