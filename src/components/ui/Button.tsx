import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-soft-sm',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-soft-sm'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 
        font-medium rounded-lg transition-all duration-200
        ${variantClasses[variant]} 
        ${sizeClasses[size]} 
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'sm' 
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-zinc-100 text-zinc-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };

  return (
    <span className={`
      inline-flex items-center font-medium rounded-full
      ${variantClasses[variant]} 
      ${sizeClasses[size]}
    `}>
      {children}
    </span>
  );
}

interface PillProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

export function Pill({ children, selected = false, onClick }: PillProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200
        ${selected 
          ? 'bg-white text-zinc-900 shadow-sm' 
          : 'text-zinc-500 hover:text-zinc-700'
        }
      `}
    >
      {children}
    </button>
  );
}

/* Demo/Story */
export function ButtonDemo() {
  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="danger">Danger Button</Button>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-4">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <Button>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              With Icon
            </Button>
            <Button variant="secondary">
              Export
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </Button>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-3">
            <Badge size="sm">Small Badge</Badge>
            <Badge size="md">Medium Badge</Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Badge variant="success">+12.5%</Badge>
            <Badge variant="error">-3.2%</Badge>
            <Badge>New</Badge>
            <Badge variant="info">44.79%</Badge>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4">Pills</h2>
          <div className="bg-zinc-100 rounded-full p-1 inline-flex">
            <Pill selected>Dashboard</Pill>
            <Pill>Data</Pill>
            <Pill>Settings</Pill>
          </div>
        </div>
      </div>
    </div>
  );
} 