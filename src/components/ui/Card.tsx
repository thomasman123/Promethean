import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'elevated' | 'outlined';
  interactive?: boolean;
}

export function Card({ 
  children, 
  className = '', 
  padding = 'lg',
  variant = 'default',
  interactive = false
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };

  const variantClasses = {
    default: 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50',
    elevated: 'bg-white dark:bg-zinc-900 shadow-lg',
    outlined: 'bg-transparent border border-zinc-200 dark:border-zinc-700'
  };

  return (
    <div className={cn(
      "rounded-2xl transition-all duration-200",
      variantClasses[variant],
      paddingClasses[padding],
      interactive && "hover:shadow-lg hover:scale-[1.02] cursor-pointer",
      className
    )}>
      {children}
    </div>
  );
}

interface SurfaceProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary';
}

export function Surface({ 
  children, 
  className = '', 
  variant = 'primary' 
}: SurfaceProps) {
  const variantClasses = {
    primary: 'bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50',
    secondary: 'bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/30 dark:border-zinc-700/30'
  };

  return (
    <div className={cn(
      "rounded-xl transition-colors duration-200",
      variantClasses[variant],
      className
    )}>
      {children}
    </div>
  );
}

// KPI Widget - Simple metric display
interface KPIWidgetProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
}

export function KPIWidget({ label, value, change }: KPIWidgetProps) {
  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-zinc-600 dark:text-zinc-400'
  };

  const trendIcons = {
    up: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    ),
    down: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
    neutral: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    )
  };

  return (
    <Card variant="default" padding="md" className="h-full">
      <div className="flex flex-col items-center justify-center text-center h-full">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className="mt-3 text-3xl font-bold text-zinc-900 dark:text-white">{value}</p>
        {change && (
          <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className={cn("flex items-center gap-1", trendColors[change.trend])}>
              {trendIcons[change.trend]}
              <span className="text-sm font-semibold">
                {change.value}
              </span>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">vs last period</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// Deprecated - keeping for backward compatibility
export function StatCard(props: KPIWidgetProps) {
  return <KPIWidget {...props} />;
}

/* Demo/Story */
export function CardDemo() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <h3 className="text-lg font-semibold text-zinc-900">Basic Card</h3>
              <p className="mt-2 text-zinc-600">This is a basic card with default padding</p>
            </Card>
            
            <Card padding="sm">
              <h3 className="text-lg font-semibold text-zinc-900">Small Padding</h3>
              <p className="mt-2 text-zinc-600">Card with small padding</p>
            </Card>
            
            <Card padding="xl">
              <h3 className="text-lg font-semibold text-zinc-900">Extra Large Padding</h3>
              <p className="mt-2 text-zinc-600">Card with extra large padding</p>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">KPI Widgets</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPIWidget 
              label="Total Revenue"
              value="$124,592"
              change={{ value: '12.5%', trend: 'up' }}
            />
            
            <KPIWidget 
              label="Active Users"
              value="1,429"
              change={{ value: '3.2%', trend: 'down' }}
            />
            
            <KPIWidget 
              label="Conversion Rate"
              value="23.8%"
              change={{ value: '0%', trend: 'neutral' }}
            />
            
            <KPIWidget 
              label="Avg. Order Value"
              value="$87.50"
              change={{ value: '5.3%', trend: 'up' }}
            />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Surfaces</h2>
          <div className="space-y-4">
            <Surface className="p-8">
              <h3 className="text-lg font-semibold text-zinc-900">Primary Surface</h3>
              <p className="mt-2 text-zinc-600">This is a primary surface with white background</p>
            </Surface>
            
            <Surface variant="secondary" className="p-8">
              <h3 className="text-lg font-semibold text-zinc-900">Secondary Surface</h3>
              <p className="mt-2 text-zinc-600">This is a secondary surface with light gray background</p>
            </Surface>
          </div>
        </div>
      </div>
    </div>
  );
} 