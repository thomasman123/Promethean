import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Card({ 
  children, 
  className = '', 
  padding = 'lg' 
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };

  return (
    <div className={`bg-zinc-100 dark:bg-zinc-800 rounded-2xl ${paddingClasses[padding]} ${className}`}>
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
    primary: 'bg-white dark:bg-zinc-900',
    secondary: 'bg-zinc-100 dark:bg-zinc-800'
  };

  return (
    <div className={`rounded-xl ${variantClasses[variant]} ${className}`}>
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

  return (
    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-white">{value}</p>
      {change && (
        <div className="mt-3 flex items-center gap-1">
          <span className={`text-sm font-medium ${trendColors[change.trend]}`}>
            {change.trend === 'up' && '+'}
            {change.trend === 'down' && '-'}
            {change.value}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">vs last period</span>
        </div>
      )}
    </div>
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