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
    <div className={`bg-white rounded-2xl shadow-soft-md border border-zinc-100 ${paddingClasses[padding]} ${className}`}>
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
    secondary: 'bg-zinc-50'
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
    neutral: 'text-zinc-600 bg-zinc-50'
  };

  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-500">{label}</p>
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
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600">
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
    <div className="min-h-screen bg-zinc-50 p-8">
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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            
            <StatCard 
              label="Active Users"
              value="1,429"
              change={{ value: '-3.2%', trend: 'down' }}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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