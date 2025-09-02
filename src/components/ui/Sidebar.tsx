"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
    },
    {
      id: 'account',
      label: 'Account',
      href: '/account',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
      ),
    },
    {
      id: 'team',
      label: 'Team',
      href: '/team',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      ),
    },
    {
      id: 'subscription',
      label: 'Subscription Plans',
      href: '/subscription',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
        </svg>
      ),
    },
    {
      id: 'compute',
      label: 'Buy Compute Packs',
      href: '/compute',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
        </svg>
      ),
    },
    {
      id: 'usage',
      label: 'Usage Statistics',
      href: '/usage',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
        </svg>
      ),
    },
    {
      id: 'billing',
      label: 'Billing',
      href: '/billing',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21.9 4.1c-.1-.1-.2-.2-.3-.2H2.4c-.1 0-.2.1-.3.2-.1.1-.1.2-.1.3v15.2c0 .1 0 .2.1.3.1.1.2.1.3.1h19.2c.1 0 .2 0 .3-.1.1-.1.1-.2.1-.3V4.4c0-.1 0-.2-.1-.3zM20 8H4V6h16v2zm0 4H4v-2h16v2zm-8 4H4v-2h8v2z"/>
        </svg>
      ),
    },
    {
      id: 'promo',
      label: 'Promo',
      href: '/promo',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 0 1 3 9.5 6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5Z"/>
        </svg>
      ),
    },
  ];

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-white z-[60] transition-all duration-300 overflow-hidden ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center ${isExpanded ? 'px-6' : 'px-4'}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          {isExpanded && (
            <span className="font-semibold text-zinc-900 whitespace-nowrap">Krea AI</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-full text-sm font-medium
                    transition-all duration-200 relative
                    ${isActive 
                      ? 'bg-zinc-100 text-zinc-900' 
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                    }
                  `}
                >
                  <span className="text-zinc-900 flex-shrink-0">
                    {item.icon}
                  </span>
                  {isExpanded && (
                    <span className="whitespace-nowrap">{item.label}</span>
                  )}
                  {!isExpanded && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
                      {item.label}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      {isExpanded && (
        <div className="p-4">
          <div className="text-xs text-zinc-500 text-center">
            curated by Mobbin
          </div>
        </div>
      )}
    </aside>
  );
}

/* Demo/Story */
export function SidebarDemo() {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="ml-16 p-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Sidebar Demo</h1>
        <p className="mt-2 text-zinc-600">Hover over the sidebar to see it expand</p>
      </div>
    </div>
  );
} 