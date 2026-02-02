import React from 'react';

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-card rounded-lg border border-border/50 shadow-lg ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', onClick }) {
  return (
    <div className={`p-6 ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-xl font-semibold leading-none tracking-tight text-foreground ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-muted-foreground mt-1.5 ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`p-6 pt-0 ${className}`}>
      {children}
    </div>
  );
}
