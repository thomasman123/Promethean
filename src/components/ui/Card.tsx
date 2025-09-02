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

// KPI Widget - Simple metric display
interface KPIWidgetProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  gradientTheme?: 'purple' | 'blue' | 'green' | 'orange';
}

export function KPIWidget({ label, value, change, gradientTheme = 'purple' }: KPIWidgetProps) {
  const trendColors = {
    up: 'text-green-300',
    down: 'text-red-300',
    neutral: 'text-zinc-300'
  };

  // Define gradient themes similar to the reference image
  const gradientClasses = {
    purple: 'bg-gradient-to-br from-purple-600 via-purple-700 to-purple-900',
    blue: 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900',
    green: 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900',
    orange: 'bg-gradient-to-br from-orange-600 via-orange-700 to-orange-900'
  };

  return (
    <div className={`${gradientClasses[gradientTheme]} rounded-3xl p-8 flex flex-col items-start justify-between text-left h-full min-h-[200px] relative overflow-hidden`}>
      {/* Background decoration similar to reference image */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-white/20 blur-3xl" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full">
        <p className="text-sm font-bold text-white/80 uppercase tracking-wider">{label}</p>
        <p className="mt-3 text-4xl font-black text-white">{value}</p>
      </div>
      
      {change && (
        <div className="relative z-10 mt-4 flex items-center gap-2">
          <span className={`text-sm font-bold ${trendColors[change.trend]}`}>
            {change.trend === 'up' && '↑'}
            {change.trend === 'down' && '↓'}
            {change.value}
          </span>
          <span className="text-xs text-white/60 font-medium">vs last period</span>
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