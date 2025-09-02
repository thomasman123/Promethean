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
    <div className={`bg-zinc-100 rounded-2xl ${paddingClasses[padding]} ${className}`}>
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
    primary: 'bg-white',
    secondary: 'bg-zinc-100'
  };

  return (
    <div className={`rounded-xl ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
}

export function StatCard({ label, value, change, icon }: StatCardProps) {
  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-zinc-600 bg-zinc-100'
  };

  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-600">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
          {change && (
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${trendColors[change.trend]}`}>
                {change.trend === 'up' && '↑'}
                {change.trend === 'down' && '↓'}
                {change.value}
              </span>
              <span className="text-xs text-zinc-500">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-zinc-900">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
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
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Stat Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard 
              label="Total Revenue"
              value="$124,592"
              change={{ value: '+12.5%', trend: 'up' }}
              icon={
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1.93.66 1.64 2.08 1.64 1.51 0 2.2-.63 2.2-1.51 0-.96-.52-1.46-2.56-1.81-2.25-.38-3.71-1.33-3.71-3.31 0-1.86 1.39-3 3.16-3.33V5h2.67v1.38c1.51.33 2.85 1.28 2.94 3.04h-1.99c-.1-.72-.58-1.38-1.78-1.38-1.21 0-1.94.54-1.94 1.38 0 .83.58 1.26 2.43 1.56 2.5.43 3.84 1.36 3.84 3.53 0 2.03-1.43 3.13-3.36 3.58z"/>
                </svg>
              }
            />
            
            <StatCard 
              label="Active Users"
              value="1,429"
              change={{ value: '-3.2%', trend: 'down' }}
              icon={
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              }
            />
            
            <StatCard 
              label="Conversion Rate"
              value="23.8%"
              change={{ value: '0%', trend: 'neutral' }}
            />
            
            <StatCard 
              label="Avg. Order Value"
              value="$87.50"
              change={{ value: '+5.3%', trend: 'up' }}
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