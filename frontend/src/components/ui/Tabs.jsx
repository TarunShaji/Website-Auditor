import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

export function Tabs({ children, defaultValue, value, onValueChange, className = '' }) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabsList({ children, className = '' }) {
  return (
    <TabsPrimitive.List
      className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({ children, value, className = '' }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ${className}`}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({ children, value, className = '' }) {
  return (
    <TabsPrimitive.Content
      value={value}
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </TabsPrimitive.Content>
  );
}
